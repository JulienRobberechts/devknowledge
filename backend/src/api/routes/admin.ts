import { type NextFunction, type Request, type Response, Router } from "express";
import { z } from "zod";
import type {
  AppSettings,
  IAppSettingsService,
  ICheckStorageConsistency,
  IResetAll,
} from "../../app-ports/admin";
import config from "../../config";

const appSettingsPatchSchema = z.object({
  embedding: z.object({ provider: z.string().min(1) }).optional(),
  storage: z.object({ provider: z.string().min(1) }).optional(),
  chunking: z
    .object({
      strategy: z.enum(["recursive", "sentence"]).optional(),
      chunkSize: z.number().int().min(64).max(2048).optional(),
      chunkOverlap: z.number().int().min(0).max(512).optional(),
    })
    .optional(),
});

const EMBEDDING_PROVIDER_OPTIONS = [
  {
    provider: "voyage",
    model: "voyage-4-lite",
    label: "Voyage AI — voyage-4-lite",
  },
  {
    provider: "openai",
    model: "text-embedding-3-small",
    label: "OpenAI — text-embedding-3-small",
  },
  {
    provider: "mistral",
    model: "mistral-embed",
    label: "Mistral — mistral-embed",
  },
];

function buildEmbeddingOptions() {
  return EMBEDDING_PROVIDER_OPTIONS.map((p) => ({
    ...p,
    available: !!(p.provider === "voyage"
      ? config.embeddings.voyage.apiKey
      : p.provider === "openai"
        ? process.env.OPENAI_API_KEY
        : p.provider === "mistral"
          ? process.env.MISTRAL_API_KEY
          : false),
  }));
}

function buildStorageOptions() {
  const { accountId, accessKeyId, secretAccessKey, bucketName } = config.storage.r2;
  const r2Available = !!(accountId && accessKeyId && secretAccessKey && bucketName);
  return [
    { provider: "r2", label: "Cloudflare R2", available: r2Available },
    { provider: "local", label: "Local disk", available: true },
  ];
}

function buildSettingsResponse(settings: AppSettings) {
  return {
    embedding: { ...settings.embedding, options: buildEmbeddingOptions() },
    storage: { ...settings.storage, options: buildStorageOptions() },
  };
}

export function adminRouter(
  checkConsistency: ICheckStorageConsistency,
  settingsService: IAppSettingsService,
  resetAll: IResetAll,
): Router {
  const router = Router();

  router.get(
    "/storage/consistency",
    async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const result = await checkConsistency.execute();
        const ok = result.orphanFiles.length === 0 && result.missingFiles.length === 0;
        res.json({ ok, ...result });
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    "/settings",
    async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const settings = await settingsService.getSettings();
        res.json(buildSettingsResponse(settings));
      } catch (err) {
        next(err);
      }
    },
  );

  router.put(
    "/settings",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const parsed = appSettingsPatchSchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: "Validation error", fields: parsed.error.issues });
          return;
        }
        const updated = await settingsService.updateSettings(parsed.data);
        res.json(buildSettingsResponse(updated));
      } catch (err) {
        next(err);
      }
    },
  );

  router.delete(
    "/reset",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const bodySchema = z.object({
          newSettings: appSettingsPatchSchema.optional(),
        });
        const parsed = bodySchema.safeParse(req.body);
        if (!parsed.success) {
          res.status(400).json({ error: "Validation error", fields: parsed.error.issues });
          return;
        }
        await resetAll.execute(parsed.data.newSettings);
        res.json({ ok: true });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}

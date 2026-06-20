import { type NextFunction, type Request, type Response, Router } from "express";
import { z } from "zod";
import type { IAppSettingsService } from "../../app-ports/admin/IAppSettingsService";
import type { ICheckStorageConsistency } from "../../app-ports/admin/ICheckStorageConsistency";
import type { IResetAll } from "../../app-ports/admin/IResetAll";

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
        res.json(settings);
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
        res.json(updated);
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

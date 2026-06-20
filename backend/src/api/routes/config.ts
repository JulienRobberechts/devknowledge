import { Router } from "express";
import pkg from "../../../package.json";
import type { IAppSettingsService } from "../../app-ports/admin/IAppSettingsService";
import config from "../../config";

export function configRouter(settingsService: IAppSettingsService): Router {
  const router = Router();

  router.get("/", async (_req, res, next) => {
    try {
      const chunking = await settingsService.getChunkingConfig();
      res.json({
        version: pkg.version,
        logLevel: config.server.logLevel,
        rag: {
          chunkingStrategy: chunking.strategy,
          chunkSize: chunking.chunkSize,
          chunkOverlap: chunking.chunkOverlap,
          retrievalLimit: config.rag.retrievalLimit,
          retrievalMinScore: config.rag.retrievalMinScore,
          searchMode: config.rag.searchMode,
          reranking: {
            enabled: config.rerank.enabled,
            model: config.rerank.model,
          },
        },
        llm: {
          provider: "anthropic",
          model: config.llm.anthropic.model,
          maxTokens: config.llm.anthropic.maxTokens,
          temperature: config.llm.anthropic.temperature,
        },
        embeddings: {
          provider: "voyage",
          model: config.embeddings.voyage.model,
        },
        storage: {
          backend: config.storage.backend,
        },
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

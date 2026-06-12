import { Router } from "express";
import config from "../../config";
import pkg from "../../../package.json";

export function configRouter(): Router {
  const router = Router();

  router.get("/", (_req, res) => {
    res.json({
      version: pkg.version,
      logLevel: config.server.logLevel,
      rag: {
        chunkingStrategy: config.rag.chunkingStrategy,
        chunkSize: config.rag.chunkSize,
        chunkOverlap: config.rag.chunkOverlap,
        retrievalLimit: config.rag.retrievalLimit,
        retrievalMinScore: config.rag.retrievalMinScore,
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
    });
  });

  return router;
}

import path from "node:path";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";

process.on("uncaughtException", (err) => {
  console.error("[uncaughtException]", err);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
  process.exit(1);
});
process.on("SIGTERM", () => {
  console.log("[SIGTERM] received — Stopping the container");
  process.exit(0);
});

dotenv.config({ path: path.join(__dirname, "../../.env") });

const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1),
    ANTHROPIC_API_KEY: z.string().min(1),
    VOYAGE_API_KEY: z.string().min(1),
    APP_PASSWORD: z.string().min(1),
    STORAGE_BACKEND: z.enum(["local", "r2"]).optional(),
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET_NAME: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.STORAGE_BACKEND === "r2") {
      for (const key of [
        "R2_ACCOUNT_ID",
        "R2_ACCESS_KEY_ID",
        "R2_SECRET_ACCESS_KEY",
        "R2_BUCKET_NAME",
      ] as const) {
        if (!env[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${key} is required when STORAGE_BACKEND=r2`,
            path: [key],
          });
        }
      }
    }
  });

const envResult = envSchema.safeParse(process.env);
if (!envResult.success) {
  const missing = envResult.error.issues.map((e) => e.message || e.path.join(".")).join("\n  ");
  console.error(`Invalid configuration:\n  ${missing}`);
  process.exit(1);
}

import { apiKeyAuth } from "./api/middleware/apiKeyAuth";
import { errorHandler } from "./api/middleware/errorHandler";
import { adminRouter } from "./api/routes/admin";
import { authRouter } from "./api/routes/auth";
import { configRouter } from "./api/routes/config";
import { conversationsRouter } from "./api/routes/conversations";
import { documentsRouter } from "./api/routes/documents";
import { quizzesRouter } from "./api/routes/quizzes";
import { searchRouter } from "./api/routes/search";
import { AppSettingsService } from "./application/AppSettingsService";
import { AskQuestion } from "./application/AskQuestion";
import { CheckStorageConsistency } from "./application/CheckStorageConsistency";
import { CreateDocument } from "./application/CreateDocument";
import { GenerateQuiz } from "./application/GenerateQuiz";
import { IngestDocument } from "./application/IngestDocument";
import { ResetAll } from "./application/ResetAll";
import { CheckContextualKnowledge } from "./application/responseChecks/CheckContextualKnowledge";
import { SearchKnowledge } from "./application/SearchKnowledge";
import { SummarizeDocument } from "./application/SummarizeDocument";
import config from "./config";
import { PgAppSettingsRepository } from "./infrastructure/db/PgAppSettingsRepository";
import { PgConversationRepository } from "./infrastructure/db/PgConversationRepository";
import { PgDocumentRepository } from "./infrastructure/db/PgDocumentRepository";
import { PgDocumentSummaryRepository } from "./infrastructure/db/PgDocumentSummaryRepository";
import { PgVectorChunkRepository } from "./infrastructure/db/PgVectorChunkRepository";
import { VoyageEmbeddingAdapter } from "./infrastructure/embeddings/VoyageEmbeddingAdapter";
import { AnthropicLLMAdapter } from "./infrastructure/llm/AnthropicLLMAdapter";
import { MultiFileParser } from "./infrastructure/parsers/MultiFileParser";
import { VoyageRerankAdapter } from "./infrastructure/reranking/VoyageRerankAdapter";
import { Logger } from "./infrastructure/logger/Logger";
import { createStorageBackends } from "./infrastructure/storage/createFileStorage";
import { DynamicFileStorage } from "./infrastructure/storage/DynamicFileStorage";

const documentRepo = new PgDocumentRepository();
const chunkRepo = new PgVectorChunkRepository();
const conversationRepo = new PgConversationRepository({
  retrievalLimit: config.rag.retrievalLimit,
  retrievalMinScore: config.rag.retrievalMinScore,
  rerankEnabled: config.rerank.enabled,
  rerankModel: config.rerank.model,
  rerankCandidateMultiplier: config.rerank.candidateMultiplier,
  llmModel: config.llm.anthropic.model,
  llmTemperature: config.llm.anthropic.temperature,
  llmMaxTokens: config.llm.anthropic.maxTokens,
  knowledgeCheckStrategies: config.rag.knowledgeCheckStrategies,
  searchMode: config.rag.searchMode,
});
const embeddingAdapter = new VoyageEmbeddingAdapter();
const llmAdapter = new AnthropicLLMAdapter();
const fileParser = new MultiFileParser();
const appSettingsRepo = new PgAppSettingsRepository();
const appSettingsService = new AppSettingsService(appSettingsRepo);
const storageBackends = createStorageBackends();
const fileStorage = new DynamicFileStorage(
  () => appSettingsService.getSettings().then((s) => s.storage.provider),
  storageBackends,
);
const createDocument = new CreateDocument(documentRepo, fileStorage);
const ingestDocument = new IngestDocument(
  documentRepo,
  chunkRepo,
  embeddingAdapter,
  fileStorage,
  fileParser,
  () => appSettingsService.getChunkingConfig(),
  new Logger("IngestDocument"),
);
const reranker = config.rerank.enabled ? new VoyageRerankAdapter() : null;
const searchKnowledge = new SearchKnowledge(
  chunkRepo,
  embeddingAdapter,
  new Logger("SearchKnowledge"),
  reranker,
  config.rerank.candidateMultiplier,
  config.rag.searchMode,
);
const knowledgeChecker = new CheckContextualKnowledge(
  llmAdapter,
  new Logger("CheckContextualKnowledge"),
);
const askQuestion = new AskQuestion(
  searchKnowledge,
  llmAdapter,
  conversationRepo,
  documentRepo,
  new Logger("AskQuestion"),
  knowledgeChecker,
);
const generateQuiz = new GenerateQuiz(chunkRepo, llmAdapter, new Logger("GenerateQuiz"));
const summaryRepo = new PgDocumentSummaryRepository();
const summarizeDocument = new SummarizeDocument(
  documentRepo,
  chunkRepo,
  summaryRepo,
  llmAdapter,
  new Logger("SummarizeDocument"),
);
const checkStorageConsistency = new CheckStorageConsistency(documentRepo, fileStorage);
const resetAll = new ResetAll(
  fileStorage,
  (patch) => appSettingsService.updateSettings(patch),
  chunkRepo,
  summaryRepo,
  conversationRepo,
  documentRepo,
  new Logger("ResetAll"),
);

const app = express();
const PORT = config.server.port;

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/config", configRouter(appSettingsService));
app.use("/api/admin", adminRouter(checkStorageConsistency, appSettingsService, resetAll));
app.use("/api/auth", authRouter());

const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api", apiLimiter);
app.use("/api", apiKeyAuth);
app.use(
  "/api/documents",
  documentsRouter(
    documentRepo,
    chunkRepo,
    fileStorage,
    createDocument,
    ingestDocument,
    summaryRepo,
    summarizeDocument,
  ),
);
app.use("/api/conversations", conversationsRouter(conversationRepo, askQuestion));
app.use("/api/search", searchRouter(searchKnowledge));
app.use("/api/quizzes", quizzesRouter(generateQuiz));

app.use(errorHandler);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;

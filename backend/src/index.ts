import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
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
  console.log("[SIGTERM] received — Railway is stopping the container");
  process.exit(0);
});

dotenv.config({ path: path.join(__dirname, "../../.env") });

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  VOYAGE_API_KEY: z.string().min(1),
  API_KEY: z.string().min(1),
});

const envResult = envSchema.safeParse(process.env);
if (!envResult.success) {
  const missing = envResult.error.errors
    .map((e) => e.path.join("."))
    .join(", ");
  console.error(`Missing required environment variables: ${missing}`);
  process.exit(1);
}

import config from "./config";
import { apiKeyAuth } from "./api/middleware/apiKeyAuth";
import { errorHandler } from "./api/middleware/errorHandler";
import { configRouter } from "./api/routes/config";
import { documentsRouter } from "./api/routes/documents";
import { conversationsRouter } from "./api/routes/conversations";
import { searchRouter } from "./api/routes/search";
import { PgDocumentRepository } from "./infrastructure/db/PgDocumentRepository";
import { PgVectorChunkRepository } from "./infrastructure/db/PgVectorChunkRepository";
import { PgConversationRepository } from "./infrastructure/db/PgConversationRepository";
import { PgDocumentSummaryRepository } from "./infrastructure/db/PgDocumentSummaryRepository";
import { VoyageEmbeddingAdapter } from "./infrastructure/embeddings/VoyageEmbeddingAdapter";
import { AnthropicLLMAdapter } from "./infrastructure/llm/AnthropicLLMAdapter";
import { MultiFileParser } from "./infrastructure/parsers/MultiFileParser";
import { createChunkingStrategy } from "./domain/services/ChunkingStrategy";
import { IngestDocument } from "./application/IngestDocument";
import { SearchKnowledge } from "./application/SearchKnowledge";
import { AskQuestion } from "./application/AskQuestion";
import { CheckContextualKnowledge } from "./application/responseChecks/CheckContextualKnowledge";
import { VoyageRerankAdapter } from "./infrastructure/reranking/VoyageRerankAdapter";
import { GenerateQuiz } from "./application/GenerateQuiz";
import { SummarizeDocument } from "./application/SummarizeDocument";
import { quizzesRouter } from "./api/routes/quizzes";

const documentRepo = new PgDocumentRepository();
const chunkRepo = new PgVectorChunkRepository();
const conversationRepo = new PgConversationRepository();
const embeddingAdapter = new VoyageEmbeddingAdapter();
const llmAdapter = new AnthropicLLMAdapter();
const fileParser = new MultiFileParser();
const chunkingStrategy = createChunkingStrategy(config.rag.chunkingStrategy);
const ingestDocument = new IngestDocument(
  documentRepo,
  chunkRepo,
  embeddingAdapter,
  fileParser,
  chunkingStrategy,
  { chunkSize: config.rag.chunkSize, chunkOverlap: config.rag.chunkOverlap },
);
const reranker = config.rerank.enabled ? new VoyageRerankAdapter() : null;
const searchKnowledge = new SearchKnowledge(
  chunkRepo,
  embeddingAdapter,
  reranker,
  config.rerank.candidateMultiplier,
  config.rag.searchMode,
);
const knowledgeChecker = new CheckContextualKnowledge(llmAdapter);
const askQuestion = new AskQuestion(
  searchKnowledge,
  llmAdapter,
  conversationRepo,
  documentRepo,
  knowledgeChecker,
);
const generateQuiz = new GenerateQuiz(chunkRepo, llmAdapter);
const summaryRepo = new PgDocumentSummaryRepository();
const summarizeDocument = new SummarizeDocument(
  documentRepo,
  chunkRepo,
  summaryRepo,
  llmAdapter,
);

const app = express();
const PORT = config.server.port;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/config", configRouter());

app.use("/api", apiKeyAuth);
app.use(
  "/api/documents",
  documentsRouter(
    documentRepo,
    chunkRepo,
    ingestDocument,
    summaryRepo,
    summarizeDocument,
  ),
);
app.use(
  "/api/conversations",
  conversationsRouter(conversationRepo, askQuestion),
);
app.use("/api/search", searchRouter(searchKnowledge));
app.use("/api/quizzes", quizzesRouter(generateQuiz));

app.use(errorHandler);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;

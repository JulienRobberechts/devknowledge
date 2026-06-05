import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { z } from "zod";

dotenv.config({ path: path.join(__dirname, "../../.env.local") });

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
import { documentsRouter } from "./api/routes/documents";
import { conversationsRouter } from "./api/routes/conversations";
import { searchRouter } from "./api/routes/search";
import { PgDocumentRepository } from "./infrastructure/db/PgDocumentRepository";
import { PgVectorChunkRepository } from "./infrastructure/db/PgVectorChunkRepository";
import { PgConversationRepository } from "./infrastructure/db/PgConversationRepository";
import { VoyageEmbeddingAdapter } from "./infrastructure/embeddings/VoyageEmbeddingAdapter";
import { AnthropicLLMAdapter } from "./infrastructure/llm/AnthropicLLMAdapter";
import { MultiFileParser } from "./infrastructure/parsers/MultiFileParser";
import { ChunkingStrategy } from "./domain/services/ChunkingStrategy";
import { IngestDocument } from "./application/IngestDocument";
import { SearchKnowledge } from "./application/SearchKnowledge";
import { AskQuestion } from "./application/AskQuestion";

const documentRepo = new PgDocumentRepository();
const chunkRepo = new PgVectorChunkRepository();
const conversationRepo = new PgConversationRepository();
const embeddingAdapter = new VoyageEmbeddingAdapter();
const llmAdapter = new AnthropicLLMAdapter();
const fileParser = new MultiFileParser();
const chunkingStrategy = new ChunkingStrategy();
const ingestDocument = new IngestDocument(
  documentRepo,
  chunkRepo,
  embeddingAdapter,
  fileParser,
  chunkingStrategy,
);
const searchKnowledge = new SearchKnowledge(chunkRepo, embeddingAdapter);
const askQuestion = new AskQuestion(
  searchKnowledge,
  llmAdapter,
  conversationRepo,
);

const app = express();
const PORT = config.server.port;

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", apiKeyAuth);
app.use(
  "/api/documents",
  documentsRouter(documentRepo, chunkRepo, ingestDocument),
);
app.use(
  "/api/conversations",
  conversationsRouter(conversationRepo, askQuestion),
);
app.use("/api/search", searchRouter(searchKnowledge));

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;

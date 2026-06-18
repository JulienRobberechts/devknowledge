import { AppSettingsService } from "./application/admin/AppSettingsService";
import { AskQuestion } from "./application/rag/AskQuestion";
import { CheckStorageConsistency } from "./application/admin/CheckStorageConsistency";
import { ConversationTitleGenerator } from "./application/rag/ConversationTitleGenerator";
import { CreateDocument } from "./application/knowledgeBase/CreateDocument";
import { GenerateQuiz } from "./application/quiz/GenerateQuiz";
import { IngestDocument } from "./application/knowledgeBase/IngestDocument";
import { ResetAll } from "./application/admin/ResetAll";
import { CheckResponseGrounding } from "./application/rag/responseGrounding/CheckResponseGrounding";
import { RetrieveKnowledge } from "./application/rag/RetrieveKnowledge";
import { SourceCitationResolver } from "./application/rag/SourceCitationResolver";
import { SummarizeDocument } from "./application/knowledgeBase/SummarizeDocument";
import { ConversationParams } from "./domain/entities/Conversation";
import config from "./config";
import { PgAppSettingsRepository } from "./infrastructure/db/PgAppSettingsRepository";
import { PgConversationRepository } from "./infrastructure/db/PgConversationRepository";
import { PgDocumentRepository } from "./infrastructure/db/PgDocumentRepository";
import { PgDocumentSummaryRepository } from "./infrastructure/db/PgDocumentSummaryRepository";
import { PgVectorChunkRepository } from "./infrastructure/db/PgVectorChunkRepository";
import { VoyageEmbeddingAdapter } from "./infrastructure/embeddings/VoyageEmbeddingAdapter";
import { Logger } from "./infrastructure/logger/Logger";
import { AnthropicLLMAdapter } from "./infrastructure/llm/AnthropicLLMAdapter";
import { MultiFileParser } from "./infrastructure/parsers/MultiFileParser";
import { VoyageRerankAdapter } from "./infrastructure/reranking/VoyageRerankAdapter";
import { createStorageBackends } from "./infrastructure/storage/createFileStorage";
import { DynamicFileStorage } from "./infrastructure/storage/DynamicFileStorage";

export const documentRepo = new PgDocumentRepository();
export const chunkRepo = new PgVectorChunkRepository();
export const conversationRepo = new PgConversationRepository(
  ConversationParams.create({
    retrievalLimit: config.rag.retrievalLimit,
    retrievalMinScore: config.rag.retrievalMinScore,
    rerankEnabled: config.rerank.enabled,
    rerankModel: config.rerank.model,
    rerankCandidateMultiplier: config.rerank.candidateMultiplier,
    llmModel: config.llm.anthropic.model,
    llmTemperature: config.llm.anthropic.temperature,
    llmMaxTokens: config.llm.anthropic.maxTokens,
    responseGroundingStrategies: config.rag.responseGroundingStrategies,
    searchMode: config.rag.searchMode,
  }),
);
const embeddingAdapter = new VoyageEmbeddingAdapter();
const llmAdapter = new AnthropicLLMAdapter();
const fileParser = new MultiFileParser();
const appSettingsRepo = new PgAppSettingsRepository();
export const appSettingsService = new AppSettingsService(appSettingsRepo);
const storageBackends = createStorageBackends();
export const fileStorage = new DynamicFileStorage(
  () => appSettingsService.getSettings().then((s) => s.storage.provider),
  storageBackends,
);
export const createDocument = new CreateDocument(documentRepo, fileStorage);
export const ingestDocument = new IngestDocument(
  documentRepo,
  chunkRepo,
  embeddingAdapter,
  fileStorage,
  fileParser,
  () => appSettingsService.getChunkingConfig(),
  new Logger("IngestDocument"),
);
const reranker = config.rerank.enabled ? new VoyageRerankAdapter() : null;
export const retrieveKnowledge = new RetrieveKnowledge(
  chunkRepo,
  embeddingAdapter,
  new Logger("RetrieveKnowledge"),
  reranker,
  config.rerank.candidateMultiplier,
  config.rag.searchMode,
);
const responseGrounder = new CheckResponseGrounding(
  llmAdapter,
  new Logger("CheckResponseGrounding"),
);
const citationResolver = new SourceCitationResolver(documentRepo);
const titleGenerator = new ConversationTitleGenerator(llmAdapter);
export const askQuestion = new AskQuestion(
  retrieveKnowledge,
  llmAdapter,
  conversationRepo,
  citationResolver,
  titleGenerator,
  new Logger("AskQuestion"),
  responseGrounder,
);
export const generateQuiz = new GenerateQuiz(
  chunkRepo,
  llmAdapter,
  new Logger("GenerateQuiz"),
);
export const summaryRepo = new PgDocumentSummaryRepository();
export const summarizeDocument = new SummarizeDocument(
  documentRepo,
  chunkRepo,
  summaryRepo,
  llmAdapter,
  new Logger("SummarizeDocument"),
);
export const checkStorageConsistency = new CheckStorageConsistency(
  documentRepo,
  fileStorage,
);
export const resetAll = new ResetAll(
  fileStorage,
  (patch) => appSettingsService.updateSettings(patch),
  chunkRepo,
  summaryRepo,
  conversationRepo,
  documentRepo,
  new Logger("ResetAll"),
);

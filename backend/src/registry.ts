import { AppSettingsService } from "./app/admin/AppSettingsService";
import { CheckStorageConsistency } from "./app/admin/CheckStorageConsistency";
import { ResetAll } from "./app/admin/ResetAll";
import { CreateDocument } from "./app/knowledgeBase/CreateDocument";
import { DeleteDocument } from "./app/knowledgeBase/DeleteDocument";
import { DocumentQueries } from "./app/knowledgeBase/DocumentQueries";
import { IngestDocument } from "./app/knowledgeBase/IngestDocument";
import { SummarizeDocument } from "./app/knowledgeBase/SummarizeDocument";
import { GenerateQuiz } from "./app/quiz/GenerateQuiz";
import { AskQuestion } from "./app/rag/AskQuestion";
import { ConversationService } from "./app/rag/ConversationService";
import { ConversationTitleGenerator } from "./app/rag/ConversationTitleGenerator";
import { RetrieveKnowledge } from "./app/rag/RetrieveKnowledge";
import { CheckResponseGrounding } from "./app/rag/responseGrounding/CheckResponseGrounding";
import { SourceCitationResolver } from "./app/rag/SourceCitationResolver";
import config from "./config";
import { ConversationParams } from "./domain/entities";
import { VoyageEmbeddingAdapter } from "./infra/ai/embeddings/VoyageEmbeddingAdapter";
import { AnthropicLLMAdapter } from "./infra/ai/llm/AnthropicLLMAdapter";
import { VoyageRerankAdapter } from "./infra/ai/reranking/VoyageRerankAdapter";
import { Logger } from "./infra/logger/Logger";
import { PgAppSettingsRepository } from "./infra/persistence/db/PgAppSettingsRepository";
import { PgConversationRepository } from "./infra/persistence/db/PgConversationRepository";
import { PgDocumentRepository } from "./infra/persistence/db/PgDocumentRepository";
import { PgDocumentSummaryRepository } from "./infra/persistence/db/PgDocumentSummaryRepository";
import { PgVectorChunkRepository } from "./infra/persistence/db/PgVectorChunkRepository";
import { createStorageBackends } from "./infra/storage/files/createFileStorage";
import { DynamicFileStorage } from "./infra/storage/files/DynamicFileStorage";
import { MultiFileParser } from "./infra/storage/parsers/MultiFileParser";

export const apiLogger = new Logger("api");

export const documentRepo = new PgDocumentRepository();
export const chunkRepo = new PgVectorChunkRepository();
export const conversationRepo = new PgConversationRepository(
  ConversationParams.create({
    retrievalLimit: config.rag.defaults.retrievalLimit,
    retrievalMinScore: config.rag.defaults.retrievalMinScore,
    rerankEnabled: config.rerank.enabled,
    rerankModel: config.rerank.defaults.model,
    rerankCandidateMultiplier: config.rerank.defaults.candidateMultiplier,
    llmModel: config.llm.defaults.model,
    llmTemperature: config.llm.defaults.temperature,
    llmMaxTokens: config.llm.defaults.maxTokens,
    responseGroundingStrategies: config.rag.responseGroundingStrategies,
    searchMode: config.rag.searchMode,
  }),
);
const embeddingAdapter = new VoyageEmbeddingAdapter();
const llmAdapter = new AnthropicLLMAdapter();
const fileParser = new MultiFileParser();
const appSettingsRepo = new PgAppSettingsRepository();
export const appSettingsService = new AppSettingsService(appSettingsRepo, {
  storageBackend: config.storage.defaults.backend,
  chunkingStrategy: config.rag.defaults.chunkingStrategy,
  chunkSize: config.rag.defaults.chunkSize,
  chunkOverlap: config.rag.defaults.chunkOverlap,
});
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
  config.rerank.defaults.candidateMultiplier,
  config.rag.searchMode,
);
const responseGrounder = new CheckResponseGrounding(
  llmAdapter,
  new Logger("CheckResponseGrounding"),
);
const citationResolver = new SourceCitationResolver(documentRepo);
const titleGenerator = new ConversationTitleGenerator(llmAdapter);
export const conversationService = new ConversationService(conversationRepo);
export const askQuestion = new AskQuestion(
  retrieveKnowledge,
  llmAdapter,
  conversationRepo,
  citationResolver,
  titleGenerator,
  new Logger("AskQuestion"),
  responseGrounder,
);
export const generateQuiz = new GenerateQuiz(chunkRepo, llmAdapter, new Logger("GenerateQuiz"));
export const summaryRepo = new PgDocumentSummaryRepository();
export const deleteDocument = new DeleteDocument(documentRepo, chunkRepo, fileStorage);
export const documentQueries = new DocumentQueries(
  documentRepo,
  chunkRepo,
  summaryRepo,
  fileStorage,
);
export const summarizeDocument = new SummarizeDocument(
  documentRepo,
  chunkRepo,
  summaryRepo,
  llmAdapter,
  new Logger("SummarizeDocument"),
);
export const checkStorageConsistency = new CheckStorageConsistency(documentRepo, fileStorage);
export const resetAll = new ResetAll(
  fileStorage,
  (patch) => appSettingsService.updateSettings(patch),
  chunkRepo,
  summaryRepo,
  conversationRepo,
  documentRepo,
  new Logger("ResetAll"),
);

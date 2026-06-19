import { AppSettingsService } from "./application/admin/AppSettingsService";
import { CheckStorageConsistency } from "./application/admin/CheckStorageConsistency";
import { ResetAll } from "./application/admin/ResetAll";
import { CreateDocument } from "./application/knowledgeBase/CreateDocument";
import { IngestDocument } from "./application/knowledgeBase/IngestDocument";
import { SummarizeDocument } from "./application/knowledgeBase/SummarizeDocument";
import { GenerateQuiz } from "./application/quiz/GenerateQuiz";
import { AskQuestion } from "./application/rag/AskQuestion";
import { ConversationTitleGenerator } from "./application/rag/ConversationTitleGenerator";
import { RetrieveKnowledge } from "./application/rag/RetrieveKnowledge";
import { CheckResponseGrounding } from "./application/rag/responseGrounding/CheckResponseGrounding";
import { SourceCitationResolver } from "./application/rag/SourceCitationResolver";
import config from "./config";
import { ConversationParams } from "./domain/entities/Conversation";
import { VoyageEmbeddingAdapter } from "./infrastructure/ai/embeddings/VoyageEmbeddingAdapter";
import { AnthropicLLMAdapter } from "./infrastructure/ai/llm/AnthropicLLMAdapter";
import { VoyageRerankAdapter } from "./infrastructure/ai/reranking/VoyageRerankAdapter";
import { Logger } from "./infrastructure/logger/Logger";
import { PgAppSettingsRepository } from "./infrastructure/persistence/db/PgAppSettingsRepository";
import { PgConversationRepository } from "./infrastructure/persistence/db/PgConversationRepository";
import { PgDocumentRepository } from "./infrastructure/persistence/db/PgDocumentRepository";
import { PgDocumentSummaryRepository } from "./infrastructure/persistence/db/PgDocumentSummaryRepository";
import { PgVectorChunkRepository } from "./infrastructure/persistence/db/PgVectorChunkRepository";
import { createStorageBackends } from "./infrastructure/storage/files/createFileStorage";
import { DynamicFileStorage } from "./infrastructure/storage/files/DynamicFileStorage";
import { MultiFileParser } from "./infrastructure/storage/parsers/MultiFileParser";

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
export const generateQuiz = new GenerateQuiz(chunkRepo, llmAdapter, new Logger("GenerateQuiz"));
export const summaryRepo = new PgDocumentSummaryRepository();
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

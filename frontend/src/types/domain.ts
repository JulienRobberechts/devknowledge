export type DocumentStatus = "pending" | "processing" | "ready" | "error";
export type SourceType = "pdf" | "markdown" | "text";
export type MessageRole = "user" | "assistant";

export interface Document {
  id: string;
  title: string;
  sourceType: SourceType;
  status: DocumentStatus;
  createdAt: string;
  filePath: string | null;
}

export interface SourceCitation {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  sourceType: SourceType;
  excerpt: string;
  score: number;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  sources: SourceCitation[];
  knowledgeCheck?: KnowledgeCheckResult[];
  createdAt: string;
}

export type KnowledgeCheckStrategy =
  | "faithfulness"
  | "counterfactual"
  | "citation_forcing";

export interface KnowledgeClaim {
  claim: string;
  status: "SUPPORTED" | "UNSUPPORTED";
  sourceExcerpt?: string;
  documentId?: string;
  documentTitle?: string;
}

export interface KnowledgeCheckResult {
  strategy: KnowledgeCheckStrategy;
  score: number;
  claims: KnowledgeClaim[];
  warning?: string;
  trainingAnswer?: string;
  similar?: boolean;
}

export interface ConversationParams {
  retrievalLimit: number;
  retrievalMinScore: number;
  rerankEnabled: boolean;
  rerankModel: string;
  rerankCandidateMultiplier: number;
  llmModel: string;
  llmTemperature: number;
  llmMaxTokens: number;
  knowledgeCheckStrategies: KnowledgeCheckStrategy[];
  searchMode: "vector" | "hybrid";
}

export interface Conversation {
  id: string;
  title: string;
  params: ConversationParams;
  messages: Message[];
  createdAt: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  params: ConversationParams;
  messageCount: number;
  createdAt: string;
}

export interface QuizQuestion {
  text: string;
  options: string[];
  correctIndex: number;
}

export interface DocumentSummary {
  id: string;
  documentId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConsistencyReport {
  ok: boolean;
  orphanFiles: string[];
  missingFiles: string[];
}

export interface ProviderOption {
  provider: string;
  model: string;
  label: string;
  available: boolean;
}

export interface StorageOption {
  provider: string;
  label: string;
  available: boolean;
}

export interface AppSettings {
  embedding: { provider: string; model: string; options: ProviderOption[] };
  storage: { provider: string; options: StorageOption[] };
}

export interface AppSettingsPatch {
  embedding?: { provider: string };
  storage?: { provider: string };
  chunking?: {
    strategy?: "recursive" | "sentence";
    chunkSize?: number;
    chunkOverlap?: number;
  };
}

export interface AppConfig {
  version: string;
  logLevel: string;
  storage: {
    backend: "local" | "r2";
  };
  rag: {
    chunkingStrategy: "recursive" | "sentence";
    chunkSize: number;
    chunkOverlap: number;
    retrievalLimit: number;
    retrievalMinScore: number;
    searchMode: "vector" | "hybrid";
    reranking: {
      enabled: boolean;
      model: string;
    };
  };
  llm: {
    provider: string;
    model: string;
    maxTokens: number;
    temperature: number;
  };
  embeddings: {
    provider: string;
    model: string;
  };
}

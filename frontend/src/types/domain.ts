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
  excerpt: string;
  score: number;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  sources: SourceCitation[];
  createdAt: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
}

export interface QuizQuestion {
  text: string;
  options: string[];
  correctIndex: number;
}

export interface AppConfig {
  logLevel: string;
  rag: {
    chunkingStrategy: string;
    chunkSize: number;
    chunkOverlap: number;
    retrievalLimit: number;
    retrievalMinScore: number;
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

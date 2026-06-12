export interface SourceCitation {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  sourceType: "pdf" | "markdown" | "text";
  excerpt: string;
  score: number;
}

export type MessageRole = "user" | "assistant";

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
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  sources: SourceCitation[];
  knowledgeCheck?: KnowledgeCheckResult[];
  createdAt: Date;
}

import { Message, KnowledgeCheckStrategy } from "./Message";

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
  createdAt: Date;
}

export interface ConversationSummary {
  id: string;
  title: string;
  params: ConversationParams;
  messageCount: number;
  createdAt: Date;
}

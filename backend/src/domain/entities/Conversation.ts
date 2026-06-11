import { Message } from "./Message";

export interface ConversationParams {
  retrievalLimit: number;
  retrievalMinScore: number;
  rerankEnabled: boolean;
  rerankCandidateMultiplier: number;
  llmModel: string;
  llmTemperature: number;
  llmMaxTokens: number;
}

export interface Conversation {
  id: string;
  title: string;
  params: ConversationParams;
  messages: Message[];
  createdAt: Date;
}

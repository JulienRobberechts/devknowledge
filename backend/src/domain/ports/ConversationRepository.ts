import { Conversation, ConversationSummary } from "../entities/Conversation";
import { Message } from "../entities/Message";

export interface ConversationRepository {
  save(conversation: Conversation): Promise<void>;
  findById(id: string): Promise<Conversation | null>;
  findAll(): Promise<ConversationSummary[]>;
  addMessage(conversationId: string, message: Message): Promise<void>;
  updateTitle(id: string, title: string): Promise<void>;
  delete(id: string): Promise<void>;
}

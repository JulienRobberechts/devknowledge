import type { Conversation, ConversationSummary } from "../../domain/entities/Conversation";
import type { Message } from "../../domain/entities/Message";

/** Persists and retrieves conversations and their messages. */
export interface IConversationRepository {
  /** Persists a conversation (create or update). */
  save(conversation: Conversation): Promise<void>;
  /** Retrieves a full conversation by id. */
  findById(id: string): Promise<Conversation | null>;
  /** Lists summaries of all conversations. */
  findAll(): Promise<ConversationSummary[]>;
  /** Appends a message to an existing conversation. */
  addMessage(conversationId: string, message: Message): Promise<void>;
  /** Updates the title of a conversation. */
  updateTitle(id: string, title: string): Promise<void>;
  /** Deletes a conversation. */
  delete(id: string): Promise<void>;
  /** Deletes all conversations and their messages. */
  deleteAll(): Promise<void>;
}

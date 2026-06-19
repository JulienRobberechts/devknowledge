import type { Conversation, ConversationSummary } from "../../src/domain/entities/Conversation";
import type { Message } from "../../src/domain/entities/Message";
import type { IConversationRepository } from "../../src/infra-ports/persistence/IConversationRepository";

export class InMemoryConversationRepository implements IConversationRepository {
  private conversations: Map<string, Conversation> = new Map();

  async save(conversation: Conversation): Promise<void> {
    this.conversations.set(conversation.id, {
      ...conversation,
      messages: [...conversation.messages],
    });
  }

  async findById(id: string): Promise<Conversation | null> {
    return this.conversations.get(id) ?? null;
  }

  async findAll(): Promise<ConversationSummary[]> {
    return Array.from(this.conversations.values()).map((c) => ({
      id: c.id,
      title: c.title,
      params: c.params,
      createdAt: c.createdAt,
      messageCount: c.messages.length,
    }));
  }

  async addMessage(conversationId: string, message: Message): Promise<void> {
    const conv = this.conversations.get(conversationId);
    if (conv) {
      this.conversations.set(conversationId, {
        ...conv,
        messages: [...conv.messages, message],
      });
    }
  }

  async updateTitle(id: string, title: string): Promise<void> {
    const conv = this.conversations.get(id);
    if (conv) this.conversations.set(id, { ...conv, title });
  }

  async delete(id: string): Promise<void> {
    this.conversations.delete(id);
  }

  async deleteAll(): Promise<void> {
    this.conversations.clear();
  }

  clear(): void {
    this.conversations.clear();
  }
}

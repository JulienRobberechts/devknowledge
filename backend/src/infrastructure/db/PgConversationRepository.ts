import type {
  Conversation,
  ConversationParams,
  ConversationSummary,
} from "../../domain/entities/Conversation";
import type {
  KnowledgeCheckResult,
  Message,
  MessageRole,
  SourceCitation,
} from "../../domain/entities/Message";
import type { IConversationRepository } from "../../domain/ports/IConversationRepository";
import pool from "./pool";

function toMessage(row: Record<string, unknown>): Message {
  return {
    id: row.id as string,
    conversationId: row.conversation_id as string,
    role: row.role as MessageRole,
    content: row.content as string,
    sources: row.sources as SourceCitation[],
    knowledgeCheck: row.knowledge_check as KnowledgeCheckResult[] | undefined,
    createdAt: new Date(row.created_at as string),
  };
}

async function fetchMessages(
  conversationIds: string[],
): Promise<Map<string, Message[]>> {
  if (conversationIds.length === 0) return new Map();
  const result = await pool.query(
    "SELECT * FROM messages WHERE conversation_id = ANY($1) ORDER BY created_at ASC",
    [conversationIds],
  );
  const map = new Map<string, Message[]>();
  for (const row of result.rows) {
    const convId = row.conversation_id as string;
    const msgs = map.get(convId) ?? [];
    msgs.push(toMessage(row));
    map.set(convId, msgs);
  }
  return map;
}

export class PgConversationRepository implements IConversationRepository {
  constructor(private readonly defaults: ConversationParams) {}

  private toParams(raw: unknown): ConversationParams {
    const p = (raw ?? {}) as Partial<ConversationParams>;
    return {
      retrievalLimit: p.retrievalLimit ?? this.defaults.retrievalLimit,
      retrievalMinScore: p.retrievalMinScore ?? this.defaults.retrievalMinScore,
      rerankEnabled: p.rerankEnabled ?? this.defaults.rerankEnabled,
      rerankModel: p.rerankModel ?? this.defaults.rerankModel,
      rerankCandidateMultiplier:
        p.rerankCandidateMultiplier ?? this.defaults.rerankCandidateMultiplier,
      llmModel: p.llmModel ?? this.defaults.llmModel,
      llmTemperature: p.llmTemperature ?? this.defaults.llmTemperature,
      llmMaxTokens: p.llmMaxTokens ?? this.defaults.llmMaxTokens,
      knowledgeCheckStrategies: Array.isArray(p.knowledgeCheckStrategies)
        ? p.knowledgeCheckStrategies
        : this.defaults.knowledgeCheckStrategies,
      searchMode: p.searchMode ?? this.defaults.searchMode,
    };
  }

  async save(conversation: Conversation): Promise<void> {
    await pool.query(
      `INSERT INTO conversations (id, title, params, created_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, params = EXCLUDED.params`,
      [
        conversation.id,
        conversation.title,
        JSON.stringify(conversation.params),
        conversation.createdAt,
      ],
    );
  }

  async findById(id: string): Promise<Conversation | null> {
    const result = await pool.query(
      "SELECT * FROM conversations WHERE id = $1",
      [id],
    );
    if (!result.rows[0]) return null;
    const row = result.rows[0];
    const messagesByConv = await fetchMessages([id]);
    return {
      id: row.id as string,
      title: row.title as string,
      params: this.toParams(row.params),
      createdAt: new Date(row.created_at as string),
      messages: messagesByConv.get(id) ?? [],
    };
  }

  async findAll(): Promise<ConversationSummary[]> {
    const result = await pool.query(
      `SELECT c.*, COUNT(m.id)::int AS message_count
       FROM conversations c
       LEFT JOIN messages m ON m.conversation_id = c.id
       GROUP BY c.id
       ORDER BY c.created_at DESC`,
    );
    return result.rows.map((row) => ({
      id: row.id as string,
      title: row.title as string,
      params: this.toParams(row.params),
      createdAt: new Date(row.created_at as string),
      messageCount: row.message_count as number,
    }));
  }

  async addMessage(conversationId: string, message: Message): Promise<void> {
    await pool.query(
      `INSERT INTO messages (id, conversation_id, role, content, sources, knowledge_check, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        message.id,
        conversationId,
        message.role,
        message.content,
        JSON.stringify(message.sources),
        message.knowledgeCheck ? JSON.stringify(message.knowledgeCheck) : null,
        message.createdAt,
      ],
    );
  }

  async updateTitle(id: string, title: string): Promise<void> {
    await pool.query("UPDATE conversations SET title = $1 WHERE id = $2", [
      title,
      id,
    ]);
  }

  async delete(id: string): Promise<void> {
    await pool.query("DELETE FROM conversations WHERE id = $1", [id]);
  }

  async deleteAll(): Promise<void> {
    await pool.query("TRUNCATE TABLE conversations CASCADE");
  }
}

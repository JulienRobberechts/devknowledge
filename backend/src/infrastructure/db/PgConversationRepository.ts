import {
  Conversation,
  ConversationParams,
} from "../../domain/entities/Conversation";
import {
  Message,
  MessageRole,
  SourceCitation,
} from "../../domain/entities/Message";
import { ConversationRepository } from "../../domain/ports/ConversationRepository";
import config from "../../config";
import pool from "./pool";

function toParams(raw: unknown): ConversationParams {
  const p = (raw ?? {}) as Partial<ConversationParams>;
  return {
    retrievalLimit: p.retrievalLimit ?? config.rag.retrievalLimit,
    retrievalMinScore: p.retrievalMinScore ?? config.rag.retrievalMinScore,
    rerankEnabled: p.rerankEnabled ?? config.rerank.enabled,
    rerankCandidateMultiplier:
      p.rerankCandidateMultiplier ?? config.rerank.candidateMultiplier,
    llmModel: p.llmModel ?? config.llm.anthropic.model,
    llmTemperature: p.llmTemperature ?? config.llm.anthropic.temperature,
    llmMaxTokens: p.llmMaxTokens ?? config.llm.anthropic.maxTokens,
  };
}

function toMessage(row: Record<string, unknown>): Message {
  return {
    id: row.id as string,
    conversationId: row.conversation_id as string,
    role: row.role as MessageRole,
    content: row.content as string,
    sources: row.sources as SourceCitation[],
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

export class PgConversationRepository implements ConversationRepository {
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
      params: toParams(row.params),
      createdAt: new Date(row.created_at as string),
      messages: messagesByConv.get(id) ?? [],
    };
  }

  async findAll(): Promise<Conversation[]> {
    const result = await pool.query(
      "SELECT * FROM conversations ORDER BY created_at DESC",
    );
    if (result.rows.length === 0) return [];
    const ids = result.rows.map((r) => r.id as string);
    const messagesByConv = await fetchMessages(ids);
    return result.rows.map((row) => ({
      id: row.id as string,
      title: row.title as string,
      params: toParams(row.params),
      createdAt: new Date(row.created_at as string),
      messages: messagesByConv.get(row.id as string) ?? [],
    }));
  }

  async addMessage(conversationId: string, message: Message): Promise<void> {
    await pool.query(
      `INSERT INTO messages (id, conversation_id, role, content, sources, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        message.id,
        conversationId,
        message.role,
        message.content,
        JSON.stringify(message.sources),
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
}

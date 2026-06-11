import { randomUUID } from "crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { Conversation } from "../../src/domain/entities/Conversation";
import { Message } from "../../src/domain/entities/Message";
import { PgConversationRepository } from "../../src/infrastructure/db/PgConversationRepository";
import pool from "../../src/infrastructure/db/pool";

const repo = new PgConversationRepository();

const DEFAULT_PARAMS = {
  retrievalLimit: 8,
  retrievalMinScore: 0.75,
  rerankEnabled: false,
  rerankCandidateMultiplier: 3,
  llmModel: "claude-haiku-4-5-20251001",
  llmTemperature: 0.1,
  llmMaxTokens: 1024,
};

function makeConversation(overrides?: Partial<Conversation>): Conversation {
  return {
    id: randomUUID(),
    title: "Test Conversation",
    messages: [],
    params: DEFAULT_PARAMS,
    createdAt: new Date(),
    ...overrides,
  };
}

function makeMessage(
  conversationId: string,
  overrides?: Partial<Message>,
): Message {
  return {
    id: randomUUID(),
    conversationId,
    role: "user",
    content: "Hello",
    sources: [],
    createdAt: new Date(),
    ...overrides,
  };
}

describe("PgConversationRepository", () => {
  beforeEach(async () => {
    await pool.query("DELETE FROM messages");
    await pool.query("DELETE FROM chunks");
    await pool.query("DELETE FROM conversations");
    await pool.query("DELETE FROM documents");
  });

  it("saves and retrieves a conversation by id", async () => {
    const conv = makeConversation();
    await repo.save(conv);
    const found = await repo.findById(conv.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(conv.id);
    expect(found!.title).toBe(conv.title);
    expect(found!.messages).toHaveLength(0);
  });

  it("findById returns null for unknown id", async () => {
    expect(await repo.findById(randomUUID())).toBeNull();
  });

  it("findAll returns all conversations", async () => {
    await repo.save(makeConversation({ title: "Conv 1" }));
    await repo.save(makeConversation({ title: "Conv 2" }));
    const all = await repo.findAll();
    expect(all).toHaveLength(2);
  });

  it("addMessage persists a message on the conversation", async () => {
    const conv = makeConversation();
    await repo.save(conv);
    const msg = makeMessage(conv.id);
    await repo.addMessage(conv.id, msg);
    const found = await repo.findById(conv.id);
    expect(found!.messages).toHaveLength(1);
    expect(found!.messages[0].id).toBe(msg.id);
    expect(found!.messages[0].role).toBe("user");
    expect(found!.messages[0].content).toBe("Hello");
  });

  it("messages are returned in chronological order", async () => {
    const conv = makeConversation();
    await repo.save(conv);
    const msg1 = makeMessage(conv.id, {
      content: "First",
      createdAt: new Date("2024-01-01T10:00:00Z"),
    });
    const msg2 = makeMessage(conv.id, {
      role: "assistant",
      content: "Second",
      createdAt: new Date("2024-01-01T10:01:00Z"),
    });
    await repo.addMessage(conv.id, msg1);
    await repo.addMessage(conv.id, msg2);
    const found = await repo.findById(conv.id);
    expect(found!.messages[0].content).toBe("First");
    expect(found!.messages[1].content).toBe("Second");
  });

  it("findAll includes messages for each conversation", async () => {
    const conv = makeConversation();
    await repo.save(conv);
    await repo.addMessage(conv.id, makeMessage(conv.id));
    const all = await repo.findAll();
    expect(all[0].messages).toHaveLength(1);
  });

  it("delete removes the conversation and cascades to messages", async () => {
    const conv = makeConversation();
    await repo.save(conv);
    await repo.addMessage(conv.id, makeMessage(conv.id));
    await repo.delete(conv.id);
    expect(await repo.findById(conv.id)).toBeNull();
    const msgs = await pool.query(
      "SELECT id FROM messages WHERE conversation_id = $1",
      [conv.id],
    );
    expect(msgs.rows).toHaveLength(0);
  });
});

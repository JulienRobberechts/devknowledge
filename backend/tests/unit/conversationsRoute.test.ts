import { describe, it, expect, vi, beforeEach } from "vitest";
import { randomUUID } from "crypto";
import express from "express";
import request from "supertest";
import { conversationsRouter } from "../../src/api/routes/conversations";
import { InMemoryConversationRepository } from "../fakes/InMemoryConversationRepository";
import { Conversation } from "../../src/domain/entities/Conversation";
import { Message } from "../../src/domain/entities/Message";

function makeConversation(overrides?: Partial<Conversation>): Conversation {
  return {
    id: randomUUID(),
    title: "Test",
    messages: [],
    createdAt: new Date(),
    ...overrides,
  };
}

function makeAssistantMessage(conversationId: string): Message {
  return {
    id: randomUUID(),
    conversationId,
    role: "assistant",
    content: "Answer",
    sources: [],
    createdAt: new Date(),
  };
}

function makeApp(
  convRepo: InMemoryConversationRepository,
  askQuestion = {
    execute: vi
      .fn()
      .mockImplementation(async (convId: string) =>
        makeAssistantMessage(convId),
      ),
  },
) {
  const app = express();
  app.use(express.json());
  app.use(
    "/conversations",
    conversationsRouter(convRepo, askQuestion as never),
  );
  return app;
}

describe("conversationsRouter", () => {
  let convRepo: InMemoryConversationRepository;

  beforeEach(() => {
    convRepo = new InMemoryConversationRepository();
  });

  it("POST /conversations creates a conversation", async () => {
    const res = await request(makeApp(convRepo))
      .post("/conversations")
      .send({ title: "My chat" });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe("My chat");
    expect(typeof res.body.id).toBe("string");
  });

  it("POST /conversations uses default title when omitted", async () => {
    const res = await request(makeApp(convRepo))
      .post("/conversations")
      .send({});
    expect(res.status).toBe(201);
    expect(res.body.title).toBe("New conversation");
  });

  it("GET /conversations returns all conversations", async () => {
    await convRepo.save(makeConversation());
    await convRepo.save(makeConversation());
    const res = await request(makeApp(convRepo)).get("/conversations");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  it("GET /conversations/:id returns a conversation", async () => {
    const conv = makeConversation();
    await convRepo.save(conv);
    const res = await request(makeApp(convRepo)).get(
      `/conversations/${conv.id}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(conv.id);
  });

  it("GET /conversations/:id returns 404 for unknown id", async () => {
    const res = await request(makeApp(convRepo)).get("/conversations/unknown");
    expect(res.status).toBe(404);
  });

  it("DELETE /conversations/:id removes conversation", async () => {
    const conv = makeConversation();
    await convRepo.save(conv);
    const res = await request(makeApp(convRepo)).delete(
      `/conversations/${conv.id}`,
    );
    expect(res.status).toBe(204);
  });

  it("DELETE /conversations/:id returns 404 for unknown id", async () => {
    const res = await request(makeApp(convRepo)).delete(
      "/conversations/unknown",
    );
    expect(res.status).toBe(404);
  });

  it("POST /conversations/:id/messages streams SSE response", async () => {
    const conv = makeConversation();
    await convRepo.save(conv);
    const res = await request(makeApp(convRepo))
      .post(`/conversations/${conv.id}/messages`)
      .send({ content: "Hello" });
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/event-stream");
  });

  it("POST /conversations/:id/messages returns 400 for missing content", async () => {
    const conv = makeConversation();
    await convRepo.save(conv);
    const res = await request(makeApp(convRepo))
      .post(`/conversations/${conv.id}/messages`)
      .send({});
    expect(res.status).toBe(400);
  });

  it("POST /conversations/:id/messages returns 404 for unknown conversation", async () => {
    const res = await request(makeApp(convRepo))
      .post("/conversations/unknown/messages")
      .send({ content: "Hello" });
    expect(res.status).toBe(404);
  });
});

import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import app from "../../src/api/app";
import pool from "../../src/infra/persistence/db/pool";

beforeAll(() => {
  const voyageKey = process.env.VOYAGE_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_APP_API_KEY;
  if (!voyageKey || voyageKey === "test-key") throw new Error("Missing env var: VOYAGE_API_KEY");
  if (!anthropicKey || anthropicKey === "test-key")
    throw new Error("Missing env var: ANTHROPIC_APP_API_KEY");
});

beforeEach(async () => {
  await pool.query("DELETE FROM messages");
  await pool.query("DELETE FROM conversations");
});

const KEY = "test-password";

/** Parses the conversationId from the SSE "created" event in the response body. */
function extractConversationId(sseBody: string): string {
  const block = sseBody.split("\n\n").find((chunk) => chunk.includes("event: created"));
  if (!block) throw new Error("SSE 'created' event not found in response");
  const dataLine = block.split("\n").find((l) => l.startsWith("data: "));
  if (!dataLine) throw new Error("No data line in 'created' event");
  return (JSON.parse(dataLine.replace("data: ", "")) as { conversationId: string }).conversationId;
}

describe("Conversation list/get/delete — e2e-api", () => {
  it("returns an empty list when no conversations exist", async () => {
    const res = await request(app).get("/api/conversations").set("x-api-key", KEY);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns 404 when patching a non-existent conversation", async () => {
    const res = await request(app)
      .patch("/api/conversations/00000000-0000-0000-0000-000000000000")
      .set("x-api-key", KEY)
      .send({ title: "Ghost" });

    expect(res.status).toBe(404);
  });
});

describe("Conversation lifecycle — e2e-api", () => {
  it("creates a conversation via SSE, lists it, updates its title, then deletes it", async () => {
    // Create — SSE stream, real Voyage embedding + Anthropic LLM
    const createRes = await request(app)
      .post("/api/conversations")
      .set("x-api-key", KEY)
      .buffer(true)
      .send({ firstMessage: "What is a RAG pipeline?" });

    expect(createRes.status).toBe(200);
    expect(createRes.headers["content-type"]).toContain("text/event-stream");

    const conversationId = extractConversationId(createRes.text);

    // List
    const listRes = await request(app).get("/api/conversations").set("x-api-key", KEY);

    expect(listRes.status).toBe(200);
    expect(listRes.body.some((c: { id: string }) => c.id === conversationId)).toBe(true);

    // Get by id — must contain user + assistant messages
    const getRes = await request(app)
      .get(`/api/conversations/${conversationId}`)
      .set("x-api-key", KEY);

    expect(getRes.status).toBe(200);
    expect(getRes.body.messages).toHaveLength(2);
    expect(getRes.body.messages[0].role).toBe("user");
    expect(getRes.body.messages[1].role).toBe("assistant");

    // Update title
    const patchRes = await request(app)
      .patch(`/api/conversations/${conversationId}`)
      .set("x-api-key", KEY)
      .send({ title: "RAG pipeline discussion" });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.title).toBe("RAG pipeline discussion");

    // Delete
    await request(app)
      .delete(`/api/conversations/${conversationId}`)
      .set("x-api-key", KEY)
      .expect(204);

    // Verify gone
    await request(app)
      .get(`/api/conversations/${conversationId}`)
      .set("x-api-key", KEY)
      .expect(404);
  });
});

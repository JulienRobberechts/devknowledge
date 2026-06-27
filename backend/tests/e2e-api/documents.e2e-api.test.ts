import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../../src/api/app";
import pool from "../../src/infra/persistence/db/pool";

beforeEach(async () => {
  await pool.query("DELETE FROM document_summaries");
  await pool.query("DELETE FROM chunks");
  await pool.query("DELETE FROM documents");
});

const KEY = "test-password";

describe("Document lifecycle — e2e-api", () => {
  it("uploads a file, lists it, fetches it by id, then deletes it", async () => {
    // Upload
    const uploadRes = await request(app)
      .post("/api/documents")
      .set("x-api-key", KEY)
      .attach("file", Buffer.from("# Knowledge Base\n\nThis is a test document."), "test.md");

    expect(uploadRes.status).toBe(202);
    expect(uploadRes.body.id).toBeDefined();
    expect(uploadRes.body.status).toBe("pending");
    const { id } = uploadRes.body;

    // List — document appears
    const listRes = await request(app).get("/api/documents").set("x-api-key", KEY);

    expect(listRes.status).toBe(200);
    expect(listRes.body.some((d: { id: string }) => d.id === id)).toBe(true);

    // Get by id — returns full document with correct source type
    const getRes = await request(app).get(`/api/documents/${id}`).set("x-api-key", KEY);

    expect(getRes.status).toBe(200);
    expect(getRes.body.id).toBe(id);
    expect(getRes.body.sourceType).toBe("markdown");

    // Delete
    const delRes = await request(app).delete(`/api/documents/${id}`).set("x-api-key", KEY);

    expect(delRes.status).toBe(204);

    // Get after delete — 404
    const missingRes = await request(app).get(`/api/documents/${id}`).set("x-api-key", KEY);

    expect(missingRes.status).toBe(404);
  });

  it("returns 404 when fetching a non-existent document", async () => {
    const res = await request(app)
      .get("/api/documents/00000000-0000-0000-0000-000000000000")
      .set("x-api-key", KEY);

    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });

  it("returns 401 without an API key", async () => {
    const res = await request(app).get("/api/documents");

    expect(res.status).toBe(401);
  });
});

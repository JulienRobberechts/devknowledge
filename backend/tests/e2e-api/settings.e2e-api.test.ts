import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import app from "../../src/api/app";
import pool from "../../src/infra/persistence/db/pool";

beforeEach(async () => {
  await pool.query("DELETE FROM app_settings");
});

const KEY = "test-password";

describe("App settings persistence — e2e-api", () => {
  it("reads default chunking config, updates it, and verifies it persisted in the DB", async () => {
    const cfg1 = await request(app).get("/api/config").set("x-api-key", KEY);

    expect(cfg1.status).toBe(200);
    const originalChunkSize = cfg1.body.rag.chunkSize as number;

    const newChunkSize = originalChunkSize === 512 ? 256 : 512;

    const putRes = await request(app)
      .put("/api/admin/settings")
      .set("x-api-key", KEY)
      .send({ chunking: { chunkSize: newChunkSize } });

    expect(putRes.status).toBe(200);

    // Fresh GET must reflect the DB value, not the in-process default
    const cfg2 = await request(app).get("/api/config").set("x-api-key", KEY);

    expect(cfg2.status).toBe(200);
    expect(cfg2.body.rag.chunkSize).toBe(newChunkSize);
  });

  it("updates embedding provider and reflects it in GET /api/admin/settings", async () => {
    const putRes = await request(app)
      .put("/api/admin/settings")
      .set("x-api-key", KEY)
      .send({ embedding: { provider: "voyage" } });

    expect(putRes.status).toBe(200);
    expect(putRes.body.embedding.provider).toBe("voyage");

    const getRes = await request(app).get("/api/admin/settings").set("x-api-key", KEY);

    expect(getRes.status).toBe(200);
    expect(getRes.body.embedding.provider).toBe("voyage");
  });

  it("rejects an invalid chunking payload with 400", async () => {
    const res = await request(app)
      .put("/api/admin/settings")
      .set("x-api-key", KEY)
      .send({ chunking: { chunkSize: 99999 } }); // exceeds max 2048

    expect(res.status).toBe(400);
  });
});

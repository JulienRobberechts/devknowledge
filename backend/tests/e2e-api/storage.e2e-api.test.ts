import request from "supertest";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import app from "../../src/api/app";
import pool from "../../src/infra/persistence/db/pool";

const KEY = "test-password";

// Minimal valid PDF — ensures sourceType="pdf" so getRawBuffer uses fileStorage.download()
const PDF_CONTENT = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n" +
    "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
    "3 0 obj<</Type/Page/MediaBox[0 0 612 792]>>endobj\n" +
    "xref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n" +
    "0000000058 00000 n \n0000000115 00000 n \n" +
    "trailer<</Size 4/Root 1 0 R>>\nstartxref\n195\n%%EOF",
);

beforeAll(() => {
  const required = ["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"];
  for (const varName of required) {
    if (!process.env[varName]) throw new Error(`Missing env var: ${varName}`);
  }
});

beforeEach(async () => {
  await pool.query("DELETE FROM document_summaries");
  await pool.query("DELETE FROM chunks");
  await pool.query("DELETE FROM documents");
});

describe("R2 storage round-trip — e2e-api", () => {
  it("uploads a PDF to R2, downloads the raw file, then deletes it", async () => {
    // Upload → fileStorage.upload() on R2
    const uploadRes = await request(app)
      .post("/api/documents")
      .set("x-api-key", KEY)
      .attach("file", PDF_CONTENT, "test.pdf");

    expect(uploadRes.status).toBe(202);
    const { id } = uploadRes.body as { id: string };

    // Download raw file → fileStorage.download() on R2
    const rawRes = await request(app).get(`/api/documents/${id}/raw`).set("x-api-key", KEY);

    expect(rawRes.status).toBe(200);
    expect(rawRes.headers["content-type"]).toContain("application/pdf");
    expect(Number(rawRes.headers["content-length"])).toBe(PDF_CONTENT.length);

    // Delete → fileStorage.delete() on R2
    await request(app).delete(`/api/documents/${id}`).set("x-api-key", KEY).expect(204);
  });
});

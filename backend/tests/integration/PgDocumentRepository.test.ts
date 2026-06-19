import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import type { Document } from "../../src/domain/entities/Document";
import { PgDocumentRepository } from "../../src/infra/persistence/db/PgDocumentRepository";
import pool from "../../src/infra/persistence/db/pool";

const repo = new PgDocumentRepository();

function makeDocument(overrides?: Partial<Document>): Document {
  return {
    id: randomUUID(),
    title: "Test Document",
    sourceType: "text",
    status: "pending",
    filePath: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("PgDocumentRepository", () => {
  beforeEach(async () => {
    await pool.query("DELETE FROM messages");
    await pool.query("DELETE FROM chunks");
    await pool.query("DELETE FROM conversations");
    await pool.query("DELETE FROM documents");
  });

  it("saves and retrieves a document by id", async () => {
    const doc = makeDocument();
    await repo.save(doc);
    const found = await repo.findById(doc.id);
    expect(found).not.toBeNull();
    expect(found?.id).toBe(doc.id);
    expect(found?.title).toBe(doc.title);
    expect(found?.status).toBe("pending");
    expect(found?.sourceType).toBe("text");
    expect(found?.filePath).toBeNull();
  });

  it("findById returns null for unknown id", async () => {
    const found = await repo.findById(randomUUID());
    expect(found).toBeNull();
  });

  it("findAll returns all saved documents", async () => {
    await repo.save(makeDocument({ title: "Doc 1" }));
    await repo.save(makeDocument({ title: "Doc 2" }));
    const all = await repo.findAll();
    expect(all).toHaveLength(2);
  });

  it("save upserts an existing document", async () => {
    const doc = makeDocument();
    await repo.save(doc);
    await repo.save({ ...doc, title: "Updated Title" });
    const found = await repo.findById(doc.id);
    expect(found?.title).toBe("Updated Title");
  });

  it("updateStatus changes document status", async () => {
    const doc = makeDocument();
    await repo.save(doc);
    await repo.updateStatus(doc.id, "ready");
    const found = await repo.findById(doc.id);
    expect(found?.status).toBe("ready");
  });

  it("delete removes the document", async () => {
    const doc = makeDocument();
    await repo.save(doc);
    await repo.delete(doc.id);
    expect(await repo.findById(doc.id)).toBeNull();
  });

  it("deleting a document cascades to its chunks", async () => {
    const doc = makeDocument();
    await repo.save(doc);
    await pool.query(
      "INSERT INTO chunks (id, document_id, content, embedding, metadata) VALUES ($1, $2, $3, $4::vector, $5)",
      [
        randomUUID(),
        doc.id,
        "chunk content",
        JSON.stringify(Array(1024).fill(0.1)),
        JSON.stringify({ position: 0, startChar: 0, endChar: 12 }),
      ],
    );
    const before = await pool.query("SELECT id FROM chunks WHERE document_id = $1", [doc.id]);
    expect(before.rows).toHaveLength(1);

    await repo.delete(doc.id);

    const after = await pool.query("SELECT id FROM chunks WHERE document_id = $1", [doc.id]);
    expect(after.rows).toHaveLength(0);
  });
});

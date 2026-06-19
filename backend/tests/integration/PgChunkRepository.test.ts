import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { type Chunk, ChunkMetadata } from "../../src/domain/entities/Chunk";
import type { Document } from "../../src/domain/entities/Document";
import { PgDocumentRepository } from "../../src/infrastructure/persistence/db/PgDocumentRepository";
import { PgVectorChunkRepository } from "../../src/infrastructure/persistence/db/PgVectorChunkRepository";
import pool from "../../src/infrastructure/persistence/db/pool";

const chunkRepo = new PgVectorChunkRepository();
const docRepo = new PgDocumentRepository();

function makeDoc(): Document {
  return {
    id: randomUUID(),
    title: "Test Doc",
    sourceType: "text",
    status: "pending",
    filePath: null,
    createdAt: new Date(),
  };
}

function makeChunk(documentId: string, embedding: number[], overrides?: Partial<Chunk>): Chunk {
  return {
    id: randomUUID(),
    documentId,
    content: "test content",
    embedding,
    metadata: ChunkMetadata.create(0, 0, 12),
    ...overrides,
  };
}

describe("PgVectorChunkRepository", () => {
  let documentId: string;

  beforeEach(async () => {
    await pool.query("DELETE FROM messages");
    await pool.query("DELETE FROM chunks");
    await pool.query("DELETE FROM conversations");
    await pool.query("DELETE FROM documents");
    const doc = makeDoc();
    await docRepo.save(doc);
    documentId = doc.id;
  });

  it("saves a chunk and finds it via search", async () => {
    const embedding = Array(1024).fill(0.1);
    const chunk = makeChunk(documentId, embedding);
    await chunkRepo.save(chunk);
    const results = await chunkRepo.searchByVector(embedding, 10, 0.0);
    expect(results).toHaveLength(1);
    expect(results[0].chunk.id).toBe(chunk.id);
  });

  it("search returns chunks sorted by cosine similarity descending", async () => {
    const queryVector = Array(1024).fill(0);
    queryVector[0] = 1.0;

    const emb1 = Array(1024).fill(0);
    emb1[0] = 1.0;

    const emb2 = Array(1024).fill(0);
    emb2[0] = 0.6;
    emb2[1] = 0.8;

    const emb3 = Array(1024).fill(0);
    emb3[1] = 1.0;

    const chunk1 = makeChunk(documentId, emb1, { content: "most similar" });
    const chunk2 = makeChunk(documentId, emb2, {
      content: "partially similar",
    });
    const chunk3 = makeChunk(documentId, emb3, { content: "dissimilar" });

    await chunkRepo.saveMany([chunk1, chunk2, chunk3]);

    const results = await chunkRepo.searchByVector(queryVector, 10, 0.0);
    expect(results).toHaveLength(3);
    expect(results[0].chunk.id).toBe(chunk1.id);
    expect(results[0].score).toBeGreaterThan(results[1].score);
    expect(results[1].score).toBeGreaterThan(results[2].score);
  });

  it("search filters results below minScore", async () => {
    const queryVector = Array(1024).fill(0);
    queryVector[0] = 1.0;

    const embHigh = Array(1024).fill(0);
    embHigh[0] = 1.0;

    const embLow = Array(1024).fill(0);
    embLow[1] = 1.0;

    await chunkRepo.saveMany([
      makeChunk(documentId, embHigh, { content: "high score" }),
      makeChunk(documentId, embLow, { content: "low score" }),
    ]);

    const results = await chunkRepo.searchByVector(queryVector, 10, 0.5);
    expect(results).toHaveLength(1);
    expect(results[0].chunk.content).toBe("high score");
  });

  it("search respects limit", async () => {
    const embedding = Array(1024).fill(0.1);
    await chunkRepo.saveMany([
      makeChunk(documentId, embedding),
      makeChunk(documentId, embedding),
      makeChunk(documentId, embedding),
    ]);
    const results = await chunkRepo.searchByVector(embedding, 2, 0.0);
    expect(results).toHaveLength(2);
  });

  it("deleteByDocumentId removes all chunks for the document", async () => {
    await chunkRepo.saveMany([
      makeChunk(documentId, Array(1024).fill(0.1)),
      makeChunk(documentId, Array(1024).fill(0.2)),
    ]);
    await chunkRepo.deleteByDocumentId(documentId);
    const results = await chunkRepo.searchByVector(Array(1024).fill(0.1), 10, 0.0);
    expect(results).toHaveLength(0);
  });
});

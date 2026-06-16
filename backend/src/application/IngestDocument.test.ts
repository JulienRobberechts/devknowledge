import { randomUUID } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Document } from "../domain/entities/Document";
import { IngestDocument } from "./IngestDocument";
import type { ChunkingConfig } from "./AppSettingsService";
import { InMemoryChunkRepository } from "../../tests/fakes/InMemoryChunkRepository";
import { InMemoryDocumentRepository } from "../../tests/fakes/InMemoryDocumentRepository";

function makeDocument(overrides?: Partial<Document>): Document {
  return {
    id: randomUUID(),
    title: "Test Doc",
    sourceType: "text",
    status: "pending",
    filePath: "test.txt",
    createdAt: new Date(),
    ...overrides,
  };
}

function makeFileStorage(content = Buffer.from("dummy")) {
  return {
    upload: vi.fn().mockResolvedValue("test.txt"),
    download: vi.fn().mockResolvedValue(content),
    delete: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue([]),
    deleteAll: vi.fn().mockResolvedValue(undefined),
  };
}

function makeFileParser(text = "word1 word2 word3 word4 word5") {
  return {
    parse: vi
      .fn()
      .mockResolvedValue({ text, metadata: { fileName: "test.txt" } }),
  };
}

function makeEmbeddingAdapter() {
  return {
    embed: vi.fn(),
    embedMany: vi
      .fn()
      .mockImplementation(async (texts: string[]) =>
        texts.map(() => Array(1024).fill(0.1)),
      ),
  };
}

describe("IngestDocument", () => {
  let docRepo: InMemoryDocumentRepository;
  let chunkRepo: InMemoryChunkRepository;
  let embeddingAdapter: ReturnType<typeof makeEmbeddingAdapter>;
  let fileStorage: ReturnType<typeof makeFileStorage>;
  let fileParser: ReturnType<typeof makeFileParser>;
  beforeEach(() => {
    docRepo = new InMemoryDocumentRepository();
    chunkRepo = new InMemoryChunkRepository();
    embeddingAdapter = makeEmbeddingAdapter();
    fileStorage = makeFileStorage();
    fileParser = makeFileParser();
  });

  function makeIngest(config?: Partial<ChunkingConfig>) {
    return new IngestDocument(
      docRepo,
      chunkRepo,
      embeddingAdapter,
      fileStorage,
      fileParser,
      async () => ({
        strategy: config?.strategy ?? "recursive",
        chunkSize: config?.chunkSize ?? 512,
        chunkOverlap: config?.chunkOverlap ?? 128,
      }),
    );
  }

  it("should download the file from storage then parse it", async () => {
    const doc = makeDocument({ filePath: "test.txt" });
    await docRepo.save(doc);
    await makeIngest().execute(doc.id);
    expect(fileStorage.download).toHaveBeenCalledWith("test.txt");
    expect(fileParser.parse).toHaveBeenCalledOnce();
  });

  it("should split content into chunks using ChunkingStrategy", async () => {
    const text = Array(10)
      .fill("word")
      .map((w, i) => `${w}${i}`)
      .join(" ");
    fileParser = makeFileParser(text);
    const doc = makeDocument();
    await docRepo.save(doc);
    await makeIngest({ chunkSize: 3, chunkOverlap: 0 }).execute(doc.id);
    const results = await chunkRepo.searchByVector(
      Array(1024).fill(0.1),
      100,
      0,
    );
    expect(results.length).toBeGreaterThan(1);
  });

  it("should call embedding adapter for each chunk in batches of 20", async () => {
    const text = Array(25)
      .fill("word")
      .map((w, i) => `${w}${i}`)
      .join(" ");
    fileParser = makeFileParser(text);
    const doc = makeDocument();
    await docRepo.save(doc);
    await makeIngest({ chunkSize: 1, chunkOverlap: 0 }).execute(doc.id);
    expect(embeddingAdapter.embedMany).toHaveBeenCalledTimes(2);
    expect(embeddingAdapter.embedMany.mock.calls[0][0]).toHaveLength(20);
    expect(embeddingAdapter.embedMany.mock.calls[1][0]).toHaveLength(5);
  });

  it("should save all chunks to the chunk repository", async () => {
    const doc = makeDocument();
    await docRepo.save(doc);
    await makeIngest().execute(doc.id);
    const results = await chunkRepo.searchByVector(
      Array(1024).fill(0.1),
      100,
      0,
    );
    expect(results.length).toBeGreaterThan(0);
  });

  it('should mark document status as "ready" after successful ingestion', async () => {
    const doc = makeDocument();
    await docRepo.save(doc);
    await makeIngest().execute(doc.id);
    const updated = await docRepo.findById(doc.id);
    expect(updated!.status).toBe("ready");
  });

  it('should mark document status as "error" if embedding adapter throws', async () => {
    const errorAdapter = {
      embed: vi.fn(),
      embedMany: vi.fn().mockRejectedValue(new Error("API error")),
    };
    const doc = makeDocument();
    await docRepo.save(doc);
    const ingest = new IngestDocument(
      docRepo,
      chunkRepo,
      errorAdapter,
      fileStorage,
      fileParser,
      async () => ({
        strategy: "recursive",
        chunkSize: 512,
        chunkOverlap: 128,
      }),
    );
    await ingest.execute(doc.id);
    const updated = await docRepo.findById(doc.id);
    expect(updated!.status).toBe("error");
  });

  it('should mark document status as "error" if storage download fails', async () => {
    fileStorage.download.mockRejectedValue(new Error("Storage error"));
    const doc = makeDocument();
    await docRepo.save(doc);
    await makeIngest().execute(doc.id);
    const updated = await docRepo.findById(doc.id);
    expect(updated!.status).toBe("error");
  });

  it("should delete existing chunks before reingest (idempotency)", async () => {
    const doc = makeDocument();
    await docRepo.save(doc);
    await makeIngest().execute(doc.id);
    const firstCount = (
      await chunkRepo.searchByVector(Array(1024).fill(0.1), 100, 0)
    ).length;

    await docRepo.updateStatus(doc.id, "pending");
    await makeIngest().execute(doc.id);
    const secondCount = (
      await chunkRepo.searchByVector(Array(1024).fill(0.1), 100, 0)
    ).length;
    expect(secondCount).toBe(firstCount);
  });
});

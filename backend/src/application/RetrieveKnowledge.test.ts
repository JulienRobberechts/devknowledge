import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryChunkRepository } from "../../tests/fakes/InMemoryChunkRepository";
import { ChunkMetadata, type Chunk } from "../domain/entities/Chunk";
import { nullLogger } from "../../tests/fakes/NullLogger";
import { RetrieveKnowledge } from "./RetrieveKnowledge";

function makeChunk(embedding: number[], overrides?: Partial<Chunk>): Chunk {
  return {
    id: randomUUID(),
    documentId: randomUUID(),
    content: "test content",
    embedding,
    metadata: ChunkMetadata.create(0, 0, 12),
    ...overrides,
  };
}

function unitVec(dim: number, hotIndex: number): number[] {
  return Array.from({ length: dim }, (_, i) => (i === hotIndex ? 1 : 0));
}

describe("RetrieveKnowledge", () => {
  let chunkRepo: InMemoryChunkRepository;

  beforeEach(() => {
    chunkRepo = new InMemoryChunkRepository();
  });

  it("should embed the query using the embedding adapter", async () => {
    const embed = vi.fn().mockResolvedValue(Array(1024).fill(0.1));
    const search = new RetrieveKnowledge(
      chunkRepo,
      {
        embed,
        embedMany: vi.fn(),
      },
      nullLogger,
    );
    await search.execute("my query");
    expect(embed).toHaveBeenCalledWith("my query", "query");
  });

  it("should return chunks sorted by score descending", async () => {
    const queryVec = unitVec(1024, 0);
    const chunk1 = makeChunk(unitVec(1024, 0), { content: "best match" });
    const chunk2 = makeChunk(
      Array.from({ length: 1024 }, (_, i) =>
        i === 0 ? 0.6 : i === 1 ? 0.8 : 0,
      ),
      { content: "partial match" },
    );
    const chunk3 = makeChunk(unitVec(1024, 1), { content: "poor match" });
    await chunkRepo.saveMany([chunk1, chunk2, chunk3]);

    const search = new RetrieveKnowledge(
      chunkRepo,
      {
        embed: vi.fn().mockResolvedValue(queryVec),
        embedMany: vi.fn(),
      },
      nullLogger,
    );
    const results = await search.execute("query", 10, 0);
    expect(results[0].chunk.id).toBe(chunk1.id);
    expect(results[0].score).toBeGreaterThan(results[1].score);
    expect(results[1].score).toBeGreaterThan(results[2].score);
  });

  it("should filter out chunks below minimum score threshold", async () => {
    const queryVec = unitVec(1024, 0);
    await chunkRepo.saveMany([
      makeChunk(unitVec(1024, 0), { content: "high score" }),
      makeChunk(unitVec(1024, 1), { content: "low score" }),
    ]);

    const search = new RetrieveKnowledge(
      chunkRepo,
      {
        embed: vi.fn().mockResolvedValue(queryVec),
        embedMany: vi.fn(),
      },
      nullLogger,
    );
    const results = await search.execute("query", 10, 0.5);
    expect(results).toHaveLength(1);
    expect(results[0].chunk.content).toBe("high score");
  });

  it("should return empty array when no chunks match the threshold", async () => {
    const search = new RetrieveKnowledge(
      chunkRepo,
      {
        embed: vi.fn().mockResolvedValue(Array(1024).fill(0.1)),
        embedMany: vi.fn(),
      },
      nullLogger,
    );
    const results = await search.execute("query", 10, 0.5);
    expect(results).toHaveLength(0);
  });

  it("should respect the limit parameter", async () => {
    const queryVec = unitVec(1024, 0);
    await chunkRepo.saveMany([
      makeChunk(unitVec(1024, 0)),
      makeChunk(unitVec(1024, 0)),
      makeChunk(unitVec(1024, 0)),
    ]);

    const search = new RetrieveKnowledge(
      chunkRepo,
      {
        embed: vi.fn().mockResolvedValue(queryVec),
        embedMany: vi.fn(),
      },
      nullLogger,
    );
    const results = await search.execute("query", 2, 0);
    expect(results).toHaveLength(2);
  });

  describe("hybrid mode", () => {
    it("should call searchHybrid when searchMode is hybrid", async () => {
      const queryVec = unitVec(1024, 0);
      const searchHybrid = vi.spyOn(chunkRepo, "searchHybrid");
      const search = new RetrieveKnowledge(
        chunkRepo,
        { embed: vi.fn().mockResolvedValue(queryVec), embedMany: vi.fn() },
        nullLogger,
        null,
        3,
        "hybrid",
      );
      await search.execute("my query", 5, 0);
      expect(searchHybrid).toHaveBeenCalledWith("my query", queryVec, 5, 0);
    });

    it("should call search (vector only) when searchMode is vector", async () => {
      const queryVec = unitVec(1024, 0);
      const search = vi.spyOn(chunkRepo, "searchByVector");
      const retrieveKnowledge = new RetrieveKnowledge(
        chunkRepo,
        { embed: vi.fn().mockResolvedValue(queryVec), embedMany: vi.fn() },
        nullLogger,
        null,
        3,
        "vector",
      );
      await retrieveKnowledge.execute("my query", 5, 0);
      expect(search).toHaveBeenCalledWith(queryVec, 5, 0);
    });

    it("should return hybrid results passed to caller", async () => {
      const queryVec = unitVec(1024, 0);
      const chunk = makeChunk(unitVec(1024, 0), {
        content: "exact acronym RAG",
      });
      await chunkRepo.save(chunk);

      const search = new RetrieveKnowledge(
        chunkRepo,
        { embed: vi.fn().mockResolvedValue(queryVec), embedMany: vi.fn() },
        nullLogger,
        null,
        3,
        "hybrid",
      );
      const results = await search.execute("RAG", 5, 0);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].chunk.id).toBe(chunk.id);
    });
  });

  describe("reranking", () => {
    function makeReranker(order: number[]) {
      return { rerank: vi.fn().mockResolvedValue(order) };
    }

    it("applique l'ordre du reranker sur les candidats", async () => {
      const queryVec = unitVec(1024, 0);
      const chunkA = makeChunk(unitVec(1024, 0), { content: "A" });
      const chunkB = makeChunk(unitVec(1024, 0), { content: "B" });
      const chunkC = makeChunk(unitVec(1024, 0), { content: "C" });
      await chunkRepo.saveMany([chunkA, chunkB, chunkC]);

      // le reranker inverse l'ordre : candidat[2] devient le meilleur
      const reranker = makeReranker([2, 1, 0]);
      const search = new RetrieveKnowledge(
        chunkRepo,
        { embed: vi.fn().mockResolvedValue(queryVec), embedMany: vi.fn() },
        nullLogger,
        reranker,
        3,
        "vector",
      );
      const results = await search.execute("query", 3, 0);
      expect(results[0].chunk.content).toBe(chunkC.content);
    });

    it("utilise searchHybrid (pas searchByVector) quand mode=hybrid avec reranking", async () => {
      const queryVec = unitVec(1024, 0);
      const chunk = makeChunk(unitVec(1024, 0), { content: "RAG" });
      await chunkRepo.save(chunk);

      const searchHybrid = vi.spyOn(chunkRepo, "searchHybrid");
      const searchByVector = vi.spyOn(chunkRepo, "searchByVector");

      const reranker = makeReranker([0]);
      const search = new RetrieveKnowledge(
        chunkRepo,
        { embed: vi.fn().mockResolvedValue(queryVec), embedMany: vi.fn() },
        nullLogger,
        reranker,
        3,
        "hybrid",
      );
      await search.execute("RAG", 1, 0);

      expect(searchHybrid).toHaveBeenCalled();
      expect(searchByVector).not.toHaveBeenCalled();
    });

    it("fetches candidateLimit = limit × multiplier candidates before reranking", async () => {
      const queryVec = unitVec(1024, 0);
      for (let i = 0; i < 9; i++)
        await chunkRepo.save(makeChunk(unitVec(1024, 0)));

      const searchByVector = vi.spyOn(chunkRepo, "searchByVector");
      const reranker = makeReranker([0, 1, 2]);
      const search = new RetrieveKnowledge(
        chunkRepo,
        { embed: vi.fn().mockResolvedValue(queryVec), embedMany: vi.fn() },
        nullLogger,
        reranker,
        3, // multiplier
        "vector",
      );
      await search.execute("query", 3, 0); // limit=3, multiplier=3 → candidateLimit=9
      expect(searchByVector).toHaveBeenCalledWith(
        queryVec,
        9,
        expect.any(Number),
      );
    });

    it("logs a warning and returns raw candidates if the reranker throws an error", async () => {
      const queryVec = unitVec(1024, 0);
      const chunk = makeChunk(unitVec(1024, 0), {
        content: "fallback on error",
      });
      await chunkRepo.save(chunk);

      const reranker = {
        rerank: vi.fn().mockRejectedValue(new Error("API timeout")),
      };
      const warn = vi.fn();
      const search = new RetrieveKnowledge(
        chunkRepo,
        { embed: vi.fn().mockResolvedValue(queryVec), embedMany: vi.fn() },
        { info: vi.fn(), warn, error: vi.fn(), debug: vi.fn() },
        reranker,
        3,
        "vector",
      );
      const results = await search.execute("query", 1, 0);
      expect(results).toHaveLength(1);
      expect(results[0].chunk.id).toBe(chunk.id);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("Reranker failed"),
        expect.objectContaining({
          error: expect.stringContaining("API timeout"),
        }),
      );
    });

    it("retourne les candidats bruts si le reranker retourne null", async () => {
      const queryVec = unitVec(1024, 0);
      const chunk = makeChunk(unitVec(1024, 0), { content: "fallback" });
      await chunkRepo.save(chunk);

      const reranker = { rerank: vi.fn().mockResolvedValue(null) };
      const search = new RetrieveKnowledge(
        chunkRepo,
        { embed: vi.fn().mockResolvedValue(queryVec), embedMany: vi.fn() },
        nullLogger,
        reranker,
        3,
        "vector",
      );
      const results = await search.execute("query", 1, 0);
      expect(results).toHaveLength(1);
      expect(results[0].chunk.id).toBe(chunk.id);
    });
  });
});

import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, type Mock, vi } from "vitest";
import { nullLogger } from "../../../tests/fakes/NullLogger";
import type { IRetrieveKnowledge } from "../../app-ports/rag";
import { ChunkMetadata } from "../../domain/entities";
import { createErrorHandler } from "../middleware/errorHandler";
import { searchRouter } from "./search";

function makeChunkSearchResult() {
  return {
    chunk: {
      id: "c1",
      documentId: "d1",
      content: "relevant content",
      embedding: [],
      metadata: ChunkMetadata.create(0, 0, 16),
    },
    score: 0.9,
  };
}

function makeApp(retrieveKnowledge: Partial<IRetrieveKnowledge>) {
  const app = express();
  app.use(express.json());
  app.use("/search", searchRouter(retrieveKnowledge as IRetrieveKnowledge));
  app.use(createErrorHandler(nullLogger));
  return app;
}

describe("searchRouter", () => {
  let mockRetrieveKnowledge: { execute: Mock<IRetrieveKnowledge["execute"]> };

  beforeEach(() => {
    mockRetrieveKnowledge = {
      execute: vi.fn<IRetrieveKnowledge["execute"]>().mockResolvedValue([]),
    };
  });

  describe("POST /search", () => {
    it("returns 200 with results array", async () => {
      mockRetrieveKnowledge.execute.mockResolvedValue([makeChunkSearchResult()]);
      const res = await request(makeApp(mockRetrieveKnowledge))
        .post("/search")
        .send({ query: "test query" });
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
    });

    it("returns result with chunk and score shape", async () => {
      mockRetrieveKnowledge.execute.mockResolvedValue([makeChunkSearchResult()]);
      const res = await request(makeApp(mockRetrieveKnowledge))
        .post("/search")
        .send({ query: "test" });
      expect(res.status).toBe(200);
      expect(res.body[0]).toMatchObject({
        chunk: expect.any(Object),
        score: expect.any(Number),
      });
    });

    it("returns 200 with empty array when no results", async () => {
      const res = await request(makeApp(mockRetrieveKnowledge))
        .post("/search")
        .send({ query: "q" });
      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });

    it("accepts optional limit parameter", async () => {
      const res = await request(makeApp(mockRetrieveKnowledge))
        .post("/search")
        .send({ query: "q", limit: 5 });
      expect(res.status).toBe(200);
    });

    it("returns 400 when query is missing", async () => {
      const res = await request(makeApp(mockRetrieveKnowledge)).post("/search").send({});
      expect(res.status).toBe(400);
    });

    it("returns 400 when query is empty", async () => {
      const res = await request(makeApp(mockRetrieveKnowledge)).post("/search").send({ query: "" });
      expect(res.status).toBe(400);
    });

    it("returns 400 when limit exceeds maximum of 50", async () => {
      const res = await request(makeApp(mockRetrieveKnowledge))
        .post("/search")
        .send({ query: "q", limit: 51 });
      expect(res.status).toBe(400);
    });

    it("returns 400 when limit is not positive", async () => {
      const res = await request(makeApp(mockRetrieveKnowledge))
        .post("/search")
        .send({ query: "q", limit: 0 });
      expect(res.status).toBe(400);
    });
  });
});

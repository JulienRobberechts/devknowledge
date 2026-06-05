import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { searchRouter } from "../../src/api/routes/search";
import { errorHandler } from "../../src/api/middleware/errorHandler";
import { SearchKnowledge } from "../../src/application/SearchKnowledge";

function makeApp(searchKnowledge: Partial<SearchKnowledge>) {
  const app = express();
  app.use(express.json());
  app.use("/search", searchRouter(searchKnowledge as SearchKnowledge));
  app.use(errorHandler);
  return app;
}

describe("searchRouter", () => {
  let mockSearch: { execute: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockSearch = { execute: vi.fn().mockResolvedValue([]) };
  });

  it("POST /search returns results from SearchKnowledge", async () => {
    mockSearch.execute.mockResolvedValue([
      {
        chunk: {
          id: "c1",
          documentId: "d1",
          content: "relevant",
          embedding: [],
          metadata: { position: 0, startChar: 0, endChar: 8 },
        },
        score: 0.9,
      },
    ]);
    const res = await request(makeApp(mockSearch))
      .post("/search")
      .send({ query: "test query" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(mockSearch.execute).toHaveBeenCalledWith("test query", 10);
  });

  it("POST /search returns 400 for missing query", async () => {
    const res = await request(makeApp(mockSearch)).post("/search").send({});
    expect(res.status).toBe(400);
  });

  it("POST /search respects limit parameter", async () => {
    const res = await request(makeApp(mockSearch))
      .post("/search")
      .send({ query: "q", limit: 5 });
    expect(res.status).toBe(200);
    expect(mockSearch.execute).toHaveBeenCalledWith("q", 5);
  });
});

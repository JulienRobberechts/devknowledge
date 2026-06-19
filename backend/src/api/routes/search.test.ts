import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RetrieveKnowledge } from "../../application/rag/RetrieveKnowledge";
import { errorHandler } from "../middleware/errorHandler";
import { searchRouter } from "./search";

function makeApp(retrieveKnowledge: Partial<RetrieveKnowledge>) {
  const app = express();
  app.use(express.json());
  app.use("/search", searchRouter(retrieveKnowledge as RetrieveKnowledge));
  app.use(errorHandler);
  return app;
}

describe("searchRouter", () => {
  let mockRetrieveKnowledge: { execute: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockRetrieveKnowledge = { execute: vi.fn().mockResolvedValue([]) };
  });

  it("POST /search returns results from RetrieveKnowledge", async () => {
    mockRetrieveKnowledge.execute.mockResolvedValue([
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
    const res = await request(
      makeApp(mockRetrieveKnowledge as unknown as Partial<RetrieveKnowledge>),
    )
      .post("/search")
      .send({ query: "test query" });
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(mockRetrieveKnowledge.execute).toHaveBeenCalledWith("test query", 10);
  });

  it("POST /search returns 400 for missing query", async () => {
    const res = await request(
      makeApp(mockRetrieveKnowledge as unknown as Partial<RetrieveKnowledge>),
    )
      .post("/search")
      .send({});
    expect(res.status).toBe(400);
  });

  it("POST /search respects limit parameter", async () => {
    const res = await request(
      makeApp(mockRetrieveKnowledge as unknown as Partial<RetrieveKnowledge>),
    )
      .post("/search")
      .send({ query: "q", limit: 5 });
    expect(res.status).toBe(200);
    expect(mockRetrieveKnowledge.execute).toHaveBeenCalledWith("q", 5);
  });
});

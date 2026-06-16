import { describe, it, expect, vi, beforeEach } from "vitest";
import { randomUUID } from "crypto";
import express from "express";
import request from "supertest";
import { documentsRouter } from "./documents";
import { CreateDocument } from "../../application/CreateDocument";
import { InMemoryDocumentRepository } from "../../../tests/fakes/InMemoryDocumentRepository";
import { InMemoryChunkRepository } from "../../../tests/fakes/InMemoryChunkRepository";
import { Document } from "../../domain/entities/Document";

function makeDoc(overrides?: Partial<Document>): Document {
  return {
    id: randomUUID(),
    title: "Test",
    sourceType: "text",
    status: "ready",
    filePath: "test.txt",
    createdAt: new Date(),
    ...overrides,
  };
}

function makeFileStorage() {
  return {
    upload: vi.fn().mockResolvedValue("test.txt"),
    download: vi.fn().mockResolvedValue(Buffer.from("content")),
    delete: vi.fn().mockResolvedValue(undefined),
    list: vi.fn().mockResolvedValue([]),
  };
}

function makeApp(
  docRepo: InMemoryDocumentRepository,
  chunkRepo: InMemoryChunkRepository,
  fileStorage = makeFileStorage(),
  ingest = { execute: vi.fn().mockResolvedValue(undefined) },
) {
  const fakeSummaryRepo = {
    findByDocumentId: vi.fn().mockResolvedValue(null),
    upsert: vi.fn().mockResolvedValue(undefined),
  };
  const fakeSummarize = { execute: vi.fn().mockResolvedValue("summary") };
  const createDocument = new CreateDocument(docRepo, fileStorage as never);
  const app = express();
  app.use(express.json());
  app.use(
    "/documents",
    documentsRouter(
      docRepo,
      chunkRepo,
      fileStorage as never,
      createDocument,
      ingest as never,
      fakeSummaryRepo as never,
      fakeSummarize as never,
    ),
  );
  return app;
}

describe("documentsRouter", () => {
  let docRepo: InMemoryDocumentRepository;
  let chunkRepo: InMemoryChunkRepository;

  beforeEach(() => {
    docRepo = new InMemoryDocumentRepository();
    chunkRepo = new InMemoryChunkRepository();
  });

  it("GET /documents returns all documents", async () => {
    const doc = makeDoc();
    await docRepo.save(doc);
    const res = await request(makeApp(docRepo, chunkRepo)).get("/documents");
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(doc.id);
  });

  it("GET /documents/:id returns a document", async () => {
    const doc = makeDoc();
    await docRepo.save(doc);
    const res = await request(makeApp(docRepo, chunkRepo)).get(
      `/documents/${doc.id}`,
    );
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(doc.id);
  });

  it("GET /documents/:id returns 404 for unknown id", async () => {
    const res = await request(makeApp(docRepo, chunkRepo)).get(
      "/documents/unknown-id",
    );
    expect(res.status).toBe(404);
  });

  it("GET /documents/:id/chunks returns chunks for document", async () => {
    const doc = makeDoc();
    await docRepo.save(doc);
    const res = await request(makeApp(docRepo, chunkRepo)).get(
      `/documents/${doc.id}/chunks`,
    );
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET /documents/:id/chunks returns 404 for unknown document", async () => {
    const res = await request(makeApp(docRepo, chunkRepo)).get(
      "/documents/no-such-id/chunks",
    );
    expect(res.status).toBe(404);
  });

  it("GET /documents/:id/raw returns PDF buffer for pdf doc", async () => {
    const fileStorage = makeFileStorage();
    fileStorage.download.mockResolvedValue(Buffer.from("%PDF-fake"));
    const doc = makeDoc({ sourceType: "pdf", filePath: "test.pdf" });
    await docRepo.save(doc);
    const res = await request(makeApp(docRepo, chunkRepo, fileStorage)).get(
      `/documents/${doc.id}/raw`,
    );
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    expect(fileStorage.download).toHaveBeenCalledWith("test.pdf");
  });

  it("GET /documents/:id/raw returns 404 for non-pdf doc", async () => {
    const doc = makeDoc({ sourceType: "text", filePath: "test.txt" });
    await docRepo.save(doc);
    const res = await request(makeApp(docRepo, chunkRepo)).get(
      `/documents/${doc.id}/raw`,
    );
    expect(res.status).toBe(404);
  });

  it("DELETE /documents/:id removes document and deletes file", async () => {
    const fileStorage = makeFileStorage();
    const doc = makeDoc({ filePath: "test.txt" });
    await docRepo.save(doc);
    const res = await request(makeApp(docRepo, chunkRepo, fileStorage)).delete(
      `/documents/${doc.id}`,
    );
    expect(res.status).toBe(204);
    expect(await docRepo.findById(doc.id)).toBeNull();
    expect(fileStorage.delete).toHaveBeenCalledWith("test.txt");
  });

  it("DELETE /documents/:id returns 404 for unknown id", async () => {
    const res = await request(makeApp(docRepo, chunkRepo)).delete(
      "/documents/unknown-id",
    );
    expect(res.status).toBe(404);
  });

  it("POST /documents returns 400 when no file is uploaded", async () => {
    const res = await request(makeApp(docRepo, chunkRepo))
      .post("/documents")
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("No file uploaded");
  });

  it("POST /documents accepts a text file and returns 202", async () => {
    const fileStorage = makeFileStorage();
    const ingest = { execute: vi.fn().mockResolvedValue(undefined) };
    const res = await request(makeApp(docRepo, chunkRepo, fileStorage, ingest))
      .post("/documents")
      .attach("file", Buffer.from("hello world"), {
        filename: "test.txt",
        contentType: "text/plain",
      })
      .field("title", "My Doc");
    expect(res.status).toBe(202);
    expect(res.body.status).toBe("pending");
    expect(typeof res.body.id).toBe("string");
    expect(fileStorage.upload).toHaveBeenCalledOnce();
  });

  it("POST /documents uses filename as title when title omitted", async () => {
    const ingest = { execute: vi.fn().mockResolvedValue(undefined) };
    const res = await request(makeApp(docRepo, chunkRepo, undefined, ingest))
      .post("/documents")
      .attach("file", Buffer.from("content"), {
        filename: "myfile.txt",
        contentType: "text/plain",
      });
    expect(res.status).toBe(202);
  });
});

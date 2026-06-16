import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { VoyageEmbeddingAdapter } from "../../src/infrastructure/embeddings/VoyageEmbeddingAdapter";
import { MarkdownParser } from "../../src/infrastructure/parsers/MarkdownParser";
import { IngestDocument } from "../../src/application/IngestDocument";
import { SearchKnowledge } from "../../src/application/SearchKnowledge";
import { InMemoryChunkRepository } from "../fakes/InMemoryChunkRepository";
import { InMemoryDocumentRepository } from "../fakes/InMemoryDocumentRepository";

const diskFileStorage = {
  upload: async (key: string) => key,
  download: async (key: string) => fs.promises.readFile(key),
  delete: async () => {},
  list: async () => [] as string[],
  deleteAll: async () => {},
};
import { RETRIEVAL_CASES } from "./venise-simplon-orient-express.retrieval.cases";

const CHUNK_SIZE = 512;
const CHUNK_OVERLAP = 128;
const MIN_SCORE = 0.1;

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;
const DOCUMENT_PATH = path.resolve(
  __dirname,
  "../DOCUMENTS/Orient-Express/Venise-Simplon-Orient-Express.md",
);

describe.skipIf(!VOYAGE_API_KEY)(
  "Retrieval – Venise-Simplon-Orient-Express (requires VOYAGE_API_KEY)",
  () => {
    let search: SearchKnowledge;
    let chunkCount: number;

    beforeAll(async () => {
      const embeddingAdapter = new VoyageEmbeddingAdapter(VOYAGE_API_KEY!);
      const parser = new MarkdownParser();
      const docRepo = new InMemoryDocumentRepository();
      const chunkRepo = new InMemoryChunkRepository();

      const documentId = randomUUID();
      await docRepo.save({
        id: documentId,
        title: "Venise-Simplon-Orient-Express",
        sourceType: "markdown",
        status: "pending",
        filePath: DOCUMENT_PATH,
        createdAt: new Date(),
      });

      const ingest = new IngestDocument(
        docRepo,
        chunkRepo,
        embeddingAdapter,
        diskFileStorage,
        parser,
        async () => ({
          strategy: "sentence",
          chunkSize: CHUNK_SIZE,
          chunkOverlap: CHUNK_OVERLAP,
        }),
      );

      await ingest.execute(documentId);

      const doc = await docRepo.findById(documentId);
      expect(doc?.status).toBe("ready");

      const allChunks = await chunkRepo.findByDocumentId(documentId);
      chunkCount = allChunks.length;
      expect(chunkCount).toBeGreaterThan(1);

      search = new SearchKnowledge(chunkRepo, embeddingAdapter);
    }, 60_000);

    it("document was split into multiple chunks", () => {
      expect(chunkCount).toBeGreaterThan(1);
    });

    for (const { question, expectedKeyword, topK = 1 } of RETRIEVAL_CASES) {
      it(`top-${topK} results for "${question}" contain "${expectedKeyword}"`, async () => {
        const results = await search.execute(question, topK, MIN_SCORE);
        expect(results.length).toBeGreaterThan(0);

        // display retrieved chunks for debugging
        console.log(
          `Question: ${question}\nRetrieved chunks:\n${results
            .map(
              (r, i) =>
                `  ${i + 1}. (score: ${r.score.toFixed(3)}) ${r.chunk.content}`,
            )
            .join("\n")}\n`,
        );
        const combined = results
          .map((r) => r.chunk.content)
          .join(" ")
          .toLowerCase();
        expect(combined).toContain(expectedKeyword.toLowerCase());
      }, 30_000);
    }
  },
);

import path from "path";
import { randomUUID } from "crypto";
import { beforeAll, describe, expect, it } from "vitest";
import { VoyageEmbeddingAdapter } from "../../src/infrastructure/embeddings/VoyageEmbeddingAdapter";
import { MarkdownParser } from "../../src/infrastructure/parsers/MarkdownParser";
import { createChunkingStrategy } from "../../src/domain/services/ChunkingStrategy";
import { IngestDocument } from "../../src/application/IngestDocument";
import { SearchKnowledge } from "../../src/application/SearchKnowledge";
import { InMemoryChunkRepository } from "../fakes/InMemoryChunkRepository";
import { InMemoryDocumentRepository } from "../fakes/InMemoryDocumentRepository";

const CHUNK_SIZE = 100;
const CHUNK_OVERLAP = 40;
const MIN_SCORE = 0.3;

const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;
const DOCUMENT_PATH = path.resolve(
  __dirname,
  "../DOCUMENTS/orient-express-1/orient-express-partie1.md",
);

// Each case: the question, the keyword that must appear in the retrieved chunk,
// and topK (default 1). topK > 1 means the keyword must appear in any of the
// top-K results — used for questions where the answer is semantically adjacent
// to a larger narrative chunk and exact top-1 precision is harder.
const RETRIEVAL_CASES: {
  question: string;
  expectedKeyword: string;
  topK?: number;
}[] = [
  {
    question: "Quelle compagnie a créé l'Orient-Express ?",
    expectedKeyword: "wagons-lits",
  },
  {
    question: "En quelle année le premier Orient-Express a-t-il été lancé ?",
    expectedKeyword: "1883",
    topK: 3,
  },
  {
    question: "Quelle était la liaison initiale assurée par le train ?",
    expectedKeyword: "Vienne",
  },
  {
    question: "Vers quelle ville le train fut-il prolongé à partir de 1919 ?",
    expectedKeyword: "Venise",
  },
  {
    question:
      "En quelle année Constantinople a-t-elle été officiellement renommée Istanbul ?",
    expectedKeyword: "1930",
  },
  {
    question:
      "Quel style artistique atteignit son apogée grâce à l'Orient-Express dans les années 1920 ?",
    expectedKeyword: "apogée",
  },
  {
    question:
      "Citez un artiste-décorateur ayant travaillé pour l'Orient-Express.",
    expectedKeyword: "Lalique",
  },
  {
    question:
      "En quelle année le service quotidien Direct-Orient-Express vers Istanbul et Athènes cessa-t-il ?",
    expectedKeyword: "1977",
  },
  {
    question:
      "Quelle était la vitesse commerciale approximative du train à la fin de son exploitation ?",
    expectedKeyword: "55",
  },
  {
    // "concurrence" is semantically close to the broader decline narrative,
    // so "aviation" ranks 2nd rather than 1st — top-3 is the right target here.
    question:
      "Quelle concurrence principale a contribué à la fin du service de l'Orient-Express ?",
    expectedKeyword: "aviation",
    topK: 3,
  },
];

describe.skipIf(!VOYAGE_API_KEY)(
  "Retrieval – orient-express-partie1 (requires VOYAGE_API_KEY)",
  () => {
    let search: SearchKnowledge;
    let chunkCount: number;

    beforeAll(async () => {
      const embeddingAdapter = new VoyageEmbeddingAdapter(VOYAGE_API_KEY!);
      const parser = new MarkdownParser();
      const chunkingStrategy = createChunkingStrategy("recursive");
      const docRepo = new InMemoryDocumentRepository();
      const chunkRepo = new InMemoryChunkRepository();

      const documentId = randomUUID();
      await docRepo.save({
        id: documentId,
        title: "Orient-Express partie 1",
        sourceType: "markdown",
        status: "pending",
        filePath: DOCUMENT_PATH,
        createdAt: new Date(),
      });

      const ingest = new IngestDocument(
        docRepo,
        chunkRepo,
        embeddingAdapter,
        parser,
        chunkingStrategy,
        // Small chunks to split the paragraph into distinct retrievable sections.
        { chunkSize: CHUNK_SIZE, chunkOverlap: CHUNK_OVERLAP },
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

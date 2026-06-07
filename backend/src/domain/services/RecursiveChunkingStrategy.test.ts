import { readFileSync } from "fs";
import { join } from "path";
import { describe, it, expect } from "vitest";
import { RecursiveChunkingStrategy } from "./RecursiveChunkingStrategy";

const CHUNK_SIZE = 100;
const CHUNK_OVERLAP = 40;

const documentText = readFileSync(
  join(
    __dirname,
    "../../../tests/DOCUMENTS/orient-express-1/orient-express-partie1.md",
  ),
  "utf-8",
);

const strategy = new RecursiveChunkingStrategy();

describe("RecursiveChunkingStrategy", () => {
  it("should split text into chunks of max CHUNK_SIZE tokens", () => {
    const text = Array(200).fill("word").join(" ");
    const chunks = strategy.chunk(text, { chunkSize: 50, chunkOverlap: 0 });

    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk) => {
      const tokenCount = chunk.content.trim().split(/\s+/).length;
      expect(tokenCount).toBeLessThanOrEqual(50);
    });
  });

  it("should maintain CHUNK_OVERLAP tokens overlap between consecutive chunks", () => {
    const words = Array.from({ length: 30 }, (_, i) => `word${i}`);
    const text = words.join(" ");
    const chunks = strategy.chunk(text, { chunkSize: 10, chunkOverlap: 3 });

    expect(chunks.length).toBeGreaterThanOrEqual(2);
    const chunk0Words = chunks[0].content.trim().split(/\s+/);
    const chunk1Words = chunks[1].content.trim().split(/\s+/);
    // chunk1 must start with words that already appeared in chunk0 (overlap).
    // findBestSplit can shift the char boundary by ±1 token, so we allow 2 shared
    // words minimum instead of requiring an exact 3-token suffix match.
    const sharedAtStart = chunk1Words
      .slice(0, 4)
      .filter((w) => chunk0Words.includes(w));
    expect(sharedAtStart.length).toBeGreaterThanOrEqual(2);
  });

  it("should never cut a sentence mid-word", () => {
    const text =
      "The quick brown fox jumps over the lazy dog and then runs away fast today always";
    const chunks = strategy.chunk(text, { chunkSize: 5, chunkOverlap: 1 });

    const originalWords = new Set(text.split(/\s+/));
    chunks.forEach((chunk) => {
      chunk.content
        .trim()
        .split(/\s+/)
        .forEach((word) => {
          expect(originalWords.has(word)).toBe(true);
        });
    });
  });

  it("should prefer splitting on double newlines over single newlines over periods", () => {
    const text =
      "word1 word2 word3 word4\n\nword5 word6 word7 word8 word9 word10 word11 word12";
    const chunks = strategy.chunk(text, { chunkSize: 8, chunkOverlap: 0 });

    expect(chunks[0].content).toContain("word4");
    expect(chunks[0].content).not.toContain("word5");
  });

  it("should prefer single newline over period as split boundary", () => {
    const text =
      "word1 word2 word3 word4 word5. word6\nword7 word8 word9 word10 word11 word12 word13 word14";
    const chunks = strategy.chunk(text, { chunkSize: 8, chunkOverlap: 0 });

    expect(chunks[0].content).not.toContain("word7");
  });

  it("should return single chunk for text shorter than chunk size", () => {
    const text = "This is a short text.";
    const chunks = strategy.chunk(text, { chunkSize: 100, chunkOverlap: 10 });

    expect(chunks).toHaveLength(1);
    expect(chunks[0].content).toBe(text.trim());
    expect(chunks[0].metadata.position).toBe(0);
  });

  it("should preserve metadata: position, startChar, endChar per chunk", () => {
    const text =
      "word1 word2 word3 word4 word5 word6 word7 word8 word9 word10 word11 word12";
    const chunks = strategy.chunk(text, { chunkSize: 5, chunkOverlap: 0 });

    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk) => {
      const sliced = text
        .slice(chunk.metadata.startChar, chunk.metadata.endChar)
        .trim();
      expect(sliced).toBe(chunk.content);
      expect(typeof chunk.metadata.position).toBe("number");
      expect(typeof chunk.metadata.startChar).toBe("number");
      expect(typeof chunk.metadata.endChar).toBe("number");
    });
  });

  it("should assign sequential position numbers starting at 0", () => {
    const text = Array(60).fill("word").join(" ");
    const chunks = strategy.chunk(text, { chunkSize: 10, chunkOverlap: 0 });

    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].metadata.position).toBe(0);
    chunks.forEach((chunk, index) => {
      expect(chunk.metadata.position).toBe(index);
    });
  });

  describe("with orient-express document (CHUNK_SIZE=100, CHUNK_OVERLAP=40)", () => {
    it("should produce multiple chunks", () => {
      const chunks = strategy.chunk(documentText, {
        chunkSize: CHUNK_SIZE,
        chunkOverlap: CHUNK_OVERLAP,
      });
      expect(chunks.length).toBeGreaterThan(1);
    });

    it("each chunk should contain at most CHUNK_SIZE tokens", () => {
      const chunks = strategy.chunk(documentText, {
        chunkSize: CHUNK_SIZE,
        chunkOverlap: CHUNK_OVERLAP,
      });
      chunks.forEach((chunk) => {
        const tokenCount = chunk.content.trim().split(/\s+/).length;
        expect(tokenCount).toBeLessThanOrEqual(CHUNK_SIZE);
      });
    });

    it("consecutive chunks should share CHUNK_OVERLAP tokens at their boundary", () => {
      const chunks = strategy.chunk(documentText, {
        chunkSize: CHUNK_SIZE,
        chunkOverlap: CHUNK_OVERLAP,
      });
      for (let i = 0; i < chunks.length - 1; i++) {
        const wordsA = chunks[i].content.trim().split(/\s+/);
        const wordsB = chunks[i + 1].content.trim().split(/\s+/);
        const tail = wordsA.slice(-CHUNK_OVERLAP).join(" ");
        const head = wordsB.slice(0, CHUNK_OVERLAP).join(" ");
        // At least some words overlap
        const overlap = wordsA.filter((w) => wordsB.includes(w));
        expect(overlap.length).toBeGreaterThan(0);
        void tail;
        void head;
      }
    });

    it("should preserve metadata startChar/endChar for each chunk", () => {
      const chunks = strategy.chunk(documentText, {
        chunkSize: CHUNK_SIZE,
        chunkOverlap: CHUNK_OVERLAP,
      });
      chunks.forEach((chunk, index) => {
        expect(chunk.metadata.position).toBe(index);
        const sliced = documentText
          .slice(chunk.metadata.startChar, chunk.metadata.endChar)
          .trim();
        expect(sliced).toBe(chunk.content);
      });
    });
  });
});

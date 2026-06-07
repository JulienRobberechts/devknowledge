import { describe, it, expect } from "vitest";
import { RecursiveChunkingStrategy } from "./RecursiveChunkingStrategy";
import { SentenceChunkingStrategy } from "./SentenceChunkingStrategy";
import type { IChunkingStrategy, ChunkResult } from "./ChunkingTypes";
import {
  recursiveCases,
  recursiveDocumentCases,
  sentenceCases,
  sentenceDocumentCases,
} from "./ChunkingStrategies.cases";

const recursive = new RecursiveChunkingStrategy();
const sentence = new SentenceChunkingStrategy();

function doChunk(
  strategy: IChunkingStrategy,
  text: string,
  size: number,
  overlap = 0,
): ChunkResult[] {
  return strategy.chunk(text, { chunkSize: size, chunkOverlap: overlap });
}

describe("RecursiveChunkingStrategy", () => {
  it.each(recursiveCases)(
    "size=$size overlap=$overlap | $text",
    ({ text, size, overlap = 0, expected }) => {
      const results = doChunk(recursive, text, size, overlap);
      expect(results.map((r) => r.content)).toEqual(expected);
    },
  );

  it.each(recursiveDocumentCases)(
    "$name",
    ({ text, size, overlap = 0, expected }) => {
      const results = doChunk(recursive, text, size, overlap);
      expect(results.map((r) => r.content)).toEqual(expected);
    },
  );
});

describe("SentenceChunkingStrategy", () => {
  it.each(sentenceCases)(
    "size=$size overlap=$overlap | $text",
    ({ text, size, overlap = 0, expected }) => {
      const results = doChunk(sentence, text, size, overlap);
      expect(results.map((r) => r.content)).toEqual(expected);
    },
  );

  it.each(sentenceDocumentCases)(
    "$name",
    ({ text, size, overlap = 0, expected }) => {
      const results = doChunk(sentence, text, size, overlap);
      expect(results.map((r) => r.content)).toEqual(expected);
    },
  );
});

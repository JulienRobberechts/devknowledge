import { describe, expect, it } from "vitest";
import {
  recursiveCases,
  recursiveDocumentCases,
  sentenceCases,
  sentenceDocumentCases,
} from "./ChunkingStrategies.cases";
import { ChunkConfig, type ChunkResult, type IChunkingStrategy } from "./ChunkingTypes";
import { RecursiveChunkingStrategy } from "./RecursiveChunkingStrategy";
import { SentenceChunkingStrategy } from "./SentenceChunkingStrategy";

const recursive = new RecursiveChunkingStrategy();
const sentence = new SentenceChunkingStrategy();

function doChunk(
  strategy: IChunkingStrategy,
  text: string,
  size: number,
  overlap = 0,
): ChunkResult[] {
  return strategy.chunk(text, ChunkConfig.create(size, overlap));
}

describe("RecursiveChunkingStrategy", () => {
  it.each(recursiveCases)("size=$size overlap=$overlap | $text", ({
    text,
    size,
    overlap = 0,
    expected,
  }) => {
    const results = doChunk(recursive, text, size, overlap);
    expect(results.map((r) => r.content)).toEqual(expected);
  });

  it.each(recursiveDocumentCases)("$name", ({ text, size, overlap = 0, expected }) => {
    const results = doChunk(recursive, text, size, overlap);
    expect(results.map((r) => r.content)).toEqual(expected);
  });
});

describe("SentenceChunkingStrategy", () => {
  it.each(sentenceCases)("size=$size overlap=$overlap | $text", ({
    text,
    size,
    overlap = 0,
    expected,
  }) => {
    const results = doChunk(sentence, text, size, overlap);
    expect(results.map((r) => r.content)).toEqual(expected);
  });

  it.each(sentenceDocumentCases)("$name", ({ text, size, overlap = 0, expected }) => {
    const results = doChunk(sentence, text, size, overlap);
    expect(results.map((r) => r.content)).toEqual(expected);
  });
});

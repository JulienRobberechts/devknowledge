import { ChunkMetadata } from "../entities/Chunk";
import type {
  ChunkConfig,
  ChunkResult,
  IChunkingStrategy,
} from "./ChunkingTypes";

interface Sentence {
  text: string;
  start: number;
  end: number;
}

// Split on paragraph breaks (\n\n) OR punctuation followed by whitespace + uppercase
const SENTENCE_BOUNDARY = /(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-Ý«"'])|(?:\n\n+)/g;

function splitIntoSentences(text: string): Sentence[] {
  const sentences: Sentence[] = [];
  let lastStart = 0;
  const regex = new RegExp(SENTENCE_BOUNDARY.source, SENTENCE_BOUNDARY.flags);

  for (const match of text.matchAll(regex)) {
    const splitAt = match.index;
    const sentence = text.slice(lastStart, splitAt).trim();
    if (sentence.length > 0) {
      sentences.push({ text: sentence, start: lastStart, end: splitAt });
    }
    lastStart = match.index + match[0].length;
  }

  const last = text.slice(lastStart).trim();
  if (last.length > 0) {
    sentences.push({ text: last, start: lastStart, end: text.length });
  }

  return sentences;
}

function countTokens(text: string): number {
  return text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
}

/** Découpe par fenêtre glissante sur des phrases (séparées par regex), avec overlap en nombre de phrases. */
export class SentenceChunkingStrategy implements IChunkingStrategy {
  chunk(text: string, config: ChunkConfig): ChunkResult[] {
    const { chunkSize, chunkOverlap } = config;
    const sentences = splitIntoSentences(text);

    if (sentences.length === 0) return [];

    const tokenCounts = sentences.map((s) => countTokens(s.text));
    const totalTokens = tokenCounts.reduce((a, b) => a + b, 0);

    if (totalTokens <= chunkSize) {
      return [
        {
          content: text.trim(),
          metadata: ChunkMetadata.create(0, 0, text.length),
        },
      ];
    }

    const results: ChunkResult[] = [];
    let sentenceStart = 0;

    while (sentenceStart < sentences.length) {
      let tokenCount = 0;
      let sentenceEnd = sentenceStart;

      while (sentenceEnd < sentences.length) {
        const next = tokenCounts[sentenceEnd];
        if (tokenCount + next > chunkSize && sentenceEnd > sentenceStart) break;
        tokenCount += next;
        sentenceEnd++;
      }

      const charStart = sentences[sentenceStart].start;
      const charEnd = sentences[sentenceEnd - 1].end;
      const content = text.slice(charStart, charEnd).trim();

      if (content.length > 0) {
        results.push({
          content,
          metadata: ChunkMetadata.create(results.length, charStart, charEnd),
        });
      }

      let overlapTokens = 0;
      let overlapStart = sentenceEnd;

      for (let i = sentenceEnd - 1; i > sentenceStart; i--) {
        if (overlapTokens + tokenCounts[i] <= chunkOverlap) {
          overlapTokens += tokenCounts[i];
          overlapStart = i;
        } else {
          break;
        }
      }

      sentenceStart = overlapStart > sentenceStart ? overlapStart : sentenceEnd;
    }

    return results;
  }
}

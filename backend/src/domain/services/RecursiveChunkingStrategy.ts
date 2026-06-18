import { ChunkMetadata } from "../entities/Chunk";
import type {
  ChunkConfig,
  ChunkResult,
  IChunkingStrategy,
} from "./ChunkingTypes";

interface Token {
  start: number;
  end: number;
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const regex = /\S+/g;
  for (const match of text.matchAll(regex)) {
    tokens.push({ start: match.index, end: match.index + match[0].length });
  }
  return tokens;
}

function findBestSplit(
  text: string,
  searchFrom: number,
  maxEnd: number,
): number {
  for (let i = maxEnd - 2; i >= searchFrom; i--) {
    if (text[i] === "\n" && text[i + 1] === "\n") return i + 2;
  }
  for (let i = maxEnd - 1; i >= searchFrom; i--) {
    if (text[i] === "\n") return i + 1;
  }
  for (let i = maxEnd - 2; i >= searchFrom; i--) {
    if (text[i] === "." && /\s/.test(text[i + 1])) return i + 2;
  }
  for (let i = maxEnd - 1; i >= searchFrom; i--) {
    if (/\s/.test(text[i])) return i + 1;
  }
  return maxEnd;
}

/** Découpe par fenêtre glissante sur des tokens (mots), en cherchant la meilleure coupure naturelle (paragraphe > newline > phrase > espace). */
export class RecursiveChunkingStrategy implements IChunkingStrategy {
  chunk(text: string, config: ChunkConfig): ChunkResult[] {
    const { chunkSize, chunkOverlap } = config;
    const tokens = tokenize(text);

    if (tokens.length === 0) return [];

    if (tokens.length <= chunkSize) {
      return [
        {
          content: text.trim(),
          metadata: ChunkMetadata.create(0, 0, text.length),
        },
      ];
    }

    const results: ChunkResult[] = [];
    let tokenStart = 0;
    const step = chunkSize - chunkOverlap;

    while (tokenStart < tokens.length) {
      const tokenEnd = Math.min(tokenStart + chunkSize, tokens.length);
      const charStart = tokens[tokenStart].start;
      const maxCharEnd = tokens[tokenEnd - 1].end;

      let charEnd: number;
      if (tokenEnd >= tokens.length) {
        charEnd = text.length;
      } else {
        const searchFrom = Math.floor(
          charStart + (maxCharEnd - charStart) * 0.5,
        );
        charEnd = findBestSplit(text, searchFrom, maxCharEnd);
      }

      const content = text.slice(charStart, charEnd).trim();
      if (content.length > 0) {
        results.push({
          content,
          metadata: ChunkMetadata.create(results.length, charStart, charEnd),
        });
      }

      tokenStart += step;
    }

    return results;
  }
}

import type { Chunk } from "./Chunk";

export interface ChunkSearchResult {
  chunk: Chunk;
  score: number;
}

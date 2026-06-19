import type { ChunkingStrategyName, IChunkingStrategy } from "./ChunkingTypes";
import { RecursiveChunkingStrategy } from "./RecursiveChunkingStrategy";
import { SentenceChunkingStrategy } from "./SentenceChunkingStrategy";

export type {
  ChunkingStrategyName,
  ChunkResult,
  IChunkingStrategy,
} from "./ChunkingTypes";
export { ChunkConfig } from "./ChunkingTypes";

export function createChunkingStrategy(name: ChunkingStrategyName): IChunkingStrategy {
  switch (name) {
    case "sentence":
      return new SentenceChunkingStrategy();
    default:
      return new RecursiveChunkingStrategy();
  }
}

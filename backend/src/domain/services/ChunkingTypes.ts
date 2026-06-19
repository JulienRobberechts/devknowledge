import type { ChunkMetadata } from "../entities/Chunk";

export type ChunkingStrategyName = "recursive" | "sentence";

/** Value Object: text splitting configuration — invariant: chunkOverlap < chunkSize. */
export class ChunkConfig {
  /** Nominal branding: prevents accidental assignment between Value Objects of the same shape. */
  private declare readonly _brand: void;

  readonly chunkSize: number;
  readonly chunkOverlap: number;

  private constructor(chunkSize: number, chunkOverlap: number) {
    this.chunkSize = chunkSize;
    this.chunkOverlap = chunkOverlap;
  }

  static create(chunkSize: number, chunkOverlap: number): ChunkConfig {
    if (chunkSize <= 0) throw new Error("ChunkConfig: chunkSize must be > 0");
    if (chunkOverlap < 0) throw new Error("ChunkConfig: chunkOverlap must be >= 0");
    if (chunkOverlap >= chunkSize) throw new Error("ChunkConfig: chunkOverlap must be < chunkSize");
    return new ChunkConfig(chunkSize, chunkOverlap);
  }

  equals(other: ChunkConfig): boolean {
    return this.chunkSize === other.chunkSize && this.chunkOverlap === other.chunkOverlap;
  }
}

export interface ChunkResult {
  content: string;
  metadata: ChunkMetadata;
}

export interface IChunkingStrategy {
  chunk(text: string, config: ChunkConfig): ChunkResult[];
}

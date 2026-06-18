import type { ChunkSearchResult } from "../../domain/entities/ChunkSearchResult";

export interface IRetrieveKnowledge {
  execute(
    query: string,
    limit?: number,
    minScore?: number,
    rerankOptions?: {
      enabled?: boolean;
      candidateMultiplier?: number;
      model?: string;
    },
    searchMode?: "vector" | "hybrid",
  ): Promise<ChunkSearchResult[]>;
}

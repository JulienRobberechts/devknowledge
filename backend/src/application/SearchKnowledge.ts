import type { ChunkSearchResult, IChunkRepository } from "../domain/ports/IChunkRepository";
import type { IRerankPort } from "../domain/ports/IRerankPort";
import type { ITextEncoder } from "../domain/ports/ITextEncoder";
import { Logger } from "../infrastructure/logger/Logger";

export class SearchKnowledge {
  private readonly logger = new Logger("SearchKnowledge");

  constructor(
    private readonly chunkRepo: IChunkRepository,
    private readonly embeddingAdapter: ITextEncoder,
    private readonly reranker: IRerankPort | null = null,
    private readonly candidateMultiplier = 3,
    private readonly searchMode: "vector" | "hybrid" = "vector",
  ) {}

  async execute(
    query: string,
    limit = 5,
    minScore = 0.7,
    rerankOptions?: {
      enabled?: boolean;
      candidateMultiplier?: number;
      model?: string;
    },
    searchMode?: "vector" | "hybrid",
  ): Promise<ChunkSearchResult[]> {
    const vector = await this.embeddingAdapter.embed(query, "query");

    const useRerank =
      rerankOptions?.enabled !== undefined
        ? rerankOptions.enabled && this.reranker !== null
        : this.reranker !== null;

    if (useRerank) {
      return this.executeWithRerank(
        query,
        vector,
        limit,
        minScore,
        rerankOptions?.candidateMultiplier,
        rerankOptions?.model,
      );
    }

    const effectiveMode = searchMode ?? this.searchMode;
    const results =
      effectiveMode === "hybrid"
        ? await this.chunkRepo.searchHybrid(query, vector, limit, minScore)
        : await this.chunkRepo.searchByVector(vector, limit, minScore);
    if (results.length === 0) {
      this.logger.warn("No results found", {
        query,
        limit,
        minScore,
        vectorLength: vector.length,
      });
    }
    return results;
  }

  private async executeWithRerank(
    query: string,
    vector: number[],
    limit: number,
    minScore: number,
    candidateMultiplier?: number,
    model?: string,
  ): Promise<ChunkSearchResult[]> {
    const candidateLimit = limit * (candidateMultiplier ?? this.candidateMultiplier);
    const candidates = await this.chunkRepo.searchByVector(vector, candidateLimit, minScore * 0.5);

    if (candidates.length === 0) {
      this.logger.warn("No candidates found for reranking", {
        query,
        candidateLimit,
      });
      return [];
    }

    const rankedIndices = await this.reranker?.rerank(
      query,
      candidates.map((c) => c.chunk.content),
      model,
    );

    if (!rankedIndices) return candidates.slice(0, limit);
    return rankedIndices.slice(0, limit).map((i) => candidates[i]);
  }
}

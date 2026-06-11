import {
  ChunkRepository,
  ChunkSearchResult,
} from "../domain/ports/ChunkRepository";
import { EmbeddingPort } from "../domain/ports/EmbeddingPort";
import { RerankPort } from "../domain/ports/RerankPort";

export class SearchKnowledge {
  constructor(
    private readonly chunkRepo: ChunkRepository,
    private readonly embeddingAdapter: EmbeddingPort,
    private readonly reranker: RerankPort | null = null,
    private readonly candidateMultiplier = 3,
  ) {}

  async execute(
    query: string,
    limit = 5,
    minScore = 0.7,
    rerankOptions?: { enabled?: boolean; candidateMultiplier?: number },
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
      );
    }

    const results = await this.chunkRepo.search(vector, limit, minScore);
    if (results.length === 0) {
      console.warn("[SearchKnowledge] No results found", {
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
  ): Promise<ChunkSearchResult[]> {
    const candidateLimit =
      limit * (candidateMultiplier ?? this.candidateMultiplier);
    const candidates = await this.chunkRepo.search(
      vector,
      candidateLimit,
      minScore * 0.5,
    );

    if (candidates.length === 0) {
      console.warn("[SearchKnowledge] No candidates found for reranking", {
        query,
        candidateLimit,
      });
      return [];
    }

    const rankedIndices = await this.reranker!.rerank(
      query,
      candidates.map((c) => c.chunk.content),
    );

    return rankedIndices.slice(0, limit).map((i) => candidates[i]);
  }
}

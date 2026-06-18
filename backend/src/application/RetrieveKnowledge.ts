import type {
  ChunkSearchResult,
  IChunkRepository,
} from "../domain/ports/IChunkRepository";
import type { ILogger } from "../domain/ports/ILogger";
import type { IRerankPort } from "../domain/ports/IRerankPort";
import type { ITextEncoder } from "../domain/ports/ITextEncoder";
import type { IRetrieveKnowledge } from "../domain/ports/IRetrieveKnowledge";

/** Use case: retrieves the most relevant chunks by vector or hybrid search, with optional reranking. */
export class RetrieveKnowledge implements IRetrieveKnowledge {
  constructor(
    private readonly chunkRepo: IChunkRepository,
    private readonly embeddingAdapter: ITextEncoder,
    private readonly logger: ILogger,
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
    const effectiveMode = searchMode ?? this.searchMode;

    const useRerank =
      rerankOptions?.enabled !== undefined
        ? rerankOptions.enabled && this.reranker !== null
        : this.reranker !== null;

    // Reranking requires a wider candidate pool than the final limit
    const candidateLimit = useRerank
      ? limit * (rerankOptions?.candidateMultiplier ?? this.candidateMultiplier)
      : limit;
    const candidateMinScore = useRerank ? minScore * 0.5 : minScore;

    const candidates =
      effectiveMode === "hybrid"
        ? await this.chunkRepo.searchHybrid(
            query,
            vector,
            candidateLimit,
            candidateMinScore,
          )
        : await this.chunkRepo.searchByVector(
            vector,
            candidateLimit,
            candidateMinScore,
          );

    if (candidates.length === 0) {
      this.logger.warn("No results found", {
        query,
        limit,
        minScore,
        vectorLength: vector.length,
      });
      return [];
    }

    if (!useRerank) return candidates;

    let rankedIndices: number[] | null = null;
    try {
      rankedIndices = await this.reranker!.rerank(
        query,
        candidates.map((c) => c.chunk.content),
        rerankOptions?.model,
      );
    } catch (err) {
      this.logger.warn("Reranker failed, falling back to retrieval order", {
        error: String(err),
      });
    }

    if (!rankedIndices) return candidates.slice(0, limit);
    return rankedIndices.slice(0, limit).map((i) => candidates[i]);
  }
}

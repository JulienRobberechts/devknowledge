import {
  ChunkRepository,
  ChunkSearchResult,
} from "../domain/ports/ChunkRepository";
import { EmbeddingPort } from "../domain/ports/EmbeddingPort";

export class SearchKnowledge {
  constructor(
    private readonly chunkRepo: ChunkRepository,
    private readonly embeddingAdapter: EmbeddingPort,
  ) {}

  async execute(
    query: string,
    limit = 5,
    minScore = 0.7,
  ): Promise<ChunkSearchResult[]> {
    const vector = await this.embeddingAdapter.embed(query, "query");
    return this.chunkRepo.search(vector, limit, minScore);
  }
}

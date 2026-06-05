import { Chunk } from "../../src/domain/entities/Chunk";
import {
  ChunkRepository,
  ChunkSearchResult,
} from "../../src/domain/ports/ChunkRepository";

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export class InMemoryChunkRepository implements ChunkRepository {
  private chunks: Map<string, Chunk> = new Map();

  async save(chunk: Chunk): Promise<void> {
    this.chunks.set(chunk.id, { ...chunk });
  }

  async saveMany(chunks: Chunk[]): Promise<void> {
    await Promise.all(chunks.map((c) => this.save(c)));
  }

  async search(
    vector: number[],
    limit: number,
    minScore: number,
  ): Promise<ChunkSearchResult[]> {
    const results: ChunkSearchResult[] = [];
    for (const chunk of this.chunks.values()) {
      const score = cosineSimilarity(vector, chunk.embedding);
      if (score >= minScore) {
        results.push({ chunk, score });
      }
    }
    return results.sort((a, b) => b.score - a.score).slice(0, limit);
  }

  async findByDocumentId(documentId: string): Promise<Chunk[]> {
    return Array.from(this.chunks.values())
      .filter((c) => c.documentId === documentId)
      .sort((a, b) => a.metadata.position - b.metadata.position);
  }

  async deleteByDocumentId(documentId: string): Promise<void> {
    for (const [id, chunk] of this.chunks.entries()) {
      if (chunk.documentId === documentId) {
        this.chunks.delete(id);
      }
    }
  }

  clear(): void {
    this.chunks.clear();
  }
}

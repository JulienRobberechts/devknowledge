import { Chunk } from "../../src/domain/entities/Chunk";
import {
  IChunkRepository,
  ChunkSearchResult,
} from "../../src/domain/ports/IChunkRepository";

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

export class InMemoryChunkRepository implements IChunkRepository {
  private chunks: Map<string, Chunk> = new Map();

  async save(chunk: Chunk): Promise<void> {
    this.chunks.set(chunk.id, { ...chunk });
  }

  async saveMany(chunks: Chunk[]): Promise<void> {
    await Promise.all(chunks.map((c) => this.save(c)));
  }

  async searchByVector(
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

  async searchHybrid(
    query: string,
    vector: number[],
    limit: number,
    _minScore: number,
  ): Promise<ChunkSearchResult[]> {
    const k = 60;
    const queryTerms = query.toLowerCase().split(/\s+/).filter(Boolean);
    const scores = new Map<string, { chunk: Chunk; score: number }>();

    const vectorResults = Array.from(this.chunks.values())
      .map((chunk) => ({
        chunk,
        sim: cosineSimilarity(vector, chunk.embedding),
      }))
      .sort((a, b) => b.sim - a.sim)
      .slice(0, limit * 3);

    vectorResults.forEach(({ chunk }, idx) => {
      scores.set(chunk.id, { chunk, score: 1 / (k + idx + 1) });
    });

    const textResults = Array.from(this.chunks.values())
      .map((chunk) => ({
        chunk,
        matches: queryTerms.filter((t) =>
          chunk.content.toLowerCase().includes(t),
        ).length,
      }))
      .filter((r) => r.matches > 0)
      .sort((a, b) => b.matches - a.matches)
      .slice(0, limit * 3);

    textResults.forEach(({ chunk }, idx) => {
      const rrfScore = 1 / (k + idx + 1);
      const existing = scores.get(chunk.id);
      if (existing) {
        existing.score += rrfScore;
      } else {
        scores.set(chunk.id, { chunk, score: rrfScore });
      }
    });

    return Array.from(scores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ chunk, score }) => ({ chunk, score }));
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

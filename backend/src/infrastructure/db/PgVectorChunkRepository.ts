import type { Chunk } from "../../domain/entities/Chunk";
import type { ChunkSearchResult } from "../../domain/entities/ChunkSearchResult";
import type { IChunkRepository } from "../../infra-ports/IChunkRepository";
import pool from "./pool";

export class PgVectorChunkRepository implements IChunkRepository {
  async save(chunk: Chunk): Promise<void> {
    await pool.query(
      `INSERT INTO chunks (id, document_id, content, embedding, metadata)
       VALUES ($1, $2, $3, $4::vector, $5)
       ON CONFLICT (id) DO UPDATE SET
         document_id = EXCLUDED.document_id,
         content = EXCLUDED.content,
         embedding = EXCLUDED.embedding,
         metadata = EXCLUDED.metadata`,
      [
        chunk.id,
        chunk.documentId,
        chunk.content,
        JSON.stringify(chunk.embedding),
        JSON.stringify(chunk.metadata),
      ],
    );
  }

  async saveMany(chunks: Chunk[]): Promise<void> {
    if (chunks.length === 0) return;
    const values = chunks
      .map((_, i) => {
        const b = i * 5;
        return `($${b + 1}::uuid, $${b + 2}::uuid, $${b + 3}::text, $${b + 4}::vector, $${b + 5}::jsonb)`;
      })
      .join(", ");
    await pool.query(
      `INSERT INTO chunks (id, document_id, content, embedding, metadata)
       VALUES ${values}
       ON CONFLICT (id) DO UPDATE SET
         document_id = EXCLUDED.document_id,
         content = EXCLUDED.content,
         embedding = EXCLUDED.embedding,
         metadata = EXCLUDED.metadata`,
      chunks.flatMap((c) => [
        c.id,
        c.documentId,
        c.content,
        JSON.stringify(c.embedding),
        JSON.stringify(c.metadata),
      ]),
    );
  }

  async searchByVector(
    vector: number[],
    limit: number,
    minScore: number,
  ): Promise<ChunkSearchResult[]> {
    const result = await pool.query(
      `WITH scored AS (
         SELECT id, document_id, content, metadata,
                1 - (embedding <=> $1::vector) AS score
         FROM chunks
       )
       SELECT id, document_id, content, metadata, score
       FROM scored
       WHERE score >= $2
       ORDER BY score DESC
       LIMIT $3`,
      [JSON.stringify(vector), minScore, limit],
    );
    return result.rows.map((row) => ({
      chunk: {
        id: row.id as string,
        documentId: row.document_id as string,
        content: row.content as string,
        embedding: [],
        metadata: row.metadata as Chunk["metadata"],
      },
      score: parseFloat(row.score as string),
    }));
  }

  async findByDocumentId(documentId: string): Promise<Chunk[]> {
    const result = await pool.query(
      `SELECT id, document_id, content, metadata
       FROM chunks
       WHERE document_id = $1
       ORDER BY (metadata->>'position')::int`,
      [documentId],
    );
    return result.rows.map((row) => ({
      id: row.id as string,
      documentId: row.document_id as string,
      content: row.content as string,
      embedding: [],
      metadata: row.metadata as Chunk["metadata"],
    }));
  }

  async searchHybrid(
    query: string,
    vector: number[],
    limit: number,
    _minScore: number,
  ): Promise<ChunkSearchResult[]> {
    const candidateLimit = limit * 3;

    const [vectorResult, textResult] = await Promise.all([
      pool.query(
        `SELECT id, document_id, content, metadata,
                ROW_NUMBER() OVER (ORDER BY embedding <=> $1::vector) AS rank
         FROM chunks
         LIMIT $2`,
        [JSON.stringify(vector), candidateLimit],
      ),
      pool.query(
        `SELECT id, document_id, content, metadata,
                ROW_NUMBER() OVER (ORDER BY ts_rank_cd(ts_content, plainto_tsquery('simple', $1)) DESC) AS rank
         FROM chunks
         WHERE ts_content @@ plainto_tsquery('simple', $1)
         LIMIT $2`,
        [query, candidateLimit],
      ),
    ]);

    const scores = this.computeRRFScores(vectorResult.rows, textResult.rows);

    return Array.from(scores.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ row, score }) => ({
        chunk: {
          id: row.id as string,
          documentId: row.document_id as string,
          content: row.content as string,
          embedding: [],
          metadata: row.metadata as Chunk["metadata"],
        },
        score,
      }));
  }

  private computeRRFScores(
    vectorRows: Record<string, unknown>[],
    textRows: Record<string, unknown>[],
    k = 60,
  ): Map<string, { row: Record<string, unknown>; score: number }> {
    const scores = new Map<
      string,
      { row: Record<string, unknown>; score: number }
    >();
    for (const row of vectorRows) {
      const id = row.id as string;
      scores.set(id, { row, score: 1 / (k + Number(row.rank)) });
    }
    for (const row of textRows) {
      const id = row.id as string;
      const rrfScore = 1 / (k + Number(row.rank));
      const existing = scores.get(id);
      if (existing) existing.score += rrfScore;
      else scores.set(id, { row, score: rrfScore });
    }
    return scores;
  }

  async deleteByDocumentId(documentId: string): Promise<void> {
    await pool.query("DELETE FROM chunks WHERE document_id = $1", [documentId]);
  }

  async deleteAll(): Promise<void> {
    await pool.query("TRUNCATE TABLE chunks");
  }
}

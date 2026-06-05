import { Chunk } from "../../domain/entities/Chunk";
import {
  ChunkRepository,
  ChunkSearchResult,
} from "../../domain/ports/ChunkRepository";
import pool from "./pool";

export class PgVectorChunkRepository implements ChunkRepository {
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
    await Promise.all(chunks.map((c) => this.save(c)));
  }

  async search(
    vector: number[],
    limit: number,
    minScore: number,
  ): Promise<ChunkSearchResult[]> {
    const result = await pool.query(
      `SELECT
         id, document_id, content, metadata,
         1 - (embedding <=> $1::vector) AS score
       FROM chunks
       WHERE 1 - (embedding <=> $1::vector) >= $2
       ORDER BY embedding <=> $1::vector
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

  async deleteByDocumentId(documentId: string): Promise<void> {
    await pool.query("DELETE FROM chunks WHERE document_id = $1", [documentId]);
  }
}

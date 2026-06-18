import type { Chunk } from "../domain/entities/Chunk";
import type { ChunkSearchResult } from "../domain/entities/ChunkSearchResult";

export type { ChunkSearchResult };

/** Stores and retrieves text chunks with their embeddings. Supports vector and hybrid search. */
export interface IChunkRepository {
  /** Persists a single chunk. */
  save(chunk: Chunk): Promise<void>;
  /** Persists multiple chunks in one operation. */
  saveMany(chunks: Chunk[]): Promise<void>;
  /** Searches chunks by vector similarity, filtered by minimum score. */
  searchByVector(
    vector: number[],
    limit: number,
    minScore: number,
  ): Promise<ChunkSearchResult[]>;
  /** Hybrid search combining full-text query and vector similarity. */
  searchHybrid(
    query: string,
    vector: number[],
    limit: number,
    minScore: number,
  ): Promise<ChunkSearchResult[]>;
  /** Retrieves all chunks belonging to a document. */
  findByDocumentId(documentId: string): Promise<Chunk[]>;
  /** Deletes all chunks belonging to a document. */
  deleteByDocumentId(documentId: string): Promise<void>;
  /** Deletes all chunks. */
  deleteAll(): Promise<void>;
}

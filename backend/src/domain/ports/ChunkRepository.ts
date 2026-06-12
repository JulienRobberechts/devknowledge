import { Chunk } from "../entities/Chunk";

export interface ChunkSearchResult {
  chunk: Chunk;
  score: number;
}

export interface ChunkRepository {
  save(chunk: Chunk): Promise<void>;
  saveMany(chunks: Chunk[]): Promise<void>;
  search(
    vector: number[],
    limit: number,
    minScore: number,
  ): Promise<ChunkSearchResult[]>;
  searchHybrid(
    query: string,
    vector: number[],
    limit: number,
    minScore: number,
  ): Promise<ChunkSearchResult[]>;
  findByDocumentId(documentId: string): Promise<Chunk[]>;
  deleteByDocumentId(documentId: string): Promise<void>;
}

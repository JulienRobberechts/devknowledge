import type { Document } from "../../../domain/entities/Document";
import type { DocumentSummary } from "../../../domain/entities/DocumentSummary";

export interface ChunkPreview {
  position: number;
  contentLength: number;
  preview: string;
}

export interface DocumentContent {
  content: string;
  sourceType: Document["sourceType"];
}

export interface IDocumentQueries {
  /** Returns all documents. */
  list(): Promise<Document[]>;
  /** Returns the document by id, or null if not found. */
  get(id: string): Promise<Document | null>;
  /** Returns chunk previews for a document. */
  getChunks(id: string): Promise<ChunkPreview[]>;
  /** Returns assembled text content, or null if no chunks exist. */
  getContent(id: string): Promise<DocumentContent | null>;
  /** Returns the raw file buffer for PDF documents, or null if unavailable. */
  getRawBuffer(id: string): Promise<Buffer | null>;
  /** Returns the document summary, or null if not generated yet. */
  getSummary(id: string): Promise<DocumentSummary | null>;
}

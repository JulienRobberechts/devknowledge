import { Document, DocumentStatus } from "../entities/Document";

/** Persists and retrieves documents and their processing status. */
export interface IDocumentRepository {
  /** Persists a document (create or update). */
  save(document: Document): Promise<void>;
  /** Retrieves a document by id. */
  findById(id: string): Promise<Document | null>;
  /** Lists all documents. */
  findAll(): Promise<Document[]>;
  /** Deletes a document. */
  delete(id: string): Promise<void>;
  /** Updates the processing status of a document. */
  updateStatus(id: string, status: DocumentStatus): Promise<void>;
}

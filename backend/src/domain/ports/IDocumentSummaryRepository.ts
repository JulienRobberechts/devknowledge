import { DocumentSummary } from "../entities/DocumentSummary";

/** Stores and retrieves AI-generated summaries for documents. */
export interface IDocumentSummaryRepository {
  /** Retrieves the summary associated with a document. */
  findByDocumentId(documentId: string): Promise<DocumentSummary | null>;
  /** Creates or updates the summary of a document. */
  upsert(documentId: string, content: string): Promise<void>;
}

import type { DocumentSummary } from "../../../domain/entities/DocumentSummary";
import type { IDocumentSummaryRepository } from "../../../infra-ports/persistence/IDocumentSummaryRepository";
import pool from "./pool";

function toSummary(row: Record<string, unknown>): DocumentSummary {
  return {
    id: row.id as string,
    documentId: row.document_id as string,
    content: row.content as string,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  };
}

export class PgDocumentSummaryRepository implements IDocumentSummaryRepository {
  async findByDocumentId(documentId: string): Promise<DocumentSummary | null> {
    const result = await pool.query("SELECT * FROM document_summaries WHERE document_id = $1", [
      documentId,
    ]);
    return result.rows[0] ? toSummary(result.rows[0]) : null;
  }

  async upsert(documentId: string, content: string): Promise<void> {
    await pool.query(
      `INSERT INTO document_summaries (id, document_id, content, created_at, updated_at)
       VALUES (gen_random_uuid(), $1, $2, NOW(), NOW())
       ON CONFLICT (document_id) DO UPDATE SET
         content = EXCLUDED.content,
         updated_at = NOW()`,
      [documentId, content],
    );
  }

  async deleteAll(): Promise<void> {
    await pool.query("TRUNCATE TABLE document_summaries");
  }
}

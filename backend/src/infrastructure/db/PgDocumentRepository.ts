import type { Document, DocumentStatus } from "../../domain/entities/Document";
import type { IDocumentRepository } from "../../domain/ports/IDocumentRepository";
import pool from "./pool";

function toDocument(row: Record<string, unknown>): Document {
  return {
    id: row.id as string,
    title: row.title as string,
    sourceType: row.source_type as Document["sourceType"],
    status: row.status as DocumentStatus,
    filePath: row.file_path as string | null,
    createdAt: new Date(row.created_at as string),
  };
}

export class PgDocumentRepository implements IDocumentRepository {
  async save(document: Document): Promise<void> {
    await pool.query(
      `INSERT INTO documents (id, title, source_type, status, file_path, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         title = EXCLUDED.title,
         source_type = EXCLUDED.source_type,
         status = EXCLUDED.status,
         file_path = EXCLUDED.file_path`,
      [
        document.id,
        document.title,
        document.sourceType,
        document.status,
        document.filePath,
        document.createdAt,
      ],
    );
  }

  async findById(id: string): Promise<Document | null> {
    const result = await pool.query("SELECT * FROM documents WHERE id = $1", [
      id,
    ]);
    return result.rows[0] ? toDocument(result.rows[0]) : null;
  }

  async findAll(): Promise<Document[]> {
    const result = await pool.query(
      "SELECT * FROM documents ORDER BY created_at DESC",
    );
    return result.rows.map(toDocument);
  }

  async delete(id: string): Promise<void> {
    await pool.query("DELETE FROM documents WHERE id = $1", [id]);
  }

  async updateStatus(id: string, status: DocumentStatus): Promise<void> {
    await pool.query("UPDATE documents SET status = $2 WHERE id = $1", [
      id,
      status,
    ]);
  }

  async deleteAll(): Promise<void> {
    await pool.query("TRUNCATE TABLE documents CASCADE");
  }
}

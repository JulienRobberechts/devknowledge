import type {
  Document,
  DocumentStatus,
} from "../../src/domain/entities/Document";
import type { IDocumentRepository } from "../../src/domain/ports/IDocumentRepository";

export class InMemoryDocumentRepository implements IDocumentRepository {
  private documents: Map<string, Document> = new Map();

  async save(document: Document): Promise<void> {
    this.documents.set(document.id, { ...document });
  }

  async findById(id: string): Promise<Document | null> {
    return this.documents.get(id) ?? null;
  }

  async findAll(): Promise<Document[]> {
    return Array.from(this.documents.values());
  }

  async delete(id: string): Promise<void> {
    this.documents.delete(id);
  }

  async updateStatus(id: string, status: DocumentStatus): Promise<void> {
    const doc = this.documents.get(id);
    if (doc) {
      this.documents.set(id, { ...doc, status });
    }
  }

  async deleteAll(): Promise<void> {
    this.documents.clear();
  }

  clear(): void {
    this.documents.clear();
  }
}

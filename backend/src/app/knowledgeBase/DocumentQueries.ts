import type {
  ChunkPreview,
  DocumentContent,
  IDocumentQueries,
} from "../../app-ports/knowledgeBase/queries/IDocumentQueries";
import type { Document } from "../../domain/entities/Document";
import type { DocumentSummary } from "../../domain/entities/DocumentSummary";
import type { IChunkRepository } from "../../infra-ports/persistence/IChunkRepository";
import type { IDocumentRepository } from "../../infra-ports/persistence/IDocumentRepository";
import type { IDocumentSummaryRepository } from "../../infra-ports/persistence/IDocumentSummaryRepository";
import type { IFileStoragePort } from "../../infra-ports/storage/IFileStoragePort";

export class DocumentQueries implements IDocumentQueries {
  constructor(
    private readonly documentRepo: IDocumentRepository,
    private readonly chunkRepo: IChunkRepository,
    private readonly summaryRepo: IDocumentSummaryRepository,
    private readonly fileStorage: IFileStoragePort,
  ) {}

  list(): Promise<Document[]> {
    return this.documentRepo.findAll();
  }

  get(id: string): Promise<Document | null> {
    return this.documentRepo.findById(id);
  }

  async getChunks(id: string): Promise<ChunkPreview[]> {
    const chunks = await this.chunkRepo.findByDocumentId(id);
    return chunks.map((chunk) => ({
      position: chunk.metadata.position,
      contentLength: chunk.content.length,
      preview: chunk.content.slice(0, 100),
    }));
  }

  async getContent(id: string): Promise<DocumentContent | null> {
    const chunks = await this.chunkRepo.findByDocumentId(id);
    if (chunks.length === 0) return null;
    const doc = await this.documentRepo.findById(id);
    if (!doc) return null;
    return {
      content: chunks.map((c) => c.content).join("\n\n"),
      sourceType: doc.sourceType,
    };
  }

  async getRawBuffer(id: string): Promise<Buffer | null> {
    const doc = await this.documentRepo.findById(id);
    if (doc?.sourceType !== "pdf" || !doc.filePath) return null;
    return this.fileStorage.download(doc.filePath);
  }

  getSummary(id: string): Promise<DocumentSummary | null> {
    return this.summaryRepo.findByDocumentId(id);
  }
}

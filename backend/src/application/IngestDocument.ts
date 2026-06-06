import { randomUUID } from "crypto";
import { ChunkRepository } from "../domain/ports/ChunkRepository";
import { DocumentRepository } from "../domain/ports/DocumentRepository";
import { EmbeddingPort } from "../domain/ports/EmbeddingPort";
import { FileParserPort } from "../domain/ports/FileParserPort";
import { ChunkingStrategy } from "../domain/services/ChunkingStrategy";
import { Logger } from "../infrastructure/logger/Logger";

const BATCH_SIZE = 20;

interface IngestConfig {
  chunkSize?: number;
  chunkOverlap?: number;
}

export class IngestDocument {
  private readonly chunkSize: number;
  private readonly chunkOverlap: number;
  private readonly logger = new Logger("IngestDocument");

  constructor(
    private readonly documentRepo: DocumentRepository,
    private readonly chunkRepo: ChunkRepository,
    private readonly embeddingAdapter: EmbeddingPort,
    private readonly fileParser: FileParserPort,
    private readonly chunkingStrategy: ChunkingStrategy,
    config: IngestConfig = {},
  ) {
    this.chunkSize = config.chunkSize ?? 400;
    this.chunkOverlap = config.chunkOverlap ?? 50;
  }

  async execute(documentId: string): Promise<void> {
    const document = await this.documentRepo.findById(documentId);
    if (!document) throw new Error(`Document ${documentId} not found`);

    this.logger.info("Starting ingestion", {
      documentId,
      file: document.filePath,
    });

    await this.chunkRepo.deleteByDocumentId(documentId);
    await this.documentRepo.updateStatus(documentId, "processing");

    try {
      const { text } = await this.fileParser.parse(document.filePath ?? "");
      const chunkResults = this.chunkingStrategy.chunk(text, {
        chunkSize: this.chunkSize,
        chunkOverlap: this.chunkOverlap,
      });

      this.logger.info("Chunking complete", {
        documentId,
        chunks: chunkResults.length,
      });

      const contents = chunkResults.map((r) => r.content);
      const embeddings: number[][] = [];

      for (let i = 0; i < contents.length; i += BATCH_SIZE) {
        const batch = contents.slice(i, i + BATCH_SIZE);
        const batchEmbeddings = await this.embeddingAdapter.embedMany(batch, "document");
        embeddings.push(...batchEmbeddings);
      }

      const chunks = chunkResults.map((result, index) => ({
        id: randomUUID(),
        documentId,
        content: result.content,
        embedding: embeddings[index],
        metadata: result.metadata,
      }));

      await this.chunkRepo.saveMany(chunks);
      await this.documentRepo.updateStatus(documentId, "ready");
      this.logger.info("Ingestion complete", {
        documentId,
        chunks: chunks.length,
      });
    } catch (err) {
      this.logger.error(
        "Ingestion failed",
        err instanceof Error ? err : new Error(String(err)),
      );
      await this.documentRepo.updateStatus(documentId, "error");
    }
  }
}

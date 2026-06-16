import fs from "fs";
import os from "os";
import path from "path";
import { randomUUID } from "crypto";
import { IChunkRepository } from "../domain/ports/IChunkRepository";
import { IDocumentRepository } from "../domain/ports/IDocumentRepository";
import { ITextEncoder } from "../domain/ports/ITextEncoder";
import { IFileParserPort } from "../domain/ports/IFileParserPort";
import { IFileStoragePort } from "../domain/ports/IFileStoragePort";
import {
  createChunkingStrategy,
  type ChunkingStrategyName,
} from "../domain/services/ChunkingStrategy";
import { Logger } from "../infrastructure/logger/Logger";
import type { ChunkingConfig } from "./AppSettingsService";

const BATCH_SIZE = 20;

export class IngestDocument {
  private readonly logger = new Logger("IngestDocument");

  constructor(
    private readonly documentRepo: IDocumentRepository,
    private readonly chunkRepo: IChunkRepository,
    private readonly embeddingAdapter: ITextEncoder,
    private readonly fileStorage: IFileStoragePort,
    private readonly fileParser: IFileParserPort,
    private readonly getChunkingConfig: () => Promise<ChunkingConfig>,
  ) {}

  async execute(documentId: string): Promise<void> {
    const document = await this.documentRepo.findById(documentId);
    if (!document) throw new Error(`Document ${documentId} not found`);

    const { strategy, chunkSize, chunkOverlap } =
      await this.getChunkingConfig();
    const chunkingStrategy = createChunkingStrategy(
      strategy as ChunkingStrategyName,
    );

    this.logger.info("Starting ingestion", {
      documentId,
      file: document.filePath,
      chunkSize,
      chunkOverlap,
    });

    await this.chunkRepo.deleteByDocumentId(documentId);
    await this.documentRepo.updateStatus(documentId, "processing");

    try {
      const key = document.filePath;
      if (!key) throw new Error(`Document ${documentId} has no file`);

      const buffer = await this.fileStorage.download(key);
      const ext = path.extname(key);
      const tempPath = path.join(os.tmpdir(), `ingest-${documentId}${ext}`);
      await fs.promises.writeFile(tempPath, buffer);

      let rawText: string;
      try {
        const parsed = await this.fileParser.parse(tempPath);
        rawText = parsed.text;
      } finally {
        await fs.promises.unlink(tempPath).catch(() => {});
      }

      const text = rawText.replace(/\x00/g, "");
      const chunkResults = chunkingStrategy.chunk(text, {
        chunkSize,
        chunkOverlap,
      });

      this.logger.info("Chunking complete", {
        documentId,
        chunks: chunkResults.length,
      });

      const contents = chunkResults.map((r) => r.content);
      const embeddings: number[][] = [];

      for (let i = 0; i < contents.length; i += BATCH_SIZE) {
        const batch = contents.slice(i, i + BATCH_SIZE);
        const batchEmbeddings = await this.embeddingAdapter.embedMany(
          batch,
          "document",
        );
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

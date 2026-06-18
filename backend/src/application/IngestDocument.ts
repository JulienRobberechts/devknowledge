import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { IChunkRepository } from "../domain/ports/IChunkRepository";
import type { IDocumentRepository } from "../domain/ports/IDocumentRepository";
import type { IFileParserPort } from "../domain/ports/IFileParserPort";
import type { IFileStoragePort } from "../domain/ports/IFileStoragePort";
import type { ILogger } from "../domain/ports/ILogger";
import type { ITextEncoder } from "../domain/ports/ITextEncoder";
import {
  ChunkConfig,
  type ChunkingStrategyName,
  createChunkingStrategy,
} from "../domain/services/ChunkingStrategy";
import type { ChunkingConfig } from "./AppSettingsService";

const BATCH_SIZE = 20;

/** Use case: parses, chunks, and generates embeddings for a document to make it queryable. */
export class IngestDocument {
  constructor(
    private readonly documentRepo: IDocumentRepository,
    private readonly chunkRepo: IChunkRepository,
    private readonly embeddingAdapter: ITextEncoder,
    private readonly fileStorage: IFileStoragePort,
    private readonly fileParser: IFileParserPort,
    private readonly getChunkingConfig: () => Promise<ChunkingConfig>,
    private readonly logger: ILogger,
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

      const text = await this.downloadAndParseFile(documentId, key);
      const chunkResults = chunkingStrategy.chunk(
        text,
        ChunkConfig.create(chunkSize, chunkOverlap),
      );

      this.logger.info("Chunking complete", {
        documentId,
        chunks: chunkResults.length,
      });

      const embeddings = await this.generateEmbeddingsBatched(
        chunkResults.map((r) => r.content),
      );

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

  private async downloadAndParseFile(
    documentId: string,
    key: string,
  ): Promise<string> {
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

    return rawText.replaceAll("\x00", "");
  }

  private async generateEmbeddingsBatched(
    contents: string[],
  ): Promise<number[][]> {
    const embeddings: number[][] = [];
    for (let i = 0; i < contents.length; i += BATCH_SIZE) {
      const batch = contents.slice(i, i + BATCH_SIZE);
      const batchEmbeddings = await this.embeddingAdapter.embedMany(
        batch,
        "document",
      );
      embeddings.push(...batchEmbeddings);
    }
    return embeddings;
  }
}

import { randomUUID } from "crypto";
import path from "path";
import { Document } from "../domain/entities/Document";
import { DocumentRepository } from "../domain/ports/DocumentRepository";
import { FileStoragePort } from "../domain/ports/FileStoragePort";

export interface CreateDocumentInput {
  buffer: Buffer;
  originalName: string;
  mimetype: string;
  title?: string;
}

function sourceTypeFromMime(
  mimetype: string,
  originalname: string,
): "pdf" | "markdown" | "text" {
  if (mimetype === "application/pdf") return "pdf";
  const ext = path.extname(originalname).toLowerCase();
  if (ext === ".md" || ext === ".markdown") return "markdown";
  return "text";
}

export class CreateDocument {
  constructor(
    private readonly documentRepo: DocumentRepository,
    private readonly fileStorage: FileStoragePort,
  ) {}

  async execute(input: CreateDocumentInput): Promise<Document> {
    const title = input.title ?? path.basename(input.originalName);
    const sourceType = sourceTypeFromMime(input.mimetype, input.originalName);

    const id = randomUUID();
    const ext = path.extname(input.originalName).toLowerCase();
    const key = `${id}${ext}`;
    await this.fileStorage.upload(key, input.buffer, input.mimetype);

    const document: Document = {
      id,
      title,
      sourceType,
      status: "pending",
      filePath: key,
      createdAt: new Date(),
    };

    await this.documentRepo.save(document);
    return document;
  }
}

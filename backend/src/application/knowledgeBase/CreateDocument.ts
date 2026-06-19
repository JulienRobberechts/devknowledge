import { randomUUID } from "node:crypto";
import path from "node:path";
import type {
  CreateDocumentInput,
  ICreateDocument,
} from "../../app-ports/knowledgeBase/ICreateDocument";
import type { Document } from "../../domain/entities/Document";
import type { IDocumentRepository } from "../../infra-ports/persistence/IDocumentRepository";
import type { IFileStoragePort } from "../../infra-ports/storage/IFileStoragePort";

export type { CreateDocumentInput };

function sourceTypeFromMime(mimetype: string, originalname: string): "pdf" | "markdown" | "text" {
  if (mimetype === "application/pdf") return "pdf";
  const ext = path.extname(originalname).toLowerCase();
  if (ext === ".md" || ext === ".markdown") return "markdown";
  return "text";
}

/** Use case: uploads the raw file to storage and persists the document entry in the database (status "pending", before ingestion). */
export class CreateDocument implements ICreateDocument {
  constructor(
    private readonly documentRepo: IDocumentRepository,
    private readonly fileStorage: IFileStoragePort,
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

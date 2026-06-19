import path from "node:path";
import type {
  ICheckStorageConsistency,
  StorageConsistencyResult,
} from "../../app-ports/admin/ICheckStorageConsistency";
import type { IDocumentRepository } from "../../infra-ports/persistence/IDocumentRepository";
import type { IFileStoragePort } from "../../infra-ports/storage/IFileStoragePort";

export type { StorageConsistencyResult };

// Extracts just the filename from a path that may be absolute or relative.
// Handles legacy DB records that stored full paths like /app/uploads/uuid.pdf
// while storage returns relative keys like uuid.pdf.
function toKey(filePath: string): string {
  return path.basename(filePath);
}

/** Use case: detects orphan files (storage without DB entry) and missing files (DB entry without file). */
export class CheckStorageConsistency implements ICheckStorageConsistency {
  constructor(
    private readonly documentRepo: IDocumentRepository,
    private readonly fileStorage: IFileStoragePort,
  ) {}

  async execute(): Promise<StorageConsistencyResult> {
    const [docs, storageKeys] = await Promise.all([
      this.documentRepo.findAll(),
      this.fileStorage.list(),
    ]);

    const dbKeys = new Set(docs.flatMap((d) => (d.filePath ? [toKey(d.filePath)] : [])));
    const storageSet = new Set(storageKeys.map(toKey));

    return {
      orphanFiles: storageKeys.filter((k) => !dbKeys.has(toKey(k))),
      missingFiles: [...dbKeys].filter((k) => !storageSet.has(k)),
      totalDocuments: docs.length,
      totalStorageFiles: storageKeys.length,
    };
  }
}

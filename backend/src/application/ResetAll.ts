import type { IChunkRepository } from "../domain/ports/IChunkRepository";
import type { IConversationRepository } from "../domain/ports/IConversationRepository";
import type { IDocumentRepository } from "../domain/ports/IDocumentRepository";
import type { IDocumentSummaryRepository } from "../domain/ports/IDocumentSummaryRepository";
import type { IFileStoragePort } from "../domain/ports/IFileStoragePort";
import type { ILogger } from "../domain/ports/ILogger";
import type { AppSettingsPatch } from "./AppSettingsService";

/** Use case : supprime tous les fichiers du storage et tronque toutes les tables, puis applique les nouveaux paramètres si fournis. */
export class ResetAll {
  constructor(
    private readonly fileStorage: IFileStoragePort,
    private readonly updateSettings: (
      patch: AppSettingsPatch,
    ) => Promise<unknown>,
    private readonly chunkRepo: IChunkRepository,
    private readonly summaryRepo: IDocumentSummaryRepository,
    private readonly conversationRepo: IConversationRepository,
    private readonly documentRepo: IDocumentRepository,
    private readonly logger: ILogger,
  ) {}

  async execute(newSettings?: AppSettingsPatch): Promise<void> {
    // Best-effort: delete files from current storage before switching provider.
    // If storage is unreachable, log and continue — DB reset must not be blocked.
    await this.fileStorage.deleteAll().catch((err) => {
      this.logger.warn("storage.deleteAll() failed, continuing", {
        error: String(err),
      });
    });

    await this.chunkRepo.deleteAll();
    await this.summaryRepo.deleteAll();
    await this.conversationRepo.deleteAll();
    await this.documentRepo.deleteAll();

    if (newSettings) {
      await this.updateSettings(newSettings);
    }
  }
}

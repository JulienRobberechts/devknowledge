import type { IChunkRepository } from "../domain/ports/IChunkRepository";
import type { IConversationRepository } from "../domain/ports/IConversationRepository";
import type { IDocumentRepository } from "../domain/ports/IDocumentRepository";
import type { IDocumentSummaryRepository } from "../domain/ports/IDocumentSummaryRepository";
import type { IFileStoragePort } from "../domain/ports/IFileStoragePort";
import type {
  AppSettingsPatch,
  AppSettingsService,
} from "./AppSettingsService";

const logger = console;

/** Use case : supprime tous les fichiers du storage et tronque toutes les tables, puis applique les nouveaux paramètres si fournis. */
export class ResetAll {
  constructor(
    private readonly fileStorage: IFileStoragePort,
    private readonly settingsService: AppSettingsService,
    private readonly chunkRepo: IChunkRepository,
    private readonly summaryRepo: IDocumentSummaryRepository,
    private readonly conversationRepo: IConversationRepository,
    private readonly documentRepo: IDocumentRepository,
  ) {}

  async execute(newSettings?: AppSettingsPatch): Promise<void> {
    // Best-effort: delete files from current storage before switching provider.
    // If storage is unreachable, log and continue — DB reset must not be blocked.
    await this.fileStorage.deleteAll().catch((err) => {
      logger.warn("[ResetAll] storage.deleteAll() failed, continuing:", err);
    });

    await this.chunkRepo.deleteAll();
    await this.summaryRepo.deleteAll();
    await this.conversationRepo.deleteAll();
    await this.documentRepo.deleteAll();

    if (newSettings) {
      await this.settingsService.updateSettings(newSettings);
    }
  }
}

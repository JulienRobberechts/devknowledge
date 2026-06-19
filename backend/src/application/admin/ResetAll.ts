import type { AppSettingsPatch } from "../../app-ports/admin/IAppSettingsService";
import type { IResetAll } from "../../app-ports/admin/IResetAll";
import type { ILogger } from "../../infra-ports/ILogger";
import type { IChunkRepository } from "../../infra-ports/persistence/IChunkRepository";
import type { IConversationRepository } from "../../infra-ports/persistence/IConversationRepository";
import type { IDocumentRepository } from "../../infra-ports/persistence/IDocumentRepository";
import type { IDocumentSummaryRepository } from "../../infra-ports/persistence/IDocumentSummaryRepository";
import type { IFileStoragePort } from "../../infra-ports/storage/IFileStoragePort";

/** Use case: deletes all storage files and truncates all tables, then applies new settings if provided. */
export class ResetAll implements IResetAll {
  constructor(
    private readonly fileStorage: IFileStoragePort,
    private readonly updateSettings: (patch: AppSettingsPatch) => Promise<unknown>,
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

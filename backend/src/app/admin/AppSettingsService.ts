import type {
  AppSettings,
  AppSettingsPatch,
  ChunkingConfig,
  IAppSettingsService,
} from "../../app-ports/admin";
import type { IAppSettingsRepository } from "../../infra-ports/persistence";
import ragConfig from "../../rag.config.json";

export type { AppSettings, AppSettingsPatch, ChunkingConfig };

const EMBEDDING_PRESETS = ragConfig.embeddings.models.map((m) => ({
  provider: m.provider,
  model: m.id,
  label: m.label,
}));

export interface SettingsDefaults {
  storageBackend: "local" | "r2";
  chunkingStrategy: "recursive" | "sentence";
  chunkSize: number;
  chunkOverlap: number;
}

/** Application service: reads and updates the runtime configuration (embedding provider, storage, chunking strategy) persisted in the database. */
export class AppSettingsService implements IAppSettingsService {
  constructor(
    private readonly repo: IAppSettingsRepository,
    private readonly defaults: SettingsDefaults,
  ) {}

  async getSettings(): Promise<AppSettings> {
    const stored = await this.repo.getAll();
    const currentProvider = stored["embedding.provider"] ?? "voyage";
    const preset =
      EMBEDDING_PRESETS.find((p) => p.provider === currentProvider) ?? EMBEDDING_PRESETS[0];

    return {
      embedding: { provider: preset.provider, model: preset.model },
      storage: {
        provider: stored["storage.provider"] ?? this.defaults.storageBackend,
      },
    };
  }

  async getChunkingConfig(): Promise<ChunkingConfig> {
    const stored = await this.repo.getAll();
    return {
      strategy: (stored["rag.strategy"] ?? this.defaults.chunkingStrategy) as
        | "recursive"
        | "sentence",
      chunkSize: stored["rag.chunkSize"]
        ? parseInt(stored["rag.chunkSize"], 10)
        : this.defaults.chunkSize,
      chunkOverlap: stored["rag.chunkOverlap"]
        ? parseInt(stored["rag.chunkOverlap"], 10)
        : this.defaults.chunkOverlap,
    };
  }

  async updateSettings(patch: AppSettingsPatch): Promise<AppSettings> {
    const entries: Record<string, string> = {};
    if (patch.embedding?.provider) entries["embedding.provider"] = patch.embedding.provider;
    if (patch.storage?.provider) entries["storage.provider"] = patch.storage.provider;
    if (patch.chunking?.strategy) entries["rag.strategy"] = patch.chunking.strategy;
    if (patch.chunking?.chunkSize != null)
      entries["rag.chunkSize"] = String(patch.chunking.chunkSize);
    if (patch.chunking?.chunkOverlap != null)
      entries["rag.chunkOverlap"] = String(patch.chunking.chunkOverlap);
    if (Object.keys(entries).length > 0) await this.repo.setMany(entries);
    return this.getSettings();
  }
}

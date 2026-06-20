export interface AppSettings {
  embedding: { provider: string; model: string };
  storage: { provider: string };
}

export interface AppSettingsPatch {
  embedding?: { provider: string };
  storage?: { provider: string };
  chunking?: {
    strategy?: "recursive" | "sentence";
    chunkSize?: number;
    chunkOverlap?: number;
  };
}

export interface ChunkingConfig {
  strategy: "recursive" | "sentence";
  chunkSize: number;
  chunkOverlap: number;
}

export interface IAppSettingsService {
  getSettings(): Promise<AppSettings>;
  getChunkingConfig(): Promise<ChunkingConfig>;
  updateSettings(patch: AppSettingsPatch): Promise<AppSettings>;
}

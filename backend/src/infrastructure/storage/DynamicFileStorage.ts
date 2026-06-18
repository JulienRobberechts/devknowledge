import type { IFileStoragePort } from "../../domain/ports/IFileStoragePort";
import type { StorageBackends } from "./createFileStorage";

/** Dispatches each operation to the active storage backend (local or R2) by reading the config at runtime. */
export class DynamicFileStorage implements IFileStoragePort {
  constructor(
    private readonly getProvider: () => Promise<string>,
    private readonly backends: StorageBackends,
  ) {}

  private async resolve(): Promise<IFileStoragePort> {
    const provider = await this.getProvider();
    if (provider === "r2" && this.backends.r2) return this.backends.r2;
    return this.backends.local;
  }

  async upload(key: string, buffer: Buffer, mimetype: string): Promise<string> {
    return (await this.resolve()).upload(key, buffer, mimetype);
  }

  async download(key: string): Promise<Buffer> {
    return (await this.resolve()).download(key);
  }

  async delete(key: string): Promise<void> {
    return (await this.resolve()).delete(key);
  }

  async list(): Promise<string[]> {
    return (await this.resolve()).list();
  }

  async deleteAll(): Promise<void> {
    return (await this.resolve()).deleteAll();
  }
}

import fs from "node:fs";
import path from "node:path";
import type { IFileStoragePort } from "../../../infra-ports/storage/IFileStoragePort";

export class LocalFileStorage implements IFileStoragePort {
  constructor(private readonly uploadDir: string) {}

  async upload(key: string, buffer: Buffer, _mimetype: string): Promise<string> {
    const filePath = path.join(this.uploadDir, key);
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, buffer);
    return key;
  }

  async download(key: string): Promise<Buffer> {
    return fs.promises.readFile(path.join(this.uploadDir, key));
  }

  async delete(key: string): Promise<void> {
    await fs.promises.unlink(path.join(this.uploadDir, key));
  }

  async list(): Promise<string[]> {
    return this.listDir(this.uploadDir, this.uploadDir);
  }

  async deleteAll(): Promise<void> {
    const keys = await this.list();
    await Promise.all(keys.map((k) => this.delete(k)));
  }

  private async listDir(dir: string, base: string): Promise<string[]> {
    let entries: fs.Dirent[];
    try {
      entries = await fs.promises.readdir(dir, { withFileTypes: true });
    } catch {
      return [];
    }
    const results: string[] = [];
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...(await this.listDir(full, base)));
      } else {
        results.push(path.relative(base, full));
      }
    }
    return results;
  }
}

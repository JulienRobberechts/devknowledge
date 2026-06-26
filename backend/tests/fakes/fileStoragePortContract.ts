import { afterEach, beforeEach, expect, it } from "vitest";
import type { IFileStoragePort } from "../../src/infra-ports/storage";

export function testFileStoragePort(
  setupStorage: () => Promise<{
    storage: IFileStoragePort;
    cleanup: () => Promise<void>;
    verifyOnMedium: (key: string, expected: Buffer) => Promise<void>;
  }>,
): void {
  let storage: IFileStoragePort;
  let cleanup: () => Promise<void>;
  let verifyOnMedium: (key: string, expected: Buffer) => Promise<void>;

  beforeEach(async () => {
    ({ storage, cleanup, verifyOnMedium } = await setupStorage());
  });

  afterEach(async () => {
    await cleanup();
  });

  it("upload stores buffer and returns key", async () => {
    const buffer = Buffer.from("hello");
    const key = await storage.upload("test.txt", buffer, "text/plain");
    expect(key).toBe("test.txt");
    const content = await storage.download(key);
    expect(content).toEqual(buffer);
  });

  it("upload writes to the underlying storage medium", async () => {
    const buffer = Buffer.from("medium-check");
    const key = await storage.upload("medium.txt", buffer, "text/plain");
    await verifyOnMedium(key, buffer);
  });

  it("download retrieves stored file", async () => {
    const buffer = Buffer.from("world");
    await storage.upload("doc.txt", buffer, "text/plain");
    const result = await storage.download("doc.txt");
    expect(result).toEqual(buffer);
  });

  it("delete removes the file", async () => {
    await storage.upload("del.txt", Buffer.from("x"), "text/plain");
    await storage.delete("del.txt");
    await expect(storage.download("del.txt")).rejects.toThrow();
  });

  it("list returns all keys", async () => {
    await storage.upload("a.txt", Buffer.from("a"), "text/plain");
    await storage.upload("b.pdf", Buffer.from("b"), "application/pdf");
    const keys = await storage.list();
    expect(keys.sort()).toEqual(["a.txt", "b.pdf"]);
  });

  it("list returns empty array when storage is empty", async () => {
    const keys = await storage.list();
    expect(keys).toEqual([]);
  });

  it("upload creates subdirectories as needed", async () => {
    const buffer = Buffer.from("nested");
    const key = await storage.upload("sub/dir/file.txt", buffer, "text/plain");
    expect(key).toBe("sub/dir/file.txt");
    const result = await storage.download(key);
    expect(result).toEqual(buffer);
  });

  it("deleteAll removes all stored files", async () => {
    await storage.upload("a.txt", Buffer.from("a"), "text/plain");
    await storage.upload("b.txt", Buffer.from("b"), "text/plain");
    await storage.deleteAll();
    const keys = await storage.list();
    expect(keys).toEqual([]);
  });
}

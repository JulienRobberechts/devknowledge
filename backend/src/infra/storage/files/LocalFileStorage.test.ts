import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LocalFileStorage } from "./LocalFileStorage";

describe("LocalFileStorage", () => {
  let tmpDir: string;
  let storage: LocalFileStorage;

  beforeEach(async () => {
    tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "local-storage-test-"));
    storage = new LocalFileStorage(tmpDir);
  });

  afterEach(async () => {
    await fs.promises.rm(tmpDir, { recursive: true, force: true });
  });

  it("upload stores buffer and returns key", async () => {
    const buffer = Buffer.from("hello");
    const key = await storage.upload("test.txt", buffer, "text/plain");
    expect(key).toBe("test.txt");
    const content = await fs.promises.readFile(path.join(tmpDir, "test.txt"));
    expect(content).toEqual(buffer);
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

  it("list returns empty array when dir is empty", async () => {
    const keys = await storage.list();
    expect(keys).toEqual([]);
  });

  it("upload creates subdirectories as needed", async () => {
    const buffer = Buffer.from("nested");
    const key = await storage.upload("sub/dir/file.txt", buffer, "text/plain");
    expect(key).toBe("sub/dir/file.txt");
    const result = await storage.download("sub/dir/file.txt");
    expect(result).toEqual(buffer);
  });
});

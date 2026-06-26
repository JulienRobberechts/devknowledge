import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect } from "vitest";
import { testFileStoragePort } from "../../../../tests/fakes/fileStoragePortContract";
import { LocalFileStorage } from "./LocalFileStorage";

describe("LocalFileStorage", () => {
  testFileStoragePort(async () => {
    const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "local-storage-test-"));
    return {
      storage: new LocalFileStorage(tmpDir),
      cleanup: () => fs.promises.rm(tmpDir, { recursive: true, force: true }),
      verifyOnMedium: async (key, expected) => {
        const content = await fs.promises.readFile(path.join(tmpDir, key));
        expect(content).toEqual(expected);
      },
    };
  });
});

import { describe, it, expect, beforeAll } from "vitest";
import { writeFile, mkdtemp } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { TextParser } from "../../src/infrastructure/parsers/TextParser";

let tmpDir: string;

beforeAll(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "text-parser-test-"));
});

describe("TextParser", () => {
  it("should read file content as text", async () => {
    const filePath = join(tmpDir, "test.txt");
    await writeFile(filePath, "Hello world");
    const result = await new TextParser().parse(filePath);
    expect(result.text).toBe("Hello world");
  });

  it("should return correct metadata", async () => {
    const filePath = join(tmpDir, "meta.txt");
    await writeFile(filePath, "content");
    const result = await new TextParser().parse(filePath);
    expect(result.metadata.fileName).toBe("meta.txt");
    expect(result.metadata.mimeType).toBe("text/plain");
    expect(typeof result.metadata.fileSize).toBe("number");
    expect(result.metadata.fileSize).toBeGreaterThan(0);
  });

  it("should preserve multi-line content", async () => {
    const filePath = join(tmpDir, "multiline.txt");
    await writeFile(filePath, "line1\nline2\nline3");
    const result = await new TextParser().parse(filePath);
    expect(result.text).toBe("line1\nline2\nline3");
  });
});

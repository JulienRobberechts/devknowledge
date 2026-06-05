import { describe, it, expect, beforeAll } from "vitest";
import { writeFile, mkdtemp } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { MultiFileParser } from "../../src/infrastructure/parsers/MultiFileParser";

let tmpDir: string;

beforeAll(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "multi-parser-test-"));
});

describe("MultiFileParser", () => {
  it("should parse .txt files via TextParser", async () => {
    const filePath = join(tmpDir, "file.txt");
    await writeFile(filePath, "plain text content");
    const result = await new MultiFileParser().parse(filePath);
    expect(result.text).toBe("plain text content");
    expect(result.metadata.mimeType).toBe("text/plain");
  });

  it("should parse .md files via MarkdownParser", async () => {
    const filePath = join(tmpDir, "file.md");
    await writeFile(filePath, "# Heading");
    const result = await new MultiFileParser().parse(filePath);
    expect(result.metadata.mimeType).toBe("text/markdown");
    expect(result.text).toContain("Heading");
  });

  it("should parse .markdown files via MarkdownParser", async () => {
    const filePath = join(tmpDir, "file.markdown");
    await writeFile(filePath, "# Title");
    const result = await new MultiFileParser().parse(filePath);
    expect(result.metadata.mimeType).toBe("text/markdown");
  });

  it("should default to TextParser for unknown extensions", async () => {
    const filePath = join(tmpDir, "file.csv");
    await writeFile(filePath, "a,b,c");
    const result = await new MultiFileParser().parse(filePath);
    expect(result.metadata.mimeType).toBe("text/plain");
    expect(result.text).toBe("a,b,c");
  });
});

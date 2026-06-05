import { describe, it, expect, beforeAll } from "vitest";
import { writeFile, mkdtemp } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { MarkdownParser } from "../../src/infrastructure/parsers/MarkdownParser";

let tmpDir: string;

beforeAll(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "md-parser-test-"));
});

describe("MarkdownParser", () => {
  it("should strip HTML tags produced from markdown", async () => {
    const filePath = join(tmpDir, "test.md");
    await writeFile(filePath, "# Hello\n\nThis is **bold** text.");
    const result = await new MarkdownParser().parse(filePath);
    expect(result.text).not.toContain("<");
    expect(result.text).not.toContain(">");
    expect(result.text).toContain("Hello");
    expect(result.text).toContain("bold");
  });

  it("should decode HTML entities", async () => {
    const filePath = join(tmpDir, "entities.md");
    await writeFile(filePath, "a &amp; b &lt;tag&gt;");
    const result = await new MarkdownParser().parse(filePath);
    expect(result.text).toContain("&");
    expect(result.text).toContain("<");
    expect(result.text).toContain(">");
  });

  it("should collapse multiple whitespace characters", async () => {
    const filePath = join(tmpDir, "ws.md");
    await writeFile(filePath, "word1\n\nword2");
    const result = await new MarkdownParser().parse(filePath);
    expect(result.text).not.toMatch(/\s{2,}/);
  });

  it("should return markdown metadata", async () => {
    const filePath = join(tmpDir, "doc.md");
    await writeFile(filePath, "# Title");
    const result = await new MarkdownParser().parse(filePath);
    expect(result.metadata.fileName).toBe("doc.md");
    expect(result.metadata.mimeType).toBe("text/markdown");
    expect(typeof result.metadata.fileSize).toBe("number");
  });
});

import { describe, expect, it } from "vitest";
import { MultiFileParser } from "./MultiFileParser";

describe("MultiFileParser", () => {
  it("should parse .txt files via TextParser", async () => {
    const result = await new MultiFileParser().parse({
      buffer: Buffer.from("plain text content"),
      fileName: "file.txt",
    });
    expect(result.text).toBe("plain text content");
    expect(result.metadata.mimeType).toBe("text/plain");
  });

  it("should parse .md files via MarkdownParser", async () => {
    const result = await new MultiFileParser().parse({
      buffer: Buffer.from("# Heading"),
      fileName: "file.md",
    });
    expect(result.metadata.mimeType).toBe("text/markdown");
    expect(result.text).toContain("Heading");
  });

  it("should parse .markdown files via MarkdownParser", async () => {
    const result = await new MultiFileParser().parse({
      buffer: Buffer.from("# Title"),
      fileName: "file.markdown",
    });
    expect(result.metadata.mimeType).toBe("text/markdown");
  });

  it("should default to TextParser for unknown extensions", async () => {
    const result = await new MultiFileParser().parse({
      buffer: Buffer.from("a,b,c"),
      fileName: "file.csv",
    });
    expect(result.metadata.mimeType).toBe("text/plain");
    expect(result.text).toBe("a,b,c");
  });
});

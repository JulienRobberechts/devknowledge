import { describe, expect, it } from "vitest";
import { MarkdownParser } from "./MarkdownParser";

describe("MarkdownParser", () => {
  it("should strip HTML tags produced from markdown", async () => {
    const result = await new MarkdownParser().parse({
      buffer: Buffer.from("# Hello\n\nThis is **bold** text."),
      fileName: "test.md",
    });
    expect(result.text).not.toContain("<");
    expect(result.text).not.toContain(">");
    expect(result.text).toContain("Hello");
    expect(result.text).toContain("bold");
  });

  it("should decode HTML entities", async () => {
    const result = await new MarkdownParser().parse({
      buffer: Buffer.from("a &amp; b &lt;tag&gt;"),
      fileName: "entities.md",
    });
    expect(result.text).toContain("&");
    expect(result.text).toContain("<");
    expect(result.text).toContain(">");
  });

  it("should collapse multiple whitespace characters", async () => {
    const result = await new MarkdownParser().parse({
      buffer: Buffer.from("word1\n\nword2"),
      fileName: "ws.md",
    });
    expect(result.text).not.toMatch(/\s{2,}/);
  });

  it("should return markdown metadata", async () => {
    const buffer = Buffer.from("# Title");
    const result = await new MarkdownParser().parse({
      buffer,
      fileName: "doc.md",
    });
    expect(result.metadata.fileName).toBe("doc.md");
    expect(result.metadata.mimeType).toBe("text/markdown");
    expect(typeof result.metadata.fileSize).toBe("number");
  });
});

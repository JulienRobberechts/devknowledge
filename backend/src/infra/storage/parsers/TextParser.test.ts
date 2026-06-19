import { describe, expect, it } from "vitest";
import { TextParser } from "./TextParser";

describe("TextParser", () => {
  it("should read buffer content as text", async () => {
    const result = await new TextParser().parse({
      buffer: Buffer.from("Hello world"),
      fileName: "test.txt",
    });
    expect(result.text).toBe("Hello world");
  });

  it("should return correct metadata", async () => {
    const buffer = Buffer.from("content");
    const result = await new TextParser().parse({
      buffer,
      fileName: "meta.txt",
    });
    expect(result.metadata.fileName).toBe("meta.txt");
    expect(result.metadata.mimeType).toBe("text/plain");
    expect(result.metadata.fileSize).toBe(buffer.length);
    expect(result.metadata.fileSize).toBeGreaterThan(0);
  });

  it("should preserve multi-line content", async () => {
    const result = await new TextParser().parse({
      buffer: Buffer.from("line1\nline2\nline3"),
      fileName: "multiline.txt",
    });
    expect(result.text).toBe("line1\nline2\nline3");
  });
});

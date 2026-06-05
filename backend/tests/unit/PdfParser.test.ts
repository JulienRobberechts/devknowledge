import { describe, it, expect, beforeAll } from "vitest";
import { writeFile, mkdtemp } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { PdfParser } from "../../src/infrastructure/parsers/PdfParser";

let tmpDir: string;

beforeAll(async () => {
  tmpDir = await mkdtemp(join(tmpdir(), "pdf-parser-test-"));
});

describe("PdfParser", () => {
  it("should throw a descriptive error prefixed with filename on invalid PDF", async () => {
    const filePath = join(tmpDir, "invalid.pdf");
    await writeFile(filePath, Buffer.from("not a pdf"));
    await expect(new PdfParser().parse(filePath)).rejects.toThrow(
      'Failed to parse PDF "invalid.pdf"',
    );
  });

  it("should include original error message in the thrown error", async () => {
    const filePath = join(tmpDir, "empty.pdf");
    await writeFile(filePath, Buffer.alloc(0));
    const err = await new PdfParser().parse(filePath).catch((e) => e);
    expect(err.message).toMatch(/^Failed to parse PDF "empty\.pdf": /);
  });
});

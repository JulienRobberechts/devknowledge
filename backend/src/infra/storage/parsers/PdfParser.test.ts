import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { PdfParser } from "./PdfParser";

describe("PdfParser", () => {
  it("should throw a descriptive error prefixed with filename on invalid PDF", async () => {
    await expect(
      new PdfParser().parse({
        buffer: Buffer.from("not a pdf"),
        fileName: "invalid.pdf",
      }),
    ).rejects.toThrow('Failed to parse PDF "invalid.pdf"');
  });

  it("should include original error message in the thrown error", async () => {
    const err = await new PdfParser()
      .parse({ buffer: Buffer.alloc(0), fileName: "empty.pdf" })
      .catch((e) => e);
    expect(err.message).toMatch(/^Failed to parse PDF "empty\.pdf": /);
  });
});

// These tests document known defects of pdf-parse (expected failures).
describe.skip("PdfParser - extracted text quality (Orient-Express PDFs)", () => {
  const ORIENT_EXPRESS_DIR = join(__dirname, "../../../tests/DOCUMENTS/Orient-Express");
  const PDF = join(ORIENT_EXPRESS_DIR, "Luxe - VSOE par Discovery Trains-p3.pdf");
  const DEBUG_FILE = PDF.replace(/\.pdf$/, ".debug.txt");

  let parsedText: string;

  beforeAll(async () => {
    const buffer = await readFile(PDF);
    const result = await new PdfParser().parse({
      buffer,
      fileName: "Luxe - VSOE par Discovery Trains-p3.pdf",
    });
    parsedText = result.text;
    await writeFile(DEBUG_FILE, parsedText, "utf-8");
  });

  it("should not merge words by removing spaces", () => {
    expect(parsedText).not.toContain("VeniceSimplon");
    expect(parsedText).toContain("Venice Simplon");
  });

  it("should not break ligatures (fi, fl) into line breaks", () => {
    expect(parsedText).toContain("défilent");
  });

  it("should not preserve end-of-line hyphens in words", () => {
    expect(parsedText).toContain("rencontres");
    expect(parsedText).not.toMatch(/ren\s*-\s*\ncontres/);
  });
});

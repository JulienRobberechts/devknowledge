import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { PdfParser } from "./PdfParser";

const ORIENT_EXPRESS_DIR = join(
  __dirname,
  "../../../tests/DOCUMENTS/Orient-Express",
);

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

// These tests document known defects of pdf-parse (expected failures).
describe.skip("PdfParser - extracted text quality (Orient-Express PDFs)", () => {
  const PDF = join(
    ORIENT_EXPRESS_DIR,
    "Luxe - VSOE par Discovery Trains-p3.pdf",
  );
  const DEBUG_FILE = PDF.replace(/\.pdf$/, ".debug.txt");

  let parsedText: string;

  beforeAll(async () => {
    const result = await new PdfParser().parse(PDF);
    parsedText = result.text;
    await writeFile(DEBUG_FILE, parsedText, "utf-8");
  });

  it("should not merge words by removing spaces", () => {
    const text = parsedText;
    // pdf-parse removes the typographic space between columns:
    // "Venice Simplon-Orient-Express" becomes "VeniceSimplon-Orient-Express"
    expect(text).not.toContain("VeniceSimplon");
    expect(text).toContain("Venice Simplon");
  });

  it("should not break ligatures (fi, fl) into line breaks", () => {
    const text = parsedText;
    // pdf-parse fragments the «fi» ligature: "défilent" → "dé\nfi\nlent"
    expect(text).toContain("défilent");
  });

  it("should not preserve end-of-line hyphens in words", () => {
    const text = parsedText;
    // pdf-parse preserves the hyphenation dash: "rencontres" → "ren-\ncontres"
    expect(text).toContain("rencontres");
    expect(text).not.toMatch(/ren\s*-\s*\ncontres/);
  });
});

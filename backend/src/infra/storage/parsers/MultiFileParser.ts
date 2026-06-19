import path from "node:path";
import type {
  IDocumentParserPort,
  ParseInput,
  ParseResult,
} from "../../../infra-ports/storage/IDocumentParserPort";
import { MarkdownParser } from "./MarkdownParser";
import { PdfParser } from "./PdfParser";
import { TextParser } from "./TextParser";

const markdownParser = new MarkdownParser();
const pdfParser = new PdfParser();
const textParser = new TextParser();

export class MultiFileParser implements IDocumentParserPort {
  async parse(input: ParseInput): Promise<ParseResult> {
    const ext = path.extname(input.fileName).toLowerCase();
    switch (ext) {
      case ".md":
      case ".markdown":
        return markdownParser.parse(input);
      case ".pdf":
        return pdfParser.parse(input);
      default:
        return textParser.parse(input);
    }
  }
}

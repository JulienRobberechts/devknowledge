import type {
  IDocumentParserPort,
  ParseInput,
  ParseResult,
} from "../../../infra-ports/storage/IDocumentParserPort";

export class TextParser implements IDocumentParserPort {
  async parse({ buffer, fileName }: ParseInput): Promise<ParseResult> {
    return {
      text: buffer.toString("utf-8"),
      metadata: {
        fileName,
        fileSize: buffer.length,
        mimeType: "text/plain",
      },
    };
  }
}

import type {
  IDocumentParserPort,
  ParseInput,
  ParseResult,
} from "../../../infra-ports/storage/IDocumentParserPort";

export class MarkdownParser implements IDocumentParserPort {
  async parse({ buffer, fileName }: ParseInput): Promise<ParseResult> {
    const { marked } = await import("marked");
    const content = buffer.toString("utf-8");
    const html = marked.parse(content) as string;
    const text = html
      .replace(/<[^>]*>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim();
    return {
      text,
      metadata: {
        fileName,
        fileSize: buffer.length,
        mimeType: "text/markdown",
      },
    };
  }
}

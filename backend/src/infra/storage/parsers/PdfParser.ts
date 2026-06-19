import { randomUUID } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { PDFParse } from "pdf-parse";
import type {
  IDocumentParserPort,
  ParseInput,
  ParseResult,
} from "../../../infra-ports/storage/IDocumentParserPort";

export class PdfParser implements IDocumentParserPort {
  async parse({ buffer, fileName }: ParseInput): Promise<ParseResult> {
    const tempPath = path.join(os.tmpdir(), `pdf-${randomUUID()}.pdf`);
    await fs.promises.writeFile(tempPath, buffer);
    const parser = new PDFParse({ url: `file://${tempPath}` });
    try {
      const [textResult, infoResult] = await Promise.all([parser.getText(), parser.getInfo()]);
      return {
        text: textResult.text,
        metadata: {
          fileName,
          fileSize: buffer.length,
          mimeType: "application/pdf",
          numPages: infoResult.total,
        },
      };
    } catch (err) {
      throw new Error(
        `Failed to parse PDF "${fileName}": ${err instanceof Error ? err.message : String(err)}`,
      );
    } finally {
      await parser.destroy();
      await fs.promises.unlink(tempPath).catch(() => {});
    }
  }
}

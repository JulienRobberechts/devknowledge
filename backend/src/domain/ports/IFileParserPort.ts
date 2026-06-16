export interface ParseResult {
  text: string;
  metadata: Record<string, unknown>;
}

/** Extracts raw text and metadata from uploaded files. */
export interface IFileParserPort {
  /** Extracts text and metadata from a file. */
  parse(filePath: string): Promise<ParseResult>;
}

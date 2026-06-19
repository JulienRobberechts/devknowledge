import type { ISummarizeDocument } from "../../app-ports/knowledgeBase/ISummarizeDocument";
import type { ILLMPort } from "../../infra-ports/ai/ILLMPort";
import type { ILogger } from "../../infra-ports/ILogger";
import type { IChunkRepository } from "../../infra-ports/persistence/IChunkRepository";
import type { IDocumentRepository } from "../../infra-ports/persistence/IDocumentRepository";
import type { IDocumentSummaryRepository } from "../../infra-ports/persistence/IDocumentSummaryRepository";

const MAX_CONTENT_CHARS = 12000;

/** Use case: generates an LLM summary from a document's chunks and persists it in the database. */
export class SummarizeDocument implements ISummarizeDocument {
  constructor(
    private readonly documentRepo: IDocumentRepository,
    private readonly chunkRepo: IChunkRepository,
    private readonly summaryRepo: IDocumentSummaryRepository,
    private readonly llmAdapter: ILLMPort,
    private readonly logger: ILogger,
  ) {}

  async execute(documentId: string): Promise<string> {
    const doc = await this.documentRepo.findById(documentId);
    if (!doc) throw new Error("Document not found");

    const chunks = await this.chunkRepo.findByDocumentId(documentId);
    if (chunks.length === 0) throw new Error("Document has no content");

    const content = chunks
      .map((c) => c.content)
      .join("\n\n")
      .slice(0, MAX_CONTENT_CHARS);

    const maxChars = Math.min(Math.floor(content.length / 2), 500);

    this.logger.info(
      `Summarizing document ${documentId} with content length ${content.length} chars, max summary length ${maxChars} chars`,
    );
    this.logger.debug(`Summarizing document ${documentId} with content : ${content}`);

    const prompt = [
      `Write a concise summary of the document titled "${doc.title}".`,
      "Cover the main topics, key concepts, and important information.",
      `The summary must be strictly less than ${maxChars} characters (hard limit).`,
      "Write plain prose, no bullet points, no title or heading.",
      "Write the summary in the same language as the document content.",
      "",
      "DOCUMENT CONTENT:",
      content,
    ].join("\n");

    const summary = await this.llmAdapter.stream(prompt, () => {});
    await this.summaryRepo.upsert(documentId, summary.trim());
    return summary.trim();
  }
}

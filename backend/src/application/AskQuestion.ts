import { randomUUID } from "crypto";
import { Message, SourceCitation } from "../domain/entities/Message";
import { ChunkSearchResult } from "../domain/ports/ChunkRepository";
import { ConversationRepository } from "../domain/ports/ConversationRepository";
import { DocumentRepository } from "../domain/ports/DocumentRepository";
import { LLMPort } from "../domain/ports/LLMPort";
import { Logger } from "../infrastructure/logger/Logger";
import { SearchKnowledge } from "./SearchKnowledge";

const SLIDING_WINDOW_EXCHANGES = 4;
const NO_INFO_RESPONSE =
  "I don't have enough information to answer this question based on the available knowledge base.";
const ERROR_RESPONSE = "An error occurred while generating the response.";

export class AskQuestion {
  private readonly logger = new Logger("AskQuestion");

  constructor(
    private readonly searchKnowledge: SearchKnowledge,
    private readonly llmAdapter: LLMPort,
    private readonly conversationRepo: ConversationRepository,
    private readonly documentRepo: DocumentRepository,
  ) {}

  async execute(
    conversationId: string,
    userContent: string,
    onToken: (token: string) => void,
    signal?: AbortSignal,
  ): Promise<Message> {
    const conversation = await this.conversationRepo.findById(conversationId);
    const history = conversation?.messages ?? [];

    const userMessage: Message = {
      id: randomUUID(),
      conversationId,
      role: "user",
      content: userContent,
      sources: [],
      createdAt: new Date(),
    };
    await this.conversationRepo.addMessage(conversationId, userMessage);

    this.logger.info("Question received", {
      conversationId,
      question: userContent,
    });

    const params = conversation?.params;
    const searchResults = await this.searchKnowledge.execute(
      userContent,
      params?.retrievalLimit,
      params?.retrievalMinScore,
      params
        ? {
            enabled: params.rerankEnabled,
            candidateMultiplier: params.rerankCandidateMultiplier,
          }
        : undefined,
    );

    this.logger.info("Retrieval complete", {
      conversationId,
      chunks: searchResults.length,
    });

    if (searchResults.length === 0) {
      this.logger.warn("No chunks found, returning no-info response", {
        conversationId,
      });
      const noInfoMessage: Message = {
        id: randomUUID(),
        conversationId,
        role: "assistant",
        content: NO_INFO_RESPONSE,
        sources: [],
        createdAt: new Date(),
      };
      await this.conversationRepo.addMessage(conversationId, noInfoMessage);
      return noInfoMessage;
    }

    const prompt = this.buildPrompt(userContent, searchResults, history);

    let assistantContent: string;
    try {
      assistantContent = await this.llmAdapter.stream(prompt, onToken, signal, {
        model: params?.llmModel,
        temperature: params?.llmTemperature,
        maxTokens: params?.llmMaxTokens,
      });
      this.logger.info("LLM response complete", { conversationId });
    } catch (err) {
      this.logger.error(
        "LLM streaming failed",
        err instanceof Error ? err : new Error(String(err)),
      );
      const errorMessage: Message = {
        id: randomUUID(),
        conversationId,
        role: "assistant",
        content: ERROR_RESPONSE,
        sources: [],
        createdAt: new Date(),
      };
      await this.conversationRepo.addMessage(conversationId, errorMessage);
      return errorMessage;
    }

    const uniqueDocIds = [
      ...new Set(searchResults.map((r) => r.chunk.documentId)),
    ];
    const docs = await Promise.all(
      uniqueDocIds.map((id) => this.documentRepo.findById(id)),
    );
    const titleById = new Map(
      uniqueDocIds.map((id, i) => [id, docs[i]?.title ?? id]),
    );
    const sourceTypeById = new Map(
      uniqueDocIds.map((id, i) => [id, docs[i]?.sourceType ?? "text"]),
    );

    const sources: SourceCitation[] = searchResults.map((result) => ({
      chunkId: result.chunk.id,
      documentId: result.chunk.documentId,
      documentTitle:
        titleById.get(result.chunk.documentId) ?? result.chunk.documentId,
      sourceType: sourceTypeById.get(result.chunk.documentId) ?? "text",
      excerpt: result.chunk.content.slice(0, 200),
      score: result.score,
    }));

    const assistantMessage: Message = {
      id: randomUUID(),
      conversationId,
      role: "assistant",
      content: assistantContent,
      sources,
      createdAt: new Date(),
    };
    await this.conversationRepo.addMessage(conversationId, assistantMessage);

    if (history.length === 0) {
      const title = await this.generateTitle(userContent, assistantContent);
      await this.conversationRepo.updateTitle(conversationId, title);
    }

    return assistantMessage;
  }

  private async generateTitle(
    userContent: string,
    assistantContent: string,
  ): Promise<string> {
    const prompt = [
      "Generate a short title (5 words maximum) summarizing this exchange. Reply with only the title, no quotes, no punctuation at the end.",
      "",
      `User: ${userContent.slice(0, 300)}`,
      `Assistant: ${assistantContent.slice(0, 300)}`,
    ].join("\n");

    try {
      const title = await this.llmAdapter.stream(prompt, () => {});
      return title.trim().slice(0, 80);
    } catch {
      return userContent.slice(0, 60);
    }
  }

  private buildPrompt(
    question: string,
    searchResults: ChunkSearchResult[],
    allMessages: Message[],
  ): string {
    const sourcesText = searchResults
      .map((r, i) => `SOURCE ${i + 1}:\n${r.chunk.content}`)
      .join("\n\n");

    const windowedMessages = allMessages.slice(-(SLIDING_WINDOW_EXCHANGES * 2));
    const historyLines = windowedMessages
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n");

    const parts = [
      "You are a helpful assistant. Answer based only on the provided sources.",
      "",
      "SOURCES:",
      sourcesText,
    ];

    if (historyLines) {
      parts.push("", "CONVERSATION:", historyLines);
    }

    parts.push("", `User: ${question}`);

    return parts.join("\n");
  }
}

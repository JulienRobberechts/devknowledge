import { randomUUID } from "node:crypto";
import type { SourceType } from "../domain/entities/Document";
import type {
  KnowledgeCheckResult,
  KnowledgeCheckStrategy,
  Message,
  SourceCitation,
} from "../domain/entities/Message";
import type { ChunkSearchResult } from "../domain/ports/IChunkRepository";
import type { IConversationRepository } from "../domain/ports/IConversationRepository";
import type { IDocumentRepository } from "../domain/ports/IDocumentRepository";
import type { ILLMPort } from "../domain/ports/ILLMPort";
import type { ILogger } from "../domain/ports/ILogger";
import type { CheckContextualKnowledge } from "./responseChecks/CheckContextualKnowledge";
import {
  buildCitationForcingInstruction,
  parseCitationForcingResult,
} from "./responseChecks/strategies/citationForcing";
import type { SearchKnowledge } from "./SearchKnowledge";

const SLIDING_WINDOW_EXCHANGES = 4;
const NO_INFO_RESPONSE =
  "I don't have enough information to answer this question based on the available knowledge base.";
const ERROR_RESPONSE = "An error occurred while generating the response.";

/** Use case : répond à une question utilisateur via RAG — récupère les chunks pertinents, streame la réponse LLM et applique les vérifications de qualité configurées. */
export class AskQuestion {
  constructor(
    private readonly searchKnowledge: SearchKnowledge,
    private readonly llmAdapter: ILLMPort,
    private readonly conversationRepo: IConversationRepository,
    private readonly documentRepo: IDocumentRepository,
    private readonly logger: ILogger,
    private readonly knowledgeChecker?: CheckContextualKnowledge,
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
            model: params.rerankModel,
            candidateMultiplier: params.rerankCandidateMultiplier,
          }
        : undefined,
      params?.searchMode,
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

    const strategies: KnowledgeCheckStrategy[] =
      params?.knowledgeCheckStrategies ?? [];
    const useCitationForcing = strategies.includes("citation_forcing");

    const prompt = this.buildPrompt(
      userContent,
      searchResults,
      history,
      useCitationForcing,
    );

    let rawContent: string;
    try {
      rawContent = await this.llmAdapter.stream(prompt, onToken, signal, {
        model: params?.llmModel,
        temperature: params?.llmTemperature,
        maxTokens: params?.llmMaxTokens,
        systemPrompt:
          "Always respond in the same language as the user's question.",
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

    const { titleById, sourceTypeById } =
      await this.fetchDocumentMeta(searchResults);

    const { assistantContent, knowledgeCheck } =
      await this.applyKnowledgeChecks(
        rawContent,
        userContent,
        searchResults,
        strategies,
        titleById,
      );

    const sources = this.buildSourceCitations(
      searchResults,
      titleById,
      sourceTypeById,
    );

    this.logger.info("Knowledge check complete", {
      conversationId,
      strategies,
      results: knowledgeCheck.length,
    });

    const assistantMessage: Message = {
      id: randomUUID(),
      conversationId,
      role: "assistant",
      content: assistantContent,
      sources,
      knowledgeCheck: knowledgeCheck.length > 0 ? knowledgeCheck : undefined,
      createdAt: new Date(),
    };
    await this.conversationRepo.addMessage(conversationId, assistantMessage);

    if (history.length === 0) {
      const title = await this.generateConversationTitle(userContent, assistantContent);
      await this.conversationRepo.updateTitle(conversationId, title);
    }

    return assistantMessage;
  }

  private async fetchDocumentMeta(searchResults: ChunkSearchResult[]): Promise<{
    titleById: Map<string, string>;
    sourceTypeById: Map<string, SourceType>;
  }> {
    const uniqueDocIds = [
      ...new Set(searchResults.map((r) => r.chunk.documentId)),
    ];
    const docs = await Promise.all(
      uniqueDocIds.map((id) => this.documentRepo.findById(id)),
    );
    const titleById = new Map(
      uniqueDocIds.map((id, i) => [id, docs[i]?.title ?? id]),
    );
    const sourceTypeById = new Map<string, SourceType>(
      uniqueDocIds.map((id, i) => [id, docs[i]?.sourceType ?? "text"]),
    );
    return { titleById, sourceTypeById };
  }

  private buildSourceCitations(
    searchResults: ChunkSearchResult[],
    titleById: Map<string, string>,
    sourceTypeById: Map<string, SourceType>,
  ): SourceCitation[] {
    return searchResults.map((result) => ({
      chunkId: result.chunk.id,
      documentId: result.chunk.documentId,
      documentTitle:
        titleById.get(result.chunk.documentId) ?? result.chunk.documentId,
      sourceType: sourceTypeById.get(result.chunk.documentId) ?? "text",
      excerpt: result.chunk.content,
      score: result.score,
    }));
  }

  private async applyKnowledgeChecks(
    rawContent: string,
    userContent: string,
    searchResults: ChunkSearchResult[],
    strategies: KnowledgeCheckStrategy[],
    titleById: Map<string, string>,
  ): Promise<{
    assistantContent: string;
    knowledgeCheck: KnowledgeCheckResult[];
  }> {
    const useCitationForcing = strategies.includes("citation_forcing");
    let assistantContent = rawContent;
    let inlineCitationResult: KnowledgeCheckResult | undefined;

    if (useCitationForcing) {
      const parsed = parseCitationForcingResult(
        rawContent,
        searchResults,
        titleById,
      );
      assistantContent = parsed.cleanContent;
      inlineCitationResult = parsed.result;
    }

    const otherStrategies = strategies.filter((s) => s !== "citation_forcing");
    const otherChecks =
      this.knowledgeChecker && otherStrategies.length > 0
        ? await this.knowledgeChecker.run(
            userContent,
            assistantContent,
            searchResults,
            otherStrategies,
            titleById,
          )
        : [];

    const knowledgeCheck: KnowledgeCheckResult[] = [
      ...(inlineCitationResult ? [inlineCitationResult] : []),
      ...otherChecks,
    ];

    return { assistantContent, knowledgeCheck };
  }

  private async generateConversationTitle(
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
    useCitationForcing = false,
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
      ...(useCitationForcing ? [buildCitationForcingInstruction()] : []),
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

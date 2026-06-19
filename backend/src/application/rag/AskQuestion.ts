import { randomUUID } from "node:crypto";
import type { IAskQuestion } from "../../app-ports/rag/IAskQuestion";
import type { IRetrieveKnowledge } from "../../app-ports/rag/IRetrieveKnowledge";
import type { ChunkSearchResult } from "../../domain/entities/ChunkSearchResult";
import type {
  Message,
  ResponseGroundingResult,
  ResponseGroundingStrategy,
} from "../../domain/entities/Message";
import { buildRagPrompt } from "../../domain/services/ragPrompt";
import { type ILLMPort, LLMStreamOptions } from "../../infra-ports/ai/ILLMPort";
import type { ILogger } from "../../infra-ports/ILogger";
import type { IConversationRepository } from "../../infra-ports/persistence/IConversationRepository";
import type { ConversationTitleGenerator } from "./ConversationTitleGenerator";
import type { CheckResponseGrounding } from "./responseGrounding/CheckResponseGrounding";
import { parseCitationForcingResult } from "./responseGrounding/strategies/citationForcing";
import type { SourceCitationResolver } from "./SourceCitationResolver";

const NO_INFO_RESPONSE =
  "I don't have enough information to answer this question based on the available knowledge base.";
const ERROR_RESPONSE = "An error occurred while generating the response.";

/** Use case: answers a user question via RAG — retrieves relevant chunks, streams the LLM response, and applies the configured quality checks. */
export class AskQuestion implements IAskQuestion {
  constructor(
    private readonly retrieveKnowledge: IRetrieveKnowledge,
    private readonly llmAdapter: ILLMPort,
    private readonly conversationRepo: IConversationRepository,
    private readonly citationResolver: SourceCitationResolver,
    private readonly titleGenerator: ConversationTitleGenerator,
    private readonly logger: ILogger,
    private readonly responseGrounder?: CheckResponseGrounding,
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
    const searchResults = await this.retrieveKnowledge.execute(
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

    const strategies: ResponseGroundingStrategy[] = params?.responseGroundingStrategies ?? [];
    const prompt = buildRagPrompt(
      userContent,
      searchResults,
      history,
      strategies.includes("citation_forcing"),
    );

    const streamResult = await this.streamLLMResponse(
      conversationId,
      prompt,
      onToken,
      signal,
      params
        ? LLMStreamOptions.create({
            model: params.llmModel,
            temperature: params.llmTemperature,
            maxTokens: params.llmMaxTokens,
          })
        : undefined,
    );
    if (!streamResult.ok) return streamResult.message;

    return this.finalizeAssistantMessage(
      streamResult.content,
      userContent,
      searchResults,
      strategies,
      conversationId,
      history,
    );
  }

  private async streamLLMResponse(
    conversationId: string,
    prompt: string,
    onToken: (token: string) => void,
    signal: AbortSignal | undefined,
    llmOptions: LLMStreamOptions | undefined,
  ): Promise<{ ok: true; content: string } | { ok: false; message: Message }> {
    try {
      const content = await this.llmAdapter.stream(
        prompt,
        onToken,
        signal,
        LLMStreamOptions.create({
          model: llmOptions?.model,
          temperature: llmOptions?.temperature,
          maxTokens: llmOptions?.maxTokens,
          systemPrompt: "Always respond in the same language as the user's question.",
        }),
      );
      this.logger.info("LLM response complete", { conversationId });
      return { ok: true, content };
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
      return { ok: false, message: errorMessage };
    }
  }

  private async finalizeAssistantMessage(
    rawContent: string,
    userContent: string,
    searchResults: ChunkSearchResult[],
    strategies: ResponseGroundingStrategy[],
    conversationId: string,
    history: Message[],
  ): Promise<Message> {
    const { sources, titleById } = await this.citationResolver.resolve(searchResults);

    const { assistantContent, responseGrounding } = await this.applyResponseGrounding(
      rawContent,
      userContent,
      searchResults,
      strategies,
      titleById,
    );

    this.logger.info("Response grounding complete", {
      conversationId,
      strategies,
      results: responseGrounding.length,
    });

    const assistantMessage: Message = {
      id: randomUUID(),
      conversationId,
      role: "assistant",
      content: assistantContent,
      sources,
      responseGrounding: responseGrounding.length > 0 ? responseGrounding : undefined,
      createdAt: new Date(),
    };
    await this.conversationRepo.addMessage(conversationId, assistantMessage);

    if (history.length === 0) {
      const title = await this.titleGenerator.generate(userContent, assistantContent);
      await this.conversationRepo.updateTitle(conversationId, title);
    }

    return assistantMessage;
  }

  private async applyResponseGrounding(
    rawContent: string,
    userContent: string,
    searchResults: ChunkSearchResult[],
    strategies: ResponseGroundingStrategy[],
    titleById: Map<string, string>,
  ): Promise<{
    assistantContent: string;
    responseGrounding: ResponseGroundingResult[];
  }> {
    const useCitationForcing = strategies.includes("citation_forcing");
    let assistantContent = rawContent;
    let inlineCitationResult: ResponseGroundingResult | undefined;

    if (useCitationForcing) {
      const parsed = parseCitationForcingResult(rawContent, searchResults, titleById);
      assistantContent = parsed.cleanContent;
      inlineCitationResult = parsed.result;
    }

    const otherStrategies = strategies.filter((s) => s !== "citation_forcing");
    const otherChecks =
      this.responseGrounder && otherStrategies.length > 0
        ? await this.responseGrounder.run(
            userContent,
            assistantContent,
            searchResults,
            otherStrategies,
            titleById,
          )
        : [];

    return {
      assistantContent,
      responseGrounding: [...(inlineCitationResult ? [inlineCitationResult] : []), ...otherChecks],
    };
  }
}

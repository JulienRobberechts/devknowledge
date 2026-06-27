import { randomUUID } from "node:crypto";
import type {
  IAskQuestion,
  ICheckResponseGrounding,
  IConversationTitleGenerator,
  IRetrieveKnowledge,
  ISourceCitationResolver,
} from "../../app-ports/rag";
import type {
  ChunkSearchResult,
  Message,
  ResponseGroundingResult,
  ResponseGroundingStrategy,
} from "../../domain/entities";
import { buildRagPrompt } from "../../domain/services";
import type { ILogger } from "../../infra-ports";
import { type ILLMPort, LLMStreamOptions } from "../../infra-ports/ai";
import type { IConversationRepository } from "../../infra-ports/persistence";
import { parseCitationForcingResult } from "./responseGrounding/strategies/citationForcing";

const NO_INFO_RESPONSE =
  "I don't have enough information to answer this question based on the available knowledge base.";
const ERROR_RESPONSE = "An error occurred while generating the response.";

/** Use case: answers a user question via RAG — retrieves relevant chunks, streams the LLM response, and applies the configured quality checks. */
export class AskQuestion implements IAskQuestion {
  constructor(
    private readonly retrieveKnowledge: IRetrieveKnowledge,
    private readonly llmAdapter: ILLMPort,
    private readonly conversationRepo: IConversationRepository,
    private readonly citationResolver: ISourceCitationResolver,
    private readonly titleGenerator: IConversationTitleGenerator,
    private readonly logger: ILogger,
    private readonly responseGrounder?: ICheckResponseGrounding,
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
      const noInfoMessage = this.makeAssistantMessage(conversationId, NO_INFO_RESPONSE);
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
      LLMStreamOptions.create({
        model: params?.llmModel,
        temperature: params?.llmTemperature,
        maxTokens: params?.llmMaxTokens,
        systemPrompt: "Always respond in the same language as the user's question.",
      }),
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
    llmOptions: LLMStreamOptions,
  ): Promise<{ ok: true; content: string } | { ok: false; message: Message }> {
    try {
      const content = await this.llmAdapter.stream(prompt, onToken, signal, llmOptions);
      this.logger.info("LLM response complete", { conversationId });
      return { ok: true, content };
    } catch (err) {
      this.logger.error(
        "LLM streaming failed",
        err instanceof Error ? err : new Error(String(err)),
      );
      const errorMessage = this.makeAssistantMessage(conversationId, ERROR_RESPONSE);
      await this.conversationRepo.addMessage(conversationId, errorMessage);
      return { ok: false, message: errorMessage };
    }
  }

  private makeAssistantMessage(conversationId: string, content: string): Message {
    return {
      id: randomUUID(),
      conversationId,
      role: "assistant",
      content,
      sources: [],
      createdAt: new Date(),
    };
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
    const tasks: Promise<unknown>[] = [
      this.conversationRepo.addMessage(conversationId, assistantMessage),
    ];
    if (history.length === 0) {
      tasks.push(
        this.titleGenerator
          .generate(userContent, assistantContent)
          .then((title) => this.conversationRepo.updateTitle(conversationId, title)),
      );
    }
    await Promise.all(tasks);

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

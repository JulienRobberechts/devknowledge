import { randomUUID } from "crypto";
import { Message, SourceCitation } from "../domain/entities/Message";
import { ChunkSearchResult } from "../domain/ports/ChunkRepository";
import { ConversationRepository } from "../domain/ports/ConversationRepository";
import { LLMPort } from "../domain/ports/LLMPort";
import { SearchKnowledge } from "./SearchKnowledge";

const SLIDING_WINDOW_EXCHANGES = 4;
const NO_INFO_RESPONSE =
  "I don't have enough information to answer this question based on the available knowledge base.";
const ERROR_RESPONSE = "An error occurred while generating the response.";

interface AskQuestionConfig {
  retrievalLimit?: number;
  retrievalMinScore?: number;
}

export class AskQuestion {
  private readonly retrievalLimit: number;
  private readonly retrievalMinScore: number;

  constructor(
    private readonly searchKnowledge: SearchKnowledge,
    private readonly llmAdapter: LLMPort,
    private readonly conversationRepo: ConversationRepository,
    config: AskQuestionConfig = {},
  ) {
    this.retrievalLimit = config.retrievalLimit ?? 8;
    this.retrievalMinScore = config.retrievalMinScore ?? 0.75;
  }

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

    const searchResults = await this.searchKnowledge.execute(
      userContent,
      this.retrievalLimit,
      this.retrievalMinScore,
    );

    if (searchResults.length === 0) {
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
      assistantContent = await this.llmAdapter.stream(prompt, onToken, signal);
    } catch {
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

    const sources: SourceCitation[] = searchResults.map((result) => ({
      chunkId: result.chunk.id,
      documentId: result.chunk.documentId,
      documentTitle: result.chunk.documentId,
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
    return assistantMessage;
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

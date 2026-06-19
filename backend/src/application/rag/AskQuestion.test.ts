import { randomUUID } from "node:crypto";
import { assert, beforeEach, describe, expect, it, vi } from "vitest";
import { InMemoryConversationRepository } from "../../../tests/fakes/InMemoryConversationRepository";
import { nullLogger } from "../../../tests/fakes/NullLogger";
import type { IRetrieveKnowledge } from "../../app-ports/rag/IRetrieveKnowledge";
import { type Chunk, ChunkMetadata } from "../../domain/entities/Chunk";
import type { ChunkSearchResult } from "../../domain/entities/ChunkSearchResult";
import { type Conversation, ConversationParams } from "../../domain/entities/Conversation";
import { type Message, SourceCitation } from "../../domain/entities/Message";
import { AskQuestion } from "./AskQuestion";
import type { ConversationTitleGenerator } from "./ConversationTitleGenerator";
import type { SourceCitationResolver } from "./SourceCitationResolver";

function makeConversation(overrides?: Partial<Conversation>): Conversation {
  return {
    id: randomUUID(),
    title: "Test",
    messages: [],
    createdAt: new Date(),
    params: ConversationParams.create({
      retrievalLimit: 8,
      retrievalMinScore: 0.75,
      rerankEnabled: false,
      rerankModel: "rerank-2.5",
      rerankCandidateMultiplier: 3,
      llmModel: "claude-haiku-4-5-20251001",
      llmTemperature: 0.1,
      llmMaxTokens: 1024,
      responseGroundingStrategies: [],
      searchMode: "hybrid",
    }),
    ...overrides,
  };
}

function makeMessage(conversationId: string, role: "user" | "assistant", content: string): Message {
  return {
    id: randomUUID(),
    conversationId,
    role,
    content,
    sources: [],
    createdAt: new Date(),
  };
}

function makeChunkResult(content = "Relevant content"): ChunkSearchResult {
  const chunk: Chunk = {
    id: randomUUID(),
    documentId: randomUUID(),
    content,
    embedding: [],
    metadata: ChunkMetadata.create(0, 0, content.length),
  };
  return { chunk, score: 0.9 };
}

function makeLLMAdapter(response = "Test LLM response") {
  return {
    stream: vi.fn().mockImplementation(async (_prompt: string, onToken: (t: string) => void) => {
      onToken(response);
      return response;
    }),
  };
}

describe("AskQuestion", () => {
  let convRepo: InMemoryConversationRepository;
  let llmAdapter: ReturnType<typeof makeLLMAdapter>;
  let mockRetrieveKnowledge: { execute: ReturnType<typeof vi.fn> };
  let mockCitationResolver: { resolve: ReturnType<typeof vi.fn> };
  let mockTitleGenerator: { generate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    convRepo = new InMemoryConversationRepository();
    llmAdapter = makeLLMAdapter();
    mockRetrieveKnowledge = {
      execute: vi.fn().mockResolvedValue([makeChunkResult()]),
    };
    mockCitationResolver = {
      resolve: vi.fn().mockResolvedValue({ sources: [], titleById: new Map() }),
    };
    mockTitleGenerator = {
      generate: vi.fn().mockResolvedValue("Test Title"),
    };
  });

  function makeAskQuestion() {
    return new AskQuestion(
      mockRetrieveKnowledge as unknown as IRetrieveKnowledge,
      llmAdapter,
      convRepo,
      mockCitationResolver as unknown as SourceCitationResolver,
      mockTitleGenerator as unknown as ConversationTitleGenerator,
      nullLogger,
    );
  }

  it("should call RetrieveKnowledge to retrieve relevant chunks", async () => {
    const conv = makeConversation();
    await convRepo.save(conv);
    await makeAskQuestion().execute(conv.id, "What is RAG?", vi.fn());
    expect(mockRetrieveKnowledge.execute).toHaveBeenCalledWith(
      "What is RAG?",
      expect.any(Number),
      expect.any(Number),
      expect.any(Object),
      expect.anything(),
    );
  });

  it("should build a context prompt with retrieved chunks formatted as SOURCE N", async () => {
    const conv = makeConversation();
    await convRepo.save(conv);
    mockRetrieveKnowledge.execute.mockResolvedValue([
      makeChunkResult("First relevant chunk"),
      makeChunkResult("Second relevant chunk"),
    ]);
    await makeAskQuestion().execute(conv.id, "Question?", vi.fn());
    const prompt: string = llmAdapter.stream.mock.calls[0][0];
    expect(prompt).toContain("SOURCE 1:");
    expect(prompt).toContain("First relevant chunk");
    expect(prompt).toContain("SOURCE 2:");
    expect(prompt).toContain("Second relevant chunk");
  });

  it("should include last 4 conversation exchanges in the prompt (sliding window)", async () => {
    const conv = makeConversation();
    await convRepo.save(conv);
    for (let i = 0; i < 5; i++) {
      await convRepo.addMessage(conv.id, makeMessage(conv.id, "user", `User msg ${i}`));
      await convRepo.addMessage(conv.id, makeMessage(conv.id, "assistant", `Assistant msg ${i}`));
    }
    await makeAskQuestion().execute(conv.id, "Current question", vi.fn());
    const prompt: string = llmAdapter.stream.mock.calls[0][0];
    expect(prompt).toContain("User msg 1");
    expect(prompt).toContain("Assistant msg 1");
    expect(prompt).toContain("User msg 4");
    expect(prompt).not.toContain("User msg 0");
    expect(prompt).not.toContain("Assistant msg 0");
  });

  it("should stream tokens via the onToken callback", async () => {
    const conv = makeConversation();
    await convRepo.save(conv);
    const onToken = vi.fn();
    llmAdapter.stream.mockImplementation(async (_p: string, cb: (t: string) => void) => {
      cb("token1");
      cb("token2");
      return "token1token2";
    });
    await makeAskQuestion().execute(conv.id, "Question?", onToken);
    expect(onToken).toHaveBeenCalledWith("token1");
    expect(onToken).toHaveBeenCalledWith("token2");
  });

  it("should save the user message and assistant message to conversation repository", async () => {
    const conv = makeConversation();
    await convRepo.save(conv);
    await makeAskQuestion().execute(conv.id, "My question", vi.fn());
    const updated = await convRepo.findById(conv.id);
    expect(updated?.messages).toHaveLength(2);
    expect(updated?.messages[0].role).toBe("user");
    expect(updated?.messages[0].content).toBe("My question");
    expect(updated?.messages[1].role).toBe("assistant");
  });

  it("should attach source citations to the saved assistant message", async () => {
    const conv = makeConversation();
    await convRepo.save(conv);
    const chunkResult = makeChunkResult("Source content");
    mockRetrieveKnowledge.execute.mockResolvedValue([chunkResult]);

    const fakeCitation = SourceCitation.create({
      chunkId: chunkResult.chunk.id,
      documentId: chunkResult.chunk.documentId,
      documentTitle: "Doc",
      sourceType: "text",
      excerpt: chunkResult.chunk.content,
      score: chunkResult.score,
    });
    mockCitationResolver.resolve.mockResolvedValue({
      sources: [fakeCitation],
      titleById: new Map([[chunkResult.chunk.documentId, "Doc"]]),
    });

    await makeAskQuestion().execute(conv.id, "Question?", vi.fn());
    const updated = await convRepo.findById(conv.id);
    const assistantMsg = updated?.messages[1];
    expect(assistantMsg).toBeDefined();
    assert(assistantMsg);
    expect(assistantMsg.sources).toHaveLength(1);
    expect(assistantMsg.sources[0].chunkId).toBe(chunkResult.chunk.id);
    expect(assistantMsg.sources[0].score).toBe(chunkResult.score);
  });

  it("should handle LLM adapter error gracefully — message saved with error content", async () => {
    const conv = makeConversation();
    await convRepo.save(conv);
    llmAdapter.stream.mockRejectedValue(new Error("LLM failed"));
    await expect(makeAskQuestion().execute(conv.id, "Question?", vi.fn())).resolves.toBeDefined();
    const updated = await convRepo.findById(conv.id);
    expect(updated?.messages).toHaveLength(2);
    expect(updated?.messages[1].role).toBe("assistant");
    expect(updated?.messages[1].content).toBeTruthy();
  });

  it('should return "no information found" response when no chunks above threshold', async () => {
    const conv = makeConversation();
    await convRepo.save(conv);
    mockRetrieveKnowledge.execute.mockResolvedValue([]);
    const result = await makeAskQuestion().execute(conv.id, "Unknown topic", vi.fn());
    expect(llmAdapter.stream).not.toHaveBeenCalled();
    expect(result.role).toBe("assistant");
    expect(result.sources).toHaveLength(0);
    const saved = await convRepo.findById(conv.id);
    expect(saved?.messages).toHaveLength(2);
  });
});

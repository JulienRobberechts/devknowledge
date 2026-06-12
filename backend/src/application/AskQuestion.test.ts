import { randomUUID } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Chunk } from "../domain/entities/Chunk";
import { Conversation } from "../domain/entities/Conversation";
import { Message } from "../domain/entities/Message";
import { AskQuestion } from "./AskQuestion";
import { SearchKnowledge } from "./SearchKnowledge";
import { ChunkSearchResult } from "../domain/ports/ChunkRepository";
import { InMemoryConversationRepository } from "../../tests/fakes/InMemoryConversationRepository";

function makeConversation(overrides?: Partial<Conversation>): Conversation {
  return {
    id: randomUUID(),
    title: "Test",
    messages: [],
    createdAt: new Date(),
    params: {
      retrievalLimit: 8,
      retrievalMinScore: 0.75,
      rerankEnabled: false,
      rerankModel: "rerank-2.5",
      rerankCandidateMultiplier: 3,
      llmModel: "claude-haiku-4-5-20251001",
      llmTemperature: 0.1,
      llmMaxTokens: 1024,
      knowledgeCheckStrategies: [],
      searchMode: "hybrid" as const,
    },
    ...overrides,
  };
}

function makeMessage(
  conversationId: string,
  role: "user" | "assistant",
  content: string,
): Message {
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
    metadata: { position: 0, startChar: 0, endChar: content.length },
  };
  return { chunk, score: 0.9 };
}

function makeLLMAdapter(response = "Test LLM response") {
  return {
    stream: vi
      .fn()
      .mockImplementation(
        async (_prompt: string, onToken: (t: string) => void) => {
          onToken(response);
          return response;
        },
      ),
  };
}

describe("AskQuestion", () => {
  let convRepo: InMemoryConversationRepository;
  let llmAdapter: ReturnType<typeof makeLLMAdapter>;
  let mockSearchKnowledge: Pick<SearchKnowledge, "execute"> & {
    execute: ReturnType<typeof vi.fn>;
  };
  let mockDocumentRepo: { findById: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    convRepo = new InMemoryConversationRepository();
    llmAdapter = makeLLMAdapter();
    mockSearchKnowledge = {
      execute: vi.fn().mockResolvedValue([makeChunkResult()]),
    };
    mockDocumentRepo = { findById: vi.fn().mockResolvedValue(null) };
  });

  it("should call SearchKnowledge to retrieve relevant chunks", async () => {
    const conv = makeConversation();
    await convRepo.save(conv);
    const ask = new AskQuestion(
      mockSearchKnowledge as unknown as SearchKnowledge,
      llmAdapter,
      convRepo,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockDocumentRepo as any,
    );
    await ask.execute(conv.id, "What is RAG?", vi.fn());
    expect(mockSearchKnowledge.execute).toHaveBeenCalledWith(
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
    mockSearchKnowledge.execute.mockResolvedValue([
      makeChunkResult("First relevant chunk"),
      makeChunkResult("Second relevant chunk"),
    ]);
    const ask = new AskQuestion(
      mockSearchKnowledge as unknown as SearchKnowledge,
      llmAdapter,
      convRepo,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockDocumentRepo as any,
    );
    await ask.execute(conv.id, "Question?", vi.fn());
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
      await convRepo.addMessage(
        conv.id,
        makeMessage(conv.id, "user", `User msg ${i}`),
      );
      await convRepo.addMessage(
        conv.id,
        makeMessage(conv.id, "assistant", `Assistant msg ${i}`),
      );
    }
    const ask = new AskQuestion(
      mockSearchKnowledge as unknown as SearchKnowledge,
      llmAdapter,
      convRepo,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockDocumentRepo as any,
    );
    await ask.execute(conv.id, "Current question", vi.fn());
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
    llmAdapter.stream.mockImplementation(
      async (_p: string, cb: (t: string) => void) => {
        cb("token1");
        cb("token2");
        return "token1token2";
      },
    );
    const ask = new AskQuestion(
      mockSearchKnowledge as unknown as SearchKnowledge,
      llmAdapter,
      convRepo,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockDocumentRepo as any,
    );
    await ask.execute(conv.id, "Question?", onToken);
    expect(onToken).toHaveBeenCalledWith("token1");
    expect(onToken).toHaveBeenCalledWith("token2");
  });

  it("should save the user message and assistant message to conversation repository", async () => {
    const conv = makeConversation();
    await convRepo.save(conv);
    const ask = new AskQuestion(
      mockSearchKnowledge as unknown as SearchKnowledge,
      llmAdapter,
      convRepo,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockDocumentRepo as any,
    );
    await ask.execute(conv.id, "My question", vi.fn());
    const updated = await convRepo.findById(conv.id);
    expect(updated!.messages).toHaveLength(2);
    expect(updated!.messages[0].role).toBe("user");
    expect(updated!.messages[0].content).toBe("My question");
    expect(updated!.messages[1].role).toBe("assistant");
  });

  it("should attach source citations to the saved assistant message", async () => {
    const conv = makeConversation();
    await convRepo.save(conv);
    const chunkResult = makeChunkResult("Source content");
    mockSearchKnowledge.execute.mockResolvedValue([chunkResult]);
    const ask = new AskQuestion(
      mockSearchKnowledge as unknown as SearchKnowledge,
      llmAdapter,
      convRepo,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockDocumentRepo as any,
    );
    await ask.execute(conv.id, "Question?", vi.fn());
    const updated = await convRepo.findById(conv.id);
    const assistantMsg = updated!.messages[1];
    expect(assistantMsg.sources).toHaveLength(1);
    expect(assistantMsg.sources[0].chunkId).toBe(chunkResult.chunk.id);
    expect(assistantMsg.sources[0].score).toBe(chunkResult.score);
  });

  it("should handle LLM adapter error gracefully — message saved with error content", async () => {
    const conv = makeConversation();
    await convRepo.save(conv);
    llmAdapter.stream.mockRejectedValue(new Error("LLM failed"));
    const ask = new AskQuestion(
      mockSearchKnowledge as unknown as SearchKnowledge,
      llmAdapter,
      convRepo,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockDocumentRepo as any,
    );
    await expect(
      ask.execute(conv.id, "Question?", vi.fn()),
    ).resolves.toBeDefined();
    const updated = await convRepo.findById(conv.id);
    expect(updated!.messages).toHaveLength(2);
    expect(updated!.messages[1].role).toBe("assistant");
    expect(updated!.messages[1].content).toBeTruthy();
  });

  it('should return "no information found" response when no chunks above threshold', async () => {
    const conv = makeConversation();
    await convRepo.save(conv);
    mockSearchKnowledge.execute.mockResolvedValue([]);
    const ask = new AskQuestion(
      mockSearchKnowledge as unknown as SearchKnowledge,
      llmAdapter,
      convRepo,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockDocumentRepo as any,
    );
    const result = await ask.execute(conv.id, "Unknown topic", vi.fn());
    expect(llmAdapter.stream).not.toHaveBeenCalled();
    expect(result.role).toBe("assistant");
    expect(result.sources).toHaveLength(0);
    const saved = await convRepo.findById(conv.id);
    expect(saved!.messages).toHaveLength(2);
  });
});

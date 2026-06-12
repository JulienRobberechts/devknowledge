import { describe, it, expect, vi, beforeEach } from "vitest";

const mockStream = vi.fn();
const mockAbort = vi.fn();

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(function (this: Record<string, unknown>) {
    this.messages = { stream: mockStream };
  }),
}));

vi.mock("../../config", () => ({
  default: {
    llm: { anthropic: { apiKey: "test-key", maxTokens: 512 } },
    server: { nodeEnv: "test" },
  },
}));

import { AnthropicLLMAdapter } from "./AnthropicLLMAdapter";

function makeTextChunk(text: string) {
  return {
    type: "content_block_delta",
    delta: { type: "text_delta", text },
  };
}

function makeAsyncIter(chunks: unknown[], abort = mockAbort) {
  let i = 0;
  return {
    abort,
    [Symbol.asyncIterator]() {
      return this;
    },
    async next() {
      if (i < chunks.length)
        return { value: chunks[i++], done: false as const };
      return { value: undefined as never, done: true as const };
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AnthropicLLMAdapter", () => {
  it("streams tokens via onToken and returns assembled content", async () => {
    mockStream.mockReturnValue(
      makeAsyncIter([makeTextChunk("hello "), makeTextChunk("world")]),
    );
    const adapter = new AnthropicLLMAdapter("key");
    const tokens: string[] = [];
    const result = await adapter.stream("prompt", (t) => tokens.push(t));
    expect(tokens).toEqual(["hello ", "world"]);
    expect(result).toBe("hello world");
  });

  it("ignores non text_delta chunk types", async () => {
    mockStream.mockReturnValue(
      makeAsyncIter([
        { type: "message_start" },
        makeTextChunk("text"),
        { type: "message_stop" },
      ]),
    );
    const adapter = new AnthropicLLMAdapter("key");
    const tokens: string[] = [];
    await adapter.stream("prompt", (t) => tokens.push(t));
    expect(tokens).toEqual(["text"]);
  });

  it("returns empty string and skips tokens when signal already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    mockStream.mockReturnValue(
      makeAsyncIter([makeTextChunk("a"), makeTextChunk("b")]),
    );
    const adapter = new AnthropicLLMAdapter("key");
    const tokens: string[] = [];
    const result = await adapter.stream(
      "prompt",
      (t) => tokens.push(t),
      controller.signal,
    );
    expect(tokens).toEqual([]);
    expect(result).toBe("");
  });

  it("calls abort when signal fires after stream starts", async () => {
    const controller = new AbortController();
    mockStream.mockReturnValue(makeAsyncIter([], mockAbort));
    const adapter = new AnthropicLLMAdapter("key");
    await adapter.stream("prompt", vi.fn(), controller.signal);
    controller.abort();
    expect(mockAbort).toHaveBeenCalled();
  });
});

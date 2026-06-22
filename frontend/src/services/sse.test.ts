import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createConversationAndStream, streamMessage } from "./sse";

function makeSSEBody(chunks: string[]): ReadableStream<Uint8Array<ArrayBuffer>> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array<ArrayBuffer>>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

function makeFetch(overrides: Partial<Response> = {}) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    body: makeSSEBody([]),
    ...overrides,
  });
}

describe("streamMessage", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", makeFetch());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fires onDelta per token and onDone with messageId", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetch({
        body: makeSSEBody([
          'event: delta\ndata: {"token":"Hello"}\n\n',
          'event: delta\ndata: {"token":" world"}\n\n',
          'event: done\ndata: {"messageId":"msg-1"}\n\n',
        ]),
      }),
    );

    const onDelta = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();

    streamMessage("conv-1", "hi", {
      onDelta,
      onSources: vi.fn(),
      onResponseGrounding: vi.fn(),
      onDone,
      onError,
    });

    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());

    expect(onDelta).toHaveBeenCalledTimes(2);
    expect(onDelta).toHaveBeenNthCalledWith(1, "Hello");
    expect(onDelta).toHaveBeenNthCalledWith(2, " world");
    expect(onDone).toHaveBeenCalledWith("msg-1");
    expect(onError).not.toHaveBeenCalled();
  });

  it("handles SSE event split across two chunks", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetch({
        // "event: delta\n" in first chunk, "data: ...\n\n" in second
        body: makeSSEBody([
          "event: delta\n",
          'data: {"token":"split"}\n\nevent: done\ndata: {"messageId":"msg-2"}\n\n',
        ]),
      }),
    );

    const onDelta = vi.fn();
    const onDone = vi.fn();

    streamMessage("conv-1", "hi", {
      onDelta,
      onSources: vi.fn(),
      onResponseGrounding: vi.fn(),
      onDone,
      onError: vi.fn(),
    });

    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());

    expect(onDelta).toHaveBeenCalledWith("split");
    expect(onDone).toHaveBeenCalledWith("msg-2");
  });

  it("calls onError and does not throw on non-ok response", async () => {
    vi.stubGlobal("fetch", makeFetch({ ok: false, status: 500, body: null }));

    const onError = vi.fn();
    const onDone = vi.fn();

    streamMessage("conv-1", "hi", {
      onDelta: vi.fn(),
      onSources: vi.fn(),
      onResponseGrounding: vi.fn(),
      onDone,
      onError,
    });

    await vi.waitFor(() => expect(onError).toHaveBeenCalled());
    expect(onDone).not.toHaveBeenCalled();
  });

  it("calls onError on 401 and does not call onDone", async () => {
    vi.stubGlobal("fetch", makeFetch({ ok: false, status: 401, body: null }));

    const onError = vi.fn();

    streamMessage("conv-1", "hi", {
      onDelta: vi.fn(),
      onSources: vi.fn(),
      onResponseGrounding: vi.fn(),
      onDone: vi.fn(),
      onError,
    });

    await vi.waitFor(() => expect(onError).toHaveBeenCalledWith("Session expired"));
  });

  it("returns a close function that aborts the fetch", async () => {
    let capturedSignal: AbortSignal | undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url: string, opts: RequestInit) => {
        capturedSignal = opts.signal as AbortSignal;
        return new Promise(() => {}); // never resolves
      }),
    );

    const close = streamMessage("conv-1", "hi", {
      onDelta: vi.fn(),
      onSources: vi.fn(),
      onResponseGrounding: vi.fn(),
      onDone: vi.fn(),
      onError: vi.fn(),
    });

    expect(capturedSignal?.aborted).toBe(false);
    close();
    expect(capturedSignal?.aborted).toBe(true);
  });
});

describe("createConversationAndStream", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fires onCreated then delta tokens then onDone", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetch({
        body: makeSSEBody([
          'event: created\ndata: {"conversationId":"conv-new"}\n\n',
          'event: delta\ndata: {"token":"Answer"}\n\n',
          'event: done\ndata: {"messageId":"msg-3"}\n\n',
        ]),
      }),
    );

    const onCreated = vi.fn();
    const onDelta = vi.fn();
    const onDone = vi.fn();

    createConversationAndStream({}, "first message", {
      onCreated,
      onDelta,
      onSources: vi.fn(),
      onResponseGrounding: vi.fn(),
      onDone,
      onError: vi.fn(),
    });

    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());

    expect(onCreated).toHaveBeenCalledWith("conv-new");
    expect(onDelta).toHaveBeenCalledWith("Answer");
    expect(onDone).toHaveBeenCalledWith("msg-3");
  });
});

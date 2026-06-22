import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSSEStream } from "./useSSEStream";

vi.mock("../services/sse", () => ({
  streamMessage: vi.fn(),
  createConversationAndStream: vi.fn(),
  setOnUnauthorized: vi.fn(),
}));

import { createConversationAndStream, streamMessage } from "../services/sse";

afterEach(() => {
  vi.clearAllMocks();
});

describe("useSSEStream — send", () => {
  it("sets isStreaming, accumulates text tokens, calls onComplete on done", () => {
    let handlers: Parameters<typeof streamMessage>[2] | undefined;
    vi.mocked(streamMessage).mockImplementation((_id, _content, h) => {
      handlers = h;
      return vi.fn();
    });

    const { result } = renderHook(() => useSSEStream("conv-1"));

    const onComplete = vi.fn();
    act(() => {
      result.current.send("question", onComplete);
    });

    expect(result.current.isStreaming).toBe(true);

    act(() => {
      handlers?.onDelta("Hello");
      handlers?.onDelta(" world");
    });

    expect(result.current.text).toBe("Hello world");

    act(() => {
      handlers?.onDone("msg-1");
    });

    expect(result.current.isStreaming).toBe(false);
    expect(onComplete).toHaveBeenCalled();
  });

  it("resets text on each new send call", () => {
    let handlers: Parameters<typeof streamMessage>[2] | undefined;
    vi.mocked(streamMessage).mockImplementation((_id, _content, h) => {
      handlers = h;
      return vi.fn();
    });

    const { result } = renderHook(() => useSSEStream("conv-1"));

    act(() => {
      result.current.send("first");
    });
    act(() => {
      handlers?.onDelta("First answer");
      handlers?.onDone("msg-1");
    });

    act(() => {
      result.current.send("second");
    });

    // text should be cleared for the new send
    expect(result.current.text).toBe("");
  });

  it("sets isStreaming to false on onError", () => {
    let handlers: Parameters<typeof streamMessage>[2] | undefined;
    vi.mocked(streamMessage).mockImplementation((_id, _content, h) => {
      handlers = h;
      return vi.fn();
    });

    const { result } = renderHook(() => useSSEStream("conv-1"));

    act(() => {
      result.current.send("question");
    });
    expect(result.current.isStreaming).toBe(true);

    act(() => {
      handlers?.onError("network error");
    });
    expect(result.current.isStreaming).toBe(false);
  });

  it("calls the abort function when unmounted during streaming", () => {
    const abortFn = vi.fn();
    vi.mocked(streamMessage).mockReturnValue(abortFn);

    const { result, unmount } = renderHook(() => useSSEStream("conv-1"));

    act(() => {
      result.current.send("question");
    });

    unmount();

    expect(abortFn).toHaveBeenCalled();
  });
});

describe("useSSEStream — startNew", () => {
  it("captures createdId and calls onComplete with it on done", () => {
    let handlers: Parameters<typeof createConversationAndStream>[2] | undefined;
    vi.mocked(createConversationAndStream).mockImplementation((_params, _content, h) => {
      handlers = h;
      return vi.fn();
    });

    const { result } = renderHook(() => useSSEStream(""));

    const onComplete = vi.fn();
    act(() => {
      result.current.startNew({}, "first message", onComplete);
    });

    expect(result.current.isStreaming).toBe(true);

    act(() => {
      handlers?.onCreated("conv-new");
      handlers?.onDelta("Answer");
    });

    expect(result.current.text).toBe("Answer");

    act(() => {
      handlers?.onDone("msg-1");
    });

    expect(result.current.isStreaming).toBe(false);
    expect(onComplete).toHaveBeenCalledWith("conv-new");
  });

  it("calls onComplete with empty string when onCreated was never fired", () => {
    let handlers: Parameters<typeof createConversationAndStream>[2] | undefined;
    vi.mocked(createConversationAndStream).mockImplementation((_params, _content, h) => {
      handlers = h;
      return vi.fn();
    });

    const { result } = renderHook(() => useSSEStream(""));

    const onComplete = vi.fn();
    act(() => {
      result.current.startNew({}, "msg", onComplete);
    });

    // done without created — onComplete still called (with empty id)
    act(() => {
      handlers?.onDone("msg-2");
    });

    expect(onComplete).toHaveBeenCalledWith("");
  });
});

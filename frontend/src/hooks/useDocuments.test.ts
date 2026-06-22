import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useDeleteDocument, useDocuments, useUploadDocument } from "./useDocuments";

vi.mock("../services/api", () => ({
  api: {
    getDocuments: vi.fn(),
    uploadDocument: vi.fn(),
    getDocument: vi.fn(),
    deleteDocument: vi.fn(),
  },
}));

import { api } from "../services/api";

function makeDoc(id: string, status: string) {
  return {
    id,
    title: `${id}.pdf`,
    sourceType: "pdf" as const,
    status: status as "pending" | "processing" | "ready" | "error",
    createdAt: "2026-01-01T00:00:00Z",
    filePath: null,
  };
}

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { queryClient, Wrapper };
}

describe("useDocuments", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns documents from the API", async () => {
    const docs = [makeDoc("doc-1", "ready"), makeDoc("doc-2", "processing")];
    vi.mocked(api.getDocuments).mockResolvedValue(docs);

    const { Wrapper } = makeWrapper();
    const { result } = renderHook(() => useDocuments(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(docs);
  });
});

describe("useUploadDocument", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("invalidates documents cache immediately on success", async () => {
    vi.mocked(api.uploadDocument).mockResolvedValue({
      id: "doc-1",
      status: "processing",
    });
    vi.mocked(api.getDocument).mockResolvedValue(makeDoc("doc-1", "ready"));

    const { queryClient, Wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUploadDocument(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({ file: new File([], "test.pdf") });
    });

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["documents"] });
  });

  it("polls getDocument until status is ready, then stops and re-invalidates", async () => {
    vi.mocked(api.uploadDocument).mockResolvedValue({
      id: "doc-1",
      status: "processing",
    });
    vi.mocked(api.getDocument)
      .mockResolvedValueOnce(makeDoc("doc-1", "processing"))
      .mockResolvedValueOnce(makeDoc("doc-1", "ready"));

    const { queryClient, Wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUploadDocument(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({ file: new File([], "test.pdf") });
    });

    // First poll — status processing, interval continues
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(api.getDocument).toHaveBeenCalledTimes(1);

    // Second poll — status ready, interval cleared + second invalidation
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(api.getDocument).toHaveBeenCalledTimes(2);

    // Third tick — interval should be cleared, no more calls
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(api.getDocument).toHaveBeenCalledTimes(2);

    // invalidateQueries called twice: once on upload success, once when ready
    expect(invalidateSpy).toHaveBeenCalledTimes(2);
  });

  it("stops polling when status is error", async () => {
    vi.mocked(api.uploadDocument).mockResolvedValue({
      id: "doc-1",
      status: "processing",
    });
    vi.mocked(api.getDocument).mockResolvedValue(makeDoc("doc-1", "error"));

    const { queryClient, Wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useUploadDocument(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync({ file: new File([], "test.pdf") });
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    expect(api.getDocument).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });
    // Still 1 — cleared after error
    expect(api.getDocument).toHaveBeenCalledTimes(1);

    expect(invalidateSpy).toHaveBeenCalledTimes(2);
  });
});

describe("useDeleteDocument", () => {
  afterEach(() => vi.clearAllMocks());

  it("invalidates documents cache on success", async () => {
    vi.mocked(api.deleteDocument).mockResolvedValue(undefined);

    const { queryClient, Wrapper } = makeWrapper();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useDeleteDocument(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.mutateAsync("doc-1");
    });

    expect(api.deleteDocument).toHaveBeenCalledWith("doc-1");
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ["documents"] });
  });
});

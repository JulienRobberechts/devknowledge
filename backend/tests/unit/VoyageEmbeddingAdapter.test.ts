import { describe, it, expect, vi, beforeEach } from "vitest";
import { VoyageEmbeddingAdapter } from "../../src/infrastructure/embeddings/VoyageEmbeddingAdapter";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeVoyageResponse(count: number) {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue({
      data: Array.from({ length: count }, (_, i) => ({
        index: i,
        embedding: Array(4).fill(0.1 * (i + 1)),
      })),
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("VoyageEmbeddingAdapter", () => {
  it("embed() delegates to embedMany and returns first vector", async () => {
    mockFetch.mockResolvedValue(makeVoyageResponse(1));
    const adapter = new VoyageEmbeddingAdapter("test-key");
    const result = await adapter.embed("hello");
    expect(result).toEqual(Array(4).fill(0.1));
  });

  it("embedMany() sends request with correct auth header", async () => {
    mockFetch.mockResolvedValue(makeVoyageResponse(1));
    const adapter = new VoyageEmbeddingAdapter("my-key");
    await adapter.embedMany(["text"]);
    const callArgs = mockFetch.mock.calls[0];
    expect(callArgs[1].headers.Authorization).toBe("Bearer my-key");
  });

  it("embedMany() returns vectors in order", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: [
          { index: 1, embedding: [0.2] },
          { index: 0, embedding: [0.1] },
        ],
      }),
    });
    const adapter = new VoyageEmbeddingAdapter("key");
    const result = await adapter.embedMany(["a", "b"]);
    expect(result[0]).toEqual([0.1]);
    expect(result[1]).toEqual([0.2]);
  });

  it("embedMany() splits texts into batches of 20 and adds delay", async () => {
    mockFetch.mockImplementation((_, opts: RequestInit) => {
      const body = JSON.parse(opts.body as string) as { input: string[] };
      return Promise.resolve(makeVoyageResponse(body.input.length));
    });

    const texts = Array.from({ length: 25 }, (_, i) => `text${i}`);
    const adapter = new VoyageEmbeddingAdapter("key");
    const start = Date.now();
    const result = await adapter.embedMany(texts);
    const elapsed = Date.now() - start;

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(25);
    expect(elapsed).toBeGreaterThanOrEqual(150);
  });

  it("embedMany() throws on non-ok API response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 429,
      text: vi.fn().mockResolvedValue("rate limit"),
    });
    const adapter = new VoyageEmbeddingAdapter("key");
    await expect(adapter.embedMany(["text"])).rejects.toThrow(
      "Voyage API error: 429",
    );
  });
});

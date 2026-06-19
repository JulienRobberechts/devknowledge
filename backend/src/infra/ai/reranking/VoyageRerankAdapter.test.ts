import { beforeEach, describe, expect, it, vi } from "vitest";
import { VoyageRerankAdapter } from "./VoyageRerankAdapter";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeRerankResponse(orderedIndices: number[]) {
  return {
    ok: true,
    json: vi.fn().mockResolvedValue({
      data: orderedIndices.map((index, rank) => ({
        index,
        relevance_score: 1 - rank * 0.1,
      })),
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("VoyageRerankAdapter", () => {
  it("returns indices sorted by relevance_score descending", async () => {
    mockFetch.mockResolvedValue(makeRerankResponse([2, 0, 1]));
    const adapter = new VoyageRerankAdapter("test-key", "rerank-2.5");
    const result = await adapter.rerank("query", ["doc0", "doc1", "doc2"]);
    expect(result).toEqual([2, 0, 1]);
  });

  it("sends request with correct auth header and body", async () => {
    mockFetch.mockResolvedValue(makeRerankResponse([0]));
    const adapter = new VoyageRerankAdapter("my-key", "rerank-2.5");
    await adapter.rerank("ma question", ["chunk A", "chunk B"]);

    const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.voyageai.com/v1/rerank");
    expect((options.headers as Record<string, string>).Authorization).toBe("Bearer my-key");
    const body = JSON.parse(options.body as string) as {
      model: string;
      query: string;
      documents: string[];
    };
    expect(body.model).toBe("rerank-2.5");
    expect(body.query).toBe("ma question");
    expect(body.documents).toEqual(["chunk A", "chunk B"]);
  });

  it("throws on non-ok API response", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: vi.fn().mockResolvedValue("unauthorized"),
    });
    const adapter = new VoyageRerankAdapter("bad-key", "rerank-2.5");
    await expect(adapter.rerank("q", ["doc"])).rejects.toThrow("Voyage rerank API error: 401");
  });

  it("handles response with unordered relevance scores", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        data: [
          { index: 0, relevance_score: 0.3 },
          { index: 1, relevance_score: 0.9 },
          { index: 2, relevance_score: 0.6 },
        ],
      }),
    });
    const adapter = new VoyageRerankAdapter("key", "rerank-2.5");
    const result = await adapter.rerank("q", ["a", "b", "c"]);
    expect(result).toEqual([1, 2, 0]);
  });
});

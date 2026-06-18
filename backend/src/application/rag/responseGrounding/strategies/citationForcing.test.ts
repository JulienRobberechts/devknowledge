import { describe, expect, it } from "vitest";
import { parseCitationForcingResult } from "./citationForcing";
import type { ChunkSearchResult } from "../../../../domain/entities/ChunkSearchResult";
import { ChunkMetadata, type Chunk } from "../../../../domain/entities/Chunk";
import { randomUUID } from "node:crypto";

function makeChunkResult(content: string): ChunkSearchResult {
  const chunk: Chunk = {
    id: randomUUID(),
    documentId: "doc-1",
    content,
    embedding: [],
    metadata: ChunkMetadata.create(0, 0, content.length),
  };
  return { chunk, score: 0.9 };
}

describe("parseCitationForcingResult", () => {
  it("parses claims with marker before period [SOURCE N].", () => {
    const raw =
      "The Orient Express was created in 1883 [SOURCE 1]. It is known for its luxury [SOURCE 2].";
    const chunks = [
      makeChunkResult("founded in 1883"),
      makeChunkResult("luxurious train"),
    ];

    const { cleanContent, result } = parseCitationForcingResult(raw, chunks);

    expect(result.claims).toHaveLength(2);
    expect(result.claims[0].claim).toBe(
      "The Orient Express was created in 1883",
    );
    expect(result.claims[0].status).toBe("SUPPORTED");
    expect(result.claims[1].claim).toBe("It is known for its luxury");
    expect(result.claims[1].status).toBe("SUPPORTED");
    expect(cleanContent).not.toContain("[SOURCE");
    expect(result.score).toBe(1);
  });

  it("parses claims with marker after period. [SOURCE N]", () => {
    const raw =
      "The Orient Express was created in 1883. [SOURCE 1] It is known for its luxury. [SOURCE 2]";
    const chunks = [
      makeChunkResult("founded in 1883"),
      makeChunkResult("luxurious train"),
    ];

    const { result } = parseCitationForcingResult(raw, chunks);

    expect(result.claims).toHaveLength(2);
    expect(result.claims[0].claim).toBe(
      "The Orient Express was created in 1883",
    );
    expect(result.claims[0].status).toBe("SUPPORTED");
    expect(result.claims[1].claim).toBe("It is known for its luxury");
    expect(result.claims[1].status).toBe("SUPPORTED");
    expect(result.score).toBe(1);
  });

  it("parses claims OWN KNOWLEDGE", () => {
    const raw = "The Orient Express is unique [OWN KNOWLEDGE].";

    const { result } = parseCitationForcingResult(raw, []);

    expect(result.claims).toHaveLength(1);
    expect(result.claims[0].claim).toBe("The Orient Express is unique");
    expect(result.claims[0].status).toBe("UNSUPPORTED");
    expect(result.score).toBe(0);
    expect(result.warning).toBeDefined();
  });

  it("parses a mix of SOURCE and OWN KNOWLEDGE in the same response", () => {
    const raw =
      "Founded in 1883. [SOURCE 1] Luxurious. [OWN KNOWLEDGE] Still active today [SOURCE 2].";
    const chunks = [
      makeChunkResult("founded in 1883"),
      makeChunkResult("still active"),
    ];

    const { result } = parseCitationForcingResult(raw, chunks);

    expect(result.claims).toHaveLength(3);
    expect(result.claims.find((c) => c.status === "UNSUPPORTED")?.claim).toBe(
      "Luxurious",
    );
    expect(result.score).toBe(2 / 3);
  });

  it("parses claims in a markdown list", () => {
    const raw =
      "- The Orient Express was created in 1883 [SOURCE 1]\n- It is known for its luxury [SOURCE 2]";
    const chunks = [
      makeChunkResult("founded in 1883"),
      makeChunkResult("luxurious train"),
    ];

    const { result } = parseCitationForcingResult(raw, chunks);

    expect(result.claims).toHaveLength(2);
    expect(result.claims[0].status).toBe("SUPPORTED");
    expect(result.claims[1].status).toBe("SUPPORTED");
  });

  it("returns score 1 without warning when no claims", () => {
    const { result } = parseCitationForcingResult("No markers here.", []);

    expect(result.claims).toHaveLength(0);
    expect(result.score).toBe(1);
    expect(result.warning).toBeUndefined();
  });

  it("correctly associates documentId from indexed chunk", () => {
    const raw = "Important fact [SOURCE 1].";
    const chunk = makeChunkResult("source content");
    const titleById = new Map([["doc-1", "My Document"]]);

    const { result } = parseCitationForcingResult(raw, [chunk], titleById);

    expect(result.claims[0].documentId).toBe("doc-1");
    expect(result.claims[0].documentTitle).toBe("My Document");
  });

  it("handles a SOURCE N out of range — claim SUPPORTED without documentId", () => {
    const raw = "Important fact [SOURCE 5].";
    const chunks = [makeChunkResult("a single chunk")];

    const { result } = parseCitationForcingResult(raw, chunks);

    expect(result.claims).toHaveLength(1);
    expect(result.claims[0].status).toBe("SUPPORTED");
    expect(result.claims[0].documentId).toBeUndefined();
  });

  it("cleans all markers from displayed content", () => {
    const raw = "Fact A [SOURCE 1]. Fact B [OWN KNOWLEDGE].";
    const chunks = [makeChunkResult("fact A")];

    const { cleanContent } = parseCitationForcingResult(raw, chunks);

    expect(cleanContent).not.toContain("[SOURCE");
    expect(cleanContent).not.toContain("[OWN KNOWLEDGE]");
    expect(cleanContent).toContain("Fact A");
    expect(cleanContent).toContain("Fact B");
  });
});

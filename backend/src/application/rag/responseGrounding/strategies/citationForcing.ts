import type { ChunkSearchResult } from "../../../../domain/entities/ChunkSearchResult";
import type { KnowledgeClaim, ResponseGroundingResult } from "../../../../domain/entities/Message";
import type { ILLMPort } from "../../../../infra-ports/ai/ILLMPort";
import { extractJSON } from "./extractJSON";

export function buildCitationForcingInstruction(): string {
  return (
    "For each factual claim you make, append [SOURCE N] where N is the number of the supporting source. " +
    "If no source supports a claim, append [OWN KNOWLEDGE] instead."
  );
}

export function parseCitationForcingResult(
  raw: string,
  chunks: ChunkSearchResult[] = [],
  titleById: Map<string, string> = new Map(),
): {
  cleanContent: string;
  result: ResponseGroundingResult;
} {
  const claims: KnowledgeClaim[] = [];

  // [^\[\]\n] stops at brackets (other markers) and newlines, allowing periods mid-sentence.
  // Stripping leading/trailing punctuation handles "fact. [SOURCE N]" and "fact [SOURCE N]." equally.
  const cleanClaim = (raw: string) =>
    raw
      .trim()
      .replace(/^[.!?,;\s]+/, "")
      .replace(/[.!?]+$/, "")
      .trim();

  const sourceRegex = /([^[\]\n]+?)\s*\[SOURCE\s+(\d+)\]/g;
  for (const match of raw.matchAll(sourceRegex)) {
    const claim = cleanClaim(match[1]);
    const sourceIndex = parseInt(match[2], 10) - 1;
    if (claim.length > 0) {
      const chunk = chunks[sourceIndex];
      if (chunk) {
        const documentId = chunk.chunk.documentId;
        claims.push({
          claim,
          status: "SUPPORTED",
          documentId,
          documentTitle: titleById.get(documentId) ?? documentId,
        });
      } else {
        claims.push({ claim, status: "SUPPORTED" });
      }
    }
  }

  const ownKnowledgeRegex = /([^[\]\n]+?)\s*\[OWN KNOWLEDGE\]/g;
  for (const match of raw.matchAll(ownKnowledgeRegex)) {
    const claim = cleanClaim(match[1]);
    if (claim.length > 0) {
      claims.push({ claim, status: "UNSUPPORTED" });
    }
  }

  const cleanContent = raw.replace(/\s*\[SOURCE\s+\d+\]/g, "").replace(/\s*\[OWN KNOWLEDGE\]/g, "");

  const supported = claims.filter((c) => c.status === "SUPPORTED").length;
  const total = claims.length;
  const score = total > 0 ? supported / total : 1;

  return {
    cleanContent,
    result: {
      strategy: "citation_forcing",
      score,
      claims,
      warning: claims.some((c) => c.status === "UNSUPPORTED")
        ? "Some claims are based on training data, not retrieved documents"
        : undefined,
    },
  };
}

export async function checkCitationForcing(
  llm: ILLMPort,
  query: string,
  answer: string,
  chunks: ChunkSearchResult[],
  titleById: Map<string, string> = new Map(),
): Promise<ResponseGroundingResult> {
  const sourcesText = chunks.map((c, i) => `SOURCE ${i + 1}:\n${c.chunk.content}`).join("\n\n");

  const prompt = [
    `Question: ${query}`,
    "",
    "Available sources:",
    sourcesText,
    "",
    `Answer to analyze: "${answer}"`,
    "",
    "For each factual claim in the answer, find the exact supporting quote from the sources above.",
    'If no source supports a claim, set status to "UNSUPPORTED" and sourceExcerpt to null.',
    "Reply ONLY with valid JSON:",
    '{"claims": [{"claim": "...", "status": "SUPPORTED|UNSUPPORTED", "sourceExcerpt": "exact quote or null"}]}',
  ].join("\n");

  const raw = await llm.stream(prompt, () => {});
  const parsed = extractJSON(raw) as {
    claims: Array<{
      claim: string;
      status: string;
      sourceExcerpt?: string | null;
    }>;
  };

  const claims: KnowledgeClaim[] = parsed.claims.map((c) => {
    if (c.status !== "SUPPORTED" || !c.sourceExcerpt) {
      return { claim: c.claim, status: "UNSUPPORTED" as const };
    }
    const excerpt = c.sourceExcerpt;
    const matchedChunk = chunks.find((ch) => ch.chunk.content.includes(excerpt.slice(0, 40)));
    if (!matchedChunk) {
      return { claim: c.claim, status: "UNSUPPORTED" as const };
    }
    const documentId = matchedChunk.chunk.documentId;
    return {
      claim: c.claim,
      status: "SUPPORTED" as const,
      sourceExcerpt: excerpt,
      documentId,
      documentTitle: titleById.get(documentId) ?? documentId,
    };
  });

  const supported = claims.filter((c) => c.status === "SUPPORTED").length;
  const score = claims.length > 0 ? supported / claims.length : 1;

  return {
    strategy: "citation_forcing",
    score,
    claims,
    warning: score < 1 ? "Some claims could not be traced to the retrieved documents" : undefined,
  };
}

import { ChunkSearchResult } from "../../../domain/ports/ChunkRepository";
import { LLMPort } from "../../../domain/ports/LLMPort";
import {
  KnowledgeClaim,
  KnowledgeCheckResult,
} from "../../../domain/entities/Message";
import { extractJSON } from "./extractJSON";

export async function checkCitationForcing(
  llm: LLMPort,
  query: string,
  answer: string,
  chunks: ChunkSearchResult[],
): Promise<KnowledgeCheckResult> {
  const sourcesText = chunks
    .map((c, i) => `SOURCE ${i + 1}:\n${c.chunk.content}`)
    .join("\n\n");

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

  const chunkTexts = chunks.map((c) => c.chunk.content);

  const claims: KnowledgeClaim[] = parsed.claims.map((c) => {
    if (c.status !== "SUPPORTED" || !c.sourceExcerpt) {
      return { claim: c.claim, status: "UNSUPPORTED" as const };
    }
    const excerpt = c.sourceExcerpt;
    const verified = chunkTexts.some((text) =>
      text.includes(excerpt.slice(0, 40)),
    );
    return {
      claim: c.claim,
      status: verified ? ("SUPPORTED" as const) : ("UNSUPPORTED" as const),
      sourceExcerpt: verified ? excerpt : undefined,
    };
  });

  const supported = claims.filter((c) => c.status === "SUPPORTED").length;
  const score = claims.length > 0 ? supported / claims.length : 1;

  return {
    strategy: "citation_forcing",
    score,
    claims,
    warning:
      score < 1
        ? "Some claims could not be traced to the retrieved documents"
        : undefined,
  };
}

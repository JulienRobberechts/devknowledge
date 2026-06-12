import { ChunkSearchResult } from "../../../domain/ports/ChunkRepository";
import { LLMPort } from "../../../domain/ports/LLMPort";
import {
  KnowledgeClaim,
  KnowledgeCheckResult,
} from "../../../domain/entities/Message";
import { extractJSON } from "./extractJSON";

export async function checkFaithfulness(
  llm: LLMPort,
  query: string,
  answer: string,
  chunks: ChunkSearchResult[],
): Promise<KnowledgeCheckResult> {
  const sourcesText = chunks.map((c) => c.chunk.content).join("\n---\n");
  const prompt = [
    `Question: "${query}"`,
    "",
    "Sources provided:",
    sourcesText,
    "",
    `Answer to evaluate: "${answer}"`,
    "",
    "For each factual claim in the answer, indicate whether it is explicitly supported by the sources above.",
    "Reply ONLY with valid JSON in this exact format:",
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

  const claims: KnowledgeClaim[] = parsed.claims.map((c) => ({
    claim: c.claim,
    status: c.status === "SUPPORTED" ? "SUPPORTED" : "UNSUPPORTED",
    sourceExcerpt: c.sourceExcerpt ?? undefined,
  }));

  const supported = claims.filter((c) => c.status === "SUPPORTED").length;
  const score = claims.length > 0 ? supported / claims.length : 1;

  return {
    strategy: "faithfulness",
    score,
    claims,
    warning:
      score < 1
        ? "Some claims are not grounded in the retrieved documents"
        : undefined,
  };
}

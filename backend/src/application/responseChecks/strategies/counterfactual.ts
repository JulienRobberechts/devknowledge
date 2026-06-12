import { LLMPort } from "../../../domain/ports/LLMPort";
import { KnowledgeCheckResult } from "../../../domain/entities/Message";
import { extractJSON } from "./extractJSON";

export async function checkCounterfactual(
  llm: LLMPort,
  query: string,
  answerWithContext: string,
): Promise<KnowledgeCheckResult> {
  const answerWithoutContext = await llm.stream(
    [
      "Answer the following question from your training knowledge only (no documents provided).",
      "Reply with just the answer, no preamble.",
      "",
      `Question: ${query}`,
    ].join("\n"),
    () => {},
  );

  const comparePrompt = [
    `Question: "${query}"`,
    "",
    `Answer A (with retrieved documents): "${answerWithContext}"`,
    `Answer B (training knowledge only): "${answerWithoutContext}"`,
    "",
    "Do these two answers convey essentially the same information?",
    'Reply ONLY with valid JSON: {"similar": true|false, "reasoning": "one sentence"}',
  ].join("\n");

  const raw = await llm.stream(comparePrompt, () => {});
  const parsed = extractJSON(raw) as { similar: boolean; reasoning: string };

  const score = parsed.similar ? 0 : 1;

  return {
    strategy: "counterfactual",
    score,
    claims: [
      {
        claim: parsed.reasoning,
        status: parsed.similar ? "UNSUPPORTED" : "SUPPORTED",
      },
    ],
    warning: parsed.similar
      ? "Answer may rely on LLM training data rather than retrieved documents"
      : undefined,
  };
}

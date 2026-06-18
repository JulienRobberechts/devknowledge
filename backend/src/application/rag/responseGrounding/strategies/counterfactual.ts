import type { ResponseGroundingResult } from "../../../../domain/entities/Message";
import type { ILLMPort } from "../../../../infra-ports/ILLMPort";
import { extractJSON } from "./extractJSON";

export async function checkCounterfactual(
  llm: ILLMPort,
  query: string,
  answerWithContext: string,
): Promise<ResponseGroundingResult> {
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
    `Answer with documents: "${answerWithContext}"`,
    `Answer without documents: "${answerWithoutContext}"`,
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
    similar: parsed.similar,
    trainingAnswer: answerWithoutContext,
    claims: [
      {
        claim: parsed.reasoning,
        status: parsed.similar ? "UNSUPPORTED" : "SUPPORTED",
      },
    ],
    warning: undefined,
  };
}

import type { ChunkSearchResult } from "../entities/ChunkSearchResult";
import type { Message } from "../entities/Message";

const SLIDING_WINDOW_EXCHANGES = 4;
const CITATION_FORCING_INSTRUCTION =
  "For each factual claim you make, append [SOURCE N] where N is the number of the supporting source. " +
  "If no source supports a claim, append [OWN KNOWLEDGE] instead.";

export function buildRagPrompt(
  question: string,
  searchResults: ChunkSearchResult[],
  history: Message[],
  useCitationForcing = false,
): string {
  const sourcesText = searchResults
    .map((r, i) => `SOURCE ${i + 1}:\n${r.chunk.content}`)
    .join("\n\n");

  const windowedMessages = history.slice(-(SLIDING_WINDOW_EXCHANGES * 2));
  const historyLines = windowedMessages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const parts = [
    "You are a helpful assistant. Answer based only on the provided sources.",
    ...(useCitationForcing ? [CITATION_FORCING_INSTRUCTION] : []),
    "",
    "SOURCES:",
    sourcesText,
  ];

  if (historyLines) {
    parts.push("", "CONVERSATION:", historyLines);
  }

  parts.push("", `User: ${question}`);

  return parts.join("\n");
}

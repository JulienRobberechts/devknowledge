import type { ResponseGroundingResult, SourceCitation } from "../types/domain";
import { setOnUnauthorized, UnauthorizedError } from "./api";

export { setOnUnauthorized };

interface SSEHandlers {
  onDelta: (token: string) => void;
  onSources: (sources: SourceCitation[]) => void;
  onResponseGrounding: (results: ResponseGroundingResult[]) => void;
  onDone: (messageId: string) => void;
  onError: (error: string) => void;
}

export function streamMessage(
  conversationId: string,
  content: string,
  handlers: SSEHandlers,
): () => void {
  const controller = new AbortController();

  const run = async () => {
    const res = await fetch(`/api/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ content }),
      signal: controller.signal,
    });

    if (res.status === 401) {
      handlers.onError("Session expired");
      throw new UnauthorizedError();
    }

    if (!res.ok || !res.body) {
      handlers.onError("Failed to connect to stream");
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let currentEvent = "";

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith("data: ") && currentEvent) {
          const data = JSON.parse(line.slice(6)) as Record<string, unknown>;
          if (currentEvent === "delta") handlers.onDelta(data.token as string);
          else if (currentEvent === "sources")
            handlers.onSources(data.sources as SourceCitation[]);
          else if (currentEvent === "response_grounding")
            handlers.onResponseGrounding(
              data.results as ResponseGroundingResult[],
            );
          else if (currentEvent === "done")
            handlers.onDone(data.messageId as string);
          else if (currentEvent === "error")
            handlers.onError(data.error as string);
          currentEvent = "";
        }
      }
    }
  };

  run().catch((err: unknown) => {
    if ((err as Error).name === "AbortError") return;
    if (err instanceof UnauthorizedError) return;
    handlers.onError("Stream error");
  });

  return () => controller.abort();
}

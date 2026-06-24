import { useCallback, useEffect, useRef, useState } from "react";
import { createConversationAndStream, streamMessage } from "../services/sse";
import type { ConversationParams, ResponseGroundingResult, SourceCitation } from "../types/domain";

export function useSSEStream(conversationId: string) {
  const [text, setText] = useState("");
  const [sources, setSources] = useState<SourceCitation[]>([]);
  const [responseGrounding, setResponseGrounding] = useState<ResponseGroundingResult[] | undefined>(
    undefined,
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const closeRef = useRef<(() => void) | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: conversationId is an intentional trigger to reset state when switching conversations
  useEffect(() => {
    setText("");
    setSources([]);
    setResponseGrounding(undefined);
    setIsStreaming(false);
    return () => {
      closeRef.current?.();
      closeRef.current = null;
    };
  }, [conversationId]);

  const send = useCallback(
    (content: string, onComplete?: () => void) => {
      setText("");
      setSources([]);
      setResponseGrounding(undefined);
      setIsStreaming(true);

      closeRef.current = streamMessage(conversationId, content, {
        onDelta: (token) => setText((t) => t + token),
        onSources: (s) => setSources(s),
        onResponseGrounding: (r) => setResponseGrounding(r),
        onDone: () => {
          setIsStreaming(false);
          onComplete?.();
        },
        onError: () => setIsStreaming(false),
      });
    },
    [conversationId],
  );

  const startNew = useCallback(
    (
      params: Partial<ConversationParams>,
      content: string,
      onComplete: (conversationId: string) => void,
    ) => {
      setText("");
      setSources([]);
      setResponseGrounding(undefined);
      setIsStreaming(true);

      let createdId = "";

      closeRef.current = createConversationAndStream(params, content, {
        onCreated: (id) => {
          createdId = id;
        },
        onDelta: (token) => setText((t) => t + token),
        onSources: (s) => setSources(s),
        onResponseGrounding: (r) => setResponseGrounding(r),
        onDone: () => {
          setIsStreaming(false);
          onComplete(createdId);
        },
        onError: () => setIsStreaming(false),
      });
    },
    [],
  );

  return { text, sources, responseGrounding, isStreaming, send, startNew };
}

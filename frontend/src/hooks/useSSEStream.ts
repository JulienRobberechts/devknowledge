import { useCallback, useEffect, useRef, useState } from "react";
import { streamMessage } from "../services/sse";
import type { SourceCitation } from "../types/domain";

export function useSSEStream(conversationId: string) {
  const [text, setText] = useState("");
  const [sources, setSources] = useState<SourceCitation[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const closeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setText("");
    setSources([]);
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
      setIsStreaming(true);

      closeRef.current = streamMessage(conversationId, content, {
        onDelta: (token) => setText((t) => t + token),
        onSources: (s) => setSources(s),
        onDone: () => {
          setIsStreaming(false);
          onComplete?.();
        },
        onError: () => setIsStreaming(false),
      });
    },
    [conversationId],
  );

  return { text, sources, isStreaming, send };
}

import { useEffect, useRef } from "react";
import type { Message, SourceCitation } from "../../types/domain";
import SourceCard from "./SourceCard";
import StreamingMessage from "./StreamingMessage";

interface Props {
  messages: Message[];
  streamingText?: string;
  streamingSources?: SourceCitation[];
  isStreaming: boolean;
}

export default function MessageList({
  messages,
  streamingText,
  streamingSources,
  isStreaming,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  return (
    <div className="flex flex-col gap-4 p-4">
      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[80%] rounded-lg p-3 ${
              msg.role === "user"
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-200"
            }`}
          >
            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            {msg.sources.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                {msg.sources.map((source) => (
                  <SourceCard key={source.chunkId} source={source} />
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
      {isStreaming && streamingText !== undefined && (
        <div className="flex justify-start">
          <div className="max-w-[80%] bg-white border border-gray-200 rounded-lg p-3">
            <StreamingMessage text={streamingText} />
            {streamingSources && streamingSources.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                {streamingSources.map((source) => (
                  <SourceCard key={source.chunkId} source={source} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Bot } from "lucide-react";
import type {
  KnowledgeCheckResult,
  Message,
  SourceCitation,
} from "../../types/domain";
import SourceCard from "./SourceCard";
import StreamingMessage from "./StreamingMessage";
import KnowledgeCheckPanel from "./KnowledgeCheckPanel";

const VISIBLE_SOURCES = 3;

function SourcesList({ sources }: { sources: SourceCitation[] }) {
  const [expanded, setExpanded] = useState(false);
  const hidden = sources.length - VISIBLE_SOURCES;
  const visible = expanded ? sources : sources.slice(0, VISIBLE_SOURCES);

  return (
    <div className="mt-3 flex flex-col gap-2">
      {visible.map((source) => (
        <SourceCard key={source.chunkId} source={source} />
      ))}
      {hidden > 0 && !expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="text-xs text-[#d97706] hover:text-[#92400e] text-left font-medium"
        >
          + {hidden} more reference{hidden > 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
}

function AssistantBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mt-0.5">
        <Bot className="w-4 h-4 text-[#d97706]" />
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

interface Props {
  messages: Message[];
  streamingText?: string;
  streamingSources?: SourceCitation[];
  streamingKnowledgeCheck?: KnowledgeCheckResult[];
  isStreaming: boolean;
}

export default function MessageList({
  messages,
  streamingText,
  streamingSources,
  streamingKnowledgeCheck,
  isStreaming,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  return (
    <div className="flex flex-col gap-6 px-4 py-6 max-w-3xl mx-auto w-full">
      {messages.map((msg) =>
        msg.role === "user" ? (
          <div key={msg.id} className="flex justify-end">
            <div className="max-w-[75%] bg-[#1f2937] text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
              {msg.content}
            </div>
          </div>
        ) : (
          <AssistantBubble key={msg.id}>
            <div className="prose prose-sm prose-slate max-w-none">
              <ReactMarkdown>{msg.content}</ReactMarkdown>
            </div>
            {msg.sources.length > 0 && <SourcesList sources={msg.sources} />}
            {msg.knowledgeCheck && msg.knowledgeCheck.length > 0 && (
              <KnowledgeCheckPanel results={msg.knowledgeCheck} />
            )}
          </AssistantBubble>
        ),
      )}
      {isStreaming && streamingText !== undefined && (
        <AssistantBubble>
          <StreamingMessage text={streamingText} />
          {streamingSources && streamingSources.length > 0 && (
            <SourcesList sources={streamingSources} />
          )}
          {streamingKnowledgeCheck && streamingKnowledgeCheck.length > 0 && (
            <KnowledgeCheckPanel results={streamingKnowledgeCheck} />
          )}
        </AssistantBubble>
      )}
      <div ref={bottomRef} />
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Bot, ShieldCheck, ShieldAlert, ChevronDown } from "lucide-react";
import type {
  KnowledgeCheckResult,
  Message,
  SourceCitation,
} from "../../types/domain";
import SourceCard from "./SourceCard";
import StreamingMessage from "./StreamingMessage";

const VISIBLE_SOURCES = 3;

const STRATEGY_LABEL: Record<string, string> = {
  faithfulness: "Faithfulness",
  counterfactual: "Counterfactual",
  citation_forcing: "Citation forcing",
};

function ScoreBadge({ score }: { score: number }) {
  if (score < 0) return null;
  const pct = Math.round(score * 100);
  const color =
    score >= 0.8
      ? "bg-green-100 text-green-700"
      : score >= 0.5
        ? "bg-amber-100 text-amber-700"
        : "bg-red-100 text-red-700";
  return (
    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${color}`}>
      {pct}%
    </span>
  );
}

function KnowledgeCheckPanel({ results }: { results: KnowledgeCheckResult[] }) {
  const [open, setOpen] = useState(false);
  const anyWarning = results.some((r) => r.warning);

  return (
    <div className="mt-2 border border-gray-100 rounded-lg text-xs overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        {anyWarning ? (
          <ShieldAlert size={13} className="text-amber-500 shrink-0" />
        ) : (
          <ShieldCheck size={13} className="text-green-500 shrink-0" />
        )}
        <span className="font-medium text-gray-600 flex-1">
          Knowledge check
        </span>
        <div className="flex gap-1.5 items-center">
          {results.map((r) => (
            <ScoreBadge key={r.strategy} score={r.score} />
          ))}
        </div>
        <ChevronDown
          size={12}
          className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="divide-y divide-gray-50">
          {results.map((result) => (
            <div key={result.strategy} className="px-3 py-2.5 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-700">
                  {STRATEGY_LABEL[result.strategy] ?? result.strategy}
                </span>
                <ScoreBadge score={result.score} />
              </div>
              {result.warning && (
                <p className="text-amber-600 bg-amber-50 rounded px-2 py-1">
                  {result.warning}
                </p>
              )}
              {result.claims.length > 0 && (
                <ul className="space-y-1">
                  {result.claims.map((claim, i) => (
                    <li key={i} className="flex gap-2 text-gray-600">
                      <span
                        className={`mt-0.5 shrink-0 w-1.5 h-1.5 rounded-full ${
                          claim.status === "SUPPORTED"
                            ? "bg-green-400"
                            : "bg-red-400"
                        }`}
                      />
                      <span>
                        {claim.claim}
                        {claim.sourceExcerpt && (
                          <span className="ml-1 text-gray-400 italic">
                            — "{claim.sourceExcerpt.slice(0, 80)}…"
                          </span>
                        )}
                        {claim.documentId && claim.documentTitle && (
                          <a
                            href={`http://localhost:5173/documents/${claim.documentId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-1.5 text-indigo-500 hover:text-indigo-700 underline underline-offset-2"
                          >
                            {claim.documentTitle}
                          </a>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

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
          className="text-xs text-indigo-500 hover:text-indigo-700 text-left"
        >
          + {hidden} autre{hidden > 1 ? "s" : ""} référence
          {hidden > 1 ? "s" : ""}
        </button>
      )}
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

function AssistantBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center mt-0.5">
        <Bot className="w-4 h-4 text-gray-500" />
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
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
            <div className="max-w-[75%] bg-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
              {msg.content}
            </div>
          </div>
        ) : (
          <AssistantBubble key={msg.id}>
            <div className="prose prose-sm prose-gray max-w-none">
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

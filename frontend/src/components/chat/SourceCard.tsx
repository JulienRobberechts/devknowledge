import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { SourceCitation } from "../../types/domain";
import DocumentTypeIcon from "../documents/DocumentTypeIcon";

const SCORE_THRESHOLDS = [
  { min: 85, bar: "bg-emerald-500", text: "text-emerald-600" },
  { min: 70, bar: "bg-amber-400", text: "text-amber-600" },
  { min: 0, bar: "bg-red-400", text: "text-red-600" },
] as const;

function scoreStyle(pct: number) {
  return SCORE_THRESHOLDS.find((t) => pct >= t.min)!;
}

function ScoreRow({ score }: { score: number }) {
  const pct = score * 100;
  const { bar, text } = scoreStyle(Math.round(pct));
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${bar} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span
        className={`font-mono text-[11px] tabular-nums w-14 text-right ${text}`}
      >
        {score.toFixed(5)}
      </span>
    </div>
  );
}

function IdCell({ value }: { value: string }) {
  return (
    <span
      className="font-mono text-[11px] text-slate-500 tracking-tight cursor-default select-all"
      title={value}
    >
      {value.slice(0, 8)}
      <span className="text-slate-300">…</span>
      {value.slice(-6)}
    </span>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[88px_1fr] items-center py-1.5 border-b border-slate-100 last:border-0">
      <span className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
        {label}
      </span>
      <div>{children}</div>
    </div>
  );
}

function DebugPanel({ source }: { source: SourceCitation }) {
  return (
    <div className="border-t border-slate-200 bg-white px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-300 mb-2">
        Technical details
      </p>
      <Row label="Score">
        <ScoreRow score={source.score} />
      </Row>
      <Row label="Type">
        <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
          {source.sourceType}
        </span>
      </Row>
      <Row label="Chunk ID">
        <IdCell value={source.chunkId} />
      </Row>
      <Row label="Document ID">
        <IdCell value={source.documentId} />
      </Row>
      <Row label="Content">
        <span className="text-[11px] font-mono text-slate-400 tabular-nums">
          {source.excerpt.length} chars
        </span>
        <div className="overflow-x-auto mt-1">
          <p className="text-[11px] font-mono text-slate-600 leading-relaxed whitespace-pre">
            {source.excerpt}
          </p>
        </div>
      </Row>
    </div>
  );
}

export default function SourceCard({ source }: { source: SourceCitation }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-gray-200 text-sm overflow-hidden bg-gray-50">
      <div className="flex gap-2.5 p-3">
        <DocumentTypeIcon sourceType={source.sourceType} size={14} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-medium text-gray-700 truncate">
              {source.documentTitle}
            </span>
            <span className="text-xs text-gray-400 flex-shrink-0">
              {(source.score * 100).toFixed(0)}%
            </span>
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex-shrink-0 ml-auto text-gray-300 hover:text-gray-500 transition-colors"
              title="Détails techniques"
            >
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>
          </div>
          <p className="text-gray-500 text-xs line-clamp-2 leading-relaxed">
            {source.excerpt}
          </p>
        </div>
      </div>
      {open && <DebugPanel source={source} />}
    </div>
  );
}

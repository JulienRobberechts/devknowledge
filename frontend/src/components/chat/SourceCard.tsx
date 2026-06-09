import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { SourceCitation } from "../../types/domain";
import DocumentTypeIcon from "../documents/DocumentTypeIcon";

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 85 ? "bg-emerald-400" : pct >= 70 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-16 text-right tabular-nums text-green-400">
        {score.toFixed(6)}
      </span>
    </div>
  );
}

function TruncatedId({ value }: { value: string }) {
  return (
    <span className="text-green-400 font-mono cursor-default" title={value}>
      {value.slice(0, 8)}…{value.slice(-4)}
    </span>
  );
}

function DebugPanel({ source }: { source: SourceCitation }) {
  return (
    <div className="mt-2 pt-2 border-t border-gray-200 font-mono text-[11px] bg-gray-900 -mx-3 -mb-3 px-3 py-2.5 rounded-b-lg">
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 items-center">
        <span className="text-gray-400">score</span>
        <ScoreBar score={source.score} />

        <span className="text-gray-400">chunkId</span>
        <TruncatedId value={source.chunkId} />

        <span className="text-gray-400">docId</span>
        <TruncatedId value={source.documentId} />

        <span className="text-gray-400">type</span>
        <span className="text-green-400">{source.sourceType}</span>

        <span className="text-gray-400">excerptLen</span>
        <span className="text-green-400 tabular-nums">
          {source.excerpt.length}
        </span>
      </div>
    </div>
  );
}

export default function SourceCard({ source }: { source: SourceCitation }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-gray-50 rounded-lg border border-gray-200 text-sm overflow-hidden">
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

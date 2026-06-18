import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { SourceCitation } from "../../types/domain";
import DocumentTypeIcon from "../documents/DocumentTypeIcon";

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
    <div className="border-t border-slate-200 bg-white px-4 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-300 mb-1">
        Technical details
      </p>
      <Row label="Chunk ID">
        <IdCell value={source.chunkId} />
      </Row>
      <Row label="Document ID">
        <IdCell value={source.documentId} />
      </Row>
      <div className="pt-1">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[10px] font-medium uppercase tracking-widest text-slate-400">
            Content
          </span>
          <span className="text-[11px] font-mono text-slate-400 tabular-nums">
            {source.excerpt.length} chars
          </span>
        </div>
        <p className="text-[11px] font-mono text-slate-600 leading-relaxed whitespace-pre-wrap break-all">
          {source.excerpt}
        </p>
      </div>
    </div>
  );
}

export default function SourceCard({ source }: { source: SourceCitation }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-lg border border-slate-200 text-sm overflow-hidden bg-slate-50">
      <div className="flex gap-2.5 p-3">
        <DocumentTypeIcon sourceType={source.sourceType} size={14} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2 mb-1">
            <a
              href={`${window.location.origin}/documents/${source.documentId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-slate-700 truncate hover:text-amber-600 hover:underline underline-offset-2"
            >
              {source.documentTitle}
            </a>
            <span className="text-xs text-slate-400 flex-shrink-0">
              {(source.score * 100).toFixed(0)}%
            </span>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="flex-shrink-0 ml-auto text-slate-300 hover:text-slate-500 transition-colors"
              title="Technical details"
            >
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>
          </div>
          <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed">
            {source.excerpt}
          </p>
        </div>
      </div>
      {open && <DebugPanel source={source} />}
    </div>
  );
}

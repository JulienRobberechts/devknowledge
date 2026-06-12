import { useState } from "react";
import { Link } from "react-router-dom";
import { Info, BookOpen } from "lucide-react";

export const RERANK_MODELS = [
  { value: "rerank-2.5", label: "rerank-2.5" },
  { value: "rerank-2.5-lite", label: "rerank-2.5-lite" },
  { value: "rerank-2", label: "rerank-2" },
  { value: "rerank-lite-1", label: "rerank-lite-1" },
];

export const LLM_MODELS = [
  { value: "claude-fable-5", label: "Claude Fable 5 (le plus capable)" },
  { value: "claude-opus-4-8", label: "Claude Opus 4.8" },
  { value: "claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { value: "claude-haiku-4-5-20251001", label: "Claude Haiku 4.5 (rapide)" },
  { value: "claude-opus-4-7", label: "Claude Opus 4.7 (legacy)" },
  { value: "claude-opus-4-6", label: "Claude Opus 4.6 (legacy)" },
  { value: "claude-sonnet-4-5-20250929", label: "Claude Sonnet 4.5 (legacy)" },
  { value: "claude-opus-4-5-20251101", label: "Claude Opus 4.5 (legacy)" },
];

export function Field({
  label,
  info,
  techLink,
  children,
}: {
  label: string;
  info?: string;
  techLink?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <div className="flex items-center justify-between gap-3 min-h-[28px]">
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs text-slate-500 leading-tight">{label}</span>
          {info && (
            <button
              onClick={() => setOpen((v) => !v)}
              className="text-slate-300 hover:text-[#d97706] transition-colors"
              aria-label={`About: ${label}`}
            >
              <Info size={11} />
            </button>
          )}
        </div>
        <div className="shrink-0">{children}</div>
      </div>
      {open && info && (
        <div className="mt-1.5 text-[11px] text-gray-600 bg-amber-50 border-l-2 border-[#d97706] rounded-r-md pl-2.5 pr-2 py-1.5 leading-relaxed">
          {info}
          {techLink && (
            <Link
              to={techLink}
              className="inline-flex items-center gap-0.5 ml-1.5 text-[#d97706] hover:text-[#92400e] font-medium transition-colors"
            >
              <BookOpen size={10} />
              Learn more
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
        checked ? "bg-[#d97706]" : "bg-slate-200"
      } ${disabled ? "opacity-50 cursor-default" : "cursor-pointer"}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-1"
        }`}
      />
    </button>
  );
}

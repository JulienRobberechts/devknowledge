import {
  Brain,
  Clock,
  DollarSign,
  ArrowRight,
  Layers,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { type ModelSpec, TIER_COLORS, TIER_LABELS } from "./models-data";

export function TierBadge({ tier }: { tier: ModelSpec["tier"] }) {
  return (
    <span
      className={`text-[10px] font-semibold uppercase tracking-wider border rounded px-1.5 py-0.5 ${TIER_COLORS[tier]}`}
    >
      {TIER_LABELS[tier]}
    </span>
  );
}

export default function ModelCard({ model }: { model: ModelSpec }) {
  const borderColor =
    model.tier === "flagship"
      ? "border-amber-300"
      : model.tier === "performance"
        ? "border-slate-300"
        : "border-slate-200";

  return (
    <div className={`bg-white border ${borderColor} rounded-xl p-5 shadow-sm`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-semibold text-gray-900 text-sm">{model.name}</p>
          <code className="text-[11px] text-gray-400 font-mono">
            {model.id}
          </code>
        </div>
        <TierBadge tier={model.tier} />
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-2 mb-4 text-xs">
        <div className="flex items-center gap-1.5 text-gray-600">
          <Layers size={12} className="text-gray-400 shrink-0" />
          <span>
            Context:{" "}
            <strong className="text-gray-800">{model.contextWindow}</strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-600">
          <ArrowRight size={12} className="text-gray-400 shrink-0" />
          <span>
            Max output:{" "}
            <strong className="text-gray-800">{model.maxOutput}</strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-600">
          <DollarSign size={12} className="text-gray-400 shrink-0" />
          <span>
            Input:{" "}
            <strong className="text-gray-800">{model.inputPrice}/MTok</strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-600">
          <DollarSign size={12} className="text-gray-400 shrink-0" />
          <span>
            Output:{" "}
            <strong className="text-gray-800">{model.outputPrice}/MTok</strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-600">
          <Clock size={12} className="text-gray-400 shrink-0" />
          <span>
            Latency: <strong className="text-gray-800">{model.latency}</strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-600">
          <Brain size={12} className="text-gray-400 shrink-0" />
          <span>
            Cutoff:{" "}
            <strong className="text-gray-800">{model.knowledgeCutoff}</strong>
          </span>
        </div>
      </div>

      <div className="flex gap-2 mb-3">
        {model.adaptiveThinking && (
          <span className="text-[10px] bg-amber-50 text-[#92400e] border border-amber-200 rounded px-1.5 py-0.5 font-medium">
            Adaptive thinking
          </span>
        )}
        {model.extendedThinking && (
          <span className="text-[10px] bg-stone-100 text-stone-700 border border-stone-200 rounded px-1.5 py-0.5 font-medium">
            Extended thinking
          </span>
        )}
      </div>

      <div className="space-y-2">
        <div>
          <p className="text-[10px] font-semibold text-green-700 uppercase tracking-wider mb-1">
            Best for
          </p>
          <ul className="space-y-0.5">
            {model.bestFor.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-1.5 text-xs text-gray-600"
              >
                <CheckCircle
                  size={11}
                  className="text-green-500 mt-0.5 shrink-0"
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider mb-1">
            Limitations
          </p>
          <ul className="space-y-0.5">
            {model.limitations.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-1.5 text-xs text-gray-600"
              >
                <AlertTriangle
                  size={11}
                  className="text-amber-500 mt-0.5 shrink-0"
                />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

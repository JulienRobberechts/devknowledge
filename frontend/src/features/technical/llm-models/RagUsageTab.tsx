import { Zap, CheckCircle } from "lucide-react";
import Card from "../../../components/ui/Card";
import SectionTitle from "../../../components/ui/SectionTitle";

export default function RagUsageTab() {
  return (
    <Card>
      <SectionTitle
        icon={<Zap size={20} />}
        title="Recommendation for this RAG project"
        subtitle="Which model to choose based on the use case"
      />
      <div className="space-y-3 text-sm text-slate-700">
        <div className="flex gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle size={16} className="text-green-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-slate-900">
              Production —{" "}
              <code className="text-amber-700">claude-sonnet-4-6</code>
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              Best balance for a RAG pipeline: 1M token context, 64k output,
              fast speed and reasonable cost ($3/$15).
            </p>
          </div>
        </div>
        <div className="flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <CheckCircle size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-slate-900">
              Experimentation / high quality —{" "}
              <code className="text-amber-700">claude-opus-4-8</code> or{" "}
              <code className="text-amber-700">claude-fable-5</code>
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              For complex queries, synthesis over very long contexts, or
              response comparison.
            </p>
          </div>
        </div>
        <div className="flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <Zap size={16} className="text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold text-slate-900">
              High volume / critical latency —{" "}
              <code className="text-amber-700">claude-haiku-4-5-20251001</code>
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              Ideal for simple document Q&A with high throughput requirements.
              Context window limited to 200k tokens.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

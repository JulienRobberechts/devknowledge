import { AlertTriangle } from "lucide-react";
import Card from "../../../components/ui/Card";
import SectionTitle from "../../../components/ui/SectionTitle";

export default function OverviewTab() {
  return (
    <Card>
      <SectionTitle
        icon={<AlertTriangle size={20} />}
        title="The problem: parametric vs contextual knowledge"
        subtitle="Why a correct answer can still be the wrong answer"
      />
      <p className="text-sm text-slate-700 leading-relaxed mb-4">
        In a RAG system the LLM receives retrieved chunks as context. Ideally
        its answer is grounded in those chunks. But LLMs also carry{" "}
        <strong>parametric knowledge</strong> — facts baked into their weights
        during training. When retrieval fails (low scores, missing documents),
        the model silently falls back to training data and still produces a
        confident answer.
      </p>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
        <p className="text-sm font-semibold text-amber-900 mb-2">
          Concrete example from this project
        </p>
        <p className="text-sm text-slate-700 leading-relaxed">
          Query:{" "}
          <em className="text-amber-800">
            "Quand a commencé l'Orient-Express ?"
          </em>
        </p>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          The retrieved chunks only contain a bibliography reference. The LLM
          answers <em>"1883, Nagelmackers"</em> — correct, but sourced from
          training data, not from the documents. The RAG pipeline silently
          failed without anyone noticing.
        </p>
      </div>

      <p className="text-sm text-slate-700 leading-relaxed mb-3">
        Research (2025) on mechanistic interpretability confirms why this is
        hard to detect:
      </p>
      <blockquote className="border-l-4 border-amber-300 pl-4 text-sm text-slate-600 italic mb-4">
        "Parametric and contextual knowledge are routed through largely distinct
        attention circuits and coexist as superposed signals, with conflicts
        resolved through differential accumulation of signal strength across
        layers."
      </blockquote>
      <p className="text-sm text-slate-600 leading-relaxed">
        There is no separate "reading from doc" register inside the model. The
        two knowledge sources are blended in the same forward pass — which is
        why the three strategies below work at the <strong>output level</strong>{" "}
        (post-generation), not by peeking into the model internals.
      </p>
    </Card>
  );
}

import { BarChart2, GitCompare, Quote, Layers, ArrowRight } from "lucide-react";
import Card from "../../../components/ui/Card";
import SectionTitle from "../../../components/ui/SectionTitle";
import CodeBlock from "../../../components/ui/CodeBlock";
import Callout from "../../../components/ui/Callout";
import StrategyBadge from "./StrategyBadge";

function FaithfulnessCard() {
  return (
    <Card className="mb-6">
      <SectionTitle
        icon={<BarChart2 size={20} />}
        title="Strategy 1 — Faithfulness (RAGAS)"
        subtitle="Decompose the answer into atomic claims, verify each one against sources"
      />
      <div className="mb-3">
        <StrategyBadge label="faithfulness" />
      </div>
      <p className="text-sm text-slate-700 leading-relaxed mb-4">
        A second LLM call (the <em>judge</em>) receives the original question,
        the retrieved chunks, and the generated answer. It extracts every
        factual claim from the answer and checks whether each claim is
        explicitly stated in the sources.
      </p>
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
        <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">
          Score formula
        </p>
        <p className="text-sm font-mono text-amber-900">
          score = supported_claims / total_claims
        </p>
        <p className="text-xs text-amber-700 mt-1">
          score = 1.0 → fully grounded · score = 0 → fully from training data
        </p>
      </div>
      <p className="text-sm font-medium text-slate-800 mb-2">Judge prompt</p>
      <CodeBlock
        code={`Question: "Quand a commencé l'Orient-Express ?"

Sources provided:
Sherwood S., 1984, Venise Simplon Orient-Express...
---
Le Venice Simplon Orient-Express circule encore...

Answer to evaluate: "L'Orient-Express a été lancé en 1883 par Nagelmackers."

For each factual claim in the answer, indicate whether it is explicitly
supported by the sources above.
Reply ONLY with valid JSON:
{
  "claims": [
    {"claim": "lancé en 1883", "status": "UNSUPPORTED", "sourceExcerpt": null},
    {"claim": "par Nagelmackers", "status": "UNSUPPORTED", "sourceExcerpt": null}
  ]
}`}
      />
      <div className="mt-4 space-y-3">
        <p className="text-sm text-slate-600 leading-relaxed">
          In the example above both claims are <strong>UNSUPPORTED</strong> —
          the bibliography chunk doesn't contain the date or the founder's name.
          Score = 0/2 = 0.
        </p>
        <Callout type="warning">
          Faithfulness measures grounding, not correctness. A score of 0 does
          not mean the answer is wrong — it means it isn't traceable to the
          retrieved documents.
        </Callout>
      </div>
    </Card>
  );
}

function CounterfactualCard() {
  return (
    <Card className="mb-6">
      <SectionTitle
        icon={<GitCompare size={20} />}
        title="Strategy 2 — Counterfactual"
        subtitle="Ask the same question without context — if the answer is the same, RAG didn't help"
      />
      <div className="mb-3">
        <StrategyBadge label="counterfactual" />
      </div>
      <p className="text-sm text-slate-700 leading-relaxed mb-4">
        The strategy generates two answers to the same question — one with the
        retrieved chunks (the RAG answer), one without any context (training
        only). A judge then compares the two.
      </p>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="border border-slate-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            Answer A — with context
          </p>
          <p className="text-xs text-slate-600 leading-relaxed">
            LLM receives the retrieved chunks + question.
          </p>
          <div className="mt-2 bg-slate-50 rounded p-2 text-xs font-mono text-slate-700">
            "L'Orient-Express a été lancé en 1883…"
          </div>
        </div>
        <div className="border border-amber-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">
            Answer B — without context
          </p>
          <p className="text-xs text-slate-600 leading-relaxed">
            Same question, no documents. LLM draws on training data only.
          </p>
          <div className="mt-2 bg-slate-50 rounded p-2 text-xs font-mono text-slate-700">
            "L'Orient-Express a été inauguré en 1883…"
          </div>
        </div>
      </div>
      <p className="text-sm font-medium text-slate-800 mb-2">
        Comparison judge prompt
      </p>
      <CodeBlock
        code={`Question: "Quand a commencé l'Orient-Express ?"

Answer A (with retrieved documents): "L'Orient-Express a été lancé en 1883 par Nagelmackers."
Answer B (training knowledge only):  "L'Orient-Express a été inauguré en 1883..."

Do these two answers convey essentially the same information?
Reply ONLY with valid JSON:
{"similar": true, "reasoning": "Both answers state the same date and origin."}`}
      />
      <div className="mt-4 space-y-3">
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">
            Score interpretation
          </p>
          <div className="space-y-1 text-xs text-slate-700">
            <div className="flex items-center gap-2">
              <span className="w-20 font-mono font-semibold text-amber-700">
                similar = true
              </span>
              <ArrowRight size={12} className="text-slate-400" />
              <span>
                score = 0 — RAG didn't add information beyond training data
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-20 font-mono font-semibold text-amber-700">
                similar = false
              </span>
              <ArrowRight size={12} className="text-slate-400" />
              <span>
                score = 1 — the context genuinely influenced the answer
              </span>
            </div>
          </div>
        </div>
        <Callout type="info">
          This strategy costs <strong>2× the LLM latency</strong>: one call to
          generate answer B, one call for the comparison judge.
        </Callout>
      </div>
    </Card>
  );
}

function CitationForcingCard() {
  return (
    <Card className="mb-6">
      <SectionTitle
        icon={<Quote size={20} />}
        title="Strategy 3 — Citation Forcing"
        subtitle="Demand an exact quote for every claim — then verify the quote actually exists"
      />
      <div className="mb-3">
        <StrategyBadge label="citation_forcing" />
      </div>
      <p className="text-sm text-slate-700 leading-relaxed mb-4">
        The judge is asked to map every factual claim to an <em>exact quote</em>{" "}
        from the numbered source list. The adapter then{" "}
        <strong>verifies</strong> each reported excerpt against the actual chunk
        text — LLMs hallucinate citations.
      </p>
      <p className="text-sm font-medium text-slate-800 mb-2">Judge prompt</p>
      <CodeBlock
        code={`Question: Quand a commencé l'Orient-Express ?

Available sources:
SOURCE 1: Sherwood S., 1984, Venise Simplon Orient-Express...
SOURCE 2: Le Venice Simplon Orient-Express circule encore aujourd'hui...

Answer to analyze: "L'Orient-Express a été lancé en 1883 par Nagelmackers."

For each factual claim in the answer, find the exact supporting quote.
Reply ONLY with valid JSON:
{
  "claims": [
    {"claim": "lancé en 1883", "status": "UNSUPPORTED", "sourceExcerpt": null}
  ]
}`}
      />
      <p className="text-sm font-medium text-slate-800 mt-4 mb-2">
        Hallucination guard
      </p>
      <CodeBlock
        code={`const verified = chunkTexts.some((text) =>
  text.includes(c.sourceExcerpt.slice(0, 40))
);`}
      />
      <div className="mt-4">
        <Callout type="warning">
          Without the hallucination guard, a score of 1.0 could be meaningless —
          the LLM may have invented plausible-looking quotes.
        </Callout>
      </div>
    </Card>
  );
}

export default function StrategiesTab() {
  return (
    <>
      <FaithfulnessCard />
      <CounterfactualCard />
      <CitationForcingCard />

      <Card>
        <SectionTitle
          icon={<Layers size={20} />}
          title="Strategy comparison"
          subtitle="Choosing the right check for your use case"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Strategy
                </th>
                <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  LLM calls
                </th>
                <th className="text-left py-2 pr-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Signal
                </th>
                <th className="text-left py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Best for
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-100">
                <td className="py-3 pr-4">
                  <StrategyBadge label="faithfulness" />
                </td>
                <td className="py-3 pr-4 text-xs text-slate-700">1</td>
                <td className="py-3 pr-4 text-xs text-slate-600">
                  Fraction of claims grounded in sources
                </td>
                <td className="py-3 text-xs text-slate-600">
                  General grounding check, low overhead
                </td>
              </tr>
              <tr className="border-b border-slate-100">
                <td className="py-3 pr-4">
                  <StrategyBadge label="counterfactual" />
                </td>
                <td className="py-3 pr-4 text-xs text-slate-700">2</td>
                <td className="py-3 pr-4 text-xs text-slate-600">
                  Did retrieval actually change the answer?
                </td>
                <td className="py-3 text-xs text-slate-600">
                  Detecting silent RAG failure
                </td>
              </tr>
              <tr>
                <td className="py-3 pr-4">
                  <StrategyBadge label="citation_forcing" />
                </td>
                <td className="py-3 pr-4 text-xs text-slate-700">1</td>
                <td className="py-3 pr-4 text-xs text-slate-600">
                  Exact source quote per claim (verified)
                </td>
                <td className="py-3 text-xs text-slate-600">
                  Audit trail, explainability
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <Callout type="tip">
            All three strategies can run in parallel since they are independent
            LLM calls.
          </Callout>
        </div>
      </Card>
    </>
  );
}

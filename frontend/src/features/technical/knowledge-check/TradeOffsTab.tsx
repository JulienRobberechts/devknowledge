import { AlertTriangle, CheckCircle } from "lucide-react";
import Card from "../../../components/ui/Card";
import SectionTitle from "../../../components/ui/SectionTitle";

export default function TradeOffsTab() {
  return (
    <Card>
      <SectionTitle
        icon={<AlertTriangle size={20} />}
        title="Trade-offs and limitations"
        subtitle="What these checks can and cannot tell you"
      />
      <div className="grid grid-cols-2 gap-4">
        <div className="border border-green-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-green-800 uppercase tracking-wide mb-2">
            These checks are useful when…
          </p>
          <ul className="text-xs text-slate-600 space-y-1.5">
            <li className="flex gap-2">
              <CheckCircle
                size={12}
                className="text-green-500 mt-0.5 flex-shrink-0"
              />
              You need an audit trail for regulated domains (legal, medical)
            </li>
            <li className="flex gap-2">
              <CheckCircle
                size={12}
                className="text-green-500 mt-0.5 flex-shrink-0"
              />
              Retrieval quality is uncertain (new documents, low scores)
            </li>
            <li className="flex gap-2">
              <CheckCircle
                size={12}
                className="text-green-500 mt-0.5 flex-shrink-0"
              />
              You want to identify gaps in your knowledge base automatically
            </li>
            <li className="flex gap-2">
              <CheckCircle
                size={12}
                className="text-green-500 mt-0.5 flex-shrink-0"
              />
              You need to trigger fallback strategies on low-score answers
            </li>
          </ul>
        </div>
        <div className="border border-amber-200 rounded-lg p-4">
          <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">
            These checks won't tell you…
          </p>
          <ul className="text-xs text-slate-600 space-y-1.5">
            <li className="flex gap-2">
              <AlertTriangle
                size={12}
                className="text-amber-500 mt-0.5 flex-shrink-0"
              />
              Whether the answer is factually correct
            </li>
            <li className="flex gap-2">
              <AlertTriangle
                size={12}
                className="text-amber-500 mt-0.5 flex-shrink-0"
              />
              Whether the retrieved chunks themselves are accurate
            </li>
            <li className="flex gap-2">
              <AlertTriangle
                size={12}
                className="text-amber-500 mt-0.5 flex-shrink-0"
              />
              Whether the LLM judge is itself hallucinating claims
            </li>
            <li className="flex gap-2">
              <AlertTriangle
                size={12}
                className="text-amber-500 mt-0.5 flex-shrink-0"
              />
              Why retrieval failed (missing doc, wrong chunking, bad embedding)
            </li>
          </ul>
        </div>
      </div>
    </Card>
  );
}

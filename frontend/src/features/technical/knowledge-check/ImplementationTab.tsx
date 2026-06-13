import { Code2, Info } from "lucide-react";
import Card from "../../../components/ui/Card";
import SectionTitle from "../../../components/ui/SectionTitle";
import CodeBlock from "../../../components/ui/CodeBlock";
import Callout from "../../../components/ui/Callout";

export default function ImplementationTab() {
  return (
    <>
      <Card className="mb-6">
        <SectionTitle
          icon={<Code2 size={20} />}
          title="Implementation — CheckContextualKnowledge"
          subtitle="How the three strategies are orchestrated"
        />
        <p className="text-sm text-slate-700 leading-relaxed mb-3">
          The{" "}
          <code className="bg-slate-100 px-1 rounded text-amber-700">
            CheckContextualKnowledge
          </code>{" "}
          use case runs after the LLM has generated its answer. It loops over
          the requested strategies and accumulates results. A failed strategy
          returns <code className="bg-slate-100 px-1 rounded">score = -1</code>{" "}
          with a warning rather than crashing the request.
        </p>
        <CodeBlock
          code={`// application/CheckContextualKnowledge.ts (simplified)

async run(
  query: string,
  answer: string,
  chunks: ChunkSearchResult[],
  strategies: KnowledgeCheckStrategy[],
): Promise<KnowledgeCheckResult[]> {
  const results: KnowledgeCheckResult[] = [];

  for (const strategy of strategies) {
    try {
      if (strategy === "faithfulness")
        results.push(await this.faithfulness(query, answer, chunks));
      else if (strategy === "counterfactual")
        results.push(await this.counterfactual(query, answer));
      else if (strategy === "citation_forcing")
        results.push(await this.citationForcing(query, answer, chunks));
    } catch (err) {
      results.push({ strategy, score: -1, claims: [], warning: String(err) });
    }
  }
  return results;
}`}
        />
        <div className="mt-4">
          <Callout type="info">
            <code>KnowledgeCheckStrategy</code> is a discriminated union:{" "}
            <code className="ml-1">
              "faithfulness" | "counterfactual" | "citation_forcing"
            </code>
            . The results are stored in the{" "}
            <code className="ml-1">messages.knowledge_check</code> JSONB column
            and exposed via the conversations API.
          </Callout>
        </div>
      </Card>

      <Card>
        <SectionTitle
          icon={<Info size={20} />}
          title="Domain types"
          subtitle="The shared data structures used across the stack"
        />
        <CodeBlock
          code={`// domain/entities/Message.ts

export type KnowledgeCheckStrategy =
  | "faithfulness"
  | "counterfactual"
  | "citation_forcing";

export interface KnowledgeClaim {
  claim: string;
  status: "SUPPORTED" | "UNSUPPORTED";
  sourceExcerpt?: string;   // only present for citation_forcing
}

export interface KnowledgeCheckResult {
  strategy: KnowledgeCheckStrategy;
  score: number;           // 0–1, or -1 if the check failed
  claims: KnowledgeClaim[];
  warning?: string;        // shown in the UI when score < 1
}

export interface Message {
  ...
  knowledgeCheck?: KnowledgeCheckResult[];  // one entry per strategy
}`}
        />
      </Card>
    </>
  );
}

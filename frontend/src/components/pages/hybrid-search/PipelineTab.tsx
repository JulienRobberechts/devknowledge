import { GitMerge, Hash, Search, Layers } from "lucide-react";
import Card from "../../ui/Card";
import SectionTitle from "../../ui/SectionTitle";
import CodeBlock from "../../ui/CodeBlock";
import Callout from "../../ui/Callout";
import PipelineStep from "../technical/PipelineStep";

export default function PipelineTab() {
  return (
    <>
      <Card className="mb-6">
        <SectionTitle
          icon={<Layers size={20} />}
          title="Hybrid retrieval pipeline"
          subtitle="Two passes, one fused ranking"
        />
        <PipelineStep
          step={1}
          icon={<Hash size={16} />}
          title="Embed the query"
          description="The query is sent to Voyage AI (input_type: query) to produce a 1024-float vector. Same embedding step as pure vector search."
        />
        <PipelineStep
          step={2}
          icon={<Search size={16} />}
          title="Vector pass — cosine similarity"
          description={`pgvector scans the HNSW index and returns the top 3×limit chunks ordered by embedding <=> query_vec (cosine distance). Each chunk gets a rank: 1 = closest, 2 = second closest, …`}
        />
        <PipelineStep
          step={3}
          icon={<Search size={16} />}
          title="Full-text pass — ts_rank_cd"
          description="PostgreSQL tokenises the query with plainto_tsquery('simple', …) and matches against the GIN-indexed tsvector column. Chunks that share at least one token are returned and ranked by ts_rank_cd (BM25-like term frequency × inverse document frequency)."
        />
        <PipelineStep
          step={4}
          icon={<GitMerge size={16} />}
          title="RRF fusion"
          description="Reciprocal Rank Fusion merges the two ranked lists into a single score. The top N chunks by fused score are returned to the LLM context."
          isLast
        />
      </Card>

      <Card className="mb-6">
        <SectionTitle
          icon={<GitMerge size={20} />}
          title="Reciprocal Rank Fusion (RRF)"
          subtitle="The formula that makes rank fusion work"
        />
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          RRF was introduced by Cormack, Clarke & Buettcher (SIGIR 2009). The
          idea: replace raw scores with their reciprocal rank, then sum across
          sources. A chunk that ranks 1st in both lists scores much higher than
          a chunk that is 1st in one and absent from the other.
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4 font-mono text-sm text-center">
          <p className="text-gray-800">
            RRF(chunk) = 1 / (k + rank_vector) + 1 / (k + rank_bm25)
          </p>
          <p className="text-xs text-gray-500 mt-1">k = 60 (constant)</p>
        </div>

        <p className="text-sm text-gray-700 leading-relaxed mb-3">
          The constant <strong>k = 60</strong> is the original paper's
          recommendation. It prevents a rank-1 result from dominating when the
          other source gives it a very low rank: 1/(60+1) ≈ 0.016 whereas
          1/(60+100) ≈ 0.006 — the difference is bounded, not explosive.
        </p>

        <CodeBlock
          code={`// RRF fusion in PgVectorChunkRepository
const k = 60;
const scores = new Map<string, { row; score }>();

for (const row of vectorResult.rows) {
  scores.set(row.id, { row, score: 1 / (k + Number(row.rank)) });
}

for (const row of textResult.rows) {
  const rrfScore = 1 / (k + Number(row.rank));
  const existing = scores.get(row.id);
  if (existing) {
    existing.score += rrfScore;   // chunk appears in both → bonus
  } else {
    scores.set(row.id, { row, score: rrfScore });  // BM25-only hit
  }
}`}
        />
      </Card>

      <Card>
        <SectionTitle
          icon={<Hash size={20} />}
          title="Worked example"
          subtitle="Chunk ranks and final RRF scores"
        />
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2 pr-4 font-semibold text-gray-600">Chunk</th>
                <th className="py-2 pr-4 font-semibold text-gray-600">
                  Vector rank
                </th>
                <th className="py-2 pr-4 font-semibold text-gray-600">
                  BM25 rank
                </th>
                <th className="py-2 pr-4 font-semibold text-gray-600">
                  RRF score
                </th>
                <th className="py-2 font-semibold text-gray-600">Why</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-2 pr-4 text-gray-800">A</td>
                <td className="py-2 pr-4 text-gray-700">1</td>
                <td className="py-2 pr-4 text-gray-700">1</td>
                <td className="py-2 pr-4 font-semibold text-green-700">
                  0.0323
                </td>
                <td className="py-2 text-gray-500">Top of both lists</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-gray-800">B</td>
                <td className="py-2 pr-4 text-gray-700">2</td>
                <td className="py-2 pr-4 text-gray-500">—</td>
                <td className="py-2 pr-4 text-gray-700">0.0161</td>
                <td className="py-2 text-gray-500">Vector only</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-gray-800">C</td>
                <td className="py-2 pr-4 text-gray-500">—</td>
                <td className="py-2 pr-4 text-gray-700">2</td>
                <td className="py-2 pr-4 text-gray-700">0.0161</td>
                <td className="py-2 text-gray-500">
                  BM25 only — exact token match
                </td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-gray-800">D</td>
                <td className="py-2 pr-4 text-gray-700">3</td>
                <td className="py-2 pr-4 text-gray-700">5</td>
                <td className="py-2 pr-4 text-gray-700">0.0153</td>
                <td className="py-2 text-gray-500">Moderate in both</td>
              </tr>
            </tbody>
          </table>
        </div>
        <Callout type="info" className="mt-4">
          Chunk C (BM25-only) beats chunk D (present in both but ranked lower).
          This is the key property: a strong exact match can outrank a mediocre
          semantic match even with no vector signal.
        </Callout>
      </Card>
    </>
  );
}

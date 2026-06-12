import { Zap, Target, TrendingUp } from "lucide-react";
import Card from "../../ui/Card";
import SectionTitle from "../../ui/SectionTitle";
import Callout from "../../ui/Callout";

export default function TradeOffsTab() {
  return (
    <>
      <Card className="mb-6">
        <SectionTitle
          icon={<Target size={20} />}
          title="When hybrid beats vector-only"
          subtitle="Queries where the exact token matters"
        />
        <div className="space-y-3">
          {[
            {
              type: "Acronyms & initialisms",
              example: "RAG, HNSW, RFC 2616, GDPR",
              why: "The embedding model may conflate similar-looking acronyms. BM25 matches the exact string.",
            },
            {
              type: "Proper nouns",
              example: "Jean-Pierre Martin, Kubernetes, NumPy",
              why: "Names not in the training corpus have noisy embeddings. Token overlap is reliable.",
            },
            {
              type: "Version identifiers",
              example: "Python 3.12, pgvector 0.7, glibc 2.31",
              why: "Numbers have similar embeddings across versions. BM25 distinguishes them precisely.",
            },
            {
              type: "Technical identifiers",
              example: "issue #4821, PR-1337, UUID abc123…",
              why: "Opaque strings with no semantic content — vector is useless, BM25 is exact.",
            },
          ].map(({ type, example, why }) => (
            <div key={type} className="border border-gray-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-700">{type}</p>
              <p className="text-xs text-purple-700 mt-0.5 font-mono">
                {example}
              </p>
              <p className="text-xs text-gray-500 mt-1">{why}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-6">
        <SectionTitle
          icon={<TrendingUp size={20} />}
          title="When vector-only is sufficient"
          subtitle="Paraphrase-heavy, conceptual queries"
        />
        <div className="space-y-3">
          {[
            {
              type: "Paraphrased questions",
              example:
                '"How does the caching layer work?" → chunks say "memoisation"',
              why: "Semantic proximity bridges the vocabulary gap. BM25 adds no signal.",
            },
            {
              type: "Multilingual corpora",
              example: "English query against French chunks",
              why: "Voyage's multilingual embeddings handle cross-lingual retrieval. BM25 requires shared tokens.",
            },
            {
              type: "Conceptual queries",
              example: '"Explain the trade-offs of eventual consistency"',
              why: "No single term dominates. Vector captures the full conceptual field.",
            },
          ].map(({ type, example, why }) => (
            <div key={type} className="border border-gray-100 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-700">{type}</p>
              <p className="text-xs text-purple-700 mt-0.5 italic">{example}</p>
              <p className="text-xs text-gray-500 mt-1">{why}</p>
            </div>
          ))}
        </div>
        <Callout type="info" className="mt-4">
          In practice, mixed corpora (technical docs + conceptual notes) benefit
          from hybrid mode by default. Switch to vector-only only if you measure
          a latency impact that matters for your use case.
        </Callout>
      </Card>

      <Card>
        <SectionTitle
          icon={<Zap size={20} />}
          title="Latency & cost"
          subtitle="Two SQL queries instead of one"
        />
        <div className="overflow-x-auto mb-4">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-2 pr-4 font-semibold text-gray-600">Mode</th>
                <th className="py-2 pr-4 font-semibold text-gray-600">
                  DB queries
                </th>
                <th className="py-2 pr-4 font-semibold text-gray-600">
                  Typical overhead
                </th>
                <th className="py-2 font-semibold text-gray-600">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-2 pr-4 text-gray-700">vector</td>
                <td className="py-2 pr-4 text-gray-700">1</td>
                <td className="py-2 pr-4 text-gray-700">baseline</td>
                <td className="py-2 text-gray-500">HNSW index only</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 text-gray-700">hybrid</td>
                <td className="py-2 pr-4 text-gray-700">2 (parallel)</td>
                <td className="py-2 pr-4 text-gray-700">+10–30 ms</td>
                <td className="py-2 text-gray-500">
                  GIN index + in-memory RRF
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm text-gray-700 leading-relaxed mb-3">
          The two queries run via <code>Promise.all</code>, so the total DB time
          is <code>max(vector_query, text_query)</code> rather than their sum.
          The GIN index on <code>ts_content</code> keeps the full-text pass
          comparable to the HNSW pass for typical corpus sizes (&lt; 1 M
          chunks).
        </p>
        <p className="text-sm text-gray-700 leading-relaxed">
          The in-memory RRF fusion is O(n) where n = 2 × candidateLimit — at
          limit=8 and candidateMultiplier=3, that's merging at most 48 rows.
          Negligible.
        </p>
      </Card>
    </>
  );
}

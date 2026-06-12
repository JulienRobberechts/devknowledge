import { AlertTriangle, CheckCircle } from "lucide-react";
import Card from "../../ui/Card";
import SectionTitle from "../../ui/SectionTitle";
import CodeBlock from "../../ui/CodeBlock";
import Callout from "../../ui/Callout";

export default function OverviewTab() {
  return (
    <>
      <Card className="mb-6">
        <SectionTitle
          icon={<AlertTriangle size={20} />}
          title="Where pure vector search fails"
          subtitle="Exact terms, acronyms and proper nouns"
        />
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          Vector search encodes <em>meaning</em> — two sentences that express
          the same idea land close together in embedding space even if they
          share no words. That strength becomes a weakness the moment the user
          types an exact identifier that the embedding model has never
          associated with anything.
        </p>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
          <p className="text-sm font-semibold text-amber-900 mb-2">
            Concrete failure cases
          </p>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>
              Query: <em className="text-purple-800">"RAG"</em> — the acronym
              has no stable position in embedding space; chunks that contain the
              letters R-A-G but define a different concept score just as high.
            </li>
            <li>
              Query: <em className="text-purple-800">"RFC 2616"</em> — a
              document number; the vector for "RFC 2616" is nearly identical to
              the vector for "RFC 2617" because the model sees them as similar
              strings.
            </li>
            <li>
              Query: <em className="text-purple-800">"Jean-Pierre Dupont"</em> —
              a proper name not present in the training corpus; its embedding is
              noisy and unreliable.
            </li>
          </ul>
        </div>

        <p className="text-sm text-gray-700 leading-relaxed">
          BM25 (and its PostgreSQL equivalent <code>ts_rank_cd</code>) has the
          exact opposite profile: it is blind to meaning but perfect on exact
          token overlap. The two approaches are <strong>complementary</strong>.
        </p>
      </Card>

      <Card className="mb-6">
        <SectionTitle
          icon={<CheckCircle size={20} />}
          title="Hybrid search: combining both signals"
          subtitle="Best of both worlds without external dependencies"
        />
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          Hybrid search runs two independent retrieval passes and fuses their
          rankings. Neither score is absolute — a cosine similarity of 0.82 and
          a BM25 score of 1.4 live on different scales and can't be added
          directly. The solution is to work on <strong>ranks</strong> rather
          than scores.
        </p>

        <div className="grid grid-cols-2 gap-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Vector pass (pgvector)
            </p>
            <CodeBlock
              code={`SELECT id,
  ROW_NUMBER() OVER (
    ORDER BY embedding <=> $query_vec
  ) AS rank
FROM chunks
LIMIT 3 * limit`}
            />
            <p className="text-xs text-gray-500 mt-2">
              Ranks chunks by cosine distance. Catches semantic matches.
            </p>
          </div>
          <div className="border border-purple-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">
              Full-text pass (tsvector / BM25)
            </p>
            <CodeBlock
              code={`SELECT id,
  ROW_NUMBER() OVER (
    ORDER BY ts_rank_cd(
      ts_content,
      plainto_tsquery($query)
    ) DESC
  ) AS rank
FROM chunks
WHERE ts_content @@
  plainto_tsquery($query)
LIMIT 3 * limit`}
            />
            <p className="text-xs text-gray-500 mt-2">
              Ranks by term frequency. Catches exact tokens.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle
          icon={<CheckCircle size={20} />}
          title="Why this project stays in PostgreSQL"
          subtitle="No Elasticsearch, no external BM25 engine"
        />
        <p className="text-sm text-gray-700 leading-relaxed mb-3">
          Many hybrid search implementations add a dedicated engine
          (Elasticsearch, Typesense, Weaviate). This project deliberately does
          not. PostgreSQL already has:
        </p>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600 mb-4">
          <li>
            <strong>pgvector</strong> — HNSW index for sub-millisecond cosine
            similarity at scale.
          </li>
          <li>
            <strong>tsvector / GIN index</strong> — inverted index for full-text
            search, same speed class as BM25 engines for typical corpus sizes.
          </li>
          <li>
            Both in the <strong>same transaction boundary</strong> — no
            consistency gap between the two indexes.
          </li>
        </ul>
        <Callout type="info">
          The two SQL queries run in <strong>parallel</strong> (
          <code>Promise.all</code>) so the total latency is{" "}
          <code>max(vector, text)</code>, not their sum.
        </Callout>
      </Card>
    </>
  );
}

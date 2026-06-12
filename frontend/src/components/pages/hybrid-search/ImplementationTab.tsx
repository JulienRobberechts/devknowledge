import { Database, Code2, Settings } from "lucide-react";
import Card from "../../ui/Card";
import SectionTitle from "../../ui/SectionTitle";
import CodeBlock from "../../ui/CodeBlock";
import Callout from "../../ui/Callout";

export default function ImplementationTab() {
  return (
    <>
      <Card className="mb-6">
        <SectionTitle
          icon={<Database size={20} />}
          title="Database schema"
          subtitle="Migration 005_hybrid_search.sql"
        />
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          The migration adds a <code>tsvector</code> column to the{" "}
          <code>chunks</code> table and keeps it in sync automatically via a
          PostgreSQL trigger.
        </p>
        <CodeBlock
          code={`-- Add the tsvector column
ALTER TABLE chunks
  ADD COLUMN IF NOT EXISTS ts_content tsvector;

-- Back-fill existing rows
UPDATE chunks
  SET ts_content = to_tsvector('simple', content)
  WHERE ts_content IS NULL;

-- Trigger: auto-update on INSERT or content change
CREATE OR REPLACE FUNCTION chunks_ts_content_trigger()
RETURNS trigger AS $$
BEGIN
  NEW.ts_content := to_tsvector('simple', NEW.content);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER chunks_ts_content_update
  BEFORE INSERT OR UPDATE OF content ON chunks
  FOR EACH ROW EXECUTE FUNCTION chunks_ts_content_trigger();

-- GIN index for fast full-text lookups
CREATE INDEX IF NOT EXISTS chunks_ts_content_idx
  ON chunks USING GIN(ts_content);`}
        />
        <p className="text-sm text-gray-600 mt-3 leading-relaxed">
          The <code>'simple'</code> text search configuration tokenises by
          whitespace and lowercases — no stemming, no stop-word removal. This
          preserves acronyms and proper nouns exactly as they appear.
        </p>
      </Card>

      <Card className="mb-6">
        <SectionTitle
          icon={<Code2 size={20} />}
          title="searchHybrid in PgVectorChunkRepository"
          subtitle="Two parallel SQL queries + in-memory RRF"
        />
        <CodeBlock
          code={`async searchHybrid(
  query: string,
  vector: number[],
  limit: number,
  _minScore: number,
): Promise<ChunkSearchResult[]> {
  const candidateLimit = limit * 3;

  // Two queries run in parallel
  const [vectorResult, textResult] = await Promise.all([
    pool.query(\`
      SELECT id, document_id, content, metadata,
        ROW_NUMBER() OVER (
          ORDER BY embedding <=> $1::vector
        ) AS rank
      FROM chunks LIMIT $2\`,
      [JSON.stringify(vector), candidateLimit],
    ),
    pool.query(\`
      SELECT id, document_id, content, metadata,
        ROW_NUMBER() OVER (
          ORDER BY ts_rank_cd(
            ts_content, plainto_tsquery('simple', $1)
          ) DESC
        ) AS rank
      FROM chunks
      WHERE ts_content @@ plainto_tsquery('simple', $1)
      LIMIT $2\`,
      [query, candidateLimit],
    ),
  ]);

  // RRF fusion (k = 60)
  const k = 60;
  const scores = new Map<string, { row; score }>();

  for (const row of vectorResult.rows) {
    scores.set(row.id, { row, score: 1 / (k + Number(row.rank)) });
  }
  for (const row of textResult.rows) {
    const rrfScore = 1 / (k + Number(row.rank));
    const existing = scores.get(row.id);
    if (existing) existing.score += rrfScore;
    else scores.set(row.id, { row, score: rrfScore });
  }

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ row, score }) => ({ chunk: mapRow(row), score }));
}`}
        />
        <Callout type="info" className="mt-4">
          <code>_minScore</code> is intentionally ignored in hybrid mode: BM25
          scores are not on the same scale as cosine similarity, so a unified
          threshold is meaningless. The limit parameter acts as the cutoff
          instead.
        </Callout>
      </Card>

      <Card>
        <SectionTitle
          icon={<Settings size={20} />}
          title="searchMode per conversation"
          subtitle="Config default + per-conversation override"
        />
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          The mode is resolved in two layers:
        </p>
        <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700 mb-4">
          <li>
            <strong>Global default</strong> — <code>SEARCH_MODE</code>{" "}
            environment variable (defaults to <code>"hybrid"</code>), read at
            startup into <code>config.rag.searchMode</code>.
          </li>
          <li>
            <strong>Per-conversation override</strong> — stored as{" "}
            <code>searchMode</code> in the <code>params</code> JSONB column of
            each conversation. Set in the panel before starting a conversation.
          </li>
        </ol>
        <CodeBlock
          code={`// SearchKnowledge.execute() — 5th parameter overrides constructor default
async execute(
  query, limit, minScore, rerankOptions,
  searchMode?: "vector" | "hybrid",   // from conversation.params
) {
  const effectiveMode = searchMode ?? this.searchMode; // fallback to config
  const results = effectiveMode === "hybrid"
    ? await this.chunkRepo.searchHybrid(query, vector, limit, minScore)
    : await this.chunkRepo.search(vector, limit, minScore);
  …
}`}
        />
      </Card>
    </>
  );
}

import {
  FileText,
  Scissors,
  Zap,
  Database,
  ChevronRight,
  Hash,
} from "lucide-react";
import Card from "../../../components/ui/Card";
import SectionTitle from "../../../components/ui/SectionTitle";
import CodeBlock from "../../../components/ui/CodeBlock";
import Callout from "../../../components/ui/Callout";
import PipelineStep from "./PipelineStep";

export default function IngestionTab() {
  return (
    <>
      <Card className="mb-6">
        <SectionTitle
          icon={<FileText size={20} />}
          title="Phase 1 — Ingestion Pipeline"
          subtitle="Turning raw files into searchable vectors"
        />
        <PipelineStep
          step={1}
          icon={<FileText size={16} />}
          title="Parse the document"
          description="The file (PDF, Markdown, or plain text) is read and converted to a single plain-text string. PDF parsing extracts text from each page; Markdown strips formatting tags."
        />
        <PipelineStep
          step={2}
          icon={<Scissors size={16} />}
          title="Chunk the text"
          description="The text is split into overlapping pieces called chunks. Each chunk is small enough to fit in an embedding model's input window and still carry a coherent idea."
        />
        <PipelineStep
          step={3}
          icon={<Zap size={16} />}
          title="Embed each chunk"
          description="Every chunk is sent to the Voyage AI embedding API (model: voyage-4-lite) which returns a 1024-dimensional vector — a numerical 'fingerprint' of that text's meaning."
        />
        <PipelineStep
          step={4}
          icon={<Database size={16} />}
          title="Store in PostgreSQL + pgvector"
          description="Each chunk's text, its 1024-float vector, and its position metadata are saved in the chunks table. An HNSW index makes future similarity searches very fast."
          isLast
        />
        <Callout type="tip">
          Chunks are processed in batches of 20 to avoid hitting Voyage AI's
          rate limits. If the API fails, the adapter retries up to 3 times with
          exponential back-off (200ms → 400ms → 800ms).
        </Callout>
      </Card>

      <Card className="mb-6">
        <SectionTitle
          icon={<Scissors size={20} />}
          title="Chunking Strategies"
          subtitle="Why it matters and how it works"
        />
        <p className="text-sm text-slate-700 mb-4 leading-relaxed">
          Chunking is one of the most impactful decisions in a RAG system. Too
          large and a chunk carries multiple unrelated ideas — the retrieval
          score becomes diluted. Too small and a chunk lacks enough context for
          the LLM to write a useful answer.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <ChevronRight size={16} className="text-amber-600" />
              <span className="font-semibold text-sm text-slate-900">
                Recursive (default)
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              Slides a fixed-size token window over the text. At each split
              point it tries to cut on a natural boundary, preferring (in order)
              a paragraph break → a line break → a sentence end → any
              whitespace.
            </p>
            <div className="bg-slate-50 rounded p-2 text-xs text-slate-700 font-mono leading-relaxed">
              <div className="text-slate-400 mb-1">
                // priority order in findBestSplit()
              </div>
              <div>
                1. double newline <span className="text-amber-600">"\n\n"</span>
              </div>
              <div>
                2. single newline <span className="text-amber-600">"\n"</span>
              </div>
              <div>
                3. period + space <span className="text-amber-600">". "</span>
              </div>
              <div>4. any whitespace</div>
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <ChevronRight size={16} className="text-amber-600" />
              <span className="font-semibold text-sm text-slate-900">
                Sentence
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              First splits the whole document into individual sentences using a
              regex that detects punctuation followed by an uppercase letter, or
              paragraph breaks. Then groups sentences together until the token
              budget is reached.
            </p>
            <div className="bg-slate-50 rounded p-2 text-xs text-slate-700 font-mono leading-relaxed">
              <div className="text-slate-400 mb-1">
                // sentence boundary regex
              </div>
              <div className="break-all text-amber-600">
                /(?&lt;=[.!?])\s+(?=[A-Z])|(?:\n\n+)/g
              </div>
            </div>
          </div>
        </div>

        <p className="text-sm text-slate-700 mb-3 font-medium">
          Overlap explained
        </p>
        <p className="text-sm text-slate-600 leading-relaxed mb-4">
          Both strategies use an <strong>overlap</strong>: the last N tokens of
          chunk <em>k</em> are repeated at the start of chunk <em>k+1</em>. This
          prevents an idea that spans a boundary from being split in two halves
          that are each too incomplete to be useful.
        </p>
        <CodeBlock
          code={`Text:  [...sentence A ... sentence B ... sentence C ... sentence D ...]

Chunk 1:  [sentence A] [sentence B] [sentence C]     ← chunkSize = 512 tokens
Chunk 2:           [sentence B] [sentence C] [sentence D]
                   ←── overlap (128 tokens) ──→`}
        />
        <div className="mt-4">
          <Callout type="warning">
            Tokens ≠ characters. This project approximates token count as word
            count (splitting on whitespace). Real tokenizers like tiktoken count
            subword pieces, so actual chunk sizes may differ slightly from the
            configured value.
          </Callout>
        </div>
      </Card>

      <Card className="mb-6">
        <SectionTitle
          icon={<Hash size={20} />}
          title="Embeddings — Text as Vectors"
          subtitle="How meaning becomes a point in space"
        />
        <p className="text-sm text-slate-700 leading-relaxed mb-4">
          An embedding model is a neural network trained to project text into a
          high-dimensional vector space such that <em>semantically similar</em>{" "}
          texts end up close together. "Dog", "puppy", and "canine" are close;
          "spaceship" is far away.
        </p>
        <div className="bg-slate-50 rounded-lg p-4 mb-4 text-sm text-slate-700">
          <p className="font-medium mb-2">
            This project uses Voyage AI — model:{" "}
            <code className="bg-slate-100 px-1 rounded text-amber-700">
              voyage-4-lite
            </code>
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs text-slate-600">
            <li>
              Output dimension: <strong>1024 floats</strong> per text
            </li>
            <li>
              Two <code className="bg-slate-100 px-1 rounded">input_type</code>{" "}
              modes:{" "}
              <code className="bg-slate-100 px-1 rounded">"document"</code> for
              ingestion,{" "}
              <code className="bg-slate-100 px-1 rounded">"query"</code> for
              search — this asymmetric embedding improves retrieval quality
            </li>
            <li>Batching: up to 20 texts per API call</li>
          </ul>
        </div>
        <Callout type="info">
          Why 1024 dimensions? More dimensions capture richer semantic nuance
          but cost more storage and compute. 1024 is a common sweet spot for
          production RAG workloads.
        </Callout>
      </Card>

      <Card>
        <SectionTitle
          icon={<Database size={20} />}
          title="Vector Storage & Similarity Search"
          subtitle="PostgreSQL + pgvector under the hood"
        />
        <p className="text-sm text-slate-700 leading-relaxed mb-4">
          Vectors are stored in PostgreSQL using the <strong>pgvector</strong>{" "}
          extension which adds a native{" "}
          <code className="bg-slate-100 px-1 rounded text-amber-700">
            vector
          </code>{" "}
          column type and similarity operators.
        </p>

        <p className="text-sm font-medium text-slate-800 mb-2">Schema</p>
        <CodeBlock
          code={`CREATE TABLE chunks (
  id          UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  embedding   vector(1024),      -- 1024 floats stored natively
  metadata    JSONB              -- position, startChar, endChar
);

-- HNSW index for fast approximate nearest-neighbor search
CREATE INDEX chunks_embedding_idx
  ON chunks USING hnsw (embedding vector_cosine_ops);`}
        />

        <p className="text-sm font-medium text-slate-800 mt-4 mb-2">
          The similarity query
        </p>
        <CodeBlock
          code={`SELECT
  id, document_id, content, metadata,
  1 - (embedding <=> $1::vector) AS score   -- cosine similarity
FROM chunks
WHERE 1 - (embedding <=> $1::vector) >= $2  -- min score filter
ORDER BY embedding <=> $1::vector           -- closest first
LIMIT $3;                                   -- top-K results`}
        />

        <div className="mt-4 space-y-3">
          <p className="text-sm font-medium text-slate-800">
            How cosine similarity works
          </p>
          <p className="text-sm text-slate-600 leading-relaxed">
            The{" "}
            <code className="bg-slate-100 px-1 rounded text-amber-700">
              {"<=>"}
            </code>{" "}
            operator computes cosine <em>distance</em> (0 = identical, 2 =
            opposite). We convert it to a <em>similarity score</em> between 0
            and 1 with{" "}
            <code className="bg-slate-100 px-1 rounded">1 − distance</code>. A
            score above <strong>0.75</strong> (the configured minimum) means the
            chunk is very semantically relevant to the query.
          </p>
          <Callout type="tip">
            The HNSW (Hierarchical Navigable Small World) index trades a tiny
            bit of recall for massive speed. Instead of comparing against every
            single vector, it navigates a graph of nearby nodes — typical
            queries run in milliseconds even with millions of chunks.
          </Callout>
        </div>
      </Card>
    </>
  );
}

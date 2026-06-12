import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  FlaskConical,
  FileText,
  Scissors,
  Zap,
  Database,
  Search,
  MessageSquare,
  ArrowRight,
  Info,
  Code2,
  Layers,
  Hash,
  ChevronRight,
} from "lucide-react";
import PageHeader from "../ui/PageHeader";
import TechnicalNav from "./TechnicalNav";

function SectionTitle({
  icon,
  title,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center text-purple-700">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white border border-gray-200 rounded-xl p-6 shadow-sm ${className}`}
    >
      {children}
    </div>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 text-xs overflow-x-auto font-mono leading-relaxed">
      {code}
    </pre>
  );
}

function Callout({
  type,
  children,
}: {
  type: "info" | "tip" | "warning";
  children: React.ReactNode;
}) {
  const styles = {
    info: "bg-blue-50 border-blue-200 text-blue-900",
    tip: "bg-green-50 border-green-200 text-green-900",
    warning: "bg-amber-50 border-amber-200 text-amber-900",
  };
  const labels = { info: "Note", tip: "Tip", warning: "Important" };
  return (
    <div className={`border rounded-lg p-4 text-sm ${styles[type]}`}>
      <span className="font-semibold">{labels[type]}: </span>
      {children}
    </div>
  );
}

function PipelineStep({
  step,
  icon,
  title,
  description,
  isLast = false,
}: {
  step: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  isLast?: boolean;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex flex-col items-center">
        <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
          {step}
        </div>
        {!isLast && (
          <div className="w-0.5 h-full bg-purple-200 mt-2 min-h-[2rem]" />
        )}
      </div>
      <div className="pb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-purple-600">{icon}</span>
          <span className="font-semibold text-gray-900">{title}</span>
        </div>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  );
}

function ParamRow({
  name,
  value,
  description,
}: {
  name: string;
  value: string;
  description: string;
}) {
  return (
    <tr className="border-b border-gray-100 last:border-0">
      <td className="py-2.5 pr-4 font-mono text-xs text-purple-700 whitespace-nowrap font-medium">
        {name}
      </td>
      <td className="py-2.5 pr-4 font-mono text-xs text-gray-700 whitespace-nowrap">
        {value}
      </td>
      <td className="py-2.5 text-xs text-gray-600">{description}</td>
    </tr>
  );
}

const TABS = ["Overview", "Ingestion", "Query", "Config"] as const;
type Tab = (typeof TABS)[number];

function TabBar({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
}) {
  return (
    <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
      {TABS.map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            active === t
              ? "bg-white text-purple-700 shadow-sm"
              : "text-gray-600 hover:text-gray-900 hover:bg-white/60"
          }`}
        >
          {t}
        </button>
      ))}
    </div>
  );
}

function isTab(value: string | null): value is Tab {
  return TABS.includes(value as Tab);
}

function OverviewTab() {
  return (
    <>
      <Card className="mb-6">
        <SectionTitle
          icon={<Layers size={20} />}
          title="What is RAG?"
          subtitle="The big picture in 60 seconds"
        />
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          A Large Language Model (LLM) is trained on a fixed dataset that has a
          knowledge cut-off date. It knows nothing about <em>your</em>{" "}
          documents.
          <strong> Retrieval-Augmented Generation (RAG)</strong> solves this by
          splitting the problem in two:
        </p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-purple-50 rounded-lg p-4 border border-purple-100">
            <p className="text-xs font-semibold text-purple-800 uppercase tracking-wide mb-2">
              Offline — Ingestion
            </p>
            <p className="text-sm text-gray-700">
              Parse your documents, cut them into small pieces, convert each
              piece to a vector of numbers (an <em>embedding</em>), and store
              everything in a database.
            </p>
          </div>
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide mb-2">
              Online — Query
            </p>
            <p className="text-sm text-gray-700">
              When a user asks a question, convert <em>that question</em> to a
              vector too, find the most similar pieces in the database, and give
              them to the LLM as context so it can answer accurately.
            </p>
          </div>
        </div>
        <Callout type="info">
          The LLM never "reads" your documents directly. It only sees the small
          relevant excerpts retrieved for each question — plus the conversation
          history.
        </Callout>
      </Card>

      <Card className="mb-6">
        <SectionTitle
          icon={<ArrowRight size={20} />}
          title="End-to-End Flow Summary"
          subtitle="The complete lifecycle of a question"
        />
        <div className="flex flex-col gap-1 text-sm text-gray-700">
          {[
            ["User uploads a PDF", "file_path stored, status = pending"],
            ["POST /documents/:id/ingest", "IngestDocument use case triggered"],
            ["FileParser extracts text", "raw string from PDF/MD/TXT"],
            [
              "ChunkingStrategy splits text",
              "N overlapping ChunkResult objects",
            ],
            [
              "VoyageEmbeddingAdapter (×N/20)",
              "1024-dim vectors via voyage-4-lite",
            ],
            [
              "PgVectorChunkRepository.saveMany()",
              "rows inserted in chunks table",
            ],
            ["Status → ready", "document is searchable"],
            ["", ""],
            ["User types a question", "POST /conversations/:id/messages (SSE)"],
            ["AskQuestion.execute()", "orchestrates the whole query"],
            [
              "VoyageEmbeddingAdapter.embed(q, 'query')",
              "1024-dim query vector",
            ],
            [
              "PgVectorChunkRepository.search()",
              "cosine similarity, top 8 ≥ 0.75",
            ],
            ["buildPrompt()", "sources + history + question string"],
            ["AnthropicLLMAdapter.stream()", "Claude Haiku streams tokens"],
            ["SSE → browser", "user sees answer token by token"],
            [
              "Sources stored with message",
              "shown as citations below the answer",
            ],
          ].map(([left, right], i) =>
            left === "" ? (
              <div
                key={i}
                className="border-t border-dashed border-gray-200 my-2"
              />
            ) : (
              <div key={i} className="flex items-start gap-2">
                <code className="bg-purple-50 text-purple-800 px-2 py-0.5 rounded text-xs flex-shrink-0 font-mono">
                  {left}
                </code>
                <span className="text-gray-500 text-xs mt-0.5">→ {right}</span>
              </div>
            ),
          )}
        </div>
      </Card>

      <Card>
        <SectionTitle
          icon={<Info size={20} />}
          title="Why These Technology Choices?"
          subtitle="The reasoning behind the stack"
        />
        <div className="space-y-4 text-sm text-gray-700">
          <div>
            <p className="font-semibold text-gray-900 mb-1">
              PostgreSQL + pgvector instead of a dedicated vector DB
            </p>
            <p className="leading-relaxed text-gray-600">
              Dedicated vector databases (Pinecone, Qdrant, Weaviate) add
              operational complexity. pgvector keeps everything in a single
              Postgres instance that you already need for documents and
              conversations, with ACID guarantees and SQL joins. For projects
              under ~10M chunks, the HNSW index is fast enough.
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-1">
              Voyage AI instead of OpenAI embeddings
            </p>
            <p className="leading-relaxed text-gray-600">
              Voyage's models are purpose-built for retrieval. The{" "}
              <code className="bg-gray-100 px-1 rounded">input_type</code>{" "}
              distinction between "document" and "query" (asymmetric embeddings)
              measurably improves retrieval quality compared to symmetric
              embedding models.
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-1">
              Claude Haiku for generation
            </p>
            <p className="leading-relaxed text-gray-600">
              Haiku is fast and cheap while still being highly capable at
              reading comprehension and synthesis from a given context. Since
              the LLM is only asked to <em>summarise retrieved sources</em> (not
              to recall facts from training), a smaller model is perfectly
              adequate.
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-1">
              Sliding window conversation history (last 4 exchanges)
            </p>
            <p className="leading-relaxed text-gray-600">
              Appending the full conversation history would grow the prompt
              unbounded, inflating cost and pushing retrieved sources out of the
              context window. Keeping only the last 8 messages (4 user + 4
              assistant) provides enough continuity for follow-up questions
              while keeping prompt size predictable.
            </p>
          </div>
        </div>
      </Card>
    </>
  );
}

function IngestionTab() {
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
        <p className="text-sm text-gray-700 mb-4 leading-relaxed">
          Chunking is one of the most impactful decisions in a RAG system. Too
          large and a chunk carries multiple unrelated ideas — the retrieval
          score becomes diluted. Too small and a chunk lacks enough context for
          the LLM to write a useful answer.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <ChevronRight size={16} className="text-purple-600" />
              <span className="font-semibold text-sm text-gray-900">
                Recursive (default)
              </span>
            </div>
            <p className="text-xs text-gray-600 mb-3 leading-relaxed">
              Slides a fixed-size token window over the text. At each split
              point it tries to cut on a natural boundary, preferring (in order)
              a paragraph break → a line break → a sentence end → any
              whitespace.
            </p>
            <div className="bg-gray-50 rounded p-2 text-xs text-gray-700 font-mono leading-relaxed">
              <div className="text-gray-400 mb-1">
                // priority order in findBestSplit()
              </div>
              <div>
                1. double newline{" "}
                <span className="text-purple-600">"\n\n"</span>
              </div>
              <div>
                2. single newline <span className="text-purple-600">"\n"</span>
              </div>
              <div>
                3. period + space <span className="text-purple-600">". "</span>
              </div>
              <div>4. any whitespace</div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <ChevronRight size={16} className="text-blue-600" />
              <span className="font-semibold text-sm text-gray-900">
                Sentence
              </span>
            </div>
            <p className="text-xs text-gray-600 mb-3 leading-relaxed">
              First splits the whole document into individual sentences using a
              regex that detects punctuation followed by an uppercase letter, or
              paragraph breaks. Then groups sentences together until the token
              budget is reached.
            </p>
            <div className="bg-gray-50 rounded p-2 text-xs text-gray-700 font-mono leading-relaxed">
              <div className="text-gray-400 mb-1">
                // sentence boundary regex
              </div>
              <div className="break-all text-purple-600">
                /(?&lt;=[.!?])\s+(?=[A-Z])|(?:\n\n+)/g
              </div>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-700 mb-3 font-medium">
          Overlap explained
        </p>
        <p className="text-sm text-gray-600 leading-relaxed mb-4">
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
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          An embedding model is a neural network trained to project text into a
          high-dimensional vector space such that <em>semantically similar</em>{" "}
          texts end up close together. "Dog", "puppy", and "canine" are close;
          "spaceship" is far away.
        </p>
        <div className="bg-gray-50 rounded-lg p-4 mb-4 text-sm text-gray-700">
          <p className="font-medium mb-2">
            This project uses Voyage AI — model:{" "}
            <code className="bg-gray-200 px-1 rounded text-purple-700">
              voyage-4-lite
            </code>
          </p>
          <ul className="list-disc list-inside space-y-1 text-xs text-gray-600">
            <li>
              Output dimension: <strong>1024 floats</strong> per text
            </li>
            <li>
              Two <code className="bg-gray-200 px-1 rounded">input_type</code>{" "}
              modes:{" "}
              <code className="bg-gray-200 px-1 rounded">"document"</code> for
              ingestion,{" "}
              <code className="bg-gray-200 px-1 rounded">"query"</code> for
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
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          Vectors are stored in PostgreSQL using the <strong>pgvector</strong>{" "}
          extension which adds a native{" "}
          <code className="bg-gray-100 px-1 rounded text-purple-700">
            vector
          </code>{" "}
          column type and similarity operators.
        </p>

        <p className="text-sm font-medium text-gray-800 mb-2">Schema</p>
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

        <p className="text-sm font-medium text-gray-800 mt-4 mb-2">
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
          <p className="text-sm font-medium text-gray-800">
            How cosine similarity works
          </p>
          <p className="text-sm text-gray-600 leading-relaxed">
            The{" "}
            <code className="bg-gray-100 px-1 rounded text-purple-700">
              {"<=>"}
            </code>{" "}
            operator computes cosine <em>distance</em> (0 = identical, 2 =
            opposite). We convert it to a <em>similarity score</em> between 0
            and 1 with{" "}
            <code className="bg-gray-100 px-1 rounded">1 − distance</code>. A
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

function QueryTab() {
  return (
    <>
      <Card className="mb-6">
        <SectionTitle
          icon={<Search size={20} />}
          title="Phase 2 — Query Pipeline"
          subtitle="From user question to grounded answer"
        />
        <PipelineStep
          step={1}
          icon={<Hash size={16} />}
          title="Embed the question"
          description={`The user's question is sent to Voyage AI with input_type "query". This produces a 1024-float vector that represents the question's meaning.`}
        />
        <PipelineStep
          step={2}
          icon={<Search size={16} />}
          title="Retrieve top-K chunks"
          description="pgvector compares the question vector against all stored chunk vectors using cosine similarity. The top 8 chunks with a score ≥ 0.75 are returned."
        />
        <PipelineStep
          step={3}
          icon={<Layers size={16} />}
          title="Build the prompt"
          description="The retrieved chunks are formatted as numbered SOURCEs. The last 4 conversation exchanges (sliding window) are appended as history. Then the user question is added."
        />
        <PipelineStep
          step={4}
          icon={<MessageSquare size={16} />}
          title="Stream the LLM answer"
          description="The prompt is sent to Claude Haiku. The model is instructed to answer ONLY using the provided sources. The response streams back token-by-token via Server-Sent Events."
          isLast
        />

        <p className="text-sm font-medium text-gray-800 mt-2 mb-2">
          Prompt structure
        </p>
        <CodeBlock
          code={`You are a helpful assistant. Answer based only on the provided sources.

SOURCES:
SOURCE 1:
<chunk text from the database>

SOURCE 2:
<chunk text from the database>

... (up to 8 sources)

CONVERSATION:
User: <previous question>
Assistant: <previous answer>
... (last 4 exchanges)

User: <current question>`}
        />
        <div className="mt-4">
          <Callout type="warning">
            If no chunk scores above the minimum threshold, the system returns a
            fixed "I don't have enough information" message without ever calling
            the LLM. This prevents hallucinations on topics not in the knowledge
            base.
          </Callout>
        </div>
      </Card>

      <Card>
        <SectionTitle
          icon={<MessageSquare size={20} />}
          title="The Language Model — Claude Haiku"
          subtitle="Generating the final answer"
        />
        <p className="text-sm text-gray-700 leading-relaxed mb-4">
          This project uses <strong>Claude Haiku 4.5</strong> (Anthropic) as its
          LLM. Haiku is fast and cost-efficient, well-suited for answering
          questions from a pre-filtered context.
        </p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Streaming (SSE)
            </p>
            <p className="text-xs text-gray-600 leading-relaxed">
              The Anthropic SDK streams tokens back one by one. Each token is
              pushed immediately to the browser via{" "}
              <strong>Server-Sent Events</strong> (SSE), so the user sees the
              answer build up in real time without waiting for the full
              completion.
            </p>
          </div>
          <div className="border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Abort / cancellation
            </p>
            <p className="text-xs text-gray-600 leading-relaxed">
              An <code className="bg-gray-100 px-1 rounded">AbortSignal</code>{" "}
              is passed all the way from the HTTP request to the Anthropic
              stream. If the user navigates away, the stream is cancelled
              immediately — no wasted tokens.
            </p>
          </div>
        </div>
        <p className="text-sm font-medium text-gray-800 mb-2">
          Auto-generated conversation title
        </p>
        <p className="text-sm text-gray-600 leading-relaxed">
          After the first exchange in a conversation, the LLM is called a second
          time with a short meta-prompt asking it to summarise the exchange in 5
          words. This title is stored in the{" "}
          <code className="bg-gray-100 px-1 rounded text-purple-700">
            conversations
          </code>{" "}
          table and shown in the sidebar.
        </p>
      </Card>
    </>
  );
}

function ConfigTab() {
  return (
    <Card>
      <SectionTitle
        icon={<Code2 size={20} />}
        title="Configuration Parameters"
        subtitle="All the knobs and what they do"
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Env var
              </th>
              <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Default
              </th>
              <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Effect
              </th>
            </tr>
          </thead>
          <tbody>
            <ParamRow
              name="CHUNKING_STRATEGY"
              value="recursive"
              description="Switch between 'recursive' (token window) and 'sentence' (sentence-aware grouping). Sentence strategy preserves meaning boundaries better for prose; recursive is more predictable for technical docs."
            />
            <ParamRow
              name="CHUNK_SIZE_TOKENS"
              value="512"
              description="Maximum number of tokens (words) per chunk. Smaller = more precise retrieval but less context per chunk. Larger = richer context but noisier similarity scores."
            />
            <ParamRow
              name="CHUNK_OVERLAP_TOKENS"
              value="128"
              description="How many tokens from the end of chunk N are repeated at the start of chunk N+1. Prevents ideas from being split across a boundary. Rule of thumb: ~20-25% of chunk size."
            />
            <ParamRow
              name="RETRIEVAL_LIMIT"
              value="8"
              description="Maximum number of chunks returned by vector search. More chunks = richer context for the LLM but longer prompts and higher cost."
            />
            <ParamRow
              name="RETRIEVAL_MIN_SCORE"
              value="0.75"
              description="Cosine similarity threshold (0–1). Chunks below this score are discarded even if they are within the top-K. Raise this to reduce noise; lower it if you get 'no information' responses too often."
            />
            <ParamRow
              name="LLM_MAX_TOKENS"
              value="1024"
              description="Maximum tokens in the LLM response. Increase for detailed answers; decrease to save cost."
            />
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default function TechnicalPage() {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState<Tab>(
    isTab(tabParam) ? tabParam : "Overview",
  );

  useEffect(() => {
    if (isTab(tabParam)) setActiveTab(tabParam);
  }, [tabParam]);

  return (
    <div className="p-8 max-w-4xl">
      <PageHeader
        icon={<FlaskConical className="text-purple-600" size={28} />}
        title="How RAG Works — Technical Deep Dive"
        info="Everything you need to understand Retrieval-Augmented Generation and how this project implements it, from document ingestion to streaming answers."
      />

      <TechnicalNav />
      <TabBar active={activeTab} onChange={setActiveTab} />

      {activeTab === "Overview" && <OverviewTab />}
      {activeTab === "Ingestion" && <IngestionTab />}
      {activeTab === "Query" && <QueryTab />}
      {activeTab === "Config" && <ConfigTab />}
    </div>
  );
}

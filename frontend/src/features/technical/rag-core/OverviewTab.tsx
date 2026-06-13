import { Layers, ArrowRight, Info } from "lucide-react";
import Card from "../../../components/ui/Card";
import SectionTitle from "../../../components/ui/SectionTitle";
import Callout from "../../../components/ui/Callout";

export default function OverviewTab() {
  return (
    <>
      <Card className="mb-6">
        <SectionTitle
          icon={<Layers size={20} />}
          title="What is RAG?"
          subtitle="The big picture in 60 seconds"
        />
        <p className="text-sm text-slate-700 leading-relaxed mb-4">
          A Large Language Model (LLM) is trained on a fixed dataset that has a
          knowledge cut-off date. It knows nothing about <em>your</em>{" "}
          documents.
          <strong> Retrieval-Augmented Generation (RAG)</strong> solves this by
          splitting the problem in two:
        </p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">
              Offline — Ingestion
            </p>
            <p className="text-sm text-slate-700">
              Parse your documents, cut them into small pieces, convert each
              piece to a vector of numbers (an <em>embedding</em>), and store
              everything in a database.
            </p>
          </div>
          <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
            <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-2">
              Online — Query
            </p>
            <p className="text-sm text-slate-700">
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
        <div className="flex flex-col gap-1 text-sm text-slate-700">
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
                className="border-t border-dashed border-slate-200 my-2"
              />
            ) : (
              <div key={i} className="flex items-start gap-2">
                <code className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded text-xs flex-shrink-0 font-mono">
                  {left}
                </code>
                <span className="text-slate-500 text-xs mt-0.5">→ {right}</span>
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
        <div className="space-y-4 text-sm text-slate-700">
          <div>
            <p className="font-semibold text-slate-900 mb-1">
              PostgreSQL + pgvector instead of a dedicated vector DB
            </p>
            <p className="leading-relaxed text-slate-600">
              Dedicated vector databases (Pinecone, Qdrant, Weaviate) add
              operational complexity. pgvector keeps everything in a single
              Postgres instance that you already need for documents and
              conversations, with ACID guarantees and SQL joins. For projects
              under ~10M chunks, the HNSW index is fast enough.
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-900 mb-1">
              Voyage AI instead of OpenAI embeddings
            </p>
            <p className="leading-relaxed text-slate-600">
              Voyage's models are purpose-built for retrieval. The{" "}
              <code className="bg-slate-100 px-1 rounded">input_type</code>{" "}
              distinction between "document" and "query" (asymmetric embeddings)
              measurably improves retrieval quality compared to symmetric
              embedding models.
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-900 mb-1">
              Claude Haiku for generation
            </p>
            <p className="leading-relaxed text-slate-600">
              Haiku is fast and cheap while still being highly capable at
              reading comprehension and synthesis from a given context. Since
              the LLM is only asked to <em>summarise retrieved sources</em> (not
              to recall facts from training), a smaller model is perfectly
              adequate.
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-900 mb-1">
              Sliding window conversation history (last 4 exchanges)
            </p>
            <p className="leading-relaxed text-slate-600">
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

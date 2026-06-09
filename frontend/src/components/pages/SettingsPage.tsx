import { Info, Settings } from "lucide-react";
import { useState } from "react";
import { useConfig } from "../../hooks/useConfig";
import PageHeader from "../ui/PageHeader";

function Row({
  label,
  value,
  info,
}: {
  label: string;
  value: string | number;
  info: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="py-2 border-b border-gray-100 last:border-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-gray-600">{label}</span>
          <button
            onClick={() => setOpen((v) => !v)}
            className="text-gray-300 hover:text-blue-500 transition-colors"
            aria-label={`About: ${label}`}
          >
            <Info size={13} />
          </button>
        </div>
        <span className="text-sm font-mono text-gray-900">{value}</span>
      </div>
      {open && (
        <p className="mt-1 text-xs text-gray-500 bg-blue-50 rounded px-2 py-1">
          {info}
        </p>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-6">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
        {title}
      </h2>
      <div className="bg-white border border-gray-200 rounded-lg px-4">
        {children}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { data: config, isLoading, isError } = useConfig();

  return (
    <div className="p-8 max-w-xl">
      <PageHeader
        icon={<Settings className="text-gray-600" size={28} />}
        title="Settings"
        info="Argos system configuration. These values are set server-side via environment variables and displayed here as read-only."
      />

      {isLoading && <p className="text-gray-400 text-sm">Loading…</p>}
      {isError && (
        <p className="text-red-500 text-sm">Failed to load configuration.</p>
      )}

      {config && (
        <>
          <Section title="General">
            <Row
              label="Log level"
              value={config.logLevel}
              info="Server log verbosity. Possible values: debug, info, warn, error."
            />
          </Section>

          <Section title="RAG — Chunking">
            <Row
              label="Strategy"
              value={config.rag.chunkingStrategy}
              info="Document splitting method. 'sentence' respects sentence boundaries; 'recursive' splits into fixed-size blocks."
            />
            <Row
              label="Chunk size (tokens)"
              value={config.rag.chunkSize}
              info="Maximum number of tokens per chunk. A larger chunk provides more context but may dilute relevance during retrieval."
            />
            <Row
              label="Overlap (tokens)"
              value={config.rag.chunkOverlap}
              info="Number of tokens shared between consecutive chunks. Prevents ideas from being cut across two chunks."
            />
          </Section>

          <Section title="RAG — Retrieval">
            <Row
              label="Result limit"
              value={config.rag.retrievalLimit}
              info="Maximum number of chunks returned by vector search and injected into the LLM context."
            />
            <Row
              label="Minimum score"
              value={config.rag.retrievalMinScore}
              info="Cosine similarity threshold (0–1) below which a chunk is ignored. A high score filters out less relevant results."
            />
          </Section>

          <Section title="LLM">
            <Row
              label="Provider"
              value={config.llm.provider}
              info="API used for response generation. Configurable via environment variables."
            />
            <Row
              label="Model"
              value={config.llm.model}
              info="LLM model used for response generation. Overridable via LLM_MODEL environment variable."
            />
            <Row
              label="Max tokens"
              value={config.llm.maxTokens}
              info="Maximum number of tokens the LLM can generate in a response. Increasing this allows longer answers."
            />
            <Row
              label="Temperature"
              value={config.llm.temperature}
              info="Controls response creativity (0 = deterministic, 1 = very creative). A low value is recommended for factual answers."
            />
          </Section>

          <Section title="Embeddings">
            <Row
              label="Provider"
              value={config.embeddings.provider}
              info="API used for vectorizing documents and queries."
            />
            <Row
              label="Model"
              value={config.embeddings.model}
              info="Embedding model used for vectorizing documents and queries. Overridable via EMBEDDING_MODEL environment variable."
            />
          </Section>
        </>
      )}
    </div>
  );
}

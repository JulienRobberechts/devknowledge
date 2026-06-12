const config = {
  server: {
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || "development",
    logLevel: process.env.LOG_LEVEL || "info",
  },
  db: {
    postgres: {
      connectionString:
        process.env.DATABASE_URL ||
        "postgresql://devknowledge:devknowledge@localhost:5432/devknowledge",
    },
  },
  llm: {
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY ?? "",
      model: process.env.LLM_MODEL ?? "claude-haiku-4-5-20251001",
      maxTokens: parseInt(process.env.LLM_MAX_TOKENS ?? "1024", 10),
      temperature: parseFloat(process.env.LLM_TEMPERATURE ?? "0.1"),
    },
  },
  embeddings: {
    voyage: {
      apiKey: process.env.VOYAGE_API_KEY ?? "",
      model: process.env.EMBEDDING_MODEL ?? "voyage-4-lite",
    },
  },
  api: {
    key: process.env.API_KEY,
    uploadDir: process.env.UPLOAD_DIR ?? "/app/uploads",
  },
  rag: {
    chunkingStrategy: (process.env.CHUNKING_STRATEGY ?? "recursive") as
      | "recursive"
      | "sentence",
    chunkSize: parseInt(process.env.CHUNK_SIZE_TOKENS ?? "512", 10),
    chunkOverlap: parseInt(process.env.CHUNK_OVERLAP_TOKENS ?? "128", 10),
    retrievalLimit: parseInt(process.env.RETRIEVAL_LIMIT ?? "8", 10),
    retrievalMinScore: parseFloat(process.env.RETRIEVAL_MIN_SCORE ?? "0.75"),
    searchMode: (process.env.SEARCH_MODE ?? "hybrid") as "vector" | "hybrid",
    knowledgeCheckStrategies: [] as (
      | "faithfulness"
      | "counterfactual"
      | "citation_forcing"
    )[],
  },
  rerank: {
    enabled: process.env.RERANK_ENABLED !== "false",
    model: process.env.RERANK_MODEL ?? "rerank-2.5",
    candidateMultiplier: parseInt(
      process.env.RERANK_CANDIDATE_MULTIPLIER ?? "3",
      10,
    ),
  },
};

export default config;

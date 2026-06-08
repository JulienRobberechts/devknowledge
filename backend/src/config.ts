const config = {
  server: {
    port: process.env.PORT || 3001,
    nodeEnv: process.env.NODE_ENV || "development",
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
      maxTokens: parseInt(process.env.LLM_MAX_TOKENS ?? "1024", 10),
    },
  },
  embeddings: {
    voyage: {
      apiKey: process.env.VOYAGE_API_KEY ?? "",
    },
  },
  api: {
    key: process.env.API_KEY,
  },
  rag: {
    chunkingStrategy: (process.env.CHUNKING_STRATEGY ?? "recursive") as
      | "recursive"
      | "sentence",
    chunkSize: parseInt(process.env.CHUNK_SIZE_TOKENS ?? "512", 10),
    chunkOverlap: parseInt(process.env.CHUNK_OVERLAP_TOKENS ?? "128", 10),
    retrievalLimit: parseInt(process.env.RETRIEVAL_LIMIT ?? "8", 10),
    retrievalMinScore: parseFloat(process.env.RETRIEVAL_MIN_SCORE ?? "0.75"),
  },
};

export default config;

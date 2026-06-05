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
};

export default config;

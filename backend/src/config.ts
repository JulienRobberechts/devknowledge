import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config({ path: path.join(__dirname, "../../.env") });

const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1),
    ANTHROPIC_APP_API_KEY: z.string().min(1),
    VOYAGE_API_KEY: z.string().min(1),
    APP_PASSWORD: z.string().min(1),
    STORAGE_BACKEND: z.enum(["local", "r2"]).default("local"),
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET_NAME: z.string().optional(),
    PORT: z.coerce.number().default(3001),
    NODE_ENV: z.string().default("development"),
    LOG_LEVEL: z.string().default("info"),
    ALLOWED_ORIGIN: z.string().optional(),
    LLM_MODEL: z.string().default("claude-haiku-4-5-20251001"),
    LLM_MAX_TOKENS: z.coerce.number().default(1024),
    LLM_TEMPERATURE: z.coerce.number().default(0.1),
    EMBEDDING_MODEL: z.string().default("voyage-4-lite"),
    UPLOAD_DIR: z.string().default("/app/uploads"),
    CHUNKING_STRATEGY: z.enum(["recursive", "sentence"]).default("recursive"),
    CHUNK_SIZE_TOKENS: z.coerce.number().default(512),
    CHUNK_OVERLAP_TOKENS: z.coerce.number().default(128),
    RETRIEVAL_LIMIT: z.coerce.number().default(8),
    RETRIEVAL_MIN_SCORE: z.coerce.number().default(0.75),
    SEARCH_MODE: z.enum(["vector", "hybrid"]).default("hybrid"),
    RERANK_ENABLED: z.string().default("true"),
    RERANK_MODEL: z.string().default("rerank-2.5"),
    RERANK_CANDIDATE_MULTIPLIER: z.coerce.number().default(3),
  })
  .superRefine((env, ctx) => {
    if (env.STORAGE_BACKEND === "r2") {
      for (const key of [
        "R2_ACCOUNT_ID",
        "R2_ACCESS_KEY_ID",
        "R2_SECRET_ACCESS_KEY",
        "R2_BUCKET_NAME",
      ] as const) {
        if (!env[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${key} is required when STORAGE_BACKEND=r2`,
            path: [key],
          });
        }
      }
    }
  });

const result = envSchema.safeParse(process.env);
if (!result.success) {
  const missing = result.error.issues.map((e) => e.message || e.path.join(".")).join("\n  ");
  console.error(`Invalid configuration:\n  ${missing}`);
  process.exit(1);
}

const env = result.data;

const config = {
  server: {
    port: env.PORT,
    nodeEnv: env.NODE_ENV,
    logLevel: env.LOG_LEVEL,
    allowedOrigin: env.ALLOWED_ORIGIN,
  },
  db: {
    postgres: {
      connectionString: env.DATABASE_URL,
    },
  },
  llm: {
    anthropic: {
      apiKey: env.ANTHROPIC_APP_API_KEY,
      model: env.LLM_MODEL,
      maxTokens: env.LLM_MAX_TOKENS,
      temperature: env.LLM_TEMPERATURE,
    },
  },
  embeddings: {
    voyage: {
      apiKey: env.VOYAGE_API_KEY,
      model: env.EMBEDDING_MODEL,
    },
  },
  api: {
    key: env.APP_PASSWORD,
    uploadDir: env.UPLOAD_DIR,
  },
  storage: {
    backend: env.STORAGE_BACKEND,
    r2: {
      accountId: env.R2_ACCOUNT_ID ?? "",
      accessKeyId: env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: env.R2_SECRET_ACCESS_KEY ?? "",
      bucketName: env.R2_BUCKET_NAME ?? "",
    },
  },
  rag: {
    chunkingStrategy: env.CHUNKING_STRATEGY,
    chunkSize: env.CHUNK_SIZE_TOKENS,
    chunkOverlap: env.CHUNK_OVERLAP_TOKENS,
    retrievalLimit: env.RETRIEVAL_LIMIT,
    retrievalMinScore: env.RETRIEVAL_MIN_SCORE,
    searchMode: env.SEARCH_MODE,
    responseGroundingStrategies: [] as ("faithfulness" | "counterfactual" | "citation_forcing")[],
  },
  rerank: {
    enabled: env.RERANK_ENABLED !== "false",
    model: env.RERANK_MODEL,
    candidateMultiplier: env.RERANK_CANDIDATE_MULTIPLIER,
  },
};

export default config;

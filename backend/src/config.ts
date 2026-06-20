import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";
import ragConfig from "./rag.config.json";

dotenv.config({ path: path.join(__dirname, "../../.env") });

function requireDefault<T extends { default?: boolean }>(items: T[], name: string): T {
  const item = items.find((m) => m.default) ?? items[0];
  if (!item) throw new Error(`rag.config.json: no ${name} defined`);
  return item;
}

const defaultLlm = requireDefault(ragConfig.llm.models, "llm model");
const defaultEmbedding = requireDefault(ragConfig.embeddings.models, "embedding model");
const defaultRerank = requireDefault(ragConfig.reranking.models, "rerank model");

const envSchema = z
  .object({
    DATABASE_URL: z.string().min(1),
    ANTHROPIC_APP_API_KEY: z.string().min(1),
    VOYAGE_API_KEY: z.string().min(1),
    APP_PASSWORD: z.string().min(1),
    DEFAULT_STORAGE_BACKEND: z.enum(["local", "r2"]).default("local"),
    R2_ACCOUNT_ID: z.string().optional(),
    R2_ACCESS_KEY_ID: z.string().optional(),
    R2_SECRET_ACCESS_KEY: z.string().optional(),
    R2_BUCKET_NAME: z.string().optional(),
    PORT: z.coerce.number().default(3001),
    NODE_ENV: z.string().default("development"),
    LOG_LEVEL: z.string().default("info"),
    ALLOWED_ORIGIN: z.string().optional(),
    UPLOAD_DIR: z.string().default("/app/uploads"),
    SEARCH_MODE: z.enum(["vector", "hybrid"]).default("hybrid"),
    RERANK_ENABLED: z.string().default("true"),
  })
  .superRefine((env, ctx) => {
    if (env.DEFAULT_STORAGE_BACKEND === "r2") {
      for (const key of [
        "R2_ACCOUNT_ID",
        "R2_ACCESS_KEY_ID",
        "R2_SECRET_ACCESS_KEY",
        "R2_BUCKET_NAME",
      ] as const) {
        if (!env[key]) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `${key} is required when DEFAULT_STORAGE_BACKEND=r2`,
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
    },
    defaults: {
      model: defaultLlm.id,
      maxTokens: defaultLlm.maxTokens,
      temperature: defaultLlm.temperature,
    },
  },
  embeddings: {
    voyage: {
      apiKey: env.VOYAGE_API_KEY,
      model: defaultEmbedding.id,
    },
  },
  api: {
    key: env.APP_PASSWORD,
    uploadDir: env.UPLOAD_DIR,
  },
  storage: {
    defaults: {
      backend: env.DEFAULT_STORAGE_BACKEND,
    },
    r2: {
      accountId: env.R2_ACCOUNT_ID ?? "",
      accessKeyId: env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: env.R2_SECRET_ACCESS_KEY ?? "",
      bucketName: env.R2_BUCKET_NAME ?? "",
    },
  },
  rag: {
    defaults: {
      chunkingStrategy: ragConfig.rag.chunkingStrategy as "recursive" | "sentence",
      chunkSize: ragConfig.rag.chunkSize,
      chunkOverlap: ragConfig.rag.chunkOverlap,
      retrievalLimit: ragConfig.rag.retrievalLimit,
      retrievalMinScore: ragConfig.rag.retrievalMinScore,
    },
    searchMode: env.SEARCH_MODE,
    responseGroundingStrategies: [] as ("faithfulness" | "counterfactual" | "citation_forcing")[],
  },
  rerank: {
    enabled: env.RERANK_ENABLED !== "false",
    defaults: {
      model: defaultRerank.id,
      candidateMultiplier: defaultRerank.candidateMultiplier,
    },
  },
};

export default config;

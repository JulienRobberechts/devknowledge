import config from "../../../config";
import type { EmbeddingInputType, ITextEncoder } from "../../../infra-ports/ai/ITextEncoder";
import { Logger } from "../../logger/Logger";

const logger = new Logger("VoyageEmbeddingAdapter");

interface VoyageEmbeddingItem {
  embedding: number[];
  index: number;
}

interface VoyageResponse {
  data: VoyageEmbeddingItem[];
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  const delays = [200, 400, 800];
  let lastError: unknown;
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < delays.length) {
        await sleep(delays[attempt]);
      }
    }
  }
  throw lastError;
}

const BATCH_SIZE = 20;
const BATCH_DELAY_MS = 200;

export class VoyageEmbeddingAdapter implements ITextEncoder {
  private readonly apiKey: string;

  // See https://docs.voyageai.com/docs/embeddings
  private readonly model = config.embeddings.voyage.model;
  private readonly apiUrl = "https://api.voyageai.com/v1/embeddings";

  constructor(apiKey: string = config.embeddings.voyage.apiKey) {
    this.apiKey = apiKey;
  }

  async embed(text: string, inputType?: EmbeddingInputType): Promise<number[]> {
    const results = await this.embedMany([text], inputType);
    return results[0];
  }

  async embedMany(texts: string[], inputType?: EmbeddingInputType): Promise<number[][]> {
    const results: number[][] = [];
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      if (i > 0) {
        await sleep(BATCH_DELAY_MS);
      }
      const batch = texts.slice(i, i + BATCH_SIZE);
      const batchResults = await this.embedBatch(batch, inputType);
      results.push(...batchResults);
    }
    return results;
  }

  private async embedBatch(texts: string[], inputType?: EmbeddingInputType): Promise<number[][]> {
    return withRetry(async () => {
      logger.info("Voyage API request", {
        model: this.model,
        inputCount: texts.length,
        texts: texts,
      });
      const start = Date.now();

      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: texts,
          ...(inputType !== undefined && { input_type: inputType }),
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        logger.error("Voyage API error", { status: response.status, body });
        throw new Error(`Voyage API error: ${response.status} ${body}`);
      }

      const data = (await response.json()) as VoyageResponse;
      logger.info("Voyage API response", {
        model: this.model,
        inputCount: texts.length,
        texts: texts,
        durationMs: Date.now() - start,
      });
      return data.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
    });
  }
}

import { EmbeddingPort } from "../../domain/ports/EmbeddingPort";
import config from "../../config";

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

export class VoyageEmbeddingAdapter implements EmbeddingPort {
  private readonly apiKey: string;
  private readonly model = "voyage-3-lite";
  private readonly apiUrl = "https://api.voyageai.com/v1/embeddings";

  constructor(apiKey: string = config.embeddings.voyage.apiKey) {
    this.apiKey = apiKey;
  }

  async embed(text: string): Promise<number[]> {
    const results = await this.embedMany([text]);
    return results[0];
  }

  async embedMany(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (let i = 0; i < texts.length; i += BATCH_SIZE) {
      if (i > 0) {
        await sleep(BATCH_DELAY_MS);
      }
      const batch = texts.slice(i, i + BATCH_SIZE);
      const batchResults = await this.embedBatch(batch);
      results.push(...batchResults);
    }
    return results;
  }

  private async embedBatch(texts: string[]): Promise<number[][]> {
    return withRetry(async () => {
      const response = await fetch(this.apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({ model: this.model, input: texts }),
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Voyage API error: ${response.status} ${body}`);
      }

      const data = (await response.json()) as VoyageResponse;
      return data.data
        .sort((a, b) => a.index - b.index)
        .map((d) => d.embedding);
    });
  }
}

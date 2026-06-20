import config from "../../../config";
import type { IRerankPort } from "../../../infra-ports/ai";
import { Logger } from "../../logger/Logger";

const logger = new Logger("VoyageRerankAdapter");

interface VoyageRerankItem {
  index: number;
  relevance_score: number;
}

interface VoyageRerankResponse {
  data: VoyageRerankItem[];
}

export class VoyageRerankAdapter implements IRerankPort {
  private readonly apiUrl = "https://api.voyageai.com/v1/rerank";

  constructor(
    private readonly apiKey: string = config.embeddings.voyage.apiKey,
    private readonly model: string = config.rerank.defaults.model,
  ) {}

  async rerank(query: string, documents: string[], model?: string): Promise<number[]> {
    const effectiveModel = model ?? this.model;
    logger.info("Voyage rerank request", {
      model: effectiveModel,
      documentCount: documents.length,
    });
    const start = Date.now();

    const response = await fetch(this.apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: effectiveModel,
        query,
        documents,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      logger.error("Voyage rerank API error", {
        status: response.status,
        body,
      });
      throw new Error(`Voyage rerank API error: ${response.status} ${body}`);
    }

    const data = (await response.json()) as VoyageRerankResponse;
    logger.info("Voyage rerank response", {
      model: effectiveModel,
      resultCount: data.data.length,
      durationMs: Date.now() - start,
    });

    return data.data
      .sort((a, b) => b.relevance_score - a.relevance_score)
      .map((item) => item.index);
  }
}

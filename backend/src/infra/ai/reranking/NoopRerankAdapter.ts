import type { IRerankPort } from "../../../infra-ports/ai/IRerankPort";

export class NoopRerankAdapter implements IRerankPort {
  async rerank(_query: string, documents: string[], _model?: string): Promise<number[]> {
    return documents.map((_, i) => i);
  }
}

/** Re-ranks a list of documents by relevance to a query to improve retrieval quality. */
export interface IRerankPort {
  /** Re-orders documents by relevance to a query and returns their scores. */
  rerank(query: string, documents: string[], model?: string): Promise<number[]>;
}

export type EmbeddingInputType = "query" | "document";

/** Converts text into vector embeddings for semantic search. */
export interface ITextEncoder {
  /** Computes the embedding vector for a single text. */
  embed(text: string, inputType?: EmbeddingInputType): Promise<number[]>;
  /** Computes embedding vectors for multiple texts. */
  embedMany(
    texts: string[],
    inputType?: EmbeddingInputType,
  ): Promise<number[][]>;
}

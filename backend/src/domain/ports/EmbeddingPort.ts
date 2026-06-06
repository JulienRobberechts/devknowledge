export type EmbeddingInputType = "query" | "document";

export interface EmbeddingPort {
  embed(text: string, inputType?: EmbeddingInputType): Promise<number[]>;
  embedMany(
    texts: string[],
    inputType?: EmbeddingInputType,
  ): Promise<number[][]>;
}

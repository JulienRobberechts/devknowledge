import { ITextEncoder } from "../../src/domain/ports/ITextEncoder";

export class InMemoryEmbeddingAdapter implements ITextEncoder {
  private readonly dimension = 1024;

  async embed(_text: string): Promise<number[]> {
    return Array.from({ length: this.dimension }, (_, i) => i / this.dimension);
  }

  async embedMany(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.embed(t)));
  }
}

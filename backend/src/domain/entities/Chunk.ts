/** Value Object: ordinal position and character range of a chunk within the source document. */
export class ChunkMetadata {
  /** Nominal branding: prevents accidental assignment between Value Objects of the same shape. */
  declare private readonly _brand: void;

  readonly position: number;
  readonly startChar: number;
  readonly endChar: number;

  private constructor(position: number, startChar: number, endChar: number) {
    this.position = position;
    this.startChar = startChar;
    this.endChar = endChar;
  }

  static create(
    position: number,
    startChar: number,
    endChar: number,
  ): ChunkMetadata {
    if (position < 0) throw new Error("ChunkMetadata: position must be >= 0");
    if (startChar < 0) throw new Error("ChunkMetadata: startChar must be >= 0");
    if (endChar < startChar)
      throw new Error("ChunkMetadata: endChar must be >= startChar");
    return new ChunkMetadata(position, startChar, endChar);
  }

  equals(other: ChunkMetadata): boolean {
    return (
      this.position === other.position &&
      this.startChar === other.startChar &&
      this.endChar === other.endChar
    );
  }
}

export interface Chunk {
  id: string;
  documentId: string;
  content: string;
  embedding: number[];
  metadata: ChunkMetadata;
}

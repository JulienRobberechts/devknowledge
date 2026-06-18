export type MessageRole = "user" | "assistant";

export type ResponseGroundingStrategy =
  | "faithfulness"
  | "counterfactual"
  | "citation_forcing";

interface SourceCitationProps {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  sourceType: "pdf" | "markdown" | "text";
  excerpt: string;
  score: number;
}

/** Value Object: reference to the source chunk backing a response, including the excerpt and relevance score. */
export class SourceCitation {
  /** Nominal branding: prevents accidental assignment between Value Objects of the same shape. */
  declare private readonly _brand: void;

  readonly chunkId: string;
  readonly documentId: string;
  readonly documentTitle: string;
  readonly sourceType: "pdf" | "markdown" | "text";
  readonly excerpt: string;
  readonly score: number;

  private constructor(props: SourceCitationProps) {
    this.chunkId = props.chunkId;
    this.documentId = props.documentId;
    this.documentTitle = props.documentTitle;
    this.sourceType = props.sourceType;
    this.excerpt = props.excerpt;
    this.score = props.score;
  }

  static create(props: SourceCitationProps): SourceCitation {
    return new SourceCitation(props);
  }

  static fromPlain(plain: unknown): SourceCitation {
    return SourceCitation.create(plain as SourceCitationProps);
  }

  toPlain(): SourceCitationProps {
    return {
      chunkId: this.chunkId,
      documentId: this.documentId,
      documentTitle: this.documentTitle,
      sourceType: this.sourceType,
      excerpt: this.excerpt,
      score: this.score,
    };
  }

  equals(other: SourceCitation): boolean {
    return (
      this.chunkId === other.chunkId &&
      this.documentId === other.documentId &&
      this.score === other.score
    );
  }
}

export interface KnowledgeClaim {
  claim: string;
  status: "SUPPORTED" | "UNSUPPORTED";
  sourceExcerpt?: string;
  documentId?: string;
  documentTitle?: string;
}

export interface ResponseGroundingResult {
  strategy: ResponseGroundingStrategy;
  score: number;
  claims: KnowledgeClaim[];
  warning?: string;
  trainingAnswer?: string;
  similar?: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  sources: SourceCitation[];
  responseGrounding?: ResponseGroundingResult[];
  createdAt: Date;
}

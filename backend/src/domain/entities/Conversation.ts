import type { ResponseGroundingStrategy, Message } from "./Message";

export interface ConversationParamsProps {
  retrievalLimit: number;
  retrievalMinScore: number;
  rerankEnabled: boolean;
  rerankModel: string;
  rerankCandidateMultiplier: number;
  llmModel: string;
  llmTemperature: number;
  llmMaxTokens: number;
  responseGroundingStrategies: ResponseGroundingStrategy[];
  searchMode: "vector" | "hybrid";
}

/** Value Object: immutable RAG parameters for a conversation (retrieval, reranking, LLM, grounding). */
export class ConversationParams {
  /** Nominal branding: prevents accidental assignment between Value Objects of the same shape. */
  declare private readonly _brand: void;

  readonly retrievalLimit: number;
  readonly retrievalMinScore: number;
  readonly rerankEnabled: boolean;
  readonly rerankModel: string;
  readonly rerankCandidateMultiplier: number;
  readonly llmModel: string;
  readonly llmTemperature: number;
  readonly llmMaxTokens: number;
  readonly responseGroundingStrategies: ResponseGroundingStrategy[];
  readonly searchMode: "vector" | "hybrid";

  private constructor(props: ConversationParamsProps) {
    this.retrievalLimit = props.retrievalLimit;
    this.retrievalMinScore = props.retrievalMinScore;
    this.rerankEnabled = props.rerankEnabled;
    this.rerankModel = props.rerankModel;
    this.rerankCandidateMultiplier = props.rerankCandidateMultiplier;
    this.llmModel = props.llmModel;
    this.llmTemperature = props.llmTemperature;
    this.llmMaxTokens = props.llmMaxTokens;
    this.responseGroundingStrategies = props.responseGroundingStrategies;
    this.searchMode = props.searchMode;
  }

  static create(props: ConversationParamsProps): ConversationParams {
    if (props.llmTemperature < 0 || props.llmTemperature > 1)
      throw new Error("ConversationParams: llmTemperature must be in [0, 1]");
    if (props.retrievalMinScore < 0 || props.retrievalMinScore > 1)
      throw new Error(
        "ConversationParams: retrievalMinScore must be in [0, 1]",
      );
    if (props.rerankCandidateMultiplier < 1)
      throw new Error(
        "ConversationParams: rerankCandidateMultiplier must be >= 1",
      );
    if (props.retrievalLimit <= 0)
      throw new Error("ConversationParams: retrievalLimit must be > 0");
    if (props.llmMaxTokens <= 0)
      throw new Error("ConversationParams: llmMaxTokens must be > 0");
    return new ConversationParams(props);
  }

  toPlain(): ConversationParamsProps {
    return {
      retrievalLimit: this.retrievalLimit,
      retrievalMinScore: this.retrievalMinScore,
      rerankEnabled: this.rerankEnabled,
      rerankModel: this.rerankModel,
      rerankCandidateMultiplier: this.rerankCandidateMultiplier,
      llmModel: this.llmModel,
      llmTemperature: this.llmTemperature,
      llmMaxTokens: this.llmMaxTokens,
      responseGroundingStrategies: [...this.responseGroundingStrategies],
      searchMode: this.searchMode,
    };
  }

  equals(other: ConversationParams): boolean {
    return (
      this.retrievalLimit === other.retrievalLimit &&
      this.retrievalMinScore === other.retrievalMinScore &&
      this.rerankEnabled === other.rerankEnabled &&
      this.rerankModel === other.rerankModel &&
      this.rerankCandidateMultiplier === other.rerankCandidateMultiplier &&
      this.llmModel === other.llmModel &&
      this.llmTemperature === other.llmTemperature &&
      this.llmMaxTokens === other.llmMaxTokens &&
      this.searchMode === other.searchMode &&
      this.responseGroundingStrategies.length ===
        other.responseGroundingStrategies.length &&
      this.responseGroundingStrategies.every(
        (s, i) => s === other.responseGroundingStrategies[i],
      )
    );
  }
}

export interface Conversation {
  id: string;
  title: string;
  params: ConversationParams;
  messages: Message[];
  createdAt: Date;
}

export interface ConversationSummary {
  id: string;
  title: string;
  params: ConversationParams;
  messageCount: number;
  createdAt: Date;
}

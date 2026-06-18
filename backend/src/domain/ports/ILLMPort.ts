interface LLMStreamOptionsProps {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

/** Value Object : options de surcharge ponctuelles pour un appel LLM (model, temperature, maxTokens, systemPrompt). */
export class LLMStreamOptions {
  declare private readonly _brand: void;

  readonly model?: string;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly systemPrompt?: string;

  private constructor(props: LLMStreamOptionsProps) {
    this.model = props.model;
    this.temperature = props.temperature;
    this.maxTokens = props.maxTokens;
    this.systemPrompt = props.systemPrompt;
  }

  static create(props: LLMStreamOptionsProps): LLMStreamOptions {
    if (
      props.temperature !== undefined &&
      (props.temperature < 0 || props.temperature > 1)
    )
      throw new Error("LLMStreamOptions: temperature must be in [0, 1]");
    if (props.maxTokens !== undefined && props.maxTokens <= 0)
      throw new Error("LLMStreamOptions: maxTokens must be > 0");
    return new LLMStreamOptions(props);
  }

  equals(other: LLMStreamOptions): boolean {
    return (
      this.model === other.model &&
      this.temperature === other.temperature &&
      this.maxTokens === other.maxTokens &&
      this.systemPrompt === other.systemPrompt
    );
  }
}

/** Streams responses from a large language model token by token. */
export interface ILLMPort {
  /** Sends a prompt to the LLM and streams the response token by token. */
  stream(
    prompt: string,
    onToken: (token: string) => void,
    signal?: AbortSignal,
    options?: LLMStreamOptions,
  ): Promise<string>;
}

export interface LLMStreamOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
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

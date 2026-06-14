export interface LLMStreamOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
}

export interface LLMPort {
  stream(
    prompt: string,
    onToken: (token: string) => void,
    signal?: AbortSignal,
    options?: LLMStreamOptions,
  ): Promise<string>;
}

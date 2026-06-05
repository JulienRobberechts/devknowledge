export interface LLMPort {
  stream(
    prompt: string,
    onToken: (token: string) => void,
    signal?: AbortSignal,
  ): Promise<string>;
}

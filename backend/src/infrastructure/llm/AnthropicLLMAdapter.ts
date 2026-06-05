import Anthropic from "@anthropic-ai/sdk";
import { LLMPort } from "../../domain/ports/LLMPort";
import config from "../../config";

export class AnthropicLLMAdapter implements LLMPort {
  private readonly client: Anthropic;
  private readonly model = "claude-haiku-4-5-20251001";
  private readonly maxTokens: number;

  constructor(
    apiKey: string = config.llm.anthropic.apiKey,
    maxTokens = config.llm.anthropic.maxTokens,
  ) {
    this.client = new Anthropic({ apiKey });
    this.maxTokens = maxTokens;
  }

  async stream(
    prompt: string,
    onToken: (token: string) => void,
    signal?: AbortSignal,
  ): Promise<string> {
    let fullContent = "";

    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: this.maxTokens,
      messages: [{ role: "user", content: prompt }],
    });

    if (signal) {
      signal.addEventListener("abort", () => stream.abort(), { once: true });
    }

    for await (const chunk of stream) {
      if (signal?.aborted) break;
      if (
        chunk.type === "content_block_delta" &&
        chunk.delta.type === "text_delta"
      ) {
        onToken(chunk.delta.text);
        fullContent += chunk.delta.text;
      }
    }

    return fullContent;
  }
}

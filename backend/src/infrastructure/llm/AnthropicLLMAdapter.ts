import Anthropic from "@anthropic-ai/sdk";
import { LLMPort } from "../../domain/ports/LLMPort";

export class AnthropicLLMAdapter implements LLMPort {
  private readonly client: Anthropic;
  private readonly model = "claude-haiku-4-5-20251001";
  private readonly maxTokens: number;

  constructor(
    apiKey: string = process.env.ANTHROPIC_API_KEY ?? "",
    maxTokens = parseInt(process.env.LLM_MAX_TOKENS ?? "1024", 10),
  ) {
    this.client = new Anthropic({ apiKey });
    this.maxTokens = maxTokens;
  }

  async stream(
    prompt: string,
    onToken: (token: string) => void,
  ): Promise<string> {
    let fullContent = "";

    const stream = await this.client.messages.stream({
      model: this.model,
      max_tokens: this.maxTokens,
      messages: [{ role: "user", content: prompt }],
    });

    for await (const chunk of stream) {
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

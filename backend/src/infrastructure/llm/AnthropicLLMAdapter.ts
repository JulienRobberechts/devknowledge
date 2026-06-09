import Anthropic from "@anthropic-ai/sdk";
import { LLMPort } from "../../domain/ports/LLMPort";
import config from "../../config";
import { Logger } from "../logger/Logger";

const logger = new Logger("AnthropicLLMAdapter");

export class AnthropicLLMAdapter implements LLMPort {
  private readonly client: Anthropic;
  private readonly model = config.llm.anthropic.model;
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

    logger.info("Anthropic LLM request", {
      model: this.model,
      maxTokens: this.maxTokens,
      promptLength: prompt.length,
    });
    const start = Date.now();

    const stream = this.client.messages.stream({
      model: this.model,
      max_tokens: this.maxTokens,
      system: "Always respond in the same language as the user's question.",
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

    logger.info("Anthropic LLM response", {
      model: this.model,
      durationMs: Date.now() - start,
      responseLength: fullContent.length,
    });

    return fullContent;
  }
}

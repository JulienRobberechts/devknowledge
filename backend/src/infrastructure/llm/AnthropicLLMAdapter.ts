import Anthropic from "@anthropic-ai/sdk";
import { LLMPort, LLMStreamOptions } from "../../domain/ports/LLMPort";
import config from "../../config";
import { Logger } from "../logger/Logger";

const logger = new Logger("AnthropicLLMAdapter");

export class AnthropicLLMAdapter implements LLMPort {
  private readonly client: Anthropic;

  constructor(apiKey: string = config.llm.anthropic.apiKey) {
    this.client = new Anthropic({ apiKey });
  }

  async stream(
    prompt: string,
    onToken: (token: string) => void,
    signal?: AbortSignal,
    options?: LLMStreamOptions,
  ): Promise<string> {
    const model = options?.model ?? config.llm.anthropic.model;
    const maxTokens = options?.maxTokens ?? config.llm.anthropic.maxTokens;
    const temperature =
      options?.temperature ?? config.llm.anthropic.temperature;
    let fullContent = "";

    logger.info("Anthropic LLM request", {
      model,
      maxTokens,
      temperature,
      promptLength: prompt.length,
    });
    const start = Date.now();

    const stream = this.client.messages.stream({
      model,
      max_tokens: maxTokens,
      temperature,
      ...(options?.systemPrompt ? { system: options.systemPrompt } : {}),
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
      model,
      durationMs: Date.now() - start,
      responseLength: fullContent.length,
    });

    return fullContent;
  }
}

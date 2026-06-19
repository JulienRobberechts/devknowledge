import type { IConversationTitleGenerator } from "../../app-ports/rag/IConversationTitleGenerator";
import type { ILLMPort } from "../../infra-ports/ai/ILLMPort";

export class ConversationTitleGenerator implements IConversationTitleGenerator {
  constructor(private readonly llm: ILLMPort) {}

  async generate(question: string, answer: string): Promise<string> {
    const prompt = [
      "Generate a short title (5 words maximum) summarizing this exchange. Reply with only the title, no quotes, no punctuation at the end.",
      "",
      `User: ${question.slice(0, 300)}`,
      `Assistant: ${answer.slice(0, 300)}`,
    ].join("\n");

    try {
      const title = await this.llm.stream(prompt, () => {});
      return title.trim().slice(0, 80);
    } catch {
      return question.slice(0, 60);
    }
  }
}

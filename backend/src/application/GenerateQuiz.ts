import { z } from "zod";
import { ChunkRepository } from "../domain/ports/ChunkRepository";
import { LLMPort } from "../domain/ports/LLMPort";
import { Logger } from "../infrastructure/logger/Logger";

const MAX_CHUNKS = 15;
const MAX_CHUNK_LENGTH = 800;

const questionSchema = z.object({
  text: z.string(),
  options: z.array(z.string()).length(4),
  correctIndex: z.number().int().min(0).max(3),
});

const responseSchema = z.object({
  questions: z.array(questionSchema),
});

export type QuizQuestion = z.infer<typeof questionSchema>;

export class GenerateQuiz {
  private readonly logger = new Logger("GenerateQuiz");

  constructor(
    private readonly chunkRepo: ChunkRepository,
    private readonly llmAdapter: LLMPort,
  ) {}

  async execute(
    documentIds: string[],
    questionCount: number,
  ): Promise<QuizQuestion[]> {
    const chunkArrays = await Promise.all(
      documentIds.map((id) => this.chunkRepo.findByDocumentId(id)),
    );
    const chunks = chunkArrays.flat();

    if (chunks.length === 0) {
      throw new Error("No content found for the selected documents");
    }

    const selected = chunks.slice(0, MAX_CHUNKS);
    const context = selected
      .map((c) => c.content.slice(0, MAX_CHUNK_LENGTH))
      .join("\n\n---\n\n");

    const prompt = this.buildPrompt(context, questionCount);

    this.logger.info("Generating quiz", {
      documentIds,
      questionCount,
      chunks: selected.length,
    });

    const raw = await this.llmAdapter.stream(prompt, () => {});
    return this.parseResponse(raw, questionCount);
  }

  private buildPrompt(context: string, questionCount: number): string {
    const example = JSON.stringify({
      questions: [
        {
          text: "Question text?",
          options: ["Option A", "Option B", "Option C", "Option D"],
          correctIndex: 0,
        },
      ],
    });

    return [
      `Generate exactly ${questionCount} multiple-choice questions based on the document content below.`,
      "",
      "DOCUMENT CONTENT:",
      context,
      "",
      "Return a JSON object in this exact format (raw JSON only, no markdown, no code blocks):",
      example,
      "",
      `Rules:`,
      `- Generate exactly ${questionCount} questions`,
      "- Each question must have exactly 4 options",
      "- correctIndex is 0-based (0 = first option, 1 = second, etc.)",
      "- Test comprehension and understanding of the content",
      "- Return ONLY valid JSON, no other text",
    ].join("\n");
  }

  private parseResponse(raw: string, expectedCount: number): QuizQuestion[] {
    const cleaned = raw
      .replace(/^```(?:json)?\s*/m, "")
      .replace(/\s*```\s*$/m, "")
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error(
        `LLM returned invalid JSON for quiz: ${cleaned.slice(0, 200)}`,
      );
    }
    const result = responseSchema.parse(parsed);
    return result.questions.slice(0, expectedCount);
  }
}

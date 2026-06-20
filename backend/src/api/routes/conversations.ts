import { randomUUID } from "node:crypto";
import { type NextFunction, type Request, type Response, Router } from "express";
import { z } from "zod";
import type { IAskQuestion } from "../../app-ports/rag/IAskQuestion";
import config from "../../config";
import { ConversationParams } from "../../domain/entities/Conversation";
import { Logger } from "../../infra/logger/Logger";
import type { IConversationRepository } from "../../infra-ports/persistence/IConversationRepository";

const logger = new Logger("conversations");

const responseGroundingStrategySchema = z.enum([
  "faithfulness",
  "counterfactual",
  "citation_forcing",
]);

const conversationParamsSchema = z.object({
  retrievalLimit: z.number().int().min(1).max(20).optional(),
  retrievalMinScore: z.number().min(0).max(1).optional(),
  rerankEnabled: z.boolean().optional(),
  rerankModel: z.string().min(1).optional(),
  rerankCandidateMultiplier: z.number().int().min(1).max(10).optional(),
  llmModel: z.string().min(1).optional(),
  llmTemperature: z.number().min(0).max(1).optional(),
  llmMaxTokens: z.number().int().min(64).max(8192).optional(),
  responseGroundingStrategies: z.array(responseGroundingStrategySchema).optional(),
  searchMode: z.enum(["vector", "hybrid"]).optional(),
});

const createConversationSchema = z.object({
  title: z.string().min(1).default("New conversation"),
  params: conversationParamsSchema.optional(),
});

const updateTitleSchema = z.object({
  title: z.string().min(1).max(80),
});

const sendMessageSchema = z.object({
  content: z.string().min(1),
});

const PING_INTERVAL_MS = 15_000;

export function conversationsRouter(
  conversationRepo: IConversationRepository,
  askQuestion: IAskQuestion,
): Router {
  const router = Router();

  router.post("/", async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = createConversationSchema.parse(_req.body);
      const p = body.params ?? {};
      const conversation = {
        id: randomUUID(),
        title: body.title,
        params: ConversationParams.create({
          retrievalLimit: p.retrievalLimit ?? config.rag.retrievalLimit,
          retrievalMinScore: p.retrievalMinScore ?? config.rag.retrievalMinScore,
          rerankEnabled: p.rerankEnabled ?? config.rerank.enabled,
          rerankModel: p.rerankModel ?? config.rerank.model,
          rerankCandidateMultiplier:
            p.rerankCandidateMultiplier ?? config.rerank.candidateMultiplier,
          llmModel: p.llmModel ?? config.llm.anthropic.model,
          llmTemperature: p.llmTemperature ?? config.llm.anthropic.temperature,
          llmMaxTokens: p.llmMaxTokens ?? config.llm.anthropic.maxTokens,
          responseGroundingStrategies:
            p.responseGroundingStrategies ?? config.rag.responseGroundingStrategies,
          searchMode: p.searchMode ?? config.rag.searchMode,
        }),
        messages: [],
        createdAt: new Date(),
      };
      await conversationRepo.save(conversation);
      res.status(201).json(conversation);
    } catch (err) {
      next(err);
    }
  });

  router.get("/", async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const conversations = await conversationRepo.findAll();
      res.json(conversations);
    } catch (err) {
      next(err);
    }
  });

  router.get("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const conversation = await conversationRepo.findById(String(req.params.id));
      if (!conversation) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }
      res.json(conversation);
    } catch (err) {
      next(err);
    }
  });

  router.patch("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = updateTitleSchema.safeParse(req.body);
      if (!body.success) {
        res.status(400).json({ error: "Validation error" });
        return;
      }
      const conversation = await conversationRepo.findById(String(req.params.id));
      if (!conversation) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }
      await conversationRepo.updateTitle(String(req.params.id), body.data.title);
      res.json({ ...conversation, title: body.data.title });
    } catch (err) {
      next(err);
    }
  });

  router.delete("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const conversation = await conversationRepo.findById(String(req.params.id));
      if (!conversation) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }
      await conversationRepo.delete(String(req.params.id));
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  router.post("/:id/messages", async (req: Request, res: Response): Promise<void> => {
    const body = sendMessageSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({
        error: "Validation error",
        fields: body.error.issues.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        })),
      });
      return;
    }

    const conversation = await conversationRepo.findById(String(req.params.id));
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const ping = setInterval(() => {
      res.write("event: ping\ndata: {}\n\n");
    }, PING_INTERVAL_MS);

    const controller = new AbortController();
    const cleanup = () => {
      clearInterval(ping);
      controller.abort();
    };
    req.on("close", cleanup);

    try {
      const assistantMessage = await askQuestion.execute(
        String(req.params.id),
        body.data.content,
        (token: string) => {
          res.write(`event: delta\ndata: ${JSON.stringify({ token })}\n\n`);
        },
        controller.signal,
      );

      res.write(
        `event: sources\ndata: ${JSON.stringify({ sources: assistantMessage.sources })}\n\n`,
      );
      if (assistantMessage.responseGrounding?.length) {
        res.write(
          `event: response_grounding\ndata: ${JSON.stringify({ results: assistantMessage.responseGrounding })}\n\n`,
        );
      }
      res.write(
        `event: done\ndata: ${JSON.stringify({ messageId: assistantMessage.id, contentLength: assistantMessage.content.length })}\n\n`,
      );
    } catch (err) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: "Stream error" })}\n\n`);
      logger.error("SSE stream error", err instanceof Error ? err : new Error(String(err)));
    } finally {
      cleanup();
      res.end();
    }
  });

  return router;
}

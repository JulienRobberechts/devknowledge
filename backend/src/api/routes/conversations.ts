import { randomUUID } from "node:crypto";
import { type NextFunction, type Request, type Response, Router } from "express";
import { type ZodError, z } from "zod";
import type { IAskQuestion, IConversationService } from "../../app-ports/rag";
import config from "../../config";
import { ConversationParams } from "../../domain/entities";
import type { ILogger } from "../../infra-ports";

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
  firstMessage: z.string().min(1),
  params: conversationParamsSchema.optional(),
});

const updateTitleSchema = z.object({
  title: z.string().min(1).max(80),
});

const sendMessageSchema = z.object({
  content: z.string().min(1),
});

const PING_INTERVAL_MS = 15_000;

function formatZodError(error: ZodError) {
  return {
    error: "Validation error",
    fields: error.issues.map((e) => ({
      path: e.path.join("."),
      message: e.message,
    })),
  };
}

async function streamAskResponse(
  res: Response,
  req: Request,
  conversationId: string,
  content: string,
  askQuestion: IAskQuestion,
  logger: ILogger,
): Promise<void> {
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
      conversationId,
      content,
      (token: string) => {
        res.write(`event: delta\ndata: ${JSON.stringify({ token })}\n\n`);
      },
      controller.signal,
    );

    res.write(`event: sources\ndata: ${JSON.stringify({ sources: assistantMessage.sources })}\n\n`);
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
}

export function conversationsRouter(
  conversationService: IConversationService,
  askQuestion: IAskQuestion,
  logger: ILogger,
): Router {
  const router = Router();

  router.post("/", async (req: Request, res: Response): Promise<void> => {
    const body = createConversationSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json(formatZodError(body.error));
      return;
    }

    const p = body.data.params ?? {};
    const conversation = {
      id: randomUUID(),
      title: "New conversation",
      params: ConversationParams.create({
        retrievalLimit: p.retrievalLimit ?? config.rag.defaults.retrievalLimit,
        retrievalMinScore: p.retrievalMinScore ?? config.rag.defaults.retrievalMinScore,
        rerankEnabled: p.rerankEnabled ?? config.rerank.enabled,
        rerankModel: p.rerankModel ?? config.rerank.defaults.model,
        rerankCandidateMultiplier:
          p.rerankCandidateMultiplier ?? config.rerank.defaults.candidateMultiplier,
        llmModel: p.llmModel ?? config.llm.defaults.model,
        llmTemperature: p.llmTemperature ?? config.llm.defaults.temperature,
        llmMaxTokens: p.llmMaxTokens ?? config.llm.defaults.maxTokens,
        responseGroundingStrategies:
          p.responseGroundingStrategies ?? config.rag.responseGroundingStrategies,
        searchMode: p.searchMode ?? config.rag.searchMode,
      }),
      messages: [],
      createdAt: new Date(),
    };

    await conversationService.save(conversation);

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    res.write(`event: created\ndata: ${JSON.stringify({ conversationId: conversation.id })}\n\n`);

    await streamAskResponse(res, req, conversation.id, body.data.firstMessage, askQuestion, logger);
  });

  router.get("/", async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const conversations = await conversationService.findAll();
      res.json(conversations);
    } catch (err) {
      next(err);
    }
  });

  router.get("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const conversation = await conversationService.findById(String(req.params.id));
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
        res.status(400).json(formatZodError(body.error));
        return;
      }
      const conversation = await conversationService.findById(String(req.params.id));
      if (!conversation) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }
      await conversationService.updateTitle(String(req.params.id), body.data.title);
      res.json({ ...conversation, title: body.data.title });
    } catch (err) {
      next(err);
    }
  });

  router.delete("/:id", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const conversation = await conversationService.findById(String(req.params.id));
      if (!conversation) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }
      await conversationService.delete(String(req.params.id));
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  router.post("/:id/messages", async (req: Request, res: Response): Promise<void> => {
    const body = sendMessageSchema.safeParse(req.body);
    if (!body.success) {
      res.status(400).json(formatZodError(body.error));
      return;
    }

    const conversation = await conversationService.findById(String(req.params.id));
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    await streamAskResponse(
      res,
      req,
      String(req.params.id),
      body.data.content,
      askQuestion,
      logger,
    );
  });

  return router;
}

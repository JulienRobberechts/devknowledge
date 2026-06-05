import { randomUUID } from "crypto";
import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { ConversationRepository } from "../../domain/ports/ConversationRepository";
import { AskQuestion } from "../../application/AskQuestion";

const createConversationSchema = z.object({
  title: z.string().min(1).default("New conversation"),
});

const sendMessageSchema = z.object({
  content: z.string().min(1),
});

const PING_INTERVAL_MS = 15_000;

export function conversationsRouter(
  conversationRepo: ConversationRepository,
  askQuestion: AskQuestion,
): Router {
  const router = Router();

  router.post(
    "/",
    async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const body = createConversationSchema.parse(_req.body);
        const conversation = {
          id: randomUUID(),
          title: body.title,
          messages: [],
          createdAt: new Date(),
        };
        await conversationRepo.save(conversation);
        res.status(201).json(conversation);
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    "/",
    async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const conversations = await conversationRepo.findAll();
        res.json(conversations);
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    "/:id",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const conversation = await conversationRepo.findById(req.params.id);
        if (!conversation) {
          res.status(404).json({ error: "Conversation not found" });
          return;
        }
        res.json(conversation);
      } catch (err) {
        next(err);
      }
    },
  );

  router.delete(
    "/:id",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const conversation = await conversationRepo.findById(req.params.id);
        if (!conversation) {
          res.status(404).json({ error: "Conversation not found" });
          return;
        }
        await conversationRepo.delete(req.params.id);
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    "/:id/messages",
    async (req: Request, res: Response): Promise<void> => {
      const body = sendMessageSchema.safeParse(req.body);
      if (!body.success) {
        res.status(400).json({
          error: "Validation error",
          fields: body.error.errors.map((e) => ({
            path: e.path.join("."),
            message: e.message,
          })),
        });
        return;
      }

      const conversation = await conversationRepo.findById(req.params.id);
      if (!conversation) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
      });

      const ping = setInterval(() => {
        res.write("event: ping\ndata: {}\n\n");
      }, PING_INTERVAL_MS);

      const cleanup = () => clearInterval(ping);
      req.on("close", cleanup);

      try {
        const assistantMessage = await askQuestion.execute(
          req.params.id,
          body.data.content,
          (token: string) => {
            res.write(`event: delta\ndata: ${JSON.stringify({ token })}\n\n`);
          },
        );

        res.write(
          `event: sources\ndata: ${JSON.stringify({ sources: assistantMessage.sources })}\n\n`,
        );
        res.write(
          `event: done\ndata: ${JSON.stringify({ messageId: assistantMessage.id, totalTokens: assistantMessage.content.length })}\n\n`,
        );
      } catch (err) {
        res.write(
          `event: error\ndata: ${JSON.stringify({ error: "Stream error" })}\n\n`,
        );
        console.error("SSE stream error:", err);
      } finally {
        cleanup();
        res.end();
      }
    },
  );

  return router;
}

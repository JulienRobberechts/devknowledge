import { type NextFunction, type Request, type Response, Router } from "express";
import { z } from "zod";
import type { IRetrieveKnowledge } from "../../app-ports/rag/IRetrieveKnowledge";

const searchSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().max(50).default(10),
});

export function searchRouter(retrieveKnowledge: IRetrieveKnowledge): Router {
  const router = Router();

  router.post("/", async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = searchSchema.parse(req.body);
      const results = await retrieveKnowledge.execute(body.query, body.limit);
      res.json(results);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

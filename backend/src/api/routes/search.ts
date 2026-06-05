import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { SearchKnowledge } from "../../application/SearchKnowledge";

const searchSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().max(50).default(10),
});

export function searchRouter(searchKnowledge: SearchKnowledge): Router {
  const router = Router();

  router.post(
    "/",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const body = searchSchema.parse(req.body);
        const results = await searchKnowledge.execute(body.query, body.limit);
        res.json(results);
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}

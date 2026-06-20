import { type NextFunction, type Request, type Response, Router } from "express";
import { z } from "zod";
import type { IGenerateQuiz } from "../../app-ports/quiz/IGenerateQuiz";

const generateQuizSchema = z.object({
  documentIds: z.array(z.string().uuid()).min(1),
  questionCount: z.number().int().min(3).max(20).default(5),
});

export function quizzesRouter(generateQuiz: IGenerateQuiz): Router {
  const router = Router();

  router.post(
    "/generate",
    async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const body = generateQuizSchema.parse(req.body);
        const questions = await generateQuiz.execute(body.documentIds, body.questionCount);
        res.json({ questions });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}

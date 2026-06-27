import { timingSafeEqual } from "node:crypto";
import { type Request, type Response, Router } from "express";
import config from "../../config";

function isValidKey(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function authRouter(): Router {
  const router = Router();

  router.post("/login", (req: Request, res: Response): void => {
    const { password } = req.body as { password?: string };
    const expectedKey = config.api.key;

    if (!expectedKey) {
      res.status(503).json({ error: "Service misconfigured" });
      return;
    }

    if (!password || typeof password !== "string") {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    if (!isValidKey(password, expectedKey)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    res.cookie("session", expectedKey, {
      httpOnly: true,
      secure: config.server.nodeEnv === "production",
      sameSite: "strict",
    });
    res.json({ ok: true });
  });

  router.post("/logout", (_req: Request, res: Response): void => {
    res.clearCookie("session");
    res.json({ ok: true });
  });

  router.get("/me", (req: Request, res: Response): void => {
    const fromCookie = (req.cookies as Record<string, string> | undefined)?.session;
    const fromHeader = req.headers["x-api-key"];
    const key = fromCookie ?? fromHeader;
    const expectedKey = config.api.key;

    if (!key || !expectedKey || typeof key !== "string" || !isValidKey(key, expectedKey)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    res.json({ ok: true });
  });

  return router;
}

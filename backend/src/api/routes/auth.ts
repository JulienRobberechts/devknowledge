import { Router, Request, Response } from "express";
import { timingSafeEqual } from "crypto";
import config from "../../config";

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

    const provided = Buffer.from(password);
    const expected = Buffer.from(expectedKey);
    if (
      provided.length !== expected.length ||
      !timingSafeEqual(provided, expected)
    ) {
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
    const fromCookie = (req.cookies as Record<string, string> | undefined)
      ?.session;
    const fromHeader = req.headers["x-api-key"];
    const key = fromCookie ?? fromHeader;
    const expectedKey = config.api.key;

    if (
      !key ||
      !expectedKey ||
      typeof key !== "string" ||
      key.length !== expectedKey.length ||
      !timingSafeEqual(Buffer.from(key), Buffer.from(expectedKey))
    ) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    res.json({ ok: true });
  });

  return router;
}

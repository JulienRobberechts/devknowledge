import { NextFunction, Request, Response } from "express";
import { timingSafeEqual } from "crypto";
import config from "../../config";

export function apiKeyAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const fromHeader = req.headers["x-api-key"];
  const fromCookie = (req.cookies as Record<string, string> | undefined)
    ?.session;
  const apiKey = fromHeader ?? fromCookie;

  const expectedKey = config.api.key;
  if (!expectedKey) {
    res.status(503).json({ error: "Service misconfigured" });
    return;
  }

  if (!apiKey || typeof apiKey !== "string") {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const provided = Buffer.from(apiKey);
  const expected = Buffer.from(expectedKey);
  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  ) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  next();
}

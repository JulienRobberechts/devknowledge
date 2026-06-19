import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { Logger } from "../../infra/logger/Logger";

const logger = new Logger("errorHandler");

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation error",
      fields: err.issues.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    });
    return;
  }

  logger.error("Unhandled error", err instanceof Error ? err : new Error(String(err)));

  res.status(500).json({ error: "Internal server error" });
}

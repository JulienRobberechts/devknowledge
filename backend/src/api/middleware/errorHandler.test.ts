import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ZodError, ZodIssueCode } from "zod";

vi.mock("../../config", () => ({
  default: {
    api: { key: "key" },
    server: { nodeEnv: "development", logLevel: "info" },
  },
}));

import { nullLogger } from "../../../tests/fakes/NullLogger";
import { createErrorHandler } from "./errorHandler";

const errorHandler = createErrorHandler(nullLogger);

function makeRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

const fakeReq = {} as Request;
const fakeNext = vi.fn() as unknown as NextFunction;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("errorHandler", () => {
  it("returns 400 with field details for ZodError", () => {
    const zodErr = new ZodError([
      {
        code: ZodIssueCode.too_small,
        minimum: 1,
        origin: "string",
        inclusive: true,
        message: "Required",
        path: ["title"],
      },
    ]);
    const res = makeRes();
    errorHandler(zodErr, fakeReq, res, fakeNext);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: "Validation error" }));
  });

  it("returns 500 for generic errors", () => {
    const res = makeRes();
    errorHandler(new Error("boom"), fakeReq, res, fakeNext);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: "Internal server error" });
  });

  it("returns 500 for non-Error values", () => {
    const res = makeRes();
    errorHandler("string error", fakeReq, res, fakeNext);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

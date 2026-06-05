import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";

vi.mock("../../src/config", () => ({
  default: { api: { key: "secret-key" }, server: { nodeEnv: "test" } },
}));

import { apiKeyAuth } from "../../src/api/middleware/apiKeyAuth";

function makeRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("apiKeyAuth", () => {
  it("calls next() when API key matches", () => {
    const req = {
      headers: { "x-api-key": "secret-key" },
    } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    apiKeyAuth(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("returns 401 when API key is missing", () => {
    const req = { headers: {} } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    apiKeyAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: "Unauthorized" });
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 when API key is wrong", () => {
    const req = { headers: { "x-api-key": "wrong-key" } } as unknown as Request;
    const res = makeRes();
    const next = vi.fn() as NextFunction;
    apiKeyAuth(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

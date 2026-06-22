import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(__dirname, "../../src");

const RULES = [
  {
    name: "domain-not-to-outer-layers",
    comment: "domain must not import from any other project layer (pure business rules)",
    severity: "error" as const,
    from: { path: "^src/domain" },
    to: { path: "^src/(api|app|app-ports|infra|infra-ports)" },
  },
  {
    name: "app-not-to-infra",
    comment: "app use-cases must not bypass ports by importing infra directly",
    severity: "error" as const,
    from: { path: "^src/app" },
    to: { path: "^src/infra" },
  },
  {
    name: "app-not-to-api",
    comment: "app use-cases must not import from the entry adapter",
    severity: "error" as const,
    from: { path: "^src/app" },
    to: { path: "^src/api" },
  },
  {
    name: "infra-not-to-api",
    comment: "infra adapters must not import from entry adapters",
    severity: "error" as const,
    from: { path: "^src/infra" },
    to: { path: "^src/api" },
  },
  {
    name: "infra-not-to-app",
    comment: "infra adapters must not import use-cases (only ports and domain)",
    severity: "error" as const,
    from: { path: "^src/infra" },
    to: { path: "^src/app" },
  },
  {
    name: "infra-not-to-app-ports",
    comment:
      "infra adapters depend on infra-ports, not app-ports (avoid cross-layer port coupling)",
    severity: "error" as const,
    from: { path: "^src/infra" },
    to: { path: "^src/app-ports" },
  },
  {
    name: "api-not-to-infra",
    comment: "API adapter must go through the app layer, not call infra directly",
    severity: "error" as const,
    from: { path: "^src/api" },
    to: { path: "^src/infra" },
  },
];

describe("arch", () => {
  it("should have no layer boundary violations", async () => {
    const { cruise } = await import("dependency-cruiser");

    const result = await cruise([SRC], {
      ruleSet: { forbidden: RULES },
      tsPreCompilationDeps: true,
      tsConfig: { fileName: path.resolve(__dirname, "../../tsconfig.json") },
    });

    if (typeof result.output === "string") {
      throw new Error("Unexpected string output from dependency-cruiser");
    }

    const violations = result.output.summary.violations.filter((v) => v.rule.severity === "error");

    if (violations.length > 0) {
      const report = violations.map((v) => `  [${v.rule.name}] ${v.from} → ${v.to}`).join("\n");
      expect.fail(`Layer boundary violations:\n${report}`);
    }
  });
});

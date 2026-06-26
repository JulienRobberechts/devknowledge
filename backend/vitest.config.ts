import path from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "vitest/config";

// Load .env before building the env object so VSCode (which has no shell env)
// gets the real keys — dotenv inside setupFiles runs too late (after env is injected).
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const shared = {
  globals: true,
  environment: "node" as const,
  env: {
    UPLOAD_DIR: "/tmp/test-uploads",
    DATABASE_URL: "postgresql://test:test@localhost:5432/test",
    ANTHROPIC_APP_API_KEY: process.env.ANTHROPIC_APP_API_KEY ?? "test-key",
    VOYAGE_API_KEY: process.env.VOYAGE_API_KEY ?? "test-key",
    APP_PASSWORD: "test-password",
  },
  setupFiles: ["./tests/setup.ts"],
  fileParallelism: false,
};

export default defineConfig({
  test: {
    passWithNoTests: true,
    coverage: {
      reportOnFailure: true,
      exclude: ["src/index.ts", "src/infra/db/migrate.ts", "src/infra/db/pool.ts"],
    },
    projects: [
      {
        test: {
          ...shared,
          name: "u-core",
          include: ["src/**/*.u-core.test.ts"],
        },
      },
      {
        test: { ...shared, name: "u-api", include: ["src/**/*.u-api.test.ts"] },
      },
      {
        test: {
          ...shared,
          name: "u-infra",
          include: ["src/**/*.u-infra.test.ts"],
        },
      },
      {
        test: { ...shared, name: "1-api", include: ["src/**/*.1-api.test.ts"] },
      },
      {
        test: {
          ...shared,
          name: "1-core",
          include: ["src/**/*.1-core.test.ts"],
        },
      },
      {
        test: {
          ...shared,
          name: "arch",
          include: ["tests/arch/**/*.arch.test.ts"],
        },
      },
      {
        test: {
          ...shared,
          name: "1-infra",
          include: ["src/**/*.1-infra.test.ts", "tests/1-infra/**/*.1-infra.test.ts"],
          globalSetup: ["./tests/globalSetup.pg.ts"],
          setupFiles: ["./tests/setup.ts", "./tests/setup.infra.ts"],
        },
      },
      {
        test: {
          ...shared,
          name: "e2e-api",
          include: ["tests/retrieval/**/*.retrieval.test.ts"],
        },
      },
    ],
  },
});

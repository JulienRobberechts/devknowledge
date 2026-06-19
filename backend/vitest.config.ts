import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    env: {
      UPLOAD_DIR: "/tmp/test-uploads",
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      ANTHROPIC_APP_API_KEY: "test-key",
      VOYAGE_API_KEY: process.env.VOYAGE_API_KEY ?? "test-key",
      APP_PASSWORD: "test-password",
    },
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
    exclude: process.env.CI ? ["tests/integration/**", "tests/retrieval/**"] : [],
    passWithNoTests: true,
    fileParallelism: false,
    coverage: {
      reportOnFailure: true,
      exclude: ["src/index.ts", "src/infra/db/migrate.ts", "src/infra/db/pool.ts"],
    },
  },
});

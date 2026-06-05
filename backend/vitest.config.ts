import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    passWithNoTests: true,
    fileParallelism: false,
    coverage: {
      reportOnFailure: true,
      exclude: [
        "src/index.ts",
        "src/infrastructure/db/migrate.ts",
        "src/infrastructure/db/pool.ts",
      ],
    },
  },
});

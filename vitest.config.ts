import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    setupFiles: ["src/__tests__/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/app/**/*.ts"],
      exclude: ["src/app/**/*.test.ts", "src/generated/**"],
    },
    testTimeout: 15000,
    hookTimeout: 15000,
    pool: "forks",
  },
});

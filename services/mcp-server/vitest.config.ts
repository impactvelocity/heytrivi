import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: false,
    // Each test file gets its own server instance; don't run concurrently.
    pool: "forks",
    poolOptions: {
      forks: { singleFork: false },
    },
    testTimeout: 15_000,
  },
});

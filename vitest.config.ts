import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // Mirror tsconfig's "@/*" path mapping.
    alias: { "@": new URL(".", import.meta.url).pathname },
  },
  test: {
    include: ["lib/**/*.test.ts"],
  },
});

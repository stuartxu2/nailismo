import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  // Mirror the tsconfig "@/*" -> "./*" path alias so route-handler tests can
  // import via "@/lib/...".
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    // Playwright specs live in e2e/ and run via `npm run e2e`, not Vitest.
    exclude: ["**/node_modules/**", "**/dist/**", "**/.next/**", "e2e/**"],
  },
});

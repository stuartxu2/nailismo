import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config for the storefront.
 *
 * Target a deployed preview by setting PLAYWRIGHT_BASE_URL (recommended — see
 * workflows/deploy_web.md). With no base URL set, Playwright boots a local
 * `next dev` server. Either target needs working Shopify Storefront env vars,
 * since the purchase path uses live catalog + cart data.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const useExternal = Boolean(process.env.PLAYWRIGHT_BASE_URL);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: useExternal
    ? undefined
    : {
        command: "npm run dev",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});

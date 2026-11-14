import { test, expect, type Page } from "@playwright/test";

/**
 * Trust + PDP regressions (P0 review, 2026-11-14). Requires live Storefront
 * data (local `next dev` with env vars, or PLAYWRIGHT_BASE_URL).
 *
 * - No fabricated testimonials or references to sets that don't exist.
 * - No false merchandising claims in the announcement ticker.
 * - Generated style imagery is not labelled as real customer hands.
 * - The mobile sticky Add-to-Bag bar stays hidden on desktop.
 * - PDP gallery images always carry alt text.
 * - The homepage "New flavors" shelf is actually stocked.
 */

// Names that never existed in the Shopify catalog but used to appear in copy.
const GHOST_SETS = ["Bubblegum Pop", "Soda Pop", "Cherry Cola", "Mint Chip", "Grape Soda"];

async function openFirstNailPdp(page: Page) {
  await page.goto("/shop");
  const link = page
    .locator('a[href^="/products/"]:not([href*="gift-card"]):not([href*="glue"])')
    .first();
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/\/products\/.+/);
}

test.describe("homepage trust", () => {
  test("shows no fabricated testimonials or ghost sets", async ({ page }) => {
    await page.goto("/");
    const body = page.locator("body");
    await expect(body).not.toContainText("Riley P.");
    for (const name of GHOST_SETS) await expect(body).not.toContainText(name);
  });

  test("announcement ticker makes no weekly-drop claim", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).not.toContainText(/new flavors every week/i);
  });

  test("New flavors shelf shows at least 4 sets", async ({ page }) => {
    await page.goto("/");
    const shelf = page.locator("section", { has: page.getByRole("heading", { name: "New flavors" }) });
    await expect(shelf.locator(".candy-rack-item").first()).toBeVisible();
    expect(await shelf.locator(".candy-rack-item").count()).toBeGreaterThanOrEqual(4);
  });
});

test("lookbook shows no third-party feed images or real-hands claims", async ({ page }) => {
  for (const path of ["/lookbook", "/lookbook/the-blazer"]) {
    await page.goto(path);
    await expect(page.locator('img[src*="/lookbook/collage/"]')).toHaveCount(0);
    await expect(page.locator("body")).not.toContainText("小红书");
    await expect(page.locator("body")).not.toContainText(/real hands/i);
  }
});

test("FAQ recommends no ghost sets", async ({ page }) => {
  await page.goto("/faq");
  for (const name of GHOST_SETS) await expect(page.locator("body")).not.toContainText(name);
});

test.describe("PDP", () => {
  test("desktop shows exactly one Add to Bag button", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openFirstNailPdp(page);
    await expect(page.getByRole("button", { name: /add to bag/i })).toHaveCount(1);
  });

  test("mobile shows exactly one Add to Bag button", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openFirstNailPdp(page);
    await expect(page.getByRole("button", { name: /add to bag/i })).toHaveCount(1);
  });

  test("every image in main has alt text", async ({ page }) => {
    await openFirstNailPdp(page);
    await expect(page.locator("main img").first()).toBeVisible();
    await expect(page.locator('main img[alt=""], main img:not([alt])')).toHaveCount(0);
  });

  test("style imagery is not labelled as real customer hands", async ({ page }) => {
    await openFirstNailPdp(page);
    await expect(page.getByText("Real hands", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("region", { name: /real hands/i })).toHaveCount(0);
  });
});

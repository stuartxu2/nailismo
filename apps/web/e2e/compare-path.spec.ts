import { test, expect } from "@playwright/test";

/**
 * Favorites → Compare → cart path.
 *
 * Heart several sets on the shop grid, open /compare, tick two, bulk-add them to
 * the bag, and confirm the purchased picks leave Favorites while the rest stay.
 * Requires a target with live Shopify Storefront data (preview URL or a local
 * server with env vars). Assumes the first few shop products are in stock —
 * if a run lands on sold-out items the checkboxes won't render; re-run or seed
 * in-stock products.
 *
 * Favorites persist in localStorage, which is shared across navigations within a
 * single Playwright browser context, so no extra wiring is needed between steps.
 */
test.describe("favorites + compare", () => {
  test("heart sets → compare → bulk add to bag → purchased leave favorites", async ({
    page,
  }) => {
    const HEART_COUNT = 4;

    // 1. Heart the first few sets on the shop grid. Each toggle flips the
    //    button's accessible name (Save → Remove), so re-querying ".first()"
    //    always lands on the next un-saved card.
    await page.goto("/shop");
    const anySaveButton = page.getByRole("button", { name: /save .+ to favorites/i });
    await expect(anySaveButton.first()).toBeVisible();

    for (let i = 0; i < HEART_COUNT; i++) {
      await page.getByRole("button", { name: /save .+ to favorites/i }).first().click();
      // Wait for the saved count to reach i + 1 before hearting the next card.
      await expect(page.locator(".candy-favlink-badge")).toHaveText(String(i + 1));
    }

    // 2. Header badge reflects the saved count and links to /compare.
    const badge = page.locator(".candy-favlink-badge");
    await expect(badge).toHaveText(String(HEART_COUNT));
    await page.getByRole("link", { name: /favorites/i }).click();
    await expect(page).toHaveURL(/\/compare/);

    // 3. Compare tray shows the saved sets as image tiles (max 4 side by side).
    const tiles = page.locator(".cmp-tile");
    await expect(tiles).toHaveCount(HEART_COUNT);

    // 4. Tick two in-stock picks (interactive labels only — sold-out tiles render
    //    a non-interactive span). Then the action bar shows the live count.
    const buyLabels = page.locator("label.cmp-select");
    expect(await buyLabels.count()).toBeGreaterThanOrEqual(2);
    await buyLabels.nth(0).click();
    await buyLabels.nth(1).click();
    await expect(page.locator(".cmp-actionbar-count")).toHaveText(/2 selected/i);

    // 5. Bulk add — the client adds both lines, clears them from Favorites, then
    //    navigates to the cart.
    await page.getByRole("button", { name: /add selected to bag/i }).click();
    await page.waitForURL(/\/cart/);

    // 6. Cart holds exactly the two purchased lines.
    await expect(page.locator(".candy-line")).toHaveCount(2);

    // 7. Back on /compare the two purchased picks are gone; the rest remain saved.
    await page.goto("/compare");
    await expect(page.locator(".candy-favlink-badge")).toHaveText(
      String(HEART_COUNT - 2),
    );
    await expect(page.locator(".cmp-tile")).toHaveCount(HEART_COUNT - 2);
  });

  test("compare board shows an empty state with no favorites", async ({ page }) => {
    await page.goto("/compare");
    await expect(page.getByRole("heading", { name: /no favorites yet/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /shop the rack/i })).toBeVisible();
  });
});

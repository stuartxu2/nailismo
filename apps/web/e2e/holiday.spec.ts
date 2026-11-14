import { test, expect, type Page } from "@playwright/test";
import { OFFER_ENABLED, OFFER_END, SEASON_END } from "../lib/promo/holiday";

/**
 * Holiday 2026 package: "Any 3 sets for $45" (Every Possible Discount) plus the
 * gift guide and shipping-cutoff messaging. Each test retires itself once its
 * window closes, so the suite stays green after the season.
 * Requires live Storefront data and the live EPD rule (PLAYWRIGHT_BASE_URL).
 */

const offerOver = () => !OFFER_ENABLED || Date.now() >= OFFER_END.getTime();
const seasonOver = () => Date.now() >= SEASON_END.getTime();

async function addToBag(page: Page, handle: string) {
  await page.goto(`/products/${handle}`);
  await page.getByRole("button", { name: /add to bag/i }).first().click();
  await page.waitForURL(/\/cart/);
}

test.describe("3 for $45 offer", () => {
  test.beforeEach(() => test.skip(offerOver(), "offer switched off or ended"));

  test("eligible set PDP shows the offer with a nudge that never miscounts", async ({ page }) => {
    await page.goto("/products/midnight-circuit");
    const main = page.locator("main");
    await expect(main).toContainText("Any 3 sets for $45");
    await expect(main).toContainText("the price drops in your bag");
    await expect(main).not.toContainText(/add 2 more/i);
  });

  for (const handle of ["nailismo-gift-card", "nail-glue"]) {
    test(`${handle} PDP does not show the offer`, async ({ page }) => {
      await page.goto(`/products/${handle}`);
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("main")).not.toContainText("Any 3 sets for $45");
    });
  }

  test("3 sets in the bag cost $45", async ({ page }) => {
    for (const handle of ["midnight-circuit", "monochrome-edge", "rebel-king"]) {
      await addToBag(page, handle);
    }
    const main = page.locator("main");
    await expect(main).toContainText(/Total\s*\$45(\.00)?(?!\d)/);
    await expect(main).toContainText("Includes $8.97 off");
    await expect(main).not.toContainText(/you saved/i);
  });

  test("a bag with no sets is offered best-selling sets, glue marked as an add-on", async ({ page }) => {
    await addToBag(page, "nail-glue");
    const section = page.getByRole("region", { name: "Build a 3-pack" });
    await expect(section).toBeVisible();
    expect(await section.getByRole("button", { name: /^Add .* to bag$/ }).count()).toBeGreaterThanOrEqual(3);
    await expect(section).not.toContainText("Nail Glue");
  });

  test("glue suggested beside a partial pack says it doesn't count", async ({ page }) => {
    await addToBag(page, "midnight-circuit");
    const section = page.getByRole("region", { name: "Complete your 3-pack" });
    await expect(section).toBeVisible();
    await expect(section).toContainText("Add-on, not part of the 3-pack");
  });

  test("home ticker leads with the offer", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toContainText("ANY 3 SETS FOR $45");
  });
});

test.describe("offer switched off", () => {
  test.beforeEach(() => test.skip(OFFER_ENABLED, "offer switched on"));

  test("no offer copy on home or an eligible PDP", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).not.toContainText(/any 3 sets for \$45/i);
    await page.goto("/products/midnight-circuit");
    await expect(page.getByRole("button", { name: /add to bag/i }).first()).toBeVisible();
    await expect(page.locator("body")).not.toContainText(/any 3 sets for \$45/i);
  });
});

test.describe("holiday season", () => {
  test.beforeEach(() => test.skip(seasonOver(), "season ended"));

  test("gift guide shows its heading and a delivery cutoff", async ({ page }) => {
    await page.goto("/collections/holiday-gift-guide");
    await expect(page.getByRole("heading", { name: "Holiday Gift Guide" })).toBeVisible();
    await expect(page.locator("main")).toContainText(/order by|deliver instantly/i);
  });

  test("header links to the gift guide", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("header").getByRole("link", { name: /Gift Guide/ }).first()).toBeVisible();
  });
});

import { test, expect } from "@playwright/test";

/**
 * Critical purchase path: browse → PDP → add to cart → checkout redirect.
 * Requires a target with live Shopify Storefront data (preview URL or a local
 * server with env vars). The first shop product is assumed in stock; if a run
 * lands on a sold-out item, re-run or seed an in-stock product.
 */
test.describe("purchase path", () => {
  test("browse → PDP → add to cart → checkout redirect", async ({ page }) => {
    // 1. Browse the shop
    await page.goto("/shop");
    const firstProduct = page.locator('a[href^="/product/"]').first();
    await expect(firstProduct).toBeVisible();
    await firstProduct.click();

    // 2. Land on a product detail page
    await expect(page).toHaveURL(/\/product\/.+/);
    const addToBag = page.getByRole("button", { name: /add to bag/i }).first();
    await expect(addToBag).toBeVisible();

    // 3. Add to cart — the server action commits the cart cookie and
    //    redirect("/cart"), so the click navigates us straight to the cart.
    await addToBag.click();
    await page.waitForURL(/\/cart/);

    // 4. Cart shows the line item
    await expect(page.locator(".candy-line").first()).toBeVisible();

    // 5. Checkout points to Shopify-hosted checkout — assert, don't follow
    const checkout = page.getByRole("link", { name: /checkout/i });
    await expect(checkout).toBeVisible();
    const href = await checkout.getAttribute("href");
    expect(href, "checkout should redirect to Shopify").toMatch(
      /myshopify\.com|\/checkouts?\//i,
    );
  });

  test("PDP exposes Product + BreadcrumbList structured data", async ({ page }) => {
    await page.goto("/shop");
    await page.locator('a[href^="/product/"]').first().click();
    await expect(page).toHaveURL(/\/product\/.+/);

    const blocks = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    const joined = blocks.join("\n");
    expect(joined).toContain('"@type":"Product"');
    expect(joined).toContain('"@type":"BreadcrumbList"');
  });
});

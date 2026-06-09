import { describe, it, expect } from "vitest";
import type { ProductsFeedNode } from "@nailismo/shopify/types";
import {
  stripEmoji,
  htmlToText,
  xmlEscape,
  buildGoogleMerchantFeed,
} from "./google-merchant-feed";

const SITE = "https://nailismo.com";

function product(overrides: Partial<ProductsFeedNode> = {}): ProductsFeedNode {
  return {
    handle: "pet-pals",
    title: "pet pals 🐾",
    descriptionHtml: "<p>Cute & cozy</p>",
    vendor: "Nailismo.com",
    isGiftCard: false,
    availableForSale: true,
    featuredImage: { url: "https://cdn.shopify.com/a.jpg" },
    images: {
      nodes: [
        { url: "https://cdn.shopify.com/a.jpg" },
        { url: "https://cdn.shopify.com/b.jpg" },
      ],
    },
    priceRange: { minVariantPrice: { amount: "17.99", currencyCode: "USD" } },
    ...overrides,
  };
}

describe("stripEmoji", () => {
  it("removes emoji and collapses whitespace", () => {
    expect(stripEmoji("pet pals 🐾")).toBe("pet pals");
  });
  it("strips a leading emoji too", () => {
    expect(stripEmoji("🐾 pet pals")).toBe("pet pals");
  });
});

describe("htmlToText", () => {
  it("strips tags, decodes entities, truncates to 5000", () => {
    expect(htmlToText("<p>Cute &amp; cozy</p>")).toBe("Cute & cozy");
    expect(htmlToText("<p>" + "x".repeat(6000) + "</p>").length).toBe(5000);
  });
  it("decodes numeric character references", () => {
    expect(htmlToText("<p>say &#8220;hi&#8221; &#x26; bye</p>")).toBe("say “hi” & bye");
  });
});

describe("xmlEscape", () => {
  it("escapes all XML metacharacters", () => {
    expect(xmlEscape(`a & b < c > d " e ' f`)).toBe(
      `a &amp; b &lt; c &gt; d &quot; e &apos; f`,
    );
  });
});

describe("buildGoogleMerchantFeed", () => {
  it("emits the g: namespace and a well-formed envelope", () => {
    const xml = buildGoogleMerchantFeed([product()], SITE);
    expect(xml).toContain('xmlns:g="http://base.google.com/ns/1.0"');
    expect(xml).toContain("<channel>");
    expect((xml.match(/<item>/g) ?? []).length).toBe(1);
    expect((xml.match(/<\/item>/g) ?? []).length).toBe(1);
  });

  it("links to the /products/ path on the custom domain", () => {
    const xml = buildGoogleMerchantFeed([product()], SITE);
    expect(xml).toContain("<g:link>https://nailismo.com/products/pet-pals</g:link>");
  });

  it("strips emoji from the title", () => {
    const xml = buildGoogleMerchantFeed([product()], SITE);
    expect(xml).toContain("pet pals");
    expect(xml).not.toContain("🐾");
  });

  it("formats price, availability, condition, brand, identifier_exists", () => {
    const xml = buildGoogleMerchantFeed([product()], SITE);
    expect(xml).toContain("<g:price>17.99 USD</g:price>");
    expect(xml).toContain("<g:availability>in_stock</g:availability>");
    expect(xml).toContain("<g:condition>new</g:condition>");
    expect(xml).toContain("<g:identifier_exists>no</g:identifier_exists>");
  });

  it("marks out-of-stock products", () => {
    const xml = buildGoogleMerchantFeed([product({ availableForSale: false })], SITE);
    expect(xml).toContain("<g:availability>out_of_stock</g:availability>");
  });

  it("includes additional images excluding the featured one", () => {
    const xml = buildGoogleMerchantFeed([product()], SITE);
    expect(xml).toContain(
      "<g:additional_image_link>https://cdn.shopify.com/b.jpg</g:additional_image_link>",
    );
    // one non-featured image → one <g:additional_image_link>…</g:additional_image_link> (open + close = 2 matches)
    expect((xml.match(/additional_image_link/g) ?? []).length).toBe(2);
  });

  it("emits no additional_image_link when the only image is the featured one", () => {
    const xml = buildGoogleMerchantFeed(
      [product({ images: { nodes: [{ url: "https://cdn.shopify.com/a.jpg" }] } })],
      SITE,
    );
    expect((xml.match(/<item>/g) ?? []).length).toBe(1);
    expect(xml).not.toContain("additional_image_link");
    expect(xml).not.toContain("\n\n"); // no stray blank line from an empty additional block
  });

  it("escapes the CDATA terminator sequence in free-text fields", () => {
    const xml = buildGoogleMerchantFeed([product({ title: "a ]]> b" })], SITE);
    expect(xml).toContain("<g:title><![CDATA[a ]]]]><![CDATA[> b]]></g:title>");
  });

  it("excludes gift cards", () => {
    const xml = buildGoogleMerchantFeed([product({ isGiftCard: true })], SITE);
    expect((xml.match(/<item>/g) ?? []).length).toBe(0);
  });

  it("excludes products with no featured image", () => {
    const xml = buildGoogleMerchantFeed([product({ featuredImage: null })], SITE);
    expect((xml.match(/<item>/g) ?? []).length).toBe(0);
  });

  it("wraps title, description, and brand in CDATA", () => {
    const xml = buildGoogleMerchantFeed([product()], SITE);
    expect(xml).toContain("<g:title><![CDATA[pet pals]]></g:title>");
    expect(xml).toContain("<g:description><![CDATA[Cute & cozy]]></g:description>");
    expect(xml).toContain("<g:brand><![CDATA[Nailismo.com]]></g:brand>");
  });

  it("falls back to the vendor default when vendor is empty", () => {
    const xml = buildGoogleMerchantFeed([product({ vendor: "" })], SITE);
    expect(xml).toContain("<g:brand><![CDATA[Nailismo]]></g:brand>");
  });

  it("falls back to the title when description is empty", () => {
    const xml = buildGoogleMerchantFeed([product({ descriptionHtml: "" })], SITE);
    expect(xml).toContain("<g:description><![CDATA[pet pals]]></g:description>");
  });
});

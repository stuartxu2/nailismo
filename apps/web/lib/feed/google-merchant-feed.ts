import type { ProductsFeedNode } from "@nailismo/shopify/types";

// Emoji, pictographs, misc-technical/dingbat symbols, skin-tone modifiers,
// regional-indicator flags, variation selectors, ZWJ, and tag characters.
const EMOJI_RE =
  /[\u{1F000}-\u{1FAFF}\u{1F3FB}-\u{1F3FF}\u{2300}-\u{27BF}\u{2B00}-\u{2BFF}\u{1F1E6}-\u{1F1FF}\u{FE00}-\u{FE0F}\u{200D}\u{E0020}-\u{E007F}]/gu;

// XML 1.0 forbids control characters other than \t \n \r. A single one
// invalidates the entire feed, so strip them from every emitted field.
function stripControlChars(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "");
}

// Decode a numeric character reference, dropping anything outside valid
// Unicode scalar values so malformed input can never throw.
function safeCodePoint(n: number): string {
  if (!Number.isFinite(n) || n < 0 || n > 0x10ffff || (n >= 0xd800 && n <= 0xdfff)) {
    return "";
  }
  try {
    return String.fromCodePoint(n);
  } catch {
    return "";
  }
}

export function stripEmoji(s: string): string {
  return s.replace(EMOJI_RE, "").replace(/\s+/g, " ").trim();
}

/**
 * Convert product description HTML to plain text. Output is intended for
 * CDATA wrapping only — it may contain raw `&`, `<`, `>` and must NOT be
 * passed to `xmlEscape`.
 */
export function htmlToText(html: string): string {
  return stripControlChars(
    html
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&#(\d+);/g, (_, n) => safeCodePoint(Number(n)))
      .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => safeCodePoint(parseInt(h, 16))),
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 5000);
}

export function xmlEscape(s: string): string {
  return stripControlChars(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// CDATA-wrap free text; strip XML-forbidden control chars and guard against a
// literal "]]>" terminator inside the content.
function cdata(s: string): string {
  return `<![CDATA[${stripControlChars(s).replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
}

function buildItem(p: ProductsFeedNode, site: string): string | null {
  if (p.isGiftCard) return null;
  const image = p.featuredImage?.url;
  if (!image) return null;

  // Google Merchant Center caps titles at 150 chars; truncate to avoid silent
  // server-side truncation (mirrors the 5000-char description guard).
  const title = (stripEmoji(p.title) || p.handle).slice(0, 150);
  const description = htmlToText(p.descriptionHtml) || title;
  const link = `${site}/products/${p.handle}`;
  const price = `${p.priceRange.minVariantPrice.amount} ${p.priceRange.minVariantPrice.currencyCode}`;
  const availability = p.availableForSale ? "in_stock" : "out_of_stock";
  const brand = p.vendor || "Nailismo";

  // Compare by path only — Shopify CDN URLs differ by ?v=/&width= query
  // params, so an exact match could let the featured image slip back in.
  const imageBase = image.split("?")[0];
  const additional = p.images.nodes
    .map((n) => n.url)
    .filter((u) => u.split("?")[0] !== imageBase)
    .slice(0, 10)
    .map((u) => `    <g:additional_image_link>${xmlEscape(u)}</g:additional_image_link>`)
    .join("\n");

  return [
    "  <item>",
    `    <g:id>${xmlEscape(p.handle)}</g:id>`,
    `    <g:title>${cdata(title)}</g:title>`,
    `    <g:description>${cdata(description)}</g:description>`,
    `    <g:link>${xmlEscape(link)}</g:link>`,
    `    <g:image_link>${xmlEscape(image)}</g:image_link>`,
    additional,
    `    <g:availability>${availability}</g:availability>`,
    `    <g:price>${xmlEscape(price)}</g:price>`,
    "    <g:condition>new</g:condition>",
    `    <g:brand>${cdata(brand)}</g:brand>`,
    "    <g:identifier_exists>no</g:identifier_exists>",
    "  </item>",
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildGoogleMerchantFeed(
  products: ProductsFeedNode[],
  siteUrl: string,
): string {
  const site = siteUrl.replace(/\/$/, "");
  const items = products
    .map((p) => buildItem(p, site))
    .filter((x): x is string => x !== null)
    .join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    "  <channel>",
    "    <title>Nailismo</title>",
    `    <link>${xmlEscape(site)}</link>`,
    "    <description>Nailismo product feed for Google Merchant Center</description>",
    items,
    "  </channel>",
    "</rss>",
  ]
    .filter(Boolean)
    .join("\n");
}

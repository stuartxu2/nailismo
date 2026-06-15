// Verify a Shopify webhook HMAC over the RAW request body. Shopify signs app
// webhooks with the app's API secret (the admin client secret). Returns false on
// any mismatch or missing header — treat the body as untrusted until this passes.

import crypto from "node:crypto";

export function verifyShopifyHmac(rawBody: string, headerHmac: string | null): boolean {
  const secret = process.env.SHOPIFY_ADMIN_CLIENT_SECRET;
  if (!secret || !headerHmac) return false;
  const digest = crypto.createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  const a = Buffer.from(digest);
  const b = Buffer.from(headerHmac);
  if (a.length !== b.length) return false; // timingSafeEqual throws on length mismatch
  return crypto.timingSafeEqual(a, b);
}

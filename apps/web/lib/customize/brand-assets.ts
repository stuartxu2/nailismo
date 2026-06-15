// Stable Blob URLs for the fixed brand reference assets attached as the second
// reference image on the flat-lay / on-model prompts. Public, not secret.
// (Re)host via .tmp/host_brand.ts if these ever change.

import type { BrandAsset } from "./prompts";

export const BRAND_ASSET_URLS: Record<BrandAsset, string> = {
  flatlay: "https://hufpv3t8jmiifz92.public.blob.vercel-storage.com/customize/brand/flatlay.jpg",
  model: "https://hufpv3t8jmiifz92.public.blob.vercel-storage.com/customize/brand/model.jpg",
};

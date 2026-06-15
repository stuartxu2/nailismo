// Stable Blob URLs for the fixed brand reference assets attached as the second
// reference image: the flat-lay product style (slot 0) and the retail kit
// packaging (slot 2). Public, not secret. (Re)host via .tmp/host_brand.ts.

import type { BrandAsset } from "./prompts";

export const BRAND_ASSET_URLS: Record<BrandAsset, string> = {
  flatlay: "https://hufpv3t8jmiifz92.public.blob.vercel-storage.com/customize/brand/flatlay.jpg",
  package: "https://hufpv3t8jmiifz92.public.blob.vercel-storage.com/customize/brand/package.jpg",
};

import { NextResponse } from "next/server";
import { getCart } from "@/lib/shopify/cart";

// Cart count is read client-side (see app/components/CartCount.tsx) so the
// header no longer reads cookies during render — that keeps all content pages
// statically renderable / ISR-cached. This route reads the cart cookie per
// request and must never be cached.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cart = await getCart();
    return NextResponse.json(
      { count: cart?.totalQuantity ?? 0 },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { count: 0 },
      { headers: { "cache-control": "no-store" } },
    );
  }
}

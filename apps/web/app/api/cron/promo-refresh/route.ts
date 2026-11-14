import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

/**
 * Vercel Cron (vercel.json, 08:00 + 19:00 UTC daily): marks every ISR page
 * stale so time-based promo copy (offer end, Black Friday label, shipping
 * cutoffs, season end in lib/promo/holiday.ts) flips on the next visit instead
 * of lingering on pages nobody has revisited since the boundary.
 * Vercel sends `Authorization: Bearer $CRON_SECRET`; anything else is refused.
 */
export function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  revalidatePath("/", "layout");
  return Response.json({ revalidated: true });
}

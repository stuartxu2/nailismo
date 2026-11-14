import Link from "next/link";
import { OFFER_LABEL, cutoffMessage, getPromoState } from "@/lib/promo/holiday";

const GUIDE_HREF = "/collections/holiday-gift-guide";

/** Seasonal band: the 3-for-$45 offer (while live) and the current US
 *  Christmas cutoff line. Renders nothing outside the season. All timing comes
 *  from lib/promo/holiday.ts; hourly revalidation plus the promo-refresh cron
 *  flip the copy on time. `linkGuide={false}` on the gift guide page itself. */
export function PromoStrip({
  now = new Date(),
  linkGuide = true,
  style,
}: {
  now?: Date;
  linkGuide?: boolean;
  style?: React.CSSProperties;
}) {
  const state = getPromoState(now);
  const cutoff = cutoffMessage(state.cutoff);
  if (!state.offerLive && !cutoff) return null;

  const cutoffHref = state.cutoff === "giftcard" ? "/products/nailismo-gift-card" : "/policies/shipping";

  return (
    <aside
      aria-label="Holiday offer and shipping dates"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "8px 20px",
        padding: "14px 20px",
        background: "var(--lemon)",
        color: "var(--ink)",
        border: "2.5px solid var(--ink)",
        borderRadius: 18,
        boxShadow: "var(--shadow-candy)",
        fontFamily: "var(--body)",
        fontWeight: 800,
        fontSize: 15,
        ...style,
      }}
    >
      {state.offerLive && (
        <p style={{ margin: 0 }}>
          {state.blackFriday ? "Black Friday: " : ""}
          {OFFER_LABEL}. Mix and match; the price drops in your bag.
          {linkGuide && (
            <>
              {" "}
              <Link href={GUIDE_HREF} style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>
                Shop the gift guide
              </Link>
            </>
          )}
        </p>
      )}
      {cutoff && (
        <p style={{ margin: 0 }}>
          <Link href={cutoffHref} style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>
            {cutoff}
          </Link>
        </p>
      )}
    </aside>
  );
}

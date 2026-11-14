import { getPromoState } from "@/lib/promo/holiday";
import { tickerItems } from "@/lib/promo/ticker";

export function AnnouncementTicker() {
  const line = tickerItems(getPromoState(new Date())).join("  ✦  ") + "  ✦  ";
  return (
    <div className="candy-marquee" style={{ background: "var(--ink)", color: "var(--lemon)", padding: "9px 0" }}>
      <div className="candy-marquee-track">
        {[0, 1].map((k) => (
          <span key={k} style={{ paddingRight: 40, fontSize: 14, letterSpacing: "0.04em" }}>
            {line}
          </span>
        ))}
      </div>
    </div>
  );
}

const ITEMS = [
  "FREE SHIPPING OVER $35",
  "NEW FLAVORS EVERY WEEK",
  "READY IN MINUTES",
  "EASY CLEAN REMOVAL",
  "PRESS ON. SHOW OFF.",
];

export function AnnouncementTicker() {
  const line = ITEMS.join("  ✦  ") + "  ✦  ";
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

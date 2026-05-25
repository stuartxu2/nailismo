type TickerItem = { label: string; href: string };

const items: TickerItem[] = [
  { label: "Free shipping over $60", href: "/policies/shipping" },
  { label: "S–XL fit per set", href: "/#fit" },
  { label: "Applies in minutes", href: "/#fit" },
  { label: "Clean removal", href: "/#fit" },
  { label: "Made for men's hands", href: "/about" },
];

export function AnnouncementTicker() {
  const doubled = [...items, ...items];
  return (
    <div className="border-b border-hair overflow-hidden bg-paper relative">
      <div className="flex whitespace-nowrap ticker-track fade-x" style={{ width: "max-content" }}>
        <div className="flex items-center py-3 text-[11px] tracking-[0.22em] uppercase text-rikyu font-mono">
          {doubled.map((item, i) => (
            <span key={i} className="flex items-center">
              <a
                href={item.href}
                className="hover:text-tetsu transition-colors"
              >
                {item.label}
              </a>
              <span className="mx-8 text-shironezumi">·</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

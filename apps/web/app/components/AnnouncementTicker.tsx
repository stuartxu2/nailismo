type TickerItem = { label: string; href: string };

const items: TickerItem[] = [
  { label: "Free shipping on starter sets over $60", href: "/policies/shipping" },
  { label: "S–XL fit per set", href: "/#fit" },
  { label: "Temporary or long-wear adhesive", href: "/#application" },
  { label: "No salon required", href: "/about" },
  { label: "New: The Architectural Edit", href: "/collections/geometric-grit" },
  { label: "Built for men's hands", href: "/shop" },
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
              <span className="dot" />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

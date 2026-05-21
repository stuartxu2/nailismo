import Link from "next/link";
const includes = [
  "1 Press-On Set",
  "S–XL Fit",
  "Sticky Tabs",
  "Liquid Glue",
  "Prep Tools",
  "Glue Remover",
];

export function Bundle() {
  return (
    <section id="bundle" className="bg-shiracha sec relative overflow-hidden">
      <div className="nail-container">
        <div className="grid grid-cols-12 gap-6 md:gap-12 items-stretch border border-hair bg-paper">
          <div className="col-span-12 lg:col-span-6 p-8 md:p-12 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="cap">N°10</span>
                <span className="cap">Bundle</span>
              </div>
              <h2 className="font-display font-light tracking-display leading-[0.9] text-[clamp(36px,4.6vw,72px)]">
                Your first manicure,
                <br />
                <span className="italic font-serif font-light">fully covered</span>
                <span className="text-akane">.</span>
              </h2>
              <p className="mt-6 text-[16px] text-rikyu max-w-[460px]">
                <strong className="text-tetsu font-medium">The First Fit Kit.</strong> One press-on set with S–XL sizing, both adhesives (sticky tabs and liquid glue), prep tools, glue remover, and the application card. Everything you need on day one.
              </p>

              <ul className="mt-8 grid grid-cols-2 gap-px bg-[var(--hair)] border border-hair">
                {includes.map((label, i) => (
                  <li key={i} className="bg-paper py-3 px-4 text-[13px] flex items-center gap-3">
                    <span className="cap text-akane">{String(i + 1).padStart(2, "0")}</span>
                    <span>{label}</span>
                  </li>
                ))}
                <li className="bg-paper py-3 px-4 text-[13px] flex items-center gap-3 col-span-2">
                  <span className="cap text-akane">07</span>
                  <span>Application Card · Step-by-step</span>
                </li>
              </ul>

              <div className="mt-8">
                <span className="cap mb-3 block">Configure your kit</span>
                <div className="grid grid-cols-4 gap-2">
                  {["Edit", "Finish", "Adhesive", "Removal"].map((label) => (
                    <div
                      key={label}
                      className="border border-hair p-3 text-[11px] uppercase tracking-[0.18em] font-mono text-rikyu text-center"
                    >
                      {label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-10">
              <div className="flex items-baseline justify-between border-t border-hair pt-6">
                <span className="cap">Configure your kit</span>
                <span className="cap">Ships in 24h</span>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/shop" className="btn-primary">
                  Shop Press-On Sets <span className="arrow">→</span>
                </Link>
                <Link href="/product/nail-glue" className="btn-ghost">
                  Add Glue + Remover <span className="arrow">→</span>
                </Link>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-6 relative min-h-[420px] lg:min-h-0 bg-tetsu overflow-hidden">
            <img
              src="/images/listing/accessories.jpg"
              alt="Nailismo First Fit Kit contents — press-on set, sticky tabs, liquid glue, prep tools, glue remover, branded case"
              className="img-cover"
            />
            <div className="absolute top-6 left-6 right-6 flex items-center justify-between">
              <span className="tape">First Fit Kit</span>
              <span className="cap cap-dark">In the box</span>
            </div>
            <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between cap cap-dark">
              <span>Beginner Friendly</span>
              <span>One Set · Both Adhesives · Full Coverage</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

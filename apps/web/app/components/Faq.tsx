const items = [
  {
    q: "Will these look fake?",
    a: "No. Nailismo focuses on shorter proportions, clean edges, and masculine finishes designed to sit naturally on men's hands.",
  },
  {
    q: "Is this too feminine?",
    a: "Not when the design language is right. Matte finishes, dark tones, architectural lines, chrome, and restrained contrast keep the manicure masculine and wearable.",
  },
  {
    q: "Can I type, lift, or work with my hands?",
    a: "Yes, for normal daily use. Use liquid adhesive for a stronger hold; use temporary tabs for short-term wear.",
  },
  {
    q: "Can I wear them for one night only?",
    a: "Yes. Use temporary tabs for events, parties, shoots, or first-time testing.",
  },
  {
    q: "How do I know my size?",
    a: "Start with a sizing range or starter set. Match each nail before applying. See the Fit System for a measurement guide.",
  },
  {
    q: "How long do they last?",
    a: "Temporary tabs are best for short wear. Liquid adhesive can last up to 7+ days depending on application, nail prep, and daily activity.",
  },
  {
    q: "How do I remove them?",
    a: "Soak and loosen gently. Do not rip them off. Most damage comes from forced removal, not from proper wear.",
  },
  {
    q: "What style should I start with?",
    a: "Start with Monochrome Edge, Galaxy Glitch, or Concrete Clarity. Clean, masculine, and easy to wear in real life.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="bg-paper sec relative overflow-hidden">
      <div className="nail-container">
        <div className="grid grid-cols-12 gap-6 md:gap-12">
          <div className="col-span-12 lg:col-span-5">
            <div className="flex items-center gap-3 mb-6">
              <span className="cap">Common questions</span>
            </div>
            <h2 className="font-display font-light tracking-display leading-[0.9] text-[clamp(40px,5.5vw,84px)]">
              Questions
              <br />
              men actually
              <br />
              <span className="italic font-serif font-light">ask</span>
              <span className="text-akane">.</span>
            </h2>
            <p className="mt-8 text-rikyu max-w-[360px]">
              Confident. Direct. Practical. No apologies, no defensive language, no spa talk.
            </p>

            <div className="mt-10 hidden lg:block">
              <span className="cap">Need a person?</span>
              <p className="mt-2 text-[14px]">
                Email{" "}
                <a href="mailto:hello@nailismo.com" className="ulink underline-offset-4">
                  hello@nailismo.com
                </a>{" "}
                for fit, removal, or styling questions. We reply in under 24h.
              </p>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-7">
            <div className="border-t border-hair">
              {items.map((it, i) => (
                <details key={i} className="border-b border-hair py-6 group">
                  <summary className="flex items-start justify-between gap-6">
                    <div className="flex items-start gap-5">
                      <span className="cap pt-1">{String(i + 1).padStart(2, "0")}</span>
                      <h3 className="font-display text-[22px] md:text-[26px] leading-[1.1] tracking-display">
                        {it.q}
                      </h3>
                    </div>
                    <span className="acc-icon w-8 h-8 border border-hair flex items-center justify-center flex-shrink-0 text-[18px] leading-none">
                      +
                    </span>
                  </summary>
                  <div className="acc-answer pl-12 pr-12 pt-4 text-[15px] text-rikyu max-w-[640px]">{it.a}</div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

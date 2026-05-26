const items = [
  { q: "Will these look fake?", a: "Nope. Salon-grade gel, clean edges, and shapes that sit naturally — they read like a real set, not a costume." },
  { q: "Are they hard to put on?", a: "Not at all. Peel, press, hold for ten seconds per nail. A full set goes on in minutes, anywhere." },
  { q: "Can I type, lift, or use my hands?", a: "Yes, for normal daily use. Use the liquid adhesive for a stronger, longer hold; use the tabs for short-term wear." },
  { q: "Can I wear them for just one night?", a: "Totally. Use the temporary tabs for events, parties, shoots, or a first-time test run." },
  { q: "How do I know my size?", a: "Start with a sizing range or starter set, and match each nail before applying. Our Find My Size tool maps your exact fit in about a minute." },
  { q: "How long do they last?", a: "Tabs are best for short wear. Liquid adhesive can last up to 7+ days depending on application, prep, and daily activity." },
  { q: "How do I remove them?", a: "Soak and loosen gently — never rip them off. Most damage comes from forced removal, not from normal wear." },
  { q: "Which flavor should I start with?", a: "Bubblegum Pop, Soda Pop, or any fan favorite. Bright, easy to wear, and impossible to resist." },
];

export function Faq() {
  return (
    <section id="faq" className="candy-wrap candy-sec" style={{ paddingTop: 20 }}>
      <div className="grid grid-cols-12 gap-6 md:gap-12">
        <div className="col-span-12 lg:col-span-5">
          <span className="candy-eyebrow">Common questions</span>
          <h2 style={{ fontSize: "clamp(36px,5vw,64px)", marginTop: 12 }}>Good to know</h2>
          <p style={{ marginTop: 16, fontWeight: 600, color: "var(--ink-soft)", maxWidth: 360 }}>
            Quick, friendly answers to everything first-timers ask.
          </p>
          <div className="hidden lg:block" style={{ marginTop: 32 }}>
            <span className="candy-eyebrow">Need a person?</span>
            <p style={{ marginTop: 8, fontSize: 14, fontWeight: 600 }}>
              Email{" "}
              <a href="mailto:hello@nailismo.com" style={{ color: "var(--soda)", textDecoration: "underline", textUnderlineOffset: 3 }}>
                hello@nailismo.com
              </a>{" "}
              — we reply in under 24h.
            </p>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-7">
          {items.map((it, i) => (
            <details key={i} className="candy-accordion">
              <summary>
                <span>{it.q}</span>
                <span className="acc-plus" aria-hidden>+</span>
              </summary>
              <div className="acc-body">{it.a}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

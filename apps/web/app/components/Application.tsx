type Step = {
  num: string;
  label: string;
  title: string;
  body: string;
  time: string;
  accent?: boolean;
};

const steps: Step[] = [
  { num: "01", label: "Prep", title: "Clean. Buff. Match.", body: "Wipe each nail with alcohol. Push back cuticles. Match a press-on to each nail bed.", time: "~90 seconds" },
  { num: "02", label: "Press", title: "Tab or adhesive.", body: "Apply temporary tabs for a single night. Apply liquid adhesive for long-wear. Press, hold, release.", time: "~2 minutes" },
  { num: "03", label: "Wear", title: "Move. Live. Repeat.", body: "A finished manicure in minutes, ready for office, daily movement, dates, or the door.", time: "Up to 7+ days", accent: true },
];

export function Application() {
  return (
    <section className="bg-tetsu sec relative overflow-hidden">
      <div className="nail-container">
        <div className="flex items-end justify-between mb-12 md:mb-16 flex-wrap gap-6">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="cap cap-dark">N°07</span>
              <span className="cap cap-dark">Application</span>
            </div>
            <h2 className="font-display font-light tracking-display leading-[0.9] text-[clamp(40px,5.5vw,84px)] text-paper">
              No salon.
              <br />
              No <span className="italic font-serif font-light">dry time</span>
              <span className="text-akane">.</span>
            </h2>
          </div>
          <p className="max-w-[440px] text-[rgba(245,245,245,0.85)]">
            Use temporary tabs for one-night wear. Use liquid adhesive for longer hold. Up to 7+ days, depending on application and wear.
          </p>
        </div>

        <div className="grid grid-cols-12 gap-px bg-[rgba(242,237,224,0.18)] border border-hair-dark">
          {steps.map((s) => (
            <div
              key={s.num}
              className="col-span-12 md:col-span-4 bg-tetsu p-8 md:p-10 relative min-h-[300px] flex flex-col"
            >
              <div className="flex items-baseline justify-between">
                <span className="font-display text-[clamp(80px,9vw,140px)] leading-[0.85] text-[rgba(245,245,245,0.95)]">
                  {s.num}
                </span>
                <span className={`cap ${s.accent ? "text-akane" : "cap-dark"}`}>{s.label}</span>
              </div>
              <h3 className="font-display text-[26px] mt-6 text-paper">{s.title}</h3>
              <p className="text-[14px] text-[rgba(245,245,245,0.85)] mt-3 max-w-[280px]">{s.body}</p>
              <div className="mt-auto pt-8 cap cap-dark">{s.time}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex items-center justify-between flex-wrap gap-4">
          <span className="cap cap-dark">Total time · under five minutes</span>
          <a href="#" className="ulink text-[12px] tracking-[0.18em] uppercase font-medium text-paper">
            Read the full application guide →
          </a>
        </div>
      </div>
    </section>
  );
}

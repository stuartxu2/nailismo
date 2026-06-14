import Link from "next/link";

type Step = {
  n: string;
  emoji: string;
  title: string;
  body: React.ReactNode;
};

const STEPS: Step[] = [
  {
    n: "1",
    emoji: "📏",
    title: "Match",
    body: (
      <>
        Use <Link href="/fit" className="poglink">Find My Size</Link> for a perfect
        fit in 30 seconds.
      </>
    ),
  },
  {
    n: "2",
    emoji: "💅",
    title: "Press",
    body: "Peel, press, hold ten seconds. Full set on in minutes.",
  },
  {
    n: "3",
    emoji: "✂️",
    title: "Clip",
    body: "Trim and file to your length and shape. Up to you.",
  },
  {
    n: "4",
    emoji: "✨",
    title: "Show off",
    body: "Wear all week, then pop them off clean — no damage.",
  },
];

/** Compact "Press on in 4 steps" guide — sits in the left column directly under
 *  the gallery, filling the space the taller buy column leaves. Single candy
 *  panel wrapping a 2×2 step grid so it reads as one cohesive guide. */
export function PressOnSteps() {
  return (
    <section className="pog" aria-labelledby="press-on-steps-heading">
      <div className="pog-head">
        <span className="candy-eyebrow">So easy it&apos;s silly</span>
        <h2 id="press-on-steps-heading" className="pog-title">
          Press on in 4 steps
        </h2>
      </div>

      <ol className="pog-grid">
        {STEPS.map((s) => (
          <li key={s.n} className="pog-step">
            <span className="pog-num">{s.n}</span>
            <div className="pog-step-text">
              <h3 className="pog-step-title">
                <span className="pog-emoji" aria-hidden>{s.emoji}</span>
                {s.title}
              </h3>
              <p className="pog-step-body">{s.body}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

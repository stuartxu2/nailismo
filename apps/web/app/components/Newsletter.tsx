"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { subscribeNewsletter } from "@/lib/shopify/newsletter";

function SubmitButton({ submitted }: { submitted: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="candy-btn" style={{ opacity: pending ? 0.6 : 1 }}>
      {pending ? "Sending…" : submitted ? "Joined!" : "Join"} <span className="pop" aria-hidden>🍭</span>
    </button>
  );
}

export function Newsletter() {
  const [state, setState] = useState<{ ok: boolean; message: string } | null>(null);

  async function action(formData: FormData) {
    const result = await subscribeNewsletter(formData);
    setState(result);
  }

  const submitted = state?.ok === true;

  return (
    <section id="newsletter" className="candy-sec">
      <div className="candy-wrap" style={{ maxWidth: 640, textAlign: "center" }}>
        <span className="candy-sticker is-mint" style={{ fontSize: 14 }}>Join the candy club</span>
        <h2 style={{ fontSize: "clamp(30px, 5vw, 48px)", marginTop: 18 }}>Get first dibs on new flavors</h2>
        <p style={{ fontSize: 16, fontWeight: 600, color: "var(--ink-soft)", marginTop: 12 }}>
          Early access, restock alerts, and the occasional very good discount. No spam, ever.
        </p>
        <form action={action} style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap", justifyContent: "center" }}>
          <input className="candy-input" type="email" name="email" placeholder="you@email.com" aria-label="Email address" required style={{ maxWidth: 320 }} />
          <SubmitButton submitted={submitted} />
        </form>
        {state && (
          <p role={state.ok ? "status" : "alert"} style={{ marginTop: 12, fontSize: 13, fontWeight: 700, color: state.ok ? "var(--bubblegum-d)" : "#E8794A" }}>
            {state.message}
          </p>
        )}
      </div>
    </section>
  );
}

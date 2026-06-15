"use client";

import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await fetch("/api/account/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } finally {
      setBusy(false);
      setSent(true); // uniform UX regardless of whether an account exists
    }
  }

  return (
    <main className="candy-wrap" style={{ paddingBlock: "clamp(40px, 6vw, 88px)", maxWidth: 520 }}>
      <header className="candy-rise" style={{ maxWidth: 560 }}>
        <span className="candy-eyebrow">Your designs</span>
        <h1 style={{ fontSize: "clamp(34px, 7vw, 64px)", marginTop: 14 }}>
          Sign in to your <span className="lb-hl">designs</span>.
        </h1>
      </header>

      {sent ? (
        <p
          className="candy-rise candy-d1"
          style={{ marginTop: 26, fontSize: 18, fontWeight: 700, color: "var(--ink-soft)" }}
        >
          If you’ve created designs with that email, we just sent you a sign-in link. Check your
          inbox 💌
        </p>
      ) : (
        <form onSubmit={submit} className="candy-rise candy-d1" style={{ marginTop: 28 }}>
          <p style={{ fontSize: 17, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 18 }}>
            Enter your email and we’ll send you a link to view your custom nail designs.
          </p>
          <label className="candy-label" htmlFor="acct-email">
            Email
          </label>
          <input
            id="acct-email"
            type="email"
            required
            className="candy-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
          />
          <button
            type="submit"
            disabled={busy || !email}
            className="candy-btn"
            style={{ marginTop: 22, width: "100%", opacity: busy || !email ? 0.45 : 1 }}
          >
            {busy ? "Sending…" : "Email me my designs"}
            <span className="pop" aria-hidden>
              💅
            </span>
          </button>
        </form>
      )}
    </main>
  );
}

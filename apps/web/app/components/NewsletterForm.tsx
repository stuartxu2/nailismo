"use client";

import { useActionState } from "react";
import { subscribeNewsletter, type NewsletterResult } from "@/lib/shopify/newsletter";

const INITIAL: NewsletterResult = { ok: false, message: "" };

export function NewsletterForm() {
  const [state, action, pending] = useActionState(
    (_prev: NewsletterResult, formData: FormData) => subscribeNewsletter(formData),
    INITIAL,
  );

  return (
    <>
      <form action={action} style={{ display: "flex", gap: 10, marginTop: 24, flexWrap: "wrap", justifyContent: "center" }}>
        <input
          className="candy-input"
          type="email"
          name="email"
          placeholder="you@email.com"
          aria-label="Email address"
          required
          disabled={pending}
          style={{ maxWidth: 320 }}
        />
        <button type="submit" className="candy-btn" disabled={pending}>
          {pending ? "Joining…" : <>Join <span className="pop" aria-hidden>🍭</span></>}
        </button>
      </form>
      {state.message && (
        <p
          role="status"
          style={{ marginTop: 14, fontWeight: 700, color: state.ok ? "var(--soda)" : "#b00020" }}
        >
          {state.message}
        </p>
      )}
    </>
  );
}

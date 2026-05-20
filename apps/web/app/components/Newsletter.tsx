"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { subscribeNewsletter } from "@/lib/shopify/newsletter";

function SubmitButton({ submitted }: { submitted: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="bg-tetsu text-paper px-6 py-4 text-[12px] tracking-[0.18em] uppercase font-medium hover:bg-akane transition-colors disabled:opacity-60"
    >
      {pending ? "Sending…" : submitted ? "Sent" : "Send Me The Guide"}
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
    <section id="newsletter" className="bg-shiracha py-16 md:py-24 relative">
      <div className="nail-container grid grid-cols-12 gap-6 md:gap-12 items-center">
        <div className="col-span-12 lg:col-span-7">
          <span className="cap">Free guide · No spam</span>
          <h3 className="font-display text-[clamp(32px,4vw,56px)] tracking-display leading-[0.95] mt-3">
            Get the First Fit Guide<span className="text-akane">.</span>
          </h3>
          <p className="mt-4 text-rikyu max-w-[520px]">
            A short guide to choosing your first Nailismo set — from low-signal daily wear to high-signal nights out. Plus 10% off your first starter set.
          </p>
        </div>
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-3 w-full">
          <form action={action} className="flex w-full border border-tetsu bg-paper">
            <input
              type="email"
              name="email"
              required
              placeholder="Email address"
              defaultValue=""
              className="flex-1 bg-transparent px-5 py-4 text-[14px] outline-none placeholder-[rgba(40,26,20,0.4)]"
              aria-label="Email"
            />
            <SubmitButton submitted={submitted} />
          </form>
          {state && (
            <p
              role={state.ok ? "status" : "alert"}
              className={`text-[12px] font-mono tracking-[0.16em] uppercase ${
                state.ok ? "text-tetsu" : "text-akane"
              }`}
            >
              {state.message}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");

const LENGTHS = ["Short", "Medium", "Long"] as const;
const SHAPES = ["Almond", "Coffin", "Square", "Round"] as const;

const STEPS = [
  ["📸", "Upload your inspo", "Any pic — a photo, a pattern, a vibe."],
  ["✨", "Preview for $2", "3 designs in ~1 min. Refunded if you don't love them."],
  ["💅", "Pick & checkout", "Choose one + your size. The $2 comes off your $69."],
  ["💖", "We hand-make it", "Made just for you and shipped in days."],
] as const;

/** Downscale a chosen image to a data URL before upload (mirrors the app scanner). */
async function downscale(file: File, max = 1280, quality = 0.72): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, w, h);
  bmp.close();
  return canvas.toDataURL("image/jpeg", quality);
}

export default function CustomizeStudio() {
  const [preview, setPreview] = useState<string | null>(null);
  const [length, setLength] = useState<(typeof LENGTHS)[number]>("Medium");
  const [shape, setShape] = useState<(typeof SHAPES)[number]>("Almond");
  const [note, setNote] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      setPreview(await downscale(file));
    } catch {
      setError("Couldn't read that image — try another 🥲");
    }
  }

  async function startPreview() {
    if (!preview || busy) return;
    setBusy(true);
    setError(null);
    try {
      const up = await fetch("/api/customize/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: preview, shape: `${length} ${shape}`, note, email }),
      });
      if (!up.ok) throw new Error("Upload hiccup — please retry.");
      const { sessionId: sid } = (await up.json()) as { sessionId: string };

      const intent = await fetch("/api/customize/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid }),
      });
      if (!intent.ok) throw new Error("Couldn't start checkout — please retry.");
      const { clientSecret: cs } = (await intent.json()) as { clientSecret: string };

      setSessionId(sid);
      setClientSecret(cs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="candy-wrap" style={{ paddingBlock: "clamp(40px, 6vw, 88px)" }}>
      {/* Hero */}
      <header style={{ maxWidth: 760 }} className="candy-rise">
        <span className="candy-eyebrow">Customize to order</span>
        <h1 style={{ fontSize: "clamp(40px, 8vw, 86px)", marginTop: 14 }}>
          Your inspo, made <span className="lb-hl">wearable</span>.
        </h1>
        <p
          style={{ fontSize: 19, fontWeight: 700, color: "var(--ink-soft)", marginTop: 20, maxWidth: 560 }}
        >
          Drop any pic — a photo, a pattern, a whole mood. Our AI whips up{" "}
          <span style={{ color: "var(--ink)" }}>3 custom nail sets</span> in about a minute. Pick
          your fave, we hand-make it. 💅
        </p>
        <span className="candy-sticker is-gum" style={{ marginTop: 22 }}>
          $2 to preview · credited to your order
        </span>
      </header>

      {/* Studio */}
      <section
        style={{
          marginTop: "clamp(36px, 5vw, 60px)",
          display: "grid",
          gap: "clamp(24px, 4vw, 52px)",
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 0.9fr)",
          alignItems: "start",
        }}
        className="candy-studio-grid"
      >
        {/* Left: uploader / payment */}
        <div
          className="candy-rise candy-d1"
          style={{
            background: "var(--cream)",
            border: "2.5px solid var(--ink)",
            borderRadius: 28,
            boxShadow: "var(--shadow-candy)",
            padding: "clamp(20px, 3vw, 34px)",
          }}
        >
          {!clientSecret ? (
            <>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(true);
                }}
                onDragLeave={() => setOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setOver(false);
                  onFile(e.dataTransfer.files?.[0]);
                }}
                style={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "4 / 3",
                  borderRadius: 22,
                  border: "2.5px dashed var(--ink)",
                  background: over ? "var(--lemon)" : "var(--cotton)",
                  overflow: "hidden",
                  display: "grid",
                  placeItems: "center",
                  cursor: "pointer",
                  transition: "background-color .2s ease, transform .12s ease",
                }}
              >
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={preview}
                    alt="Your reference"
                    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span style={{ textAlign: "center", padding: "0 24px" }}>
                    <span style={{ fontSize: 52, display: "block" }} aria-hidden>
                      📸
                    </span>
                    <span
                      style={{ fontFamily: "var(--display)", fontSize: 24, display: "block", marginTop: 8 }}
                    >
                      Drop your inspo here
                    </span>
                    <span style={{ fontWeight: 700, color: "var(--ink-soft)", fontSize: 14 }}>
                      or tap to upload · JPG / PNG / HEIC
                    </span>
                  </span>
                )}
                {preview && (
                  <span className="candy-sticker is-gum" style={{ position: "absolute", bottom: 12, right: 12 }}>
                    Replace 🔁
                  </span>
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => onFile(e.target.files?.[0])}
              />

              <div style={{ marginTop: 26 }}>
                <span className="candy-label">Nail length</span>
                <ChipRow options={LENGTHS} value={length} onChange={setLength} />
              </div>
              <div style={{ marginTop: 18 }}>
                <span className="candy-label">Shape</span>
                <ChipRow options={SHAPES} value={shape} onChange={setShape} />
              </div>
              <div style={{ marginTop: 18 }}>
                <label className="candy-label" htmlFor="c2o-note">
                  Anything to add? <span style={{ color: "var(--ink-soft)" }}>(optional)</span>
                </label>
                <input
                  id="c2o-note"
                  className="candy-field"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="e.g. matte finish, gold accents"
                  maxLength={120}
                />
              </div>
              <div style={{ marginTop: 18 }}>
                <label className="candy-label" htmlFor="c2o-email">
                  Email <span style={{ color: "var(--ink-soft)" }}>(so we can save your designs)</span>
                </label>
                <input
                  id="c2o-email"
                  type="email"
                  className="candy-field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com"
                />
              </div>

              {error && (
                <p style={{ marginTop: 18, fontWeight: 700, color: "#C0392B" }}>{error}</p>
              )}

              <button
                type="button"
                onClick={startPreview}
                disabled={!preview || busy}
                className="candy-btn"
                style={{ marginTop: 26, width: "100%", opacity: !preview || busy ? 0.45 : 1 }}
              >
                {busy ? "Starting…" : "Preview my 3 designs — $2"}
                <span className="pop" aria-hidden>✨</span>
              </button>
              <p
                style={{
                  marginTop: 12,
                  textAlign: "center",
                  fontWeight: 800,
                  fontSize: 13,
                  color: "var(--ink-soft)",
                }}
              >
                Not a fee — a $2 deposit, credited to your order 💸
              </p>
            </>
          ) : (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: "flat",
                  variables: { colorPrimary: "#9FED40", borderRadius: "14px", fontFamily: "Nunito, system-ui, sans-serif" },
                },
              }}
            >
              <PayForm sessionId={sessionId!} />
            </Elements>
          )}
        </div>

        {/* Right: how it works */}
        <aside className="candy-rise candy-d2">
          <span className="candy-eyebrow">How it works</span>
          <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
            {STEPS.map(([emoji, t, d], i) => (
              <div key={t} className="candy-step" style={{ padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span className="num" style={{ width: 42, height: 42, fontSize: 18 }}>
                    {i + 1}
                  </span>
                  <span style={{ fontSize: 30 }} aria-hidden>
                    {emoji}
                  </span>
                </div>
                <h3 style={{ fontSize: 21, marginTop: 14 }}>{t}</h3>
                <p style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-soft)", marginTop: 5 }}>{d}</p>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 18 }}>
            <span className="candy-sticker">🔒 Secure · Stripe</span>
            <span className="candy-sticker is-soda" style={{ color: "#fff" }}>
              Credited at checkout
            </span>
          </div>
        </aside>
      </section>

      <style>{`@media (max-width: 860px){ .candy-studio-grid{ grid-template-columns: 1fr !important; } }`}</style>
    </main>
  );
}

function PayForm({ sessionId }: { sessionId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function pay(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setErr(null);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: `${location.origin}/customize/result/${sessionId}` },
      redirect: "if_required",
    });
    if (error) {
      setErr(error.message ?? "Payment failed — please try again.");
      setBusy(false);
      return;
    }
    router.push(`/customize/result/${sessionId}`);
  }

  return (
    <form onSubmit={pay}>
      <span className="candy-eyebrow">Hold your spot</span>
      <h2 style={{ fontSize: "clamp(24px, 4vw, 32px)", marginTop: 10 }}>
        $2 deposit — you get it back 💸
      </h2>
      <p style={{ fontWeight: 700, color: "var(--ink-soft)", marginTop: 8 }}>
        Credited straight to your $69 set when you order.
      </p>
      <div style={{ marginTop: 22 }}>
        <PaymentElement />
      </div>
      {err && <p style={{ marginTop: 16, fontWeight: 700, color: "#C0392B" }}>{err}</p>}
      <button
        type="submit"
        disabled={!stripe || busy}
        className="candy-btn"
        style={{ marginTop: 24, width: "100%", opacity: !stripe || busy ? 0.5 : 1 }}
      >
        {busy ? "Processing…" : "Pay $2 & generate"}
        <span className="pop" aria-hidden>✨</span>
      </button>
      <ul style={{ marginTop: 16, display: "grid", gap: 6, fontWeight: 800, fontSize: 13, color: "var(--ink-soft)" }}>
        <li>↺ $2 comes off your $69 order automatically</li>
        <li>🎨 3 unique designs, yours to keep</li>
      </ul>
    </form>
  );
}

function ChipRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`candy-chip ${value === o ? "is-active" : ""}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "");

const LENGTHS = ["Short", "Medium", "Long"] as const;
const SHAPES = ["Almond", "Squoval", "Square", "Oval", "Round", "Coffin"] as const;
const FINISHES = ["Any", "Glossy", "Matte", "Glass", "Chrome"] as const;
const FEELS = ["Neutral", "Masculine", "Feminine"] as const;
const OCCASIONS = ["Any", "Daylight", "Nightlife"] as const;
const DETAILS = ["Balanced", "Minimal", "Loaded"] as const;
const INTERPRETATIONS = ["Abstract", "Balanced", "Literal"] as const;

const STEPS = [
  ["📸", "Upload your inspo", "Any pic — a photo, a pattern, a vibe."],
  ["✨", "Preview for $2", "Your set, shown 3 ways in ~1 min. The $2 covers AI processing."],
  ["💅", "Size & checkout", "Pick your size. The $2 comes off your $69."],
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
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(null);
  const [length, setLength] = useState<(typeof LENGTHS)[number]>("Medium");
  const [shape, setShape] = useState<(typeof SHAPES)[number]>("Almond");
  const [finish, setFinish] = useState<(typeof FINISHES)[number]>("Any");
  const [feel, setFeel] = useState<(typeof FEELS)[number]>("Neutral");
  const [occasion, setOccasion] = useState<(typeof OCCASIONS)[number]>("Any");
  const [detail, setDetail] = useState<(typeof DETAILS)[number]>("Balanced");
  const [interpretation, setInterpretation] = useState<(typeof INTERPRETATIONS)[number]>("Abstract");
  const [note, setNote] = useState("");
  const [email, setEmail] = useState("");
  const [promo, setPromo] = useState("");
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [amountCents, setAmountCents] = useState(200);
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
    if (!preview || !agreed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const up = await fetch("/api/customize/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: preview,
          shape: `${length} ${shape}`,
          note,
          email,
          finish: finish.toLowerCase(),
          feel: feel.toLowerCase(),
          occasion: occasion.toLowerCase(),
          detail: detail.toLowerCase(),
          interpretation: interpretation.toLowerCase(),
        }),
      });
      if (!up.ok) throw new Error("Upload hiccup — please retry.");
      const { sessionId: sid } = (await up.json()) as { sessionId: string };

      const intent = await fetch("/api/customize/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, promoCode: promo }),
      });
      const data = (await intent.json()) as {
        clientSecret?: string;
        amountCents?: number;
        free?: boolean;
        error?: string;
      };
      if (!intent.ok) {
        throw new Error(data.error ?? "Couldn't start checkout — please retry.");
      }
      // A promo that nets to $0 skips Stripe entirely — generation is already
      // running server-side; go straight to the result page (it polls /status).
      if (data.free) {
        router.push(`/customize/result/${sid}`);
        return;
      }

      setSessionId(sid);
      setClientSecret(data.clientSecret ?? null);
      setAmountCents(data.amountCents ?? 200);
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
          Drop any pic — a photo, a pattern, a whole mood. Our AI designs{" "}
          <span style={{ color: "var(--ink)" }}>one custom set</span> and shows it 3 ways in about a
          minute. Love it? We hand-make it. 💅
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
            border: "1px solid var(--marshmallow)",
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
                <span className="candy-label">Finish</span>
                <ChipRow options={FINISHES} value={finish} onChange={setFinish} />
              </div>
              <div style={{ marginTop: 18 }}>
                <span className="candy-label">Feel</span>
                <ChipRow options={FEELS} value={feel} onChange={setFeel} />
              </div>
              <div style={{ marginTop: 18 }}>
                <span className="candy-label">Occasion</span>
                <ChipRow options={OCCASIONS} value={occasion} onChange={setOccasion} />
              </div>
              <div style={{ marginTop: 18 }}>
                <span className="candy-label">Detail</span>
                <ChipRow options={DETAILS} value={detail} onChange={setDetail} />
              </div>
              <div style={{ marginTop: 18 }}>
                <span className="candy-label">Interpretation</span>
                <ChipRow options={INTERPRETATIONS} value={interpretation} onChange={setInterpretation} />
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
              <div style={{ marginTop: 18 }}>
                <label className="candy-label" htmlFor="c2o-promo">
                  Promo code <span style={{ color: "var(--ink-soft)" }}>(optional)</span>
                </label>
                <input
                  id="c2o-promo"
                  className="candy-field"
                  value={promo}
                  onChange={(e) => setPromo(e.target.value.toUpperCase())}
                  placeholder="Have a code? Enter it here"
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  style={{ textTransform: "uppercase" }}
                />
              </div>

              {error && (
                <p style={{ marginTop: 18, fontWeight: 700, color: "#C0392B" }}>{error}</p>
              )}

              <label className="c2o-agree" style={{ marginTop: 24 }}>
                <input
                  type="checkbox"
                  className="sr-only c2o-agree-input"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <span className="c2o-agree-box" aria-hidden>
                  {agreed ? "✓" : ""}
                </span>
                <span className="c2o-agree-text">
                  I understand the <strong>$2 covers AI processing</strong> (Gemini 3 Pro Image) and
                  comes off my $69 order. If I'm really unhappy with my design, I'll email{" "}
                  <a href="mailto:hello@nailismo.com">hello@nailismo.com</a>.
                </span>
              </label>

              <button
                type="button"
                onClick={startPreview}
                disabled={!preview || !agreed || busy}
                className="candy-btn"
                style={{ marginTop: 20, width: "100%", opacity: !preview || !agreed || busy ? 0.45 : 1 }}
              >
                {busy ? "Starting…" : "Preview my design — $2"}
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
                Credited to your $69 order at checkout 💸
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
              <PayForm sessionId={sessionId!} amountCents={amountCents} />
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

      <style>{`
        @media (max-width: 860px){ .candy-studio-grid{ grid-template-columns: 1fr !important; } }
        .c2o-agree{ display:flex; gap:11px; align-items:flex-start; cursor:pointer; }
        .c2o-agree-box{ flex:none; width:24px; height:24px; border-radius:8px; border:2.5px solid var(--ink); background:var(--cotton); display:grid; place-items:center; font-weight:900; color:var(--ink); font-size:14px; line-height:1; transition: background-color .15s ease, transform .12s ease, box-shadow .15s ease; }
        .c2o-agree:hover .c2o-agree-box{ box-shadow:0 0 0 4px rgba(0,0,0,.06); }
        .c2o-agree:active .c2o-agree-box{ transform: scale(.9); }
        .c2o-agree-input:checked + .c2o-agree-box{ background:#9FED40; }
        .c2o-agree-input:focus-visible + .c2o-agree-box{ outline:3px solid var(--ink); outline-offset:2px; }
        .c2o-agree-text{ font-weight:800; font-size:13px; color:var(--ink-soft); line-height:1.45; }
        .c2o-agree-text a{ color:var(--ink); text-decoration:underline; text-underline-offset:2px; }
      `}</style>
    </main>
  );
}

function PayForm({ sessionId, amountCents }: { sessionId: string; amountCents: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const money = `$${(amountCents / 100).toFixed(2)}`;

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
        {money} to generate — credited to your set 💸
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
        {busy ? "Processing…" : `Pay ${money} & generate`}
        <span className="pop" aria-hidden>✨</span>
      </button>
      <ul style={{ marginTop: 16, display: "grid", gap: 6, fontWeight: 800, fontSize: 13, color: "var(--ink-soft)" }}>
        <li>↺ {money} comes off your $69 order automatically</li>
        <li>🎨 Your custom design in 3 views, yours to keep</li>
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

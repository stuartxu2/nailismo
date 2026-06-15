"use client";

import { useEffect, useState } from "react";

type Job = { status: "pending" | "ready" | "failed"; resultUrl?: string };
type StatusResp = {
  status: "pending_payment" | "generating" | "ready" | "selected" | "ordered" | "refunded" | "failed";
  jobs: Job[];
};

const SIZES = ["S", "M", "L", "XL"] as const;
const POLL_MS = 2500;

export default function ResultPicker({ sessionId }: { sessionId: string }) {
  const [data, setData] = useState<StatusResp | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [size, setSize] = useState<(typeof SIZES)[number] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    async function tick() {
      try {
        const res = await fetch(`/api/customize/status/${sessionId}`, { cache: "no-store" });
        if (res.status === 404) {
          if (alive) setNotFound(true);
          return;
        }
        const json = (await res.json()) as StatusResp;
        if (!alive) return;
        setData(json);
        if (json.status === "generating" || json.status === "pending_payment") {
          timer = setTimeout(tick, POLL_MS);
        }
      } catch {
        if (alive) timer = setTimeout(tick, POLL_MS);
      }
    }
    tick();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [sessionId]);

  async function order() {
    if (selected === null || !size || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/customize/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, selectedIndex: selected, size }),
      });
      if (!res.ok) throw new Error("Couldn't start checkout — please retry.");
      const { checkoutUrl } = (await res.json()) as { checkoutUrl: string };
      window.location.href = checkoutUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setBusy(false);
    }
  }

  if (notFound) return <Centered emoji="🔎" title="We couldn't find that session." />;

  const status = data?.status;
  const ready = status === "ready" || status === "selected";
  const failed = status === "failed" || status === "refunded";

  if (failed) {
    return (
      <Centered
        emoji="🫶"
        title="That render didn't work out."
        body="Your $2 deposit's been refunded — no charge unless you love it. Try again with another pic!"
      />
    );
  }

  const readyCount = (data?.jobs ?? []).filter((j) => j.status === "ready" && j.resultUrl).length;

  return (
    <main className="candy-wrap" style={{ paddingBlock: "clamp(40px, 6vw, 88px)" }}>
      <header style={{ maxWidth: 680 }} className="candy-rise">
        <span className="candy-eyebrow">{ready ? "Pick your favorite" : "Designing"}</span>
        <h1 style={{ fontSize: "clamp(34px, 6.5vw, 64px)", marginTop: 12 }}>
          {ready ? (
            <>
              Three takes on <span className="lb-hl">your</span> idea.
            </>
          ) : (
            <>Painting your nails… 💅</>
          )}
        </h1>
        {!ready && (
          <p style={{ fontSize: 17, fontWeight: 700, color: "var(--ink-soft)", marginTop: 14 }}>
            Reading your pic, sketching 3 looks, rendering on nails. About a minute! ✨
          </p>
        )}
      </header>

      {/* Design grid */}
      <section
        style={{
          marginTop: "clamp(28px, 4vw, 52px)",
          display: "grid",
          gap: 20,
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
        }}
      >
        {[0, 1, 2].map((i) => {
          const job = data?.jobs?.[i];
          const isReady = job?.status === "ready" && job.resultUrl;
          const isSelected = selected === i;
          return (
            <button
              key={i}
              type="button"
              disabled={!isReady}
              onClick={() => setSelected(i)}
              className={isSelected ? "candy-rise" : undefined}
              style={{
                position: "relative",
                aspectRatio: "4 / 5",
                borderRadius: 26,
                overflow: "hidden",
                background: "var(--cream)",
                border: `3px solid var(--ink)`,
                boxShadow: isSelected ? "var(--shadow-pop)" : "var(--shadow-candy)",
                transform: isSelected ? "translateY(-6px) rotate(-1deg)" : "none",
                transition: "transform .18s cubic-bezier(.34,1.56,.64,1), box-shadow .18s ease",
                cursor: isReady ? "pointer" : "default",
                padding: 0,
              }}
            >
              {isReady ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={job!.resultUrl}
                    alt={`Design ${i + 1}`}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                  <span
                    className={`candy-sticker ${isSelected ? "is-gum" : "is-soda"}`}
                    style={{ position: "absolute", top: 12, left: 14, color: isSelected ? "var(--ink)" : "#fff" }}
                  >
                    {isSelected ? "✓ Picked" : `Design ${i + 1}`}
                  </span>
                </>
              ) : job?.status === "failed" ? (
                <span style={{ display: "grid", placeItems: "center", height: "100%", fontWeight: 800, color: "var(--ink-soft)" }}>
                  unavailable 🥲
                </span>
              ) : (
                <span
                  className="animate-pulse"
                  style={{
                    display: "grid",
                    placeItems: "center",
                    height: "100%",
                    background: "var(--marshmallow)",
                    fontWeight: 800,
                    color: "var(--ink)",
                  }}
                >
                  <span style={{ textAlign: "center" }}>
                    <span style={{ fontSize: 40, display: "block" }} aria-hidden>
                      💅
                    </span>
                    Rendering {i + 1}…
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </section>

      {/* Buy panel */}
      {ready && readyCount > 0 && (
        <section
          className="candy-rise"
          style={{
            marginTop: "clamp(32px, 5vw, 56px)",
            display: "grid",
            gap: "clamp(22px, 4vw, 48px)",
            gridTemplateColumns: "minmax(0, 1fr) minmax(0, 0.8fr)",
            alignItems: "start",
          }}
        >
          <div>
            <span className="candy-eyebrow">Your size</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
              {SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={`candy-chip ${size === s ? "is-active" : ""}`}
                  style={{ minWidth: 56, justifyContent: "center" }}
                >
                  {s}
                </button>
              ))}
            </div>
            <a
              href="/fit"
              style={{ marginTop: 14, display: "inline-block", fontWeight: 800, color: "var(--soda)", textDecoration: "underline", textUnderlineOffset: 3 }}
            >
              Not sure? Measure your nails →
            </a>
          </div>

          <div
            style={{
              background: "var(--cream)",
              border: "2.5px solid var(--ink)",
              borderRadius: 26,
              boxShadow: "var(--shadow-candy)",
              padding: "clamp(20px, 3vw, 30px)",
            }}
          >
            <Row label="Custom Nail Set" value="$69.00" />
            <Row label="Design deposit 💸" value="−$2.00" accent />
            <div style={{ height: "2.5px", background: "var(--ink)", borderRadius: 2, margin: "14px 0" }} />
            <Row label="You pay today" value="$67.00" strong />
            <p style={{ marginTop: 6, fontWeight: 800, fontSize: 13, color: "var(--ink-soft)" }}>
              $2 already paid · net $69 total
            </p>

            {error && <p style={{ marginTop: 14, fontWeight: 700, color: "#C0392B" }}>{error}</p>}

            <button
              type="button"
              onClick={order}
              disabled={selected === null || !size || busy}
              className="candy-btn"
              style={{ marginTop: 22, width: "100%", opacity: selected === null || !size || busy ? 0.45 : 1 }}
            >
              {busy ? "Starting checkout…" : "Order my custom set"}
              <span className="pop" aria-hidden>💖</span>
            </button>
            <p style={{ marginTop: 12, textAlign: "center", fontWeight: 700, color: "var(--ink-soft)" }}>
              {selected === null
                ? "Pick a design above ☝️"
                : !size
                  ? "Choose your size"
                  : "Hand-made to order · ships in days"}
            </p>
          </div>
        </section>
      )}

      <style>{`@media (max-width: 760px){ main.candy-wrap section[style*="0.8fr"]{ grid-template-columns: 1fr !important; } }`}</style>
    </main>
  );
}

function Row({
  label,
  value,
  accent,
  strong,
}: {
  label: string;
  value: string;
  accent?: boolean;
  strong?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "3px 0" }}>
      <span style={{ fontWeight: strong ? 800 : 700, color: strong ? "var(--ink)" : "var(--ink-soft)" }}>{label}</span>
      <span
        style={{
          fontFamily: "var(--display)",
          fontWeight: 600,
          fontSize: strong ? 22 : 17,
          color: accent ? "var(--bubblegum-d)" : "var(--ink)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Centered({ emoji, title, body }: { emoji: string; title: string; body?: string }) {
  return (
    <main className="candy-wrap candy-empty">
      <span className="emoji" aria-hidden>{emoji}</span>
      <h2>{title}</h2>
      {body && <p style={{ maxWidth: 460, margin: "10px auto 0" }}>{body}</p>}
      <a href="/customize" className="candy-btn" style={{ marginTop: 28 }}>
        Start a new design <span className="pop" aria-hidden>✨</span>
      </a>
    </main>
  );
}

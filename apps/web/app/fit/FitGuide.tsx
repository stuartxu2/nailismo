"use client";

import { useEffect, useState } from "react";
import type { ShopifyProduct } from "@/lib/shopify/types";
import {
  FINGERS,
  type FingerKey,
  pxPerMm,
  isComplete,
  sizeFromMeasurements,
  recommendSet,
  loadFit,
  saveFit,
  clearFit,
} from "@/lib/fit/sizing";
import { CalibrationCard } from "./components/CalibrationCard";
import { NailCaliper } from "./components/NailCaliper";
import { HandDiagram } from "./components/HandDiagram";
import { SizeMapCard } from "./components/SizeMapCard";

type Step = "start" | "calibrate" | "measure" | "result";

/** ≈ 85.6 mm at a typical 96 dpi — a sensible starting card width. */
const DEFAULT_CARD_PX = 323;

/** Nominal starting widths (the chart's Medium row) so each caliper opens near size. */
const SEED_MM: Record<FingerKey, number> = {
  thumb: 15,
  index: 11,
  middle: 12,
  ring: 11,
  pinky: 8,
};

const PHASES: { key: Step; label: string }[] = [
  { key: "calibrate", label: "Calibrate" },
  { key: "measure", label: "Measure" },
  { key: "result", label: "Your Size" },
];

export function FitGuide({ products }: { products: ShopifyProduct[] }) {
  const [step, setStep] = useState<Step>("start");
  const [cardPxWidth, setCardPxWidth] = useState<number | null>(null);
  const [fingerMm, setFingerMm] = useState<Partial<Record<FingerKey, number>>>({});
  const [index, setIndex] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  // Restore an in-progress fitting after a reload. This must run in an effect,
  // not during render: localStorage is unavailable on the server, so reading it
  // eagerly would break SSR hydration. Runs once on mount.
  useEffect(() => {
    const saved = loadFit();
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from persisted store
      setCardPxWidth(saved.cardPxWidth);
      setFingerMm(saved.fingerMm);
      if (isComplete(saved.fingerMm)) setStep("result");
      else if (saved.cardPxWidth != null) setStep("measure");
    }
    setHydrated(true);
  }, []);

  // Persist calibration + progress.
  useEffect(() => {
    if (!hydrated) return;
    saveFit({ version: 1, cardPxWidth, fingerMm });
  }, [hydrated, cardPxWidth, fingerMm]);

  const factor = pxPerMm(cardPxWidth ?? DEFAULT_CARD_PX);
  const currentFinger = FINGERS[index];
  const currentMm = fingerMm[currentFinger] ?? SEED_MM[currentFinger];
  const phaseIndex = PHASES.findIndex((p) => p.key === step);

  const begin = () => {
    if (cardPxWidth == null) setCardPxWidth(DEFAULT_CARD_PX);
    setStep("calibrate");
  };

  const setMm = (mm: number) =>
    setFingerMm((prev) => ({ ...prev, [currentFinger]: mm }));

  const next = () => {
    if (fingerMm[currentFinger] == null) setMm(currentMm); // commit the seed
    if (index >= FINGERS.length - 1) setStep("result");
    else setIndex((i) => i + 1);
  };

  const back = () => {
    if (index <= 0) setStep("calibrate");
    else setIndex((i) => i - 1);
  };

  const editFinger = (finger: FingerKey) => {
    setIndex(FINGERS.indexOf(finger));
    setStep("measure");
  };

  const restart = () => {
    clearFit();
    setFingerMm({});
    setIndex(0);
    setStep(cardPxWidth != null ? "measure" : "start");
  };

  return (
    <section className="candy-wrap" style={{ paddingTop: 28, paddingBottom: "clamp(48px,8vw,96px)" }}>
      <div
        style={{
          position: "relative",
          border: "2.5px solid var(--ink)",
          background: "var(--cream)",
          borderRadius: 28,
          boxShadow: "var(--shadow-candy)",
          overflow: "hidden",
        }}
      >
        {/* phase stepper */}
        {step !== "start" && (
          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              padding: "16px clamp(18px,3vw,32px)",
              borderBottom: "2px solid var(--marshmallow)",
              background: "var(--cotton)",
            }}
          >
            {PHASES.map((p, i) => {
              const active = i === phaseIndex;
              const done = i < phaseIndex;
              return (
                <div key={p.key} style={{ display: "flex", alignItems: "center", gap: 10, flex: "1 1 140px" }}>
                  <span
                    aria-hidden
                    style={{
                      display: "grid",
                      placeItems: "center",
                      width: 38,
                      height: 38,
                      flex: "none",
                      borderRadius: "50%",
                      border: "2.5px solid var(--ink)",
                      fontFamily: "var(--body)",
                      fontWeight: 800,
                      fontSize: 16,
                      color: "var(--ink)",
                      background: active ? "var(--bubblegum)" : done ? "var(--lemon)" : "var(--cream)",
                      boxShadow: active ? "0 4px 0 var(--ink)" : "none",
                    }}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span
                    style={{
                      fontFamily: "var(--body)",
                      fontWeight: 800,
                      fontSize: 13,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      color: active ? "var(--ink)" : "var(--ink-soft)",
                    }}
                  >
                    {p.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div key={step} className="candy-rise" style={{ padding: "clamp(24px,4vw,48px)" }}>
          {step === "start" && (
            <div className="grid grid-cols-12 gap-x-0 gap-y-8 lg:gap-x-8 items-center">
              <div className="col-span-12 lg:col-span-7">
                <span className="candy-eyebrow">Find my size</span>
                <h2 style={{ fontSize: "clamp(32px,5vw,56px)", marginTop: 12 }}>
                  Three steps to a fit
                  <br />
                  that actually <span style={{ color: "var(--bubblegum-d)" }}>holds</span>
                </h2>
                <ol style={{ marginTop: 30, display: "grid", gap: 12, maxWidth: 540, listStyle: "none", padding: 0 }}>
                  {[
                    ["1", "Calibrate", "Match an on-screen card to any bank or ID card you have."],
                    ["2", "Measure", "Lay each nail on the screen and drag the caliper to fit."],
                    ["3", "Get your size", "We crunch all five nails into your S–XL set size + the set that fits."],
                  ].map(([n, t, d]) => (
                    <li
                      key={n}
                      style={{
                        display: "flex",
                        gap: 16,
                        alignItems: "flex-start",
                        background: "var(--cotton)",
                        border: "2.5px solid var(--ink)",
                        borderRadius: 20,
                        padding: "16px 18px",
                        boxShadow: "0 3px 0 var(--ink)",
                      }}
                    >
                      <span
                        aria-hidden
                        style={{
                          display: "grid",
                          placeItems: "center",
                          width: 40,
                          height: 40,
                          flex: "none",
                          borderRadius: "50%",
                          border: "2.5px solid var(--ink)",
                          background: "var(--bubblegum)",
                          fontWeight: 800,
                          fontSize: 18,
                          boxShadow: "0 3px 0 var(--ink)",
                        }}
                      >
                        {n}
                      </span>
                      <div>
                        <h3 style={{ fontSize: 19 }}>{t}</h3>
                        <p style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-soft)", marginTop: 3 }}>{d}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <button type="button" onClick={begin} className="candy-btn" style={{ marginTop: 30 }}>
                  {Object.keys(fingerMm).length > 0 ? "Resume fitting" : "Begin fitting"}{" "}
                  <span className="pop" aria-hidden>→</span>
                </button>
                <p style={{ marginTop: 16, fontSize: 13, fontWeight: 700, color: "var(--ink-soft)" }}>
                  You&apos;ll need · any bank or ID card
                </p>
              </div>
              <div className="col-span-12 lg:col-span-5">
                <div
                  style={{
                    background: "var(--cotton)",
                    border: "2.5px solid var(--ink)",
                    borderRadius: 24,
                    padding: 28,
                    boxShadow: "var(--shadow-candy)",
                  }}
                >
                  <span className="candy-sticker is-gum" style={{ marginBottom: 18 }}>Preview · your hand</span>
                  <div style={{ marginTop: 18 }}>
                    <HandDiagram measuredMm={fingerMm} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === "calibrate" && (
            <div className="grid grid-cols-12 gap-x-0 gap-y-8 lg:gap-x-12 items-center">
              <div className="col-span-12 lg:col-span-5">
                <span className="candy-eyebrow">Step 1 · Calibrate</span>
                <h2 style={{ fontSize: "clamp(28px,3.6vw,46px)", marginTop: 12 }}>Match the card</h2>
                <p style={{ marginTop: 16, fontSize: 16, fontWeight: 600, color: "var(--ink-soft)", maxWidth: 400 }}>
                  Hold any bank or ID card flat against your screen and drag the lime
                  edge until the outline matches its width exactly. This teaches the
                  page your screen&apos;s true scale.
                </p>
                <span className="candy-chip" style={{ marginTop: 20, cursor: "default" }}>
                  Scale · {factor.toFixed(2)} px / mm
                </span>
                <div style={{ marginTop: 28, display: "flex", flexWrap: "wrap", gap: 12 }}>
                  <button type="button" onClick={() => setStep("measure")} className="candy-btn">
                    This matches <span className="pop" aria-hidden>→</span>
                  </button>
                  <button type="button" onClick={() => setStep("start")} className="candy-btn is-ghost">
                    Back
                  </button>
                </div>
              </div>
              <div className="col-span-12 lg:col-span-7 flex justify-center py-6">
                <CalibrationCard pxWidth={cardPxWidth ?? DEFAULT_CARD_PX} onChange={setCardPxWidth} />
              </div>
            </div>
          )}

          {step === "measure" && (
            <div className="grid grid-cols-12 gap-x-0 gap-y-8 lg:gap-x-12 items-start">
              <div className="col-span-12 lg:col-span-5">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
                  <span className="candy-eyebrow">Nail {index + 1} of {FINGERS.length}</span>
                  <span className="candy-chip" style={{ cursor: "default" }}>One hand · we mirror it</span>
                </div>
                <div
                  style={{
                    background: "var(--cotton)",
                    border: "2.5px solid var(--ink)",
                    borderRadius: 24,
                    padding: 24,
                    boxShadow: "var(--shadow-candy)",
                  }}
                >
                  <HandDiagram measuredMm={fingerMm} activeFinger={currentFinger} onSelect={editFinger} />
                </div>
                <p style={{ marginTop: 16, fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", maxWidth: 360 }}>
                  Tap any nail to jump to it. We size one hand and mirror it to the other.
                </p>
              </div>

              <div className="col-span-12 lg:col-span-7">
                <NailCaliper factor={factor} mm={currentMm} onChange={setMm} finger={currentFinger} />
                <div style={{ marginTop: 28, display: "flex", flexWrap: "wrap", gap: 12 }}>
                  <button type="button" onClick={back} className="candy-btn is-ghost">
                    Back
                  </button>
                  <button type="button" onClick={next} className="candy-btn">
                    {index >= FINGERS.length - 1 ? "See my size" : "Next nail"}{" "}
                    <span className="pop" aria-hidden>→</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {step === "result" && (
            <SizeMapCard
              fingerMm={fingerMm}
              size={sizeFromMeasurements(fingerMm)}
              recommended={recommendSet(products)}
              onRestart={restart}
              onEditFinger={editFinger}
            />
          )}
        </div>
      </div>
    </section>
  );
}

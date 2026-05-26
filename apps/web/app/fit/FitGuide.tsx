"use client";

import { useEffect, useState } from "react";
import type { ShopifyProduct } from "@/lib/shopify/types";
import {
  FINGERS,
  type FingerKey,
  type NailSize,
  pxPerMm,
  mmToSize,
  isComplete,
  buildSymmetricMap,
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

/** Nominal starting widths so each caliper opens near the right size. */
const SEED_MM: Record<FingerKey, number> = {
  thumb: 16,
  index: 13.5,
  middle: 14.5,
  ring: 12.5,
  pinky: 9,
};

const PHASES: { key: Step; label: string }[] = [
  { key: "calibrate", label: "Calibrate" },
  { key: "measure", label: "Measure" },
  { key: "result", label: "Size Map" },
];

function measuredSizes(
  fingerMm: Partial<Record<FingerKey, number>>,
): Partial<Record<FingerKey, NailSize>> {
  const out: Partial<Record<FingerKey, NailSize>> = {};
  for (const f of FINGERS) {
    const mm = fingerMm[f];
    if (typeof mm === "number") out[f] = mmToSize(mm);
  }
  return out;
}

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
    <section className="sec">
      <div className="nail-container">
        <div className="relative" style={{ border: "2.5px solid var(--ink)", background: "var(--cream)", borderRadius: 28, boxShadow: "var(--shadow-candy)", overflow: "hidden" }}>

          {/* phase stepper */}
          {step !== "start" && (
            <div className="flex items-stretch border-b border-hair">
              {PHASES.map((p, i) => {
                const active = i === phaseIndex;
                const done = i < phaseIndex;
                return (
                  <div
                    key={p.key}
                    className={`flex-1 px-4 md:px-6 py-4 flex items-center gap-3 ${
                      i > 0 ? "border-l border-hair" : ""
                    } ${active ? "bg-tetsu text-paper" : ""}`}
                  >
                    <span
                      className={`grid place-items-center h-6 w-6 font-mono text-[12px] border ${
                        active
                          ? "border-paper text-paper"
                          : done
                            ? "border-akane text-akane"
                            : "border-hair text-rikyu"
                      }`}
                    >
                      {done ? "✓" : i + 1}
                    </span>
                    <span
                      className={`text-[11px] tracking-[0.22em] uppercase font-mono ${
                        active ? "text-paper" : done ? "text-tetsu" : "text-rikyu"
                      }`}
                    >
                      {p.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div key={step} className="rise p-6 md:p-12">
            {step === "start" && (
              <div className="grid grid-cols-12 gap-8 items-center">
                <div className="col-span-12 lg:col-span-7">
                  <h2 className="font-display font-light tracking-display leading-[0.95] text-[clamp(30px,4vw,52px)]">
                    Three steps to a fit
                    <br />
                    that actually <span className="italic font-serif">holds</span>
                    <span className="text-akane">.</span>
                  </h2>
                  <ol className="mt-8 space-y-px bg-[var(--hair)] border border-hair max-w-[520px]">
                    {[
                      ["01", "Calibrate", "Match an on-screen card to any bank or ID card you have."],
                      ["02", "Measure", "Lay each nail on the screen and drag the caliper to fit."],
                      ["03", "Map it", "Get your 0–9 size map and the set that matches it."],
                    ].map(([n, t, d]) => (
                      <li key={n} className="bg-paper p-5 flex items-start gap-5">
                        <span className="font-display text-[28px] leading-none text-tetsu">
                          {n}
                        </span>
                        <div>
                          <h3 className="font-display text-[18px]">{t}</h3>
                          <p className="text-[14px] text-rikyu mt-1">{d}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <button type="button" onClick={begin} className="candy-btn mt-9">
                    {fingerMm && Object.keys(fingerMm).length > 0
                      ? "Resume Fitting"
                      : "Begin Fitting"}{" "}
                    <span className="arrow">→</span>
                  </button>
                  <p className="mt-4 cap">You&apos;ll need · any bank or ID card</p>
                </div>
                <div className="col-span-12 lg:col-span-5">
                  <div className="border border-hair bg-toriko p-8">
                    <span className="cap block mb-6">Preview · Size Map</span>
                    <HandDiagram sizes={measuredSizes(fingerMm)} />
                  </div>
                </div>
              </div>
            )}

            {step === "calibrate" && (
              <div className="grid grid-cols-12 gap-8 lg:gap-12 items-center">
                <div className="col-span-12 lg:col-span-5">
                  <span className="cap block mb-4">Step 01 · Calibrate</span>
                  <h2 className="font-display font-light tracking-display leading-[0.95] text-[clamp(28px,3.2vw,44px)]">
                    Match the card
                    <span className="text-akane">.</span>
                  </h2>
                  <p className="mt-5 text-rikyu max-w-[400px]">
                    Hold any bank or ID card flat against your screen and drag the
                    red edge until the outline matches its width exactly. This
                    teaches the page your screen&apos;s true scale.
                  </p>
                  <div className="mt-6 cap">
                    Scale · {factor.toFixed(2)} px / mm
                  </div>
                  <div className="mt-9 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setStep("measure")}
                      className="candy-btn"
                    >
                      This Matches <span className="arrow">→</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setStep("start")}
                      className="candy-btn is-ghost"
                    >
                      Back
                    </button>
                  </div>
                </div>
                <div className="col-span-12 lg:col-span-7 flex justify-center py-6">
                  <CalibrationCard
                    pxWidth={cardPxWidth ?? DEFAULT_CARD_PX}
                    onChange={setCardPxWidth}
                  />
                </div>
              </div>
            )}

            {step === "measure" && (
              <div className="grid grid-cols-12 gap-8 lg:gap-12 items-start">
                <div className="col-span-12 lg:col-span-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="cap">
                      Nail {index + 1} of {FINGERS.length}
                    </span>
                    <span className="cap">Right hand · mirrored</span>
                  </div>
                  <div className="border border-hair bg-toriko p-6">
                    <HandDiagram
                      sizes={measuredSizes(fingerMm)}
                      activeFinger={currentFinger}
                      onSelect={editFinger}
                    />
                  </div>
                  <p className="mt-4 text-[13px] text-rikyu max-w-[360px]">
                    We size your right hand and mirror it to the left. Adjust any
                    nail individually on the final map.
                  </p>
                </div>

                <div className="col-span-12 lg:col-span-7">
                  <NailCaliper
                    factor={factor}
                    mm={currentMm}
                    onChange={setMm}
                    fingerLabel={currentFinger}
                  />
                  <div className="mt-9 flex items-center gap-3">
                    <button type="button" onClick={back} className="candy-btn is-ghost">
                      Back
                    </button>
                    <button type="button" onClick={next} className="candy-btn">
                      {index >= FINGERS.length - 1 ? "See My Size Map" : "Next Nail"}{" "}
                      <span className="arrow">→</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {step === "result" && (
              <SizeMapCard
                sizeMap={buildSymmetricMap(fingerMm)}
                recommended={recommendSet(products)}
                onRestart={restart}
                onEditFinger={editFinger}
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

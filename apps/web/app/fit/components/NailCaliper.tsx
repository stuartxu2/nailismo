"use client";

import { useCallback } from "react";
import { pxToMm, sizeFromMm, clampMm, MIN_MM, MAX_MM, type FingerKey } from "@/lib/fit/sizing";

/** Left inset (px) where the fixed jaw sits inside the measuring bed. */
const PAD = 28;

const FINGER_LABEL: Record<FingerKey, string> = {
  thumb: "Thumb",
  index: "Index",
  middle: "Middle",
  ring: "Ring",
  pinky: "Pinky",
};

/**
 * A physical caliper rendered at true scale. The gap between the fixed left jaw
 * and the draggable right jaw equals `mm × factor` pixels — so the user lays a
 * real fingernail between the lines and drags until it matches. `factor` is the
 * device's px/mm from calibration.
 */
export function NailCaliper({
  factor,
  mm,
  onChange,
  finger,
}: {
  factor: number;
  mm: number;
  onChange: (mm: number) => void;
  finger: FingerKey;
}) {
  const gapPx = mm * factor;
  const size = sizeFromMm(finger, mm);
  const label = FINGER_LABEL[finger];

  const startDrag = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startGap = mm * factor;
      const move = (ev: PointerEvent) => {
        const nextGap = startGap + (ev.clientX - startX);
        onChange(clampMm(pxToMm(nextGap, factor)));
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [mm, factor, onChange],
  );

  const onKey = useCallback(
    (e: React.KeyboardEvent) => {
      const step = e.shiftKey ? 2 : 0.5;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        onChange(clampMm(mm + step));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        onChange(clampMm(mm - step));
      }
    },
    [mm, onChange],
  );

  return (
    <div className="w-full">
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div>
          <span className="candy-eyebrow">Measuring</span>
          <div style={{ fontFamily: "var(--display)", fontWeight: 600, fontSize: 26, marginTop: 2 }}>{label}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <span style={{ fontFamily: "var(--display)", fontWeight: 600, fontSize: 40, lineHeight: 1, color: "var(--ink)", fontVariantNumeric: "tabular-nums" }}>
            {mm.toFixed(1)}
            <span style={{ fontSize: 16, fontWeight: 700, color: "var(--ink-soft)", marginLeft: 4 }}>mm</span>
          </span>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-soft)" }}>
              Reads as
            </span>
            <span className="candy-sticker is-gum" style={{ transform: "rotate(-3deg)" }}>{size}</span>
          </div>
        </div>
      </div>

      {/* measuring bed — true scale */}
      <div
        style={{
          position: "relative",
          height: 144,
          background: "var(--cotton)",
          border: "2.5px solid var(--ink)",
          borderRadius: 20,
          overflow: "hidden",
        }}
      >
        <span style={{ position: "absolute", left: 14, top: 12, fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ink-soft)" }}>
          Lay nail flat
        </span>

        {/* nail highlight spanning the gap */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            transform: "translateY(-50%)",
            left: PAD,
            width: Math.max(0, gapPx),
            height: 88,
            background: "rgba(159,237,64,0.30)",
            borderLeft: "2px solid var(--bubblegum-d)",
            borderRight: "2px solid var(--bubblegum-d)",
            borderRadius: 12,
          }}
        >
          <div style={{ position: "absolute", insetInline: 0, top: 0, height: 12, background: "rgba(159,237,64,0.55)", borderRadius: "12px 12px 0 0" }} />
        </div>

        {/* fixed left jaw */}
        <div style={{ position: "absolute", top: 12, bottom: 12, width: 2, background: "var(--ink)", left: PAD }} aria-hidden />

        {/* draggable right jaw */}
        <button
          type="button"
          role="slider"
          aria-label={`Adjust ${label} nail width`}
          aria-valuemin={MIN_MM}
          aria-valuemax={MAX_MM}
          aria-valuenow={Number(mm.toFixed(1))}
          aria-valuetext={`${mm.toFixed(1)} millimetres, reads as size ${size}`}
          onPointerDown={startDrag}
          onKeyDown={onKey}
          className="group"
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            width: 44,
            marginLeft: -22,
            cursor: "ew-resize",
            touchAction: "none",
            display: "grid",
            placeItems: "center",
            left: PAD + gapPx,
            background: "transparent",
            border: "none",
          }}
        >
          <span style={{ position: "absolute", top: 12, bottom: 12, width: 2, background: "var(--ink)" }} aria-hidden />
          <span
            aria-hidden
            style={{
              width: 22,
              height: 56,
              borderRadius: 999,
              background: "var(--bubblegum)",
              border: "2.5px solid var(--ink)",
              boxShadow: "0 3px 0 var(--ink)",
            }}
          />
        </button>
      </div>

      {/* precise / accessible fallback */}
      <label style={{ marginTop: 24, display: "flex", alignItems: "center", gap: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-soft)", whiteSpace: "nowrap" }}>
          Fine tune
        </span>
        <input
          type="range"
          min={MIN_MM}
          max={MAX_MM}
          step={0.5}
          value={mm}
          onChange={(e) => onChange(clampMm(Number(e.target.value)))}
          style={{ width: "100%", accentColor: "var(--grape)" }}
          aria-label={`${label} nail width in millimetres`}
        />
      </label>
    </div>
  );
}

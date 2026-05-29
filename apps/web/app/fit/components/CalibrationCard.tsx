"use client";

import { useCallback } from "react";

/** ID-1 aspect ratio (height ÷ width) — a real card is 53.98 × 85.6 mm. */
const CARD_RATIO = 53.98 / 85.6;
const MIN_W = 200;
const MAX_W = 680;

const clampWidth = (n: number) => Math.min(MAX_W, Math.max(MIN_W, n));

/**
 * A draggable on-screen card the user matches against a real bank/ID card.
 * The resulting pixel width is the device's calibration: width ÷ 85.6 = px/mm.
 */
export function CalibrationCard({
  pxWidth,
  onChange,
}: {
  pxWidth: number;
  onChange: (px: number) => void;
}) {
  const height = Math.round(pxWidth * CARD_RATIO);

  const startDrag = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = pxWidth;
      const move = (ev: PointerEvent) => {
        onChange(clampWidth(startW + (ev.clientX - startX)));
      };
      const up = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", up);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", up);
    },
    [pxWidth, onChange],
  );

  const onKey = useCallback(
    (e: React.KeyboardEvent) => {
      const step = e.shiftKey ? 10 : 1;
      if (e.key === "ArrowRight" || e.key === "ArrowUp") {
        e.preventDefault();
        onChange(clampWidth(pxWidth + step));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
        e.preventDefault();
        onChange(clampWidth(pxWidth - step));
      }
    },
    [pxWidth, onChange],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div
        style={{
          position: "relative",
          width: pxWidth,
          height,
          background: "var(--grape)",
          color: "var(--cream)",
          border: "2.5px solid var(--ink)",
          borderRadius: Math.round(height * 0.09),
          boxShadow: "0 6px 0 var(--ink)",
          userSelect: "none",
        }}
      >
        {/* chip */}
        <div
          style={{
            position: "absolute",
            left: "10%",
            top: "30%",
            width: "15%",
            height: "28%",
            borderRadius: 6,
            background: "var(--bubblegum)",
            border: "2px solid var(--ink)",
          }}
        />
        <div style={{ position: "absolute", left: "10%", bottom: "15%", fontFamily: "var(--body)", fontWeight: 800, fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(255,255,255,0.85)" }}>
          Calibration · ID-1
        </div>
        <div style={{ position: "absolute", right: "8%", top: "16%", fontFamily: "var(--body)", fontWeight: 800, fontSize: 11, letterSpacing: "0.1em", color: "rgba(255,255,255,0.7)" }}>
          85.6 mm
        </div>

        {/* drag handle on the right edge */}
        <button
          type="button"
          aria-label="Drag to match the width of your card"
          role="slider"
          aria-valuemin={MIN_W}
          aria-valuemax={MAX_W}
          aria-valuenow={Math.round(pxWidth)}
          onPointerDown={startDrag}
          onKeyDown={onKey}
          style={{
            position: "absolute",
            top: "50%",
            right: -16,
            transform: "translateY(-50%)",
            height: 72,
            width: 28,
            display: "grid",
            placeItems: "center",
            cursor: "ew-resize",
            touchAction: "none",
            background: "transparent",
            border: "none",
          }}
        >
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

      {/* accessible / precise fine-tune */}
      <label style={{ marginTop: 28, width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink-soft)" }}>
          Fine tune
        </span>
        <input
          type="range"
          min={MIN_W}
          max={MAX_W}
          value={Math.round(pxWidth)}
          onChange={(e) => onChange(clampWidth(Number(e.target.value)))}
          style={{ width: "100%", accentColor: "var(--grape)" }}
          aria-label="Fine tune card width"
        />
      </label>
    </div>
  );
}

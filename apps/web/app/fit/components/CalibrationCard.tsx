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
    <div className="flex flex-col items-center">
      <div
        className="relative bg-tetsu text-paper select-none shadow-editorial"
        style={{ width: pxWidth, height, borderRadius: Math.round(height * 0.06) }}
      >
        {/* corner registration marks, echoing the site's technical motif */}
        <span className="crosshair crosshair-light" style={{ left: -8, top: -8 }} />
        <span className="crosshair crosshair-light" style={{ right: -8, top: -8 }} />
        <span className="crosshair crosshair-light" style={{ left: -8, bottom: -8 }} />
        <span
          className="crosshair crosshair-light"
          style={{ right: -8, bottom: -8 }}
        />

        {/* chip */}
        <div
          className="absolute rounded-[4px] bg-kikuchiba/90"
          style={{ left: "10%", top: "32%", width: "14%", height: "26%" }}
        />
        <div className="absolute left-[10%] bottom-[16%] font-mono text-[10px] tracking-[0.28em] uppercase text-paper/70">
          Calibration · ID-1
        </div>
        <div className="absolute right-[8%] top-[16%] font-mono text-[10px] tracking-[0.22em] uppercase text-paper/55">
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
          className="group absolute top-1/2 -right-3 -translate-y-1/2 h-16 w-6 grid place-items-center cursor-ew-resize touch-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-akane focus-visible:outline-offset-2"
        >
          <span className="h-12 w-1.5 rounded-full bg-akane transition-transform duration-200 group-hover:scale-y-110 group-active:scale-y-95" />
        </button>
      </div>

      {/* accessible / precise fine-tune */}
      <label className="mt-7 w-full max-w-[420px] flex flex-col items-center gap-2">
        <span className="cap">Fine tune</span>
        <input
          type="range"
          min={MIN_W}
          max={MAX_W}
          value={Math.round(pxWidth)}
          onChange={(e) => onChange(clampWidth(Number(e.target.value)))}
          className="w-full accent-akane"
          aria-label="Fine tune card width"
        />
      </label>
    </div>
  );
}

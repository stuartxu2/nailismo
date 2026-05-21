"use client";

import { useCallback } from "react";
import { pxToMm, mmToSize, clampMm, MIN_MM, MAX_MM } from "@/lib/fit/sizing";

/** Left inset (px) where the fixed jaw sits inside the measuring bed. */
const PAD = 28;

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
  fingerLabel,
}: {
  factor: number;
  mm: number;
  onChange: (mm: number) => void;
  fingerLabel: string;
}) {
  const gapPx = mm * factor;
  const size = mmToSize(mm);

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
      <div className="flex items-end justify-between mb-4">
        <div>
          <span className="cap block">Measuring</span>
          <span className="font-display text-[22px] capitalize">{fingerLabel}</span>
        </div>
        <div className="text-right">
          <span className="font-display text-[40px] leading-none tabular-nums text-tetsu">
            {mm.toFixed(1)}
            <span className="text-[16px] text-rikyu ml-1">mm</span>
          </span>
          <span className="mt-2 flex items-center justify-end gap-2 cap">
            Size
            <span className="grid place-items-center h-6 w-6 bg-akane text-paper font-mono text-[12px]">
              {size}
            </span>
          </span>
        </div>
      </div>

      {/* measuring bed — true scale */}
      <div className="relative h-[136px] bg-toriko border border-hair overflow-hidden">
        <span className="corner-mark" style={{ left: 8, top: 6 }}>
          Lay nail flat
        </span>

        {/* nail highlight spanning the gap */}
        <div
          className="absolute top-1/2 -translate-y-1/2 bg-akane/12 border-x border-akane/40"
          style={{ left: PAD, width: Math.max(0, gapPx), height: 84, borderRadius: 12 }}
        >
          <div className="absolute inset-x-0 top-0 h-3 bg-akane/25 rounded-t-[12px]" />
        </div>

        {/* fixed left jaw */}
        <div
          className="absolute top-3 bottom-3 w-px bg-tetsu"
          style={{ left: PAD }}
          aria-hidden
        />

        {/* draggable right jaw */}
        <button
          type="button"
          role="slider"
          aria-label={`Adjust ${fingerLabel} nail width`}
          aria-valuemin={MIN_MM}
          aria-valuemax={MAX_MM}
          aria-valuenow={Number(mm.toFixed(1))}
          aria-valuetext={`${mm.toFixed(1)} millimetres, size ${size}`}
          onPointerDown={startDrag}
          onKeyDown={onKey}
          className="group absolute top-0 bottom-0 w-10 -ml-5 cursor-ew-resize touch-none grid place-items-center focus-visible:outline focus-visible:outline-1 focus-visible:outline-akane focus-visible:-outline-offset-2"
          style={{ left: PAD + gapPx }}
        >
          <span className="absolute top-3 bottom-3 w-px bg-tetsu" />
          <span className="h-12 w-1.5 rounded-full bg-akane transition-transform duration-200 group-hover:scale-y-110 group-active:scale-y-95" />
        </button>
      </div>

      {/* precise / accessible fallback */}
      <label className="mt-6 flex items-center gap-3">
        <span className="cap whitespace-nowrap">Fine tune</span>
        <input
          type="range"
          min={MIN_MM}
          max={MAX_MM}
          step={0.5}
          value={mm}
          onChange={(e) => onChange(clampMm(Number(e.target.value)))}
          className="w-full accent-akane"
          aria-label={`${fingerLabel} nail width in millimetres`}
        />
      </label>
    </div>
  );
}

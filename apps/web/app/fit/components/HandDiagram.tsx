"use client";

import type { FingerKey } from "@/lib/fit/sizing";

type FingerGeom = {
  key: FingerKey;
  x: number; // centre x
  top: number; // y of finger tip
  w: number; // finger width
};

/** Stylised right hand, palm-down — a friendly schematic, not anatomy. */
const GEOM: FingerGeom[] = [
  { key: "thumb", x: 58, top: 150, w: 40 },
  { key: "index", x: 124, top: 44, w: 38 },
  { key: "middle", x: 170, top: 26, w: 40 },
  { key: "ring", x: 216, top: 50, w: 38 },
  { key: "pinky", x: 260, top: 86, w: 32 },
];

const PALM_TOP = 206;
const NAIL_H = 28;

export function HandDiagram({
  measuredMm,
  activeFinger,
  onSelect,
}: {
  measuredMm: Partial<Record<FingerKey, number>>;
  activeFinger?: FingerKey | null;
  onSelect?: (finger: FingerKey) => void;
}) {
  return (
    <svg viewBox="0 0 320 290" className="w-full h-auto" role="img" aria-label="Your hand measuring progress">
      {/* palm */}
      <rect
        x="40"
        y={PALM_TOP - 8}
        width="232"
        height="86"
        rx="40"
        fill="var(--cream)"
        stroke="var(--ink)"
        strokeWidth="2"
      />

      {GEOM.map((f) => {
        const done = typeof measuredMm[f.key] === "number";
        const active = activeFinger === f.key;
        const nailW = f.w * 0.78;
        const nailX = f.x - nailW / 2;
        const interactive = Boolean(onSelect);

        const fingerFill = active ? "var(--lemon)" : "var(--cream)";
        const nailFill = done ? "var(--bubblegum)" : active ? "rgba(159,237,64,0.35)" : "var(--cotton)";
        const nailStroke = active ? "var(--grape)" : "var(--ink)";

        return (
          <g
            key={f.key}
            onClick={interactive ? () => onSelect?.(f.key) : undefined}
            tabIndex={interactive ? 0 : undefined}
            role={interactive ? "button" : undefined}
            aria-label={interactive ? `Measure ${f.key}` : undefined}
            onKeyDown={
              interactive
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect?.(f.key);
                    }
                  }
                : undefined
            }
            style={{ cursor: interactive ? "pointer" : "default" }}
          >
            {/* finger column */}
            <rect
              x={f.x - f.w / 2}
              y={f.top}
              width={f.w}
              height={PALM_TOP - f.top + 24}
              rx={f.w / 2}
              fill={fingerFill}
              stroke="var(--ink)"
              strokeWidth="2"
            />
            {/* nail cap */}
            <rect
              x={nailX}
              y={f.top + 6}
              width={nailW}
              height={NAIL_H}
              rx={nailW / 2.6}
              fill={nailFill}
              stroke={nailStroke}
              strokeWidth={active ? 2.5 : 2}
            />
            {done && (
              <text
                x={f.x}
                y={f.top + 6 + NAIL_H / 2 + 5}
                textAnchor="middle"
                fontFamily="var(--body)"
                fontWeight="800"
                fontSize="15"
                fill="var(--ink)"
              >
                ✓
              </text>
            )}
            {active && !done && (
              <circle cx={f.x} cy={f.top + 6 + NAIL_H / 2} r="3.5" fill="var(--grape)" />
            )}
          </g>
        );
      })}
    </svg>
  );
}

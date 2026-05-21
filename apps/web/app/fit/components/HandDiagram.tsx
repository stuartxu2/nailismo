"use client";

import type { FingerKey, NailSize } from "@/lib/fit/sizing";

type FingerGeom = {
  key: FingerKey;
  x: number; // centre x
  top: number; // y of finger tip
  w: number; // finger width
};

/** Stylised right hand, palm-down — a technical schematic, not anatomy. */
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
  sizes,
  activeFinger,
  onSelect,
}: {
  sizes: Partial<Record<FingerKey, NailSize>>;
  activeFinger?: FingerKey | null;
  onSelect?: (finger: FingerKey) => void;
}) {
  return (
    <svg viewBox="0 0 320 290" className="w-full h-auto" role="img" aria-label="Your hand size map">
      {/* palm */}
      <rect
        x="40"
        y={PALM_TOP - 8}
        width="232"
        height="86"
        rx="40"
        fill="var(--toriko)"
        stroke="var(--hair)"
      />

      {GEOM.map((f) => {
        const size = sizes[f.key];
        const done = typeof size === "number";
        const active = activeFinger === f.key;
        const nailW = f.w * 0.78;
        const nailX = f.x - nailW / 2;
        const interactive = Boolean(onSelect);

        const fingerFill = active ? "var(--toriko)" : "var(--paper)";
        const stroke = active
          ? "var(--akane)"
          : done
            ? "var(--tetsu)"
            : "var(--hair)";
        const nailFill = done
          ? "var(--tetsu)"
          : active
            ? "rgba(183,40,46,0.14)"
            : "var(--paper)";

        return (
          <g
            key={f.key}
            onClick={interactive ? () => onSelect?.(f.key) : undefined}
            tabIndex={interactive ? 0 : undefined}
            role={interactive ? "button" : undefined}
            aria-label={interactive ? `Edit ${f.key}` : undefined}
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
            style={{
              cursor: interactive ? "pointer" : "default",
              transition: "opacity .3s ease",
            }}
          >
            {/* finger column */}
            <rect
              x={f.x - f.w / 2}
              y={f.top}
              width={f.w}
              height={PALM_TOP - f.top + 24}
              rx={f.w / 2}
              fill={fingerFill}
              stroke={stroke}
              strokeWidth={active ? 1.5 : 1}
            />
            {/* nail cap */}
            <rect
              x={nailX}
              y={f.top + 6}
              width={nailW}
              height={NAIL_H}
              rx={nailW / 2.6}
              fill={nailFill}
              stroke={active ? "var(--akane)" : "var(--hair)"}
              strokeWidth={active ? 1.5 : 0.75}
            />
            {done && (
              <text
                x={f.x}
                y={f.top + 6 + NAIL_H / 2 + 4}
                textAnchor="middle"
                fontFamily="var(--font-mono)"
                fontSize="13"
                fill="var(--paper)"
              >
                {size}
              </text>
            )}
            {active && !done && (
              <circle
                cx={f.x}
                cy={f.top + 6 + NAIL_H / 2}
                r="3"
                fill="var(--akane)"
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}

# Measure tool — derive the thumb instead of measuring it

**Date:** 2026-06-14
**Status:** approved, ready for plan
**Scope:** nail-size scanner (Measure tab) across web detection API, iOS Swift app, and Expo/RN app.

## Problem

In the Measure flow the user lays a hand flat (palm down, fingers spread) beside a
bank card and shoots straight down. Detection returns a width caliper across each
of the five nails; the card gives a px→mm scale; the five widths aggregate into one
S/M/L/XL set size.

The thumb is broken. With the hand flat palm-down, the thumb's nail plane sits
roughly 90° to the other four — the top-down camera sees the thumb nail **edge-on**.
Its true width is foreshortened and geometrically unrecoverable from that frame. The
thumb caliper is always a side profile, so its measured width is wrong (too small).

Two consequences:
1. The thumb is the **widest** nail (chart 14–17 mm) and currently votes in the
   aggregate, so a foreshortened (too-small) thumb biases the recommendation
   **down** → under-sized set.
2. The review overlay shows a visibly wrong, draggable thumb caliper.

## Decision

Constraint: **keep the single top-down photo** (no second thumb shot).

The thumb stops being measured anywhere. The four camera-facing nails
(index/middle/ring/pinky) are detected, drawn, and dragged exactly as today. The
thumb width is **derived** from a sibling finger and is **display-only — it does not
vote** in the set-size aggregate.

- Derivation: `thumb_mm = middle_mm + 3`, fallback `index_mm + 4`, else null
  (no estimate). Offsets are exact and constant in the printed chart
  (thumb − middle = 3 mm and thumb − index = 4 mm at every size), so a derived thumb
  is functionally identical to a measured one for a single-letter set.
- Aggregate uses only the measured fingers. Removing the foreshortened thumb from the
  vote removes the down-bias.
- Visual: **number-only**. The overlay shows the card + four nail calipers. The thumb
  appears as a derived number on the result card, tagged "est.", with a one-line trust
  note. No thumb caliper is drawn (this is what directly removes the side-on artifact).

## Architecture / components

### 1. Shared domain — `packages/fit-sizing/src/index.ts`

Add:
- `MEASURED_FINGERS = ["index", "middle", "ring", "pinky"] as const` — the fingers we
  actually measure (thumb excluded).
- `THUMB_OFFSET_FROM_MIDDLE_MM = 3`, `THUMB_OFFSET_FROM_INDEX_MM = 4`.
- `deriveThumbMm(fingerMm: Partial<Record<FingerKey, number>>): number | null`
  - middle present → `clampMm(middle + 3)`
  - else index present → `clampMm(index + 4)`
  - else `null`

`sizeFromMeasurements` is unchanged — it already averages only the fingers present in
the map. Callers pass the **measured** fingers (thumb absent), so the thumb never
votes. The persisted `SavedFit.fingerMm` gets the derived thumb back-filled afterward
for the result display.

Update the file-level and `sizeFromMeasurements` doc comments to state the thumb is
derived, not measured.

### 2. Swift port — `apps/ios/Nailismo/Core/FitSizing.swift`

Mirror the TS additions: `measuredFingers`, `thumbOffsetFromMiddleMM`,
`thumbOffsetFromIndexMM`, and `deriveThumbMm(_ fingerMm: [String: Double]) -> Double?`.
`sizeFromMeasurements` stays as-is; the call site stops passing a thumb.

### 3. Detection stops requesting the thumb

- `apps/web/app/api/scan/route.ts`
  - `SYSTEM_PROMPT`: ask for the four nails only (index/middle/ring/pinky); drop the
    thumb from the example JSON shape; reword the "at least three nails" gate to apply
    to the four. Add one sentence explaining the thumb is edge-on in a flat top-down
    shot and is therefore not measured.
  - `normalize`: discard a `thumb` entry if the model still returns one (safety net),
    so a stray thumb can never re-enter the pipeline.
- `apps/ios/Nailismo/Core/VisionScanProvider.swift`: remove the thumb joint from
  `joints` so the on-device pass returns four nails. The `found` gate (card + ≥3 nails)
  is unchanged and still valid against four fingers.

### 4. Clients — overlay shows card + four nails; thumb is a derived number

- iOS `apps/ios/Nailismo/Features/Measure/MeasureView.swift`
  - `buildSegments` and `defaultSegments`: do not add a thumb segment.
  - `liveMeasurement`: compute mm for the four measured segments, size from those, then
    set `mm["thumb"] = FitSizing.deriveThumbMm(mm)` for persistence/display.
  - `confirm`: persists the four measured widths + the derived thumb.
- RN `apps/app/src/app/(tabs)/measure.tsx`
  - `enterReview`: skip the thumb when building review segments and the missing-finger
    fallback.
  - review live size + `confirmReview`: size from the four measured fingers, then
    back-fill the derived thumb into the persisted `fingerMm`.
  - manual fallback `nail` step: iterate `MEASURED_FINGERS` (four nails — "nail X of 4"),
    then derive the thumb before reaching `result`.
- Result screens (both): the thumb row shows the derived mm with an **"est."** tag.

### 5. Copy

- Intro steps that say "all five nails visible" → soften to lay the hand flat; we read
  four nails and estimate the thumb.
- Result/review trust note: "Thumb estimated from your middle finger — it lies edge-on
  in a flat photo."

## Data flow (after change)

```
photo → detect 4 nails + card
      → user nudges 4 calipers (review overlay)
      → measured4 = { index, middle, ring, pinky } in mm  (via card scale)
      → size = sizeFromMeasurements(measured4)             ← thumb does NOT vote
      → persisted fingerMm = { ...measured4, thumb: deriveThumbMm(measured4) }
      → result card shows 5 rows; thumb tagged "est."
```

## Edge cases

- **Middle missing, index present:** thumb = index + 4.
- **Both middle and index missing:** `deriveThumbMm` → null; thumb row shows "—". The
  scan is already poor at <2 key fingers; acceptable.
- **Model returns a thumb anyway:** `normalize` drops it; clients never build a thumb
  caliper. No path can reintroduce a measured thumb.
- **Manual fallback:** four-nail loop + derived thumb; same result shape as auto path.
- **clampMm:** derived value is clamped to [MIN_MM, MAX_MM] like every other width.

## Testing

- TS unit tests (`packages/fit-sizing/src/index.test.ts`): `deriveThumbMm` middle path,
  index fallback, null when neither present, clamp at bounds; and that
  `sizeFromMeasurements` over the four measured fingers is unaffected by thumb.
- Swift: parity by inspection against the TS source (the port has no test harness).
- Visual QA is manual — provide the running URL/build, user screenshots (standing rule:
  no automated screenshot loop).

## Out of scope

- Second thumb capture shot (explicitly rejected — single photo stays).
- Tilt/foreshorten geometry correction (unstable near edge-on).
- Locked non-draggable thumb caliper in the overlay (possible later polish; v1 is
  number-only).

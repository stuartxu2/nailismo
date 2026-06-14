# Measure Thumb Derivation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop measuring the thumb (it lies edge-on in a flat top-down photo); derive its width from the middle finger as a display-only value while the four camera-facing nails alone decide the set size.

**Architecture:** A shared `deriveThumbMm` helper lives in the `@nailismo/fit-sizing` domain package and is mirrored into the Swift `FitSizing` port. Detection (web prompt + iOS Vision) stops returning the thumb. Both clients build the review overlay from four nails, size from those four, then back-fill the derived thumb purely for display.

**Tech Stack:** TypeScript + Vitest (`packages/fit-sizing`), Next.js route handler (`apps/web`), SwiftUI (`apps/ios`), Expo/React Native (`apps/app`).

**Spec:** `docs/superpowers/specs/2026-06-14-measure-thumb-derivation-design.md`

---

## File Structure

- `packages/fit-sizing/src/index.ts` — add `MEASURED_FINGERS`, thumb offset constants, `deriveThumbMm`. **Source of truth.** (Task 1)
- `packages/fit-sizing/src/index.test.ts` — unit tests for the above. (Task 1)
- `apps/web/app/api/scan/route.ts` — prompt asks for four nails; `normalize` drops any thumb. (Task 2)
- `apps/ios/Nailismo/Core/VisionScanProvider.swift` — remove thumb joint. (Task 3)
- `apps/ios/Nailismo/Core/FitSizing.swift` — mirror the TS additions. (Task 4)
- `apps/ios/Nailismo/Features/Measure/MeasureView.swift` — overlay/live/confirm/result/copy. (Task 5)
- `apps/app/src/app/(tabs)/measure.tsx` — review/manual/confirm/result/copy. (Task 6)
- Final verification across all packages. (Task 7)

Order matters: Task 1 (TS domain) and Task 4 (Swift port) define the helpers the client tasks call. Do Task 1 before Task 6; Task 4 before Task 5.

---

### Task 1: `fit-sizing` — `deriveThumbMm` + measured-fingers constant

**Files:**
- Modify: `packages/fit-sizing/src/index.ts`
- Test: `packages/fit-sizing/src/index.test.ts`

- [ ] **Step 1: Write the failing tests**

Add these imports to the existing import block at the top of `packages/fit-sizing/src/index.test.ts` (extend the destructured list — do not duplicate the `import`):

```ts
  deriveThumbMm,
  MEASURED_FINGERS,
  THUMB_OFFSET_FROM_MIDDLE_MM,
  THUMB_OFFSET_FROM_INDEX_MM,
```

Append these `describe` blocks to the end of `packages/fit-sizing/src/index.test.ts`:

```ts
describe("MEASURED_FINGERS", () => {
  it("is the four camera-facing nails, excluding the thumb", () => {
    expect(MEASURED_FINGERS).toEqual(["index", "middle", "ring", "pinky"]);
    expect(MEASURED_FINGERS).not.toContain("thumb");
  });
});

describe("deriveThumbMm", () => {
  it("estimates the thumb from the middle finger (+3mm)", () => {
    expect(deriveThumbMm({ middle: 12 })).toBe(15);
  });

  it("falls back to the index finger (+4mm) when middle is absent", () => {
    expect(deriveThumbMm({ index: 11 })).toBe(15);
  });

  it("prefers the middle finger when both are present", () => {
    expect(deriveThumbMm({ middle: 12, index: 99 })).toBe(15);
  });

  it("returns null when neither middle nor index is measured", () => {
    expect(deriveThumbMm({ ring: 11, pinky: 8 })).toBeNull();
    expect(deriveThumbMm({})).toBeNull();
  });

  it("clamps the derived value into the caliper range", () => {
    expect(deriveThumbMm({ middle: 19 })).toBe(MAX_MM); // 19+3=22 -> 20
  });

  it("uses the exact, constant chart offsets it estimates from", () => {
    for (const size of SET_SIZES) {
      expect(SIZE_CHART.thumb[size] - SIZE_CHART.middle[size]).toBe(
        THUMB_OFFSET_FROM_MIDDLE_MM,
      );
      expect(SIZE_CHART.thumb[size] - SIZE_CHART.index[size]).toBe(
        THUMB_OFFSET_FROM_INDEX_MM,
      );
    }
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @nailismo/fit-sizing test`
Expected: FAIL — `deriveThumbMm`/`MEASURED_FINGERS`/`THUMB_OFFSET_FROM_MIDDLE_MM`/`THUMB_OFFSET_FROM_INDEX_MM` are not exported.

- [ ] **Step 3: Implement the helper**

In `packages/fit-sizing/src/index.ts`, immediately AFTER the `FINGERS` / `FingerKey` declaration (lines 16-18), add:

```ts
/**
 * The four nails the top-down camera can actually measure. The thumb is
 * excluded: with the hand flat palm-down its nail plane sits ~90° to these
 * four, so a straight-down photo only ever sees the thumb nail edge-on and its
 * width is unrecoverable. The thumb is derived from a sibling instead.
 */
export const MEASURED_FINGERS = ["index", "middle", "ring", "pinky"] as const;

/**
 * Chart offsets used to estimate the thumb. The printed chart is exact and
 * constant: thumb = middle + 3mm and thumb = index + 4mm at every size.
 */
export const THUMB_OFFSET_FROM_MIDDLE_MM = 3;
export const THUMB_OFFSET_FROM_INDEX_MM = 4;
```

Then add `deriveThumbMm` immediately AFTER `clampMm` (after line 61):

```ts
/**
 * Estimate the thumb's nail-bed width (mm) from a measured sibling finger.
 * Prefers the middle finger (+3mm), falls back to the index (+4mm), and returns
 * null when neither is available. The result is clamped to the caliper range.
 *
 * Display-only: the derived thumb is shown to the user but must NOT be fed into
 * `sizeFromMeasurements` — it carries no independent information and would only
 * re-weight the middle finger's vote.
 */
export function deriveThumbMm(
  fingerMm: Partial<Record<FingerKey, number>>,
): number | null {
  if (typeof fingerMm.middle === "number") {
    return clampMm(fingerMm.middle + THUMB_OFFSET_FROM_MIDDLE_MM);
  }
  if (typeof fingerMm.index === "number") {
    return clampMm(fingerMm.index + THUMB_OFFSET_FROM_INDEX_MM);
  }
  return null;
}
```

Update the `sizeFromMeasurements` doc comment (line 80-85) — append a sentence:

```
 * stretched. Returns null until at least one nail is measured. Callers pass only
 * the measured fingers; the thumb is derived for display and never votes here.
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @nailismo/fit-sizing test`
Expected: PASS — all suites green, including the new `deriveThumbMm` and `MEASURED_FINGERS` blocks.

- [ ] **Step 5: Commit**

```bash
git add packages/fit-sizing/src/index.ts packages/fit-sizing/src/index.test.ts
git commit -m "feat(fit-sizing): derive thumb width from a sibling finger

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Web detection — stop requesting the thumb

**Files:**
- Modify: `apps/web/app/api/scan/route.ts`

- [ ] **Step 1: Replace the system prompt**

In `apps/web/app/api/scan/route.ts`, replace the entire `SYSTEM_PROMPT` constant (lines 40-52) with:

```ts
const SYSTEM_PROMPT = `You are a precise computer-vision measuring tool for a press-on nail store.
The image shows ONE human hand lying flat, palm down, fingers spread, photographed from directly above, with a standard ID-1 / bank card (85.6mm long edge) lying flat on the SAME surface next to the hand.

Return ONLY a JSON object. All coordinates are normalized to the image: x runs 0 (left) to 1 (right), y runs 0 (top) to 1 (bottom). Use decimals.

Find:
1. The reference card. Give the two endpoints "a" and "b" of ONE LONG edge (the 85.6mm side). Choose the long edge that is clearest and least occluded.
2. FOUR fingernails: index, middle, ring, and pinky. Do NOT measure the thumb — in a flat top-down photo the thumb nail faces sideways (edge-on) and its width cannot be read; it is estimated separately. For each of the four, give endpoints "a" and "b" of the nail's WIDTH — the widest span across the nail bed, perpendicular to the finger. This is the WIDTH, not the length. Include a "confidence" between 0 and 1.

Respond with exactly this shape:
{"found":true,"card":{"a":[x,y],"b":[x,y]},"nails":[{"finger":"index","a":[x,y],"b":[x,y],"confidence":0.9},{"finger":"middle","a":[x,y],"b":[x,y],"confidence":0.9},{"finger":"ring","a":[x,y],"b":[x,y],"confidence":0.9},{"finger":"pinky","a":[x,y],"b":[x,y],"confidence":0.9}]}

If you cannot clearly find both the card and at least three of the four fingernails, return {"found":false}. Output JSON only — no prose, no code fences.`;
```

- [ ] **Step 2: Drop any thumb from `normalize` (safety net)**

In the `normalize` function, find the loop body (around lines 94-95):

```ts
      const finger = rec.finger as FingerKey;
      if (!FINGERS.includes(finger)) continue;
```

Replace with:

```ts
      const finger = rec.finger as FingerKey;
      if (!FINGERS.includes(finger)) continue;
      if (finger === "thumb") continue; // thumb is derived client-side, never measured
```

- [ ] **Step 3: Typecheck the web app**

Run: `pnpm --filter web exec tsc --noEmit`
(If the filter name errors, run from the app dir: `cd apps/web && pnpm exec tsc --noEmit`)
Expected: PASS — no type errors. The `nails.length < 3` gate in `normalize` is unchanged and remains valid for four fingers.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/api/scan/route.ts
git commit -m "feat(scan): detection requests four nails, never the thumb

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: iOS Vision — drop the thumb joint

**Files:**
- Modify: `apps/ios/Nailismo/Core/VisionScanProvider.swift`

- [ ] **Step 1: Remove the thumb from the joint list**

In `apps/ios/Nailismo/Core/VisionScanProvider.swift`, in the `joints` array (lines 73-79), delete the thumb line so it reads:

```swift
    private static let joints: [Joint] = [
        .init(tip: .indexTip, base: .indexDIP, finger: "index"),
        .init(tip: .middleTip, base: .middleDIP, finger: "middle"),
        .init(tip: .ringTip, base: .ringDIP, finger: "ring"),
        .init(tip: .littleTip, base: .littleDIP, finger: "pinky"),
    ]
```

The `found` gate `card != nil && nails.count >= 3` (line 40) is unchanged — three of four is still a valid bar.

- [ ] **Step 2: Verify it compiles**

Run: build the iOS app (Task 7 builds everything; for a quick check open `apps/ios` in Xcode and ⌘B, or run the xcodebuild command from Task 7 Step 2).
Expected: compiles; the on-device scan now returns at most four nails.

- [ ] **Step 3: Commit**

```bash
git add apps/ios/Nailismo/Core/VisionScanProvider.swift
git commit -m "feat(ios): Vision scan skips the thumb joint

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Swift `FitSizing` — mirror `deriveThumbMm`

**Files:**
- Modify: `apps/ios/Nailismo/Core/FitSizing.swift`

- [ ] **Step 1: Add the constants and helper**

In `apps/ios/Nailismo/Core/FitSizing.swift`, add after the `setSizes` line (line 8):

```swift
    /// The four nails the top-down camera can actually measure (thumb excluded —
    /// it lies edge-on in a flat photo and is derived from a sibling instead).
    static let measuredFingers = ["index", "middle", "ring", "pinky"]

    /// Exact, constant chart offsets used to estimate the thumb.
    static let thumbOffsetFromMiddleMM: Double = 3
    static let thumbOffsetFromIndexMM: Double = 4
```

Add this method after `clampMm` (after line 31):

```swift
    /// Estimate the thumb's width (mm) from a measured sibling finger. Prefers
    /// the middle (+3mm), falls back to the index (+4mm), nil if neither.
    /// Clamped. Display-only — must NOT be passed into sizeFromMeasurements.
    static func deriveThumbMm(_ fingerMm: [String: Double]) -> Double? {
        if let m = fingerMm["middle"] { return clampMm(m + thumbOffsetFromMiddleMM) }
        if let i = fingerMm["index"] { return clampMm(i + thumbOffsetFromIndexMM) }
        return nil
    }
```

- [ ] **Step 2: Verify it compiles** (covered by the build in Task 7 Step 2, or ⌘B in Xcode now).

- [ ] **Step 3: Commit**

```bash
git add apps/ios/Nailismo/Core/FitSizing.swift
git commit -m "feat(ios): port deriveThumbMm into FitSizing

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: iOS MeasureView — overlay four nails, derive thumb, label it

**Files:**
- Modify: `apps/ios/Nailismo/Features/Measure/MeasureView.swift`

- [ ] **Step 1: Stop drawing a thumb caliper**

In `buildSegments` (lines 283-304), change the missing-finger loop from `FitSizing.fingers` to `FitSizing.measuredFingers`, and guard the detected loop against a stray thumb. The two loops become:

```swift
        let present = Set((result.nails ?? []).map(\.finger))
        for n in result.nails ?? [] where FitSizing.measuredFingers.contains(n.finger) {
            segs.append(ScanSegment(id: n.finger, label: FitSizing.fingerLabels[n.finger] ?? n.finger,
                                    color: Candy.accent, a: point(n.a, box), b: point(n.b, box),
                                    dim: (n.confidence ?? 1) < 0.5))
        }
        var i = 0
        for f in FitSizing.measuredFingers where !present.contains(f) {
            let y = 0.32 + Double(i) * 0.09
            segs.append(ScanSegment(id: f, label: FitSizing.fingerLabels[f] ?? f, color: Candy.accent,
                                    a: CGPoint(x: box.width * 0.42, y: box.height * y),
                                    b: CGPoint(x: box.width * 0.58, y: box.height * y), dim: true))
            i += 1
        }
```

In `defaultSegments` (manual fallback, lines 274-279), change `for (i, f) in FitSizing.fingers.enumerated()` to `for (i, f) in FitSizing.measuredFingers.enumerated()`.

- [ ] **Step 2: Derive the thumb in `liveMeasurement` (after sizing)**

Replace `liveMeasurement` (lines 306-316) with:

```swift
    private func liveMeasurement() -> (mm: [String: Double], size: String?) {
        guard let card = segments.first(where: { $0.id == "card" }) else { return ([:], nil) }
        let cardPx = Double(distance(card.a, card.b))
        guard cardPx > 0 else { return ([:], nil) }
        let factor = FitSizing.pxPerMm(cardPx)
        var mm: [String: Double] = [:]
        for s in segments where s.id != "card" {
            mm[s.id] = FitSizing.clampMm(FitSizing.pxToMm(Double(distance(s.a, s.b)), factor: factor))
        }
        // Size from the four measured fingers ONLY, then back-fill the derived
        // thumb for display so it never sways the recommendation.
        let size = FitSizing.sizeFromMeasurements(mm)
        if let thumb = FitSizing.deriveThumbMm(mm) { mm["thumb"] = thumb }
        return (mm, size)
    }
```

`confirm` (lines 318-325) is unchanged — it already persists `live.mm` (now including the derived thumb) and gates on `live.size`.

- [ ] **Step 3: Tag the thumb row "est." + add a trust note**

In the `result` view, replace the per-finger `ForEach` (lines 198-206) with:

```swift
                    ForEach(FitSizing.fingers, id: \.self) { f in
                        HStack {
                            Text(FitSizing.fingerLabels[f] ?? f)
                                .font(.bodyFont(14, .semibold)).foregroundStyle(Candy.subtle)
                            if f == "thumb" {
                                Text("est.")
                                    .font(.bodyFont(10, .bold)).foregroundStyle(Candy.onPop)
                                    .padding(.horizontal, 6).padding(.vertical, 2)
                                    .background(Candy.accent, in: Capsule())
                            }
                            Spacer()
                            Text(fit.fingerMm[f].map { String(format: "%.1f mm", $0) } ?? "—")
                                .font(.bodyFont(14, .bold)).foregroundStyle(Candy.ink)
                        }
                    }
```

Immediately AFTER the finger-list card's `.candyShadow()` (line 211), add the trust note:

```swift
                Text("Thumb estimated from your middle finger — it lies edge-on in a flat photo, so we read your other four nails and size from those.")
                    .font(.bodyFont(12)).foregroundStyle(Candy.subtle).lineSpacing(2)
```

- [ ] **Step 4: Update the intro copy**

In `MeasureView.swift`, in the `scanSteps` array (lines 9-16) replace the last line:

```swift
    "Make sure all five nails are visible and not in shadow.",
```

with:

```swift
    "Keep your four fingers' nails visible and not in shadow.",
```

In the `intro` view, replace the body `Text` (line 79) with:

```swift
                    Text("Lay a hand flat beside any bank card (exactly 85.6 mm wide) and shoot from above. We read your four fingers, estimate the thumb, and read your set size.")
```

- [ ] **Step 5: Verify it compiles** (Task 7 Step 2 build, or ⌘B now).

- [ ] **Step 6: Commit**

```bash
git add apps/ios/Nailismo/Features/Measure/MeasureView.swift
git commit -m "feat(ios): Measure overlay reads four nails, estimates the thumb

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: RN MeasureScreen — four-nail review/manual, derive thumb, label it

**Files:**
- Modify: `apps/app/src/app/(tabs)/measure.tsx`

- [ ] **Step 1: Import the new domain symbols**

In the `@nailismo/fit-sizing` import block (lines 26-33), add `MEASURED_FINGERS` and `deriveThumbMm`:

```ts
import {
  FINGERS,
  MEASURED_FINGERS,
  clampMm,
  pxToMm,
  pxPerMm,
  sizeFromMeasurements,
  deriveThumbMm,
  type FingerKey,
} from "@nailismo/fit-sizing";
```

- [ ] **Step 2: Skip the thumb when building review segments**

In `enterReview`, guard the detected-nail loop and change the missing-finger loop to `MEASURED_FINGERS`. The detected loop header (line 155) becomes:

```ts
    for (const n of detection.nails) {
      if (n.finger === "thumb") continue; // thumb is derived, never measured
```

The missing-finger loop header (line 170) becomes:

```ts
    for (const f of MEASURED_FINGERS) {
```

- [ ] **Step 3: Derive the thumb on confirm**

Replace `confirmReview` (lines 247-258) with:

```ts
  function confirmReview() {
    const cardPx = segPxMap.card;
    if (!cardPx || cardPx <= 0) return;
    const f = pxPerMm(cardPx);
    setCardPxWidth(cardPx);
    const measured: Partial<Record<FingerKey, number>> = {};
    for (const seg of reviewSegments) {
      if (seg.id === "card") continue;
      const px = segPxMap[seg.id] ?? 0;
      if (px > 0) measured[seg.id as FingerKey] = clampMm(pxToMm(px, f));
    }
    for (const [finger, mm] of Object.entries(measured)) {
      setFingerMm(finger as FingerKey, mm);
    }
    const thumb = deriveThumbMm(measured); // display-only, does not vote
    if (thumb != null) setFingerMm("thumb", thumb);
    setPhase("result");
  }
```

(The review `liveMm`/`liveSize` block at lines 344-353 needs no change: thumb is no longer a segment, so it is absent from `liveMm` and never votes.)

- [ ] **Step 4: Make the manual fallback a four-nail loop that derives the thumb**

In the `nail` phase block, replace the top three lines (lines 425-427):

```ts
    const finger = FINGERS[nailIndex];
    const mm = factor ? clampMm(pxToMm(livePx, factor)) : 0;
    const last = nailIndex === FINGERS.length - 1;
```

with:

```ts
    const finger = MEASURED_FINGERS[nailIndex];
    const mm = factor ? clampMm(pxToMm(livePx, factor)) : 0;
    const last = nailIndex === MEASURED_FINGERS.length - 1;
```

Update the Eyebrow text (line 432) from `nail ${nailIndex + 1} of 5` to:

```ts
            <Eyebrow>{`step 2 · nail ${nailIndex + 1} of 4`}</Eyebrow>
```

Replace the "See my size" button `onPress` (lines 452-457) with one that derives the thumb after the last finger:

```ts
            onPress={() => {
              const measuredMm = factor ? clampMm(pxToMm(livePx, factor)) : 0;
              if (factor) setFingerMm(finger, measuredMm);
              setLivePx(0);
              if (last) {
                const full = { ...fingerMm, [finger]: measuredMm };
                const thumb = deriveThumbMm(full); // display-only, does not vote
                if (thumb != null) setFingerMm("thumb", thumb);
                setPhase("result");
              } else {
                setNailIndex((n) => n + 1);
              }
            }}
```

- [ ] **Step 5: Tag the thumb row "est." + add a trust note in the result**

In the `result` view, replace the finger-list `FINGERS.map(...)` block (lines 476-485) with:

```tsx
            {FINGERS.map((f) => (
              <View key={f} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ fontFamily: font.bodyMd, fontSize: 14, color: colors.subtle, textTransform: "capitalize" }}>
                    {FINGER_LABELS[f]}
                  </Text>
                  {f === "thumb" ? (
                    <Text style={{ fontFamily: font.bodyBold, fontSize: 10, color: colors.onPop, backgroundColor: colors.accent, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 1, overflow: "hidden" }}>
                      est.
                    </Text>
                  ) : null}
                </View>
                <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: colors.ink }}>
                  {typeof fingerMm[f] === "number" ? `${fingerMm[f]!.toFixed(1)} mm` : "—"}
                </Text>
              </View>
            ))}
```

Immediately AFTER the closing `</Card>` of that finger list (line 486), add the trust note:

```tsx
          <Text style={{ fontFamily: font.body, fontSize: 12.5, lineHeight: 18, color: colors.subtle }}>
            Thumb estimated from your middle finger — it lies edge-on in a flat photo, so we read your other four nails and size from those.
          </Text>
```

- [ ] **Step 6: Update the intro copy**

In `STEPS` (lines 47-54) replace the last entry:

```ts
  "Make sure all five nails are visible and not in shadow.",
```

with:

```ts
  "Keep your four fingers' nails visible and not in shadow.",
```

Replace the intro body `Text` (lines 271-274) content with:

```tsx
              <Text style={{ fontFamily: font.body, fontSize: 15, lineHeight: 23, color: colors.subtle }}>
                Lay a hand flat beside any bank card (exactly 85.6&nbsp;mm wide) and shoot from
                above. We read your four fingers, estimate the thumb, and read your set size.
              </Text>
```

- [ ] **Step 7: Typecheck the RN app**

Run: `pnpm --filter app exec tsc --noEmit`
(If the filter name errors: `cd apps/app && pnpm exec tsc --noEmit`)
Expected: PASS — no type errors.

- [ ] **Step 8: Commit**

```bash
git add apps/app/src/app/\(tabs\)/measure.tsx
git commit -m "feat(app): Measure reads four nails, estimates the thumb

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Full verification + manual QA handoff

**Files:** none (verification only)

- [ ] **Step 1: Run the domain test suite**

Run: `pnpm --filter @nailismo/fit-sizing test`
Expected: PASS — all suites, including `deriveThumbMm` and `MEASURED_FINGERS`.

- [ ] **Step 2: Build / typecheck the three apps**

Run:
```bash
pnpm --filter web exec tsc --noEmit
pnpm --filter app exec tsc --noEmit
xcodebuild build -project apps/ios/Nailismo.xcodeproj -scheme Nailismo \
  -destination 'platform=iOS Simulator,name=iPhone 16' -quiet
```
(If the iOS scheme/project path differs, open `apps/ios` in Xcode and ⌘B instead.)
Expected: web + RN typecheck clean; iOS builds with no errors.

- [ ] **Step 3: Manual QA (user-driven — no automated screenshots)**

Provide the user the running web dev URL (`pnpm --filter web dev`) and/or the iOS build, and ask them to:
  1. Run a top-down hand+card photo through Measure.
  2. Confirm the review overlay shows the card + four nail calipers and **no** thumb caliper.
  3. Confirm the result card lists all five fingers, the thumb tagged **est.**, with a sane derived value (≈ middle + 3 mm), and the recommended size reads off the four measured nails.
  4. Confirm the manual fallback runs "nail 1–4 of 4" then lands on the result with a derived thumb.

- [ ] **Step 4: Final commit (only if Steps 1-2 required fixups)**

```bash
git add -A
git commit -m "chore(measure): verification fixups for thumb derivation

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Notes for the implementer

- **The thumb never votes.** In every flow, size is computed from the measured fingers *before* the derived thumb is added back to the map. Do not pass a map containing the derived thumb into `sizeFromMeasurements`.
- **`apps/app` is the Android client** but shares `@nailismo/fit-sizing`; keep it in parity with iOS.
- **No automated screenshot loop** — visual QA is the user's manual pass (standing project rule).
- Read `apps/web/AGENTS.md` and `apps/app/AGENTS.md` before editing those apps (pinned framework-version docs).

# Customize Style Axes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 5 optional style axes (Finish, Feel, Occasion, Detail, Interpretation) to the Customize studio and realign the nail-shape roster to 2026 mainstream demand, on both web and iOS, with zero regression when axes are left at their defaults.

**Architecture:** The 5 axes flow as lowercase string values: intake UI → `/api/customize/upload` → `CustomizeSession` → `generation.ts` → `buildPrompts`. In `prompts.ts` the canonical slot-0 prompt is refactored into composable segments: Finish/Feel/Occasion append clauses; Detail and Interpretation *replace* a segment whose default value reproduces today's wording byte-for-byte. Slots 1 (hand) and 2 (package) are untouched — they anchor on slot 0's output image and copy it "EXACTLY", so style carries through automatically.

**Tech Stack:** TypeScript / Next.js (apps/web), Vitest, SwiftUI (apps/ios), XcodeGen + xcodebuild.

---

## File Structure

**Web (apps/web):**
- `lib/customize/prompts.ts` — MODIFY: extend `PromptInput`, add clause/segment maps + helpers, refactor slot-0 assembly. (Task 1)
- `lib/customize/prompts.test.ts` — MODIFY: add a `buildPrompts style axes` describe block. (Task 1)
- `lib/customize/types.ts` — MODIFY: add 5 optional fields to `CustomizeSession`. (Task 2)
- `app/api/customize/upload/route.ts` — MODIFY: read + persist the 5 fields. (Task 2)
- `lib/customize/generation.ts` — MODIFY: pass the 5 session fields into `buildPrompts`. (Task 3)
- `app/customize/CustomizeStudio.tsx` — MODIFY: new `SHAPES`, 5 axis chip rows, 5 body fields. (Task 4)

**iOS (apps/ios):**
- `Nailismo/Features/Customize/CustomizeIntakeView.swift` — MODIFY: new shapes, 5 axis chip rows, horizontal-scroll chips, style dict. (Task 5)
- `Nailismo/Stores/CustomizeStore.swift` — MODIFY: `beginPayment` gains `style`. (Task 5)
- `Nailismo/Core/CustomizeClient.swift` — MODIFY: protocol + live `upload` gain `style`. (Task 5)
- `NailismoTests/CustomizeStoreTests.swift` — MODIFY: stub `upload` signature + any `beginPayment` call sites. (Task 5)

Tasks are ordered so each leaves the tree compiling: Task 1 is self-contained (default output unchanged); Tasks 2–3 widen the pipe without UI; Task 4 lights up web; Task 5 brings iOS to parity.

---

### Task 1: Refactor `prompts.ts` into composable, axis-aware segments

**Files:**
- Modify: `apps/web/lib/customize/prompts.ts`
- Test: `apps/web/lib/customize/prompts.test.ts`

- [ ] **Step 1: Add the failing tests**

Append this describe block to the end of `apps/web/lib/customize/prompts.test.ts`:

```ts
describe("buildPrompts style axes", () => {
  const input = { referenceDescriptor: "warm coral gradient, palm motifs, tropical mood" };

  it("emits no style clauses by default (regression: matches today)", () => {
    const flatlay = buildPrompts(input)[0].prompt;
    expect(flatlay).toMatch(/slightly abstract/);
    expect(flatlay).toContain("accents on 2-4 nails");
    expect(flatlay).not.toMatch(/Finish:/);
    expect(flatlay).not.toMatch(/Lean masculine|Lean feminine/);
    expect(flatlay).not.toMatch(/daytime mood|night mood/i);
  });

  it("injects the finish clause when set", () => {
    expect(buildPrompts({ ...input, finish: "matte" })[0].prompt).toContain("flat matte finish");
    expect(buildPrompts({ ...input, finish: "Glass" })[0].prompt).toContain("jelly/glass finish");
  });

  it("injects feel and occasion clauses when set", () => {
    expect(buildPrompts({ ...input, feel: "masculine" })[0].prompt).toMatch(/Lean masculine/);
    expect(buildPrompts({ ...input, occasion: "nightlife" })[0].prompt).toMatch(/night mood/i);
  });

  it("detail replaces the embellishment segment", () => {
    const minimal = buildPrompts({ ...input, detail: "minimal" })[0].prompt;
    expect(minimal).toContain("paint only");
    expect(minimal).not.toContain("rhinestones");
    expect(buildPrompts({ ...input, detail: "loaded" })[0].prompt).toMatch(/maximally/i);
  });

  it("interpretation replaces the abstract segment", () => {
    const literal = buildPrompts({ ...input, interpretation: "literal" })[0].prompt;
    expect(literal).toContain("faithful reproduction");
    expect(literal).not.toMatch(/slightly abstract/);
  });

  it("never leaks style steering into the derived views", () => {
    const [, hand, pkg] = buildPrompts({ ...input, finish: "matte", feel: "masculine", detail: "loaded" });
    expect(hand.prompt).not.toMatch(/Finish:|Lean masculine|maximally/i);
    expect(pkg.prompt).not.toMatch(/Finish:|Lean masculine|maximally/i);
  });

  it("treats unknown/neutral values as the default", () => {
    expect(buildPrompts({ ...input, finish: "any", feel: "neutral" })[0].prompt).not.toMatch(/Finish:/);
    expect(buildPrompts({ ...input, interpretation: "abstract" })[0].prompt).toMatch(/slightly abstract/);
    expect(buildPrompts({ ...input, detail: "balanced" })[0].prompt).toContain("accents on 2-4 nails");
  });
});
```

- [ ] **Step 2: Run the new tests to confirm they fail**

Run: `pnpm --filter web exec vitest run lib/customize/prompts.test.ts`
Expected: FAIL — TypeScript errors that `finish`/`feel`/`occasion`/`detail`/`interpretation` are not in `PromptInput`, and assertions like "flat matte finish" not found.

- [ ] **Step 3: Extend `PromptInput`**

In `apps/web/lib/customize/prompts.ts`, replace the `PromptInput` type:

```ts
export type PromptInput = {
  /** Server-derived palette/motif/mood descriptor of the upload ({REF}). */
  referenceDescriptor: string;
  /** Shape/length pick ({SHAPE}); defaults to "medium almond". */
  shape?: string;
  /** Raw, untrusted user note ({NOTE}). */
  note?: string;
  /** Optional style axes (lowercase keys). Neutral/unknown → today's defaults. */
  finish?: string;
  feel?: string;
  occasion?: string;
  detail?: string;
  interpretation?: string;
};
```

- [ ] **Step 4: Add clause/segment maps + resolver helpers**

In `apps/web/lib/customize/prompts.ts`, immediately after the `const NEGATIVE = ...;` line, add:

```ts
// Style-axis steering. Neutral selections (e.g. "any" / "neutral") are simply
// absent from the *_CLAUSES maps → no clause emitted → output matches today.
const FINISH_CLAUSES: Record<string, string> = {
  glossy: "Finish: high-gloss glassy topcoat with a wet-look shine.",
  matte: "Finish: flat matte finish, no shine, soft velvety surface.",
  glass: "Finish: sheer translucent jelly/glass finish, candy-like see-through layers.",
  chrome: "Finish: mirror chrome metallic finish with reflective foil.",
};
const FEEL_CLAUSES: Record<string, string> = {
  masculine:
    "Lean masculine — muted or darker palette, clean geometric or minimal motifs, restrained embellishment.",
  feminine:
    "Lean feminine — soft pastel or warm palette, floral, heart or bow motifs, dainty embellishment.",
};
const OCCASION_CLAUSES: Record<string, string> = {
  daylight: "Everyday daytime mood — natural, soft, understated tones.",
  nightlife:
    "Going-out night mood — bold and high-shine, metallic or glitter accents, deeper or neon tones.",
};

// Detail + Interpretation REPLACE a segment of the canonical prompt. The default
// key reproduces the current production wording verbatim (regression-locked).
const INTERPRETATION_SEGMENTS: Record<string, string> = {
  abstract:
    "translate it into a simplified, slightly abstract design — bold shapes, clean color blocks " +
    "and loose, organic brushwork a nail artist could realistically paint by hand, not a photographic copy",
  balanced:
    "render a recognizable interpretation — keep the key colors and main motifs of the inspiration " +
    "clearly, stylized for hand-painting",
  literal:
    "render a faithful reproduction — reproduce the inspiration's actual imagery, colors and details " +
    "as closely as a skilled nail artist can hand-paint",
};
const EMBELLISHMENT_SEGMENTS: Record<string, string> = {
  balanced:
    "Build the look from paint plus mixed-media embellishments: a few rhinestones or gems, tiny pearls, " +
    "gold-foil flakes, small charms and little decals/stickers, placed tastefully as accents on 2-4 nails " +
    "with the rest kept simpler.",
  minimal: "Build the look from paint only — no 3D embellishments, clean and understated across all nails.",
  loaded:
    "Build the look maximally — rich 3D embellishment (gems, pearls, charms, gold-foil flakes, " +
    "decals/stickers) across most nails, layered and ornate.",
};

/** Resolve an appended clause; empty string when neutral/unknown. */
function styleClause(map: Record<string, string>, value?: string): string {
  const k = value?.trim().toLowerCase();
  return (k && map[k]) || "";
}
/** Resolve a replaceable segment; falls back to the default key when neutral/unknown. */
function styleSegment(map: Record<string, string>, value: string | undefined, fallbackKey: string): string {
  const k = value?.trim().toLowerCase();
  return (k && map[k]) || map[fallbackKey];
}
```

- [ ] **Step 5: Rebuild the slot-0 (`flatlay`) prompt from segments**

In `apps/web/lib/customize/prompts.ts`, inside `buildPrompts`, replace the entire `const flatlay = ...;` assignment (the slot-0 comment + template literal) with:

```ts
  // slot 0 — canonical, artisan hand-painted design in the brand flat-lay style.
  // Interpretation + embellishment are replaceable segments (defaults = today's
  // wording); finish/feel/occasion append clauses only when non-neutral.
  const interpretationSeg = styleSegment(INTERPRETATION_SEGMENTS, input.interpretation, "abstract");
  const embellishmentSeg = styleSegment(EMBELLISHMENT_SEGMENTS, input.detail, "balanced");
  const styleClauses = [
    styleClause(FINISH_CLAUSES, input.finish),
    styleClause(FEEL_CLAUSES, input.feel),
    styleClause(OCCASION_CLAUSES, input.occasion),
  ]
    .filter(Boolean)
    .map((c) => ` ${c}`)
    .join("");

  const flatlay =
    `Match the styling of the second reference image exactly: a full set of 10 short ${shape} ` +
    `press-on nails graded by size, arranged in the same diagonal flat-lay on a pale blue-grey ` +
    `seamless background, soft even studio lighting, gentle shadows, no hand, photoreal, 2k. ` +
    `Interpret the first reference (${ref}) as an artisan, 100% hand-painted nail-art set: ` +
    `${interpretationSeg}. ${embellishmentSeg}${styleClauses}${note} Keep the layout, ` +
    `background and lighting identical to the second reference; change ONLY the nail art. ${NEGATIVE}`;
```

Leave the `hand` and `pkg` constants and the `return [...]` array exactly as they are.

- [ ] **Step 6: Run the full prompts test file to verify pass**

Run: `pnpm --filter web exec vitest run lib/customize/prompts.test.ts`
Expected: PASS — all existing tests (including the `abstract`/`gems`/`medium almond` ones) plus the 7 new style-axis tests.

- [ ] **Step 7: Commit**

```bash
git add apps/web/lib/customize/prompts.ts apps/web/lib/customize/prompts.test.ts
git commit -m "feat(customize): composable slot-0 prompt with 5 style axes"
```

---

### Task 2: Persist the 5 axis values on the session

**Files:**
- Modify: `apps/web/lib/customize/types.ts`
- Modify: `apps/web/app/api/customize/upload/route.ts`

- [ ] **Step 1: Add the fields to `CustomizeSession`**

In `apps/web/lib/customize/types.ts`, in the `CustomizeSession` type, immediately after the `note?: string;` line, add:

```ts
  /** Optional style axes (lowercase keys); unset/neutral → today's defaults. */
  finish?: string;
  feel?: string;
  occasion?: string;
  detail?: string;
  interpretation?: string;
```

- [ ] **Step 2: Widen the upload request body type**

In `apps/web/app/api/customize/upload/route.ts`, replace the `let body: {...}` declaration with:

```ts
  let body: {
    image?: unknown;
    shape?: unknown;
    note?: unknown;
    email?: unknown;
    finish?: unknown;
    feel?: unknown;
    occasion?: unknown;
    detail?: unknown;
    interpretation?: unknown;
  };
```

- [ ] **Step 3: Persist the axis values**

In `apps/web/app/api/customize/upload/route.ts`, in the `await upsertSession({ ... })` call, add these lines right after `note: asStr(body.note),`:

```ts
    finish: asStr(body.finish),
    feel: asStr(body.feel),
    occasion: asStr(body.occasion),
    detail: asStr(body.detail),
    interpretation: asStr(body.interpretation),
```

(`asStr` already trims and drops empties, so neutral/absent values store as `undefined`.)

- [ ] **Step 4: Verify the web package type-checks + lints**

Run: `pnpm --filter web exec tsc --noEmit && pnpm --filter web lint`
Expected: no errors. (If `tsc` is unavailable, run `pnpm --filter web build` and expect a successful compile.)

- [ ] **Step 5: Commit**

```bash
git add apps/web/lib/customize/types.ts apps/web/app/api/customize/upload/route.ts
git commit -m "feat(customize): persist style axes on the session"
```

---

### Task 3: Pass the axis values into generation

**Files:**
- Modify: `apps/web/lib/customize/generation.ts`

- [ ] **Step 1: Forward the session fields to `buildPrompts`**

In `apps/web/lib/customize/generation.ts`, replace the `const prompts = buildPrompts({ ... });` call (around line 42) with:

```ts
  const prompts = buildPrompts({
    referenceDescriptor: session.referenceDescriptor ?? "",
    shape: session.shape,
    note: session.note,
    finish: session.finish,
    feel: session.feel,
    occasion: session.occasion,
    detail: session.detail,
    interpretation: session.interpretation,
  });
```

- [ ] **Step 2: Verify the web package type-checks**

Run: `pnpm --filter web exec tsc --noEmit`
Expected: no errors. (Fallback: `pnpm --filter web build`.)

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/customize/generation.ts
git commit -m "feat(customize): thread style axes into generation"
```

---

### Task 4: Web studio — new shape roster + 5 axis chip rows

**Files:**
- Modify: `apps/web/app/customize/CustomizeStudio.tsx`

- [ ] **Step 1: Update the shape roster and add axis option constants**

In `apps/web/app/customize/CustomizeStudio.tsx`, replace the `SHAPES` const (line 11) and add the axis consts right below it:

```ts
const SHAPES = ["Almond", "Squoval", "Square", "Oval", "Round", "Coffin"] as const;
const FINISHES = ["Any", "Glossy", "Matte", "Glass", "Chrome"] as const;
const FEELS = ["Neutral", "Masculine", "Feminine"] as const;
const OCCASIONS = ["Any", "Daylight", "Nightlife"] as const;
const DETAILS = ["Balanced", "Minimal", "Loaded"] as const;
const INTERPRETATIONS = ["Abstract", "Balanced", "Literal"] as const;
```

- [ ] **Step 2: Add the axis state**

In `CustomizeStudio`, immediately after the `const [shape, setShape] = ...` line, add:

```ts
  const [finish, setFinish] = useState<(typeof FINISHES)[number]>("Any");
  const [feel, setFeel] = useState<(typeof FEELS)[number]>("Neutral");
  const [occasion, setOccasion] = useState<(typeof OCCASIONS)[number]>("Any");
  const [detail, setDetail] = useState<(typeof DETAILS)[number]>("Balanced");
  const [interpretation, setInterpretation] = useState<(typeof INTERPRETATIONS)[number]>("Abstract");
```

- [ ] **Step 3: Send the axis values in the upload body**

In `startPreview`, replace the upload `body: JSON.stringify({ ... })` (the one posting to `/api/customize/upload`) with:

```ts
        body: JSON.stringify({
          image: preview,
          shape: `${length} ${shape}`,
          note,
          email,
          finish: finish.toLowerCase(),
          feel: feel.toLowerCase(),
          occasion: occasion.toLowerCase(),
          detail: detail.toLowerCase(),
          interpretation: interpretation.toLowerCase(),
        }),
```

- [ ] **Step 4: Render the 5 axis chip rows**

In the JSX, find the Shape block:

```tsx
              <div style={{ marginTop: 18 }}>
                <span className="candy-label">Shape</span>
                <ChipRow options={SHAPES} value={shape} onChange={setShape} />
              </div>
```

Immediately after that closing `</div>`, insert:

```tsx
              <div style={{ marginTop: 18 }}>
                <span className="candy-label">Finish</span>
                <ChipRow options={FINISHES} value={finish} onChange={setFinish} />
              </div>
              <div style={{ marginTop: 18 }}>
                <span className="candy-label">Feel</span>
                <ChipRow options={FEELS} value={feel} onChange={setFeel} />
              </div>
              <div style={{ marginTop: 18 }}>
                <span className="candy-label">Occasion</span>
                <ChipRow options={OCCASIONS} value={occasion} onChange={setOccasion} />
              </div>
              <div style={{ marginTop: 18 }}>
                <span className="candy-label">Detail</span>
                <ChipRow options={DETAILS} value={detail} onChange={setDetail} />
              </div>
              <div style={{ marginTop: 18 }}>
                <span className="candy-label">Interpretation</span>
                <ChipRow options={INTERPRETATIONS} value={interpretation} onChange={setInterpretation} />
              </div>
```

(`ChipRow` is generic over the options' string-literal union, so each `onChange={setX}` is type-correct without changes.)

- [ ] **Step 5: Verify web type-check + lint + build**

Run: `pnpm --filter web exec tsc --noEmit && pnpm --filter web lint`
Expected: no errors. The chips render under Shape; defaults (`Any`/`Neutral`/`Balanced`/`Abstract`) post values that map to no-op clauses server-side.

- [ ] **Step 6: Commit**

```bash
git add apps/web/app/customize/CustomizeStudio.tsx
git commit -m "feat(customize): web studio shape roster + 5 style-axis chips"
```

---

### Task 5: iOS parity — shapes, axis chips, payload

**Files:**
- Modify: `apps/ios/Nailismo/Features/Customize/CustomizeIntakeView.swift`
- Modify: `apps/ios/Nailismo/Stores/CustomizeStore.swift`
- Modify: `apps/ios/Nailismo/Core/CustomizeClient.swift`
- Modify: `apps/ios/NailismoTests/CustomizeStoreTests.swift`

- [ ] **Step 1: Update intake constants (shapes + axes)**

In `CustomizeIntakeView.swift`, replace the `SHAPES` line (line 6) and add the axis arrays:

```swift
private let SHAPES = ["Almond", "Squoval", "Square", "Oval", "Round", "Coffin"]
private let FINISHES = ["Any", "Glossy", "Matte", "Glass", "Chrome"]
private let FEELS = ["Neutral", "Masculine", "Feminine"]
private let OCCASIONS = ["Any", "Daylight", "Nightlife"]
private let DETAILS = ["Balanced", "Minimal", "Loaded"]
private let INTERPRETATIONS = ["Abstract", "Balanced", "Literal"]
```

- [ ] **Step 2: Add axis state**

In `CustomizeIntakeView`, immediately after `@State private var shape = "Almond"`, add:

```swift
    @State private var finish = "Any"
    @State private var feel = "Neutral"
    @State private var occasion = "Any"
    @State private var detail = "Balanced"
    @State private var interpretation = "Abstract"
```

- [ ] **Step 3: Render the axis chip rows**

In `body`, find:

```swift
                chips(title: "Nail length", options: LENGTHS, selection: $length)
                chips(title: "Shape", options: SHAPES, selection: $shape)
```

Replace with:

```swift
                chips(title: "Nail length", options: LENGTHS, selection: $length)
                chips(title: "Shape", options: SHAPES, selection: $shape)
                chips(title: "Finish", options: FINISHES, selection: $finish)
                chips(title: "Feel", options: FEELS, selection: $feel)
                chips(title: "Occasion", options: OCCASIONS, selection: $occasion)
                chips(title: "Detail", options: DETAILS, selection: $detail)
                chips(title: "Interpretation", options: INTERPRETATIONS, selection: $interpretation)
```

- [ ] **Step 4: Make chip rows horizontally scrollable (handles 5–6 chips)**

In `CustomizeIntakeView.swift`, replace the entire `private func chips(...)` body with:

```swift
    private func chips(title: String, options: [String], selection: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Eyebrow(title)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(options, id: \.self) { o in
                        let active = selection.wrappedValue == o
                        Button { selection.wrappedValue = o } label: {
                            Text(o).font(.bodyFont(13, .bold))
                                .foregroundStyle(active ? Candy.onPop : Candy.ink)
                                .padding(.horizontal, 14).padding(.vertical, 9)
                                .background(active ? Candy.pop : Candy.surface, in: Capsule())
                                .overlay(Capsule().stroke(active ? Candy.pop : Candy.border, lineWidth: 1.5))
                        }
                        .buttonStyle(PressableStyle())
                    }
                }
            }
        }
    }
```

- [ ] **Step 5: Pass the style dict to `beginPayment`**

In `CustomizeIntakeView.swift`, replace the `await store.beginPayment(...)` call with:

```swift
                        await store.beginPayment(
                            imageDataURL: dataURL,
                            shape: "\(length) \(shape)",
                            note: note,
                            email: email,
                            style: [
                                "finish": finish.lowercased(),
                                "feel": feel.lowercased(),
                                "occasion": occasion.lowercased(),
                                "detail": detail.lowercased(),
                                "interpretation": interpretation.lowercased(),
                            ]
                        )
```

- [ ] **Step 6: Add `style` to `CustomizeStore.beginPayment`**

In `CustomizeStore.swift`, replace the `beginPayment` signature and its `client.upload(...)` call:

```swift
    func beginPayment(imageDataURL: String, shape: String, note: String?, email: String?, style: [String: String]) async {
        guard phase == .intake else { return }
        phase = .uploading
        errorMessage = nil
        do {
            let up = try await client.upload(imageDataURL: imageDataURL, shape: shape, note: note, email: email, style: style)
```

(Leave the rest of the function body unchanged.)

- [ ] **Step 7: Add `style` to the client protocol + live impl**

In `CustomizeClient.swift`, update the protocol method:

```swift
    func upload(imageDataURL: String, shape: String, note: String?, email: String?, style: [String: String]) async throws -> UploadResp
```

And the live `CustomizeClient.upload`:

```swift
    func upload(imageDataURL: String, shape: String, note: String?, email: String?, style: [String: String]) async throws -> UploadResp {
        var body: [String: Any] = ["image": imageDataURL, "shape": shape]
        if let note, !note.isEmpty { body["note"] = note }
        if let email, !email.isEmpty { body["email"] = email }
        for (k, v) in style where !v.isEmpty { body[k] = v }
        return try await post("\(base)/upload", body: body, timeout: 45)
    }
```

- [ ] **Step 8: Fix the test stub + call sites**

In `NailismoTests/CustomizeStoreTests.swift`, update the `MockClient.upload` stub signature (line 7):

```swift
        func upload(imageDataURL: String, shape: String, note: String?, email: String?, style: [String: String]) async throws -> UploadResp { UploadResp(sessionId: "s1", uploadUrl: nil) }
```

Then find any `beginPayment(` call sites in the test file and add `, style: [:]` as the final argument. Run this to locate them:

```bash
grep -rn "beginPayment(" apps/ios/NailismoTests
```

For each match, ensure the call ends with `style: [:])`.

- [ ] **Step 9: Build iOS + run the store tests**

Regenerate the project and build for an iPhone 17 simulator. Per the project's SPM/sandbox constraint, run on the main thread with the git-config workaround and sandbox disabled:

```bash
cd apps/ios && xcodegen generate
GIT_CONFIG_VALUE_0=all xcodebuild \
  -project Nailismo.xcodeproj -scheme Nailismo \
  -destination 'platform=iOS Simulator,name=iPhone 17' \
  build test
```

Expected: build succeeds; `CustomizeStoreTests` pass. (If `xcodebuild` cannot run in this environment, at minimum confirm `xcodegen generate` succeeds and the Swift changes compile via a `build`-only run.)

- [ ] **Step 10: Commit**

```bash
git add apps/ios/Nailismo/Features/Customize/CustomizeIntakeView.swift \
        apps/ios/Nailismo/Stores/CustomizeStore.swift \
        apps/ios/Nailismo/Core/CustomizeClient.swift \
        apps/ios/NailismoTests/CustomizeStoreTests.swift
git commit -m "feat(customize): iOS parity for shape roster + 5 style axes"
```

---

## Final verification

- [ ] Web: `pnpm --filter web exec vitest run lib/customize/prompts.test.ts` → all green.
- [ ] Web: `pnpm --filter web exec tsc --noEmit && pnpm --filter web lint` → clean.
- [ ] iOS: build + `CustomizeStoreTests` green.
- [ ] Manual sanity (optional, user runs): on `/customize`, leaving every axis at its default produces the same design as before; selecting Matte + Masculine + Literal visibly changes all 3 result views.

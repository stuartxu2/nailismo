# Customize Style Axes — Design

**Date:** 2026-06-15
**Status:** Approved (design), pending implementation plan
**Feature area:** Customize to Order (AI nail-art studio)

## Problem

The Customize studio gives the customer only **nail length**, **shape**, and a **freeform note** to steer their AI-generated design. Every other aesthetic decision is hardcoded in the slot-0 prompt ([`apps/web/lib/customize/prompts.ts`](../../../apps/web/lib/customize/prompts.ts)):

- Every design is forced "simplified, slightly **abstract**" — a faithful/literal reproduction of the inspiration is impossible.
- Every design always gets "paint plus mixed-media embellishments … accents on 2-4 nails" — there is no flat/minimal option.
- **Finish** (glossy/matte/etc.) is only reachable by typing into the freeform note.

We want to promote these baked-in choices to explicit, optional user controls so the customer can dial the *vibe* of the result.

## Goals

- Add 5 style axes as chip-row controls: **Finish, Feel, Occasion, Detail, Interpretation**.
- Each axis is **optional** with a neutral default. When left at the default, the generated output is **identical to today** (no regression).
- The axes flow through the existing pipeline: web/iOS intake → upload route → session → generation → slot-0 prompt.
- Web and iOS reach parity on the new controls.

## Non-goals

- No pricing, Stripe, result-page, or `{REF}` descriptor changes.
- No new persistence layer — sessions are upserted whole; new fields are just additional optional properties.
- No vibe presets, color-story, or cute/edgy axes (considered and cut for simplicity — they overlap the chosen 5).
- The freeform note **stays** (open-ended requests remain possible).

## Axis taxonomy

Each axis is a `ChipRow`. The **first chip is the default and is neutral**: a neutral selection emits **no** steering clause, so slot 0 renders exactly as it does today. For `Detail` and `Interpretation`, the neutral default reproduces the *current hardcoded text*, which is what locks in no-regression.

| Axis | Chips (default first) | Behavior when non-default |
|------|----------------------|---------------------------|
| **Finish** | `Any` · `Glossy` · `Matte` · `Glass/jelly` · `Chrome` | inject a finish clause |
| **Feel** | `Neutral` · `Masculine` · `Feminine` | steer palette + motif + embellishment density |
| **Occasion** | `Any` · `Daylight` · `Nightlife` | steer brightness + sparkle/metallic |
| **Detail** | `Balanced` · `Minimal` · `Loaded` | override embellishment density |
| **Interpretation** | `Abstract` · `Balanced` · `Literal` | override how faithfully the inspiration is reproduced |

### Clause definitions (slot 0 only)

These are the steering strings injected into the canonical design prompt. Exact wording can be refined during implementation, but the *semantics* are fixed here.

**Finish** (appended clause; `Any` → empty):
- Glossy: `high-gloss glassy topcoat with a wet-look shine`
- Matte: `flat matte finish, no shine, soft velvety surface`
- Glass/jelly: `sheer translucent jelly/glass finish, candy-like see-through layers`
- Chrome: `mirror chrome metallic finish with reflective foil`

**Feel** (appended clause; `Neutral` → empty):
- Masculine: `lean masculine — muted or darker palette, clean geometric or minimal motifs, restrained embellishment`
- Feminine: `lean feminine — soft pastel or warm palette, floral / heart / bow motifs, dainty embellishment`

**Occasion** (appended clause; `Any` → empty):
- Daylight: `everyday daytime mood — natural, soft, understated tones`
- Nightlife: `going-out night mood — bold and high-shine, metallic or glitter accents, deeper or neon tones`

**Detail** (replaces the embellishment segment; `Balanced` → current text):
- Balanced (default, = current): `a few rhinestones or gems, tiny pearls, gold-foil flakes, small charms and little decals/stickers, placed tastefully as accents on 2-4 nails with the rest kept simpler`
- Minimal: `paint only, no 3D embellishments — clean and understated across all nails`
- Loaded: `maximalist — rich 3D embellishment (gems, pearls, charms, foil, decals) across most nails, layered and ornate`

**Interpretation** (replaces the interpretation segment; `Abstract` → current text):
- Abstract (default, = current): `translate it into a simplified, slightly abstract design — bold shapes, clean color blocks and loose, organic brushwork a nail artist could realistically paint by hand, not a photographic copy`
- Balanced: `a recognizable interpretation — keep the key colors and main motifs of the inspiration clearly, stylized for hand-painting`
- Literal: `a faithful reproduction — reproduce the inspiration's actual imagery, colors and details as closely as a skilled nail artist can hand-paint`

## Nail shape roster

The existing **Shape** chip row is realigned to 2026 mainstream demand. Web search
(June 2026) confirms almond + **squoval** dominate everyday wear, oval and short round
are rising, and coffin/stiletto are past-peak "performative" long shapes.

- **Current:** Almond · Coffin · Square · Round (missing squoval entirely)
- **New (6):** `Almond` · `Squoval` · `Square` · `Oval` · `Round` · `Coffin` (ordered by demand)
- Adds the two missing mainstream shapes (Squoval, Oval); drops nothing. Stiletto stays out (not mainstream everyday).
- `DEFAULT_SHAPE` stays `"medium almond"` and the studio default selection stays `Medium` + `Almond` — still the #1 shape. **Length** chips (Short/Medium/Long) are unchanged.
- Shape is already a free passthrough token (`{SHAPE}`) in the prompt, so no prompt logic changes — only the `SHAPES` constant on web and the equivalent iOS list.

## Prompt assembly refactor

Today slot 0 (`flatlay`) is one frozen template string. Refactor it into composable segments so axes can override or append:

```
[fixed brand framing: 10 nails, diagonal flat-lay, pale blue-grey bg, studio lighting, {SHAPE}]
[INTERPRETATION segment]   ← default = current abstract text; Balanced/Literal replace
[EMBELLISHMENT segment]    ← default = current "2-4 nails" text; Minimal/Loaded replace
[FINISH clause]            ← empty unless set
[FEEL clause]              ← empty unless set
[OCCASION clause]          ← empty unless set
{NOTE}                     ← unchanged
NEGATIVE                   ← unchanged
```

Clause maps (`Record<value, string>`) live next to `buildPrompts`. Unknown / missing values resolve to the neutral default.

**Slots 1 (`hand`) and 2 (`package`) are not modified.** They anchor on slot 0's *output image* (`base: "design"`) and instruct "reproduce EXACTLY like the reference image," so finish / feel / detail / interpretation all carry through visually without any text change.

## Data flow & plumbing

1. **`PromptInput`** ([prompts.ts](../../../apps/web/lib/customize/prompts.ts)) gains 5 optional fields: `finish?`, `feel?`, `occasion?`, `detail?`, `interpretation?`.
2. **`CustomizeSession`** ([types.ts](../../../apps/web/lib/customize/types.ts)) gains the same 5 optional fields.
3. **Upload route** ([upload/route.ts](../../../apps/web/app/api/customize/upload/route.ts)) reads them from the body and persists via the existing `asStr` pattern (same as `shape` / `note`).
4. **Generation** ([generation.ts](../../../apps/web/lib/customize/generation.ts) `buildPrompts` call ~L42) passes the session fields through.
5. **Web studio** ([CustomizeStudio.tsx](../../../apps/web/app/customize/CustomizeStudio.tsx)) updates the `SHAPES` constant to the new 6-shape roster, adds 5 `ChipRow`s under Shape (always visible) with state, and includes all values in the upload request body. Freeform note unchanged.
6. **iOS intake** ([CustomizeIntakeView.swift](../../../apps/ios/Nailismo/Features/Customize/CustomizeIntakeView.swift)) updates its shape list to match, adds the 5 axis chip rows, and includes the fields in its upload payload, for parity.

## Validation & safety

- Axis values are constrained to their enum server-side; an unknown or absent value is treated as the **neutral default** (fails safe, never errors).
- These are bounded enums, not free text — they add **no prompt-injection surface** (unlike the freeform note, which keeps its existing `sanitizeNote` defense).

## Testing

[prompts.test.ts](../../../apps/web/lib/customize/prompts.test.ts):
- For each axis: the clause/segment is present when the axis is set, and absent (or equal to the current default text) when neutral.
- **Regression lock:** with all axes at default (or unset), slot 0 equals the current production string.
- Slots 1 and 2 are byte-identical regardless of axis values.
- Unknown axis values fall back to neutral.

Web component and iOS build are covered by existing harnesses; no new E2E required.

## Success criteria

- A customer can pick any combination of the 5 axes (or none) in both web and iOS.
- Default selections reproduce today's output exactly (test-enforced).
- Non-default selections measurably change slot 0's prompt and therefore the generated design; the change carries into the hand and package views.

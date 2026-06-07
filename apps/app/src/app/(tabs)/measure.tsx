import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";

import { Button, Card, Eyebrow } from "@/components/ui";
import { ProductCard } from "@/components/product-card";
import { MeasureCanvas } from "@/components/measure-canvas";
import { ScanOverlay, type SegmentInit } from "@/components/scan-overlay";
import { processImage, detectHand, toDisplay, segPx, type Detection } from "@/lib/scan";
import {
  storefrontFetch,
  PRODUCTS_QUERY,
  type ProductsQueryResult,
  type ShopifyProduct,
} from "@/lib/shopify";
import {
  FINGERS,
  clampMm,
  pxToMm,
  pxPerMm,
  sizeFromMeasurements,
  type FingerKey,
} from "@nailismo/fit-sizing";
import { useFit } from "@/store/fit";
import { colors, font } from "@/theme";

const { width, height } = Dimensions.get("window");

const FINGER_LABELS: Record<FingerKey, string> = {
  thumb: "thumb",
  index: "index finger",
  middle: "middle finger",
  ring: "ring finger",
  pinky: "pinky",
};

const STEPS = [
  "Lay your hand flat on a table.",
  "Put any standard-size card next to your hand.",
  "Use the blank back, a gift card, or cover any private numbers.",
  "Keep the card and hand on the same flat surface.",
  "Shoot straight down, from directly above.",
  "Make sure all five nails are visible and not in shadow.",
];

type Photo = { uri: string; w: number; h: number };
type Phase = "intro" | "capture" | "detecting" | "review" | "calibrate" | "nail" | "result";

function fitBox(photo: Photo) {
  const maxW = width - 32;
  const maxH = height * 0.58;
  const ar = photo.w / photo.h;
  let bw = maxW;
  let bh = bw / ar;
  if (bh > maxH) {
    bh = maxH;
    bw = bh * ar;
  }
  return { bw, bh };
}

export default function MeasureScreen() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [permission, requestPermission] = useCameraPermissions();
  const camRef = useRef<CameraView>(null);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Auto-scan review state.
  const [reviewSegments, setReviewSegments] = useState<SegmentInit[]>([]);
  const [segPxMap, setSegPxMap] = useState<Record<string, number>>({});

  // Manual fallback state.
  const [nailIndex, setNailIndex] = useState(0);
  const [livePx, setLivePx] = useState(0);

  // Sets to recommend once a size is known (shown on the result screen).
  const [recs, setRecs] = useState<ShopifyProduct[]>([]);

  const setCardPxWidth = useFit((s) => s.setCardPxWidth);
  const setFingerMm = useFit((s) => s.setFingerMm);
  const factor = useFit((s) => s.factor)();
  const size = useFit((s) => s.size)();
  const fingerMm = useFit((s) => s.fingerMm);
  const reset = useFit((s) => s.reset);

  const onSeg = useCallback((id: string, px: number) => {
    setSegPxMap((m) => (m[id] === px ? m : { ...m, [id]: px }));
  }, []);

  // Load a few in-stock sets to recommend once the user reaches their result.
  useEffect(() => {
    if (phase !== "result" || recs.length) return;
    let alive = true;
    (async () => {
      try {
        const data = await storefrontFetch<ProductsQueryResult>(
          PRODUCTS_QUERY,
          { first: 12 },
          { revalidate: 0 },
        );
        const inStock = data.products.nodes.filter((p) =>
          p.variants?.nodes.some((v) => v.availableForSale),
        );
        const pick = (inStock.length ? inStock : data.products.nodes).slice(0, 4);
        if (alive) setRecs(pick);
      } catch (err) {
        console.warn("[measure] recommendations failed:", err);
      }
    })();
    return () => {
      alive = false;
    };
  }, [phase, recs.length]);

  function backToStart() {
    reset();
    setPhoto(null);
    setReviewSegments([]);
    setSegPxMap({});
    setNailIndex(0);
    setLivePx(0);
    setRecs([]);
    setNotice(null);
    setPhase("intro");
  }

  // Build the editable card + 5-nail segments from a detection, filling any nail
  // the model missed with a dim default the user can drag into place.
  function enterReview(detection: Extract<Detection, { found: true }>, img: Photo) {
    const { bw, bh } = fitBox(img);
    const present = new Set(detection.nails.map((n) => n.finger));
    const map: Record<string, number> = { card: segPx(detection.card, bw, bh) };

    const segs: SegmentInit[] = [
      {
        id: "card",
        label: "card · 85.6 mm",
        tint: colors.pop,
        a: toDisplay(detection.card.a, bw, bh),
        b: toDisplay(detection.card.b, bw, bh),
      },
    ];

    for (const n of detection.nails) {
      map[n.finger] = segPx(n, bw, bh);
      segs.push({
        id: n.finger,
        label: FINGER_LABELS[n.finger],
        tint: colors.accent,
        patch: true,
        dim: n.confidence < 0.5,
        a: toDisplay(n.a, bw, bh),
        b: toDisplay(n.b, bw, bh),
      });
    }

    // Missing nails: a small centered default, staggered so they don't stack.
    let i = 0;
    for (const f of FINGERS) {
      if (present.has(f)) continue;
      const y: [number, number] = [0.42, 0.32 + i * 0.09];
      const a: [number, number] = [0.42, y[1]];
      const b: [number, number] = [0.58, y[1]];
      map[f] = segPx({ a, b }, bw, bh);
      segs.push({
        id: f,
        label: FINGER_LABELS[f],
        tint: colors.accent,
        patch: true,
        dim: true,
        a: toDisplay(a, bw, bh),
        b: toDisplay(b, bw, bh),
      });
      i += 1;
    }

    setPhoto(img);
    setReviewSegments(segs);
    setSegPxMap(map);
    setPhase("review");
  }

  async function runScan(uri: string, w: number, h: number) {
    setNotice(null);
    setPhase("detecting");
    let img: Photo;
    try {
      const out = await processImage(uri, w, h);
      img = { uri: out.uri, w: out.w, h: out.h };
      const detection = await detectHand(out);
      if (detection.found) {
        enterReview(detection, img);
        return;
      }
      setNotice("Couldn't auto-detect — line things up by hand.");
    } catch {
      setNotice("Scan unavailable — measuring by hand.");
      try {
        const out = await processImage(uri, w, h);
        img = { uri: out.uri, w: out.w, h: out.h };
      } catch {
        setNotice("Couldn't read that photo. Try again.");
        setPhase("intro");
        return;
      }
    }
    // Fallback to the manual caliper on the same processed image.
    setPhoto(img);
    setNailIndex(0);
    setLivePx(0);
    setPhase("calibrate");
  }

  async function openCamera() {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) return;
    }
    setPhase("capture");
  }

  async function capture() {
    const pic = await camRef.current?.takePictureAsync({ quality: 0.85 });
    if (pic) await runScan(pic.uri, pic.width, pic.height);
  }

  async function uploadPhoto() {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 1,
    });
    const asset = res.canceled ? null : res.assets?.[0];
    if (asset) await runScan(asset.uri, asset.width, asset.height);
  }

  function confirmReview() {
    const cardPx = segPxMap.card;
    if (!cardPx || cardPx <= 0) return;
    const f = pxPerMm(cardPx);
    setCardPxWidth(cardPx);
    for (const seg of reviewSegments) {
      if (seg.id === "card") continue;
      const px = segPxMap[seg.id] ?? 0;
      if (px > 0) setFingerMm(seg.id as FingerKey, clampMm(pxToMm(px, f)));
    }
    setPhase("result");
  }

  // ---- intro ----
  if (phase === "intro") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
            <View style={{ gap: 6, paddingTop: 8 }}>
              <Eyebrow>scan my size</Eyebrow>
              <Text style={{ fontFamily: font.display, fontSize: 32, color: colors.ink, letterSpacing: -0.5 }}>
                One photo. Your size.
              </Text>
              <Text style={{ fontFamily: font.body, fontSize: 15, lineHeight: 23, color: colors.subtle }}>
                Lay a hand flat beside any bank card (exactly 85.6&nbsp;mm wide) and shoot from
                above. We detect every nail, you check the outlines, and we read your set size.
              </Text>
            </View>
            <Card style={{ padding: 20, gap: 12 }}>
              {STEPS.map((t, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.pop, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontFamily: font.bodyBold, color: colors.onPop }}>{i + 1}</Text>
                  </View>
                  <Text style={{ flex: 1, fontFamily: font.body, fontSize: 14, color: colors.ink }}>{t}</Text>
                </View>
              ))}
            </Card>
            {notice ? (
              <Text style={{ fontFamily: font.bodyMd, fontSize: 13, color: colors.accent, textAlign: "center" }}>
                {notice}
              </Text>
            ) : null}
            <Button label="Take photo" onPress={openCamera} />
            <Button label="Upload a photo" variant="ghost" onPress={uploadPhoto} />
            {size ? (
              <Button label={`Your saved size: ${size} — shop it`} variant="ghost" onPress={() => router.push("/")} />
            ) : null}
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ---- capture ----
  if (phase === "capture") {
    return (
      <View style={{ flex: 1, backgroundColor: "#000" }}>
        <CameraView ref={camRef} style={{ flex: 1 }} facing="back" />
        <SafeAreaView edges={["bottom"]} style={{ position: "absolute", bottom: 0, left: 0, right: 0, alignItems: "center", paddingBottom: 24, gap: 14 }}>
          <Text style={{ fontFamily: font.bodyBold, color: "#fff", fontSize: 14 }}>
            Card + hand flat, straight down, then tap
          </Text>
          <Pressable
            onPress={capture}
            accessibilityLabel="Take photo"
            style={({ pressed }) => [
              { width: 74, height: 74, borderRadius: 37, backgroundColor: "#fff", borderWidth: 5, borderColor: colors.pop },
              pressed && { transform: [{ scale: 0.94 }] },
            ]}
          />
        </SafeAreaView>
      </View>
    );
  }

  // ---- detecting ----
  if (phase === "detecting") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", gap: 16, padding: 24 }}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={{ fontFamily: font.displaySemi, fontSize: 20, color: colors.ink }}>
          Finding your nails…
        </Text>
        <Text style={{ fontFamily: font.body, fontSize: 14, color: colors.subtle, textAlign: "center" }}>
          Reading the card for scale and outlining all five nails.
        </Text>
      </View>
    );
  }

  if (!photo) return null;
  const { bw, bh } = fitBox(photo);

  // ---- review (auto-detected, editable) ----
  if (phase === "review") {
    const cardPx = segPxMap.card ?? 0;
    const liveFactor = cardPx > 0 ? pxPerMm(cardPx) : null;
    const liveMm: Partial<Record<FingerKey, number>> = {};
    if (liveFactor) {
      for (const seg of reviewSegments) {
        if (seg.id === "card") continue;
        liveMm[seg.id as FingerKey] = clampMm(pxToMm(segPxMap[seg.id] ?? 0, liveFactor));
      }
    }
    const liveSize = sizeFromMeasurements(liveMm);
    const anyDim = reviewSegments.some((s) => s.dim);

    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <SafeAreaView edges={["top"]} style={{ flex: 1, padding: 16, gap: 12 }}>
          <View style={{ gap: 4 }}>
            <Eyebrow>check the outlines</Eyebrow>
            <Text style={{ fontFamily: font.displaySemi, fontSize: 22, color: colors.ink }}>
              Looks good? Drag any dot to fix.
            </Text>
          </View>
          <ScanOverlay uri={photo.uri} boxW={bw} boxH={bh} segments={reviewSegments} onChange={onSeg} />
          {anyDim ? (
            <Text style={{ fontFamily: font.bodyMd, fontSize: 12.5, color: colors.accent, textAlign: "center" }}>
              Dashed nails are low-confidence — double-check those.
            </Text>
          ) : null}
          <Text style={{ fontFamily: font.display, fontSize: 26, color: colors.ink, textAlign: "center" }}>
            {liveSize ? `You're a ${liveSize}` : "Line up the card to read your size"}
          </Text>
          <Button
            label="Looks good"
            disabled={!liveSize}
            onPress={confirmReview}
          />
          <Button label="Retake" variant="ghost" onPress={() => setPhase("intro")} />
        </SafeAreaView>
      </View>
    );
  }

  // ---- calibrate (manual fallback) ----
  if (phase === "calibrate") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <SafeAreaView edges={["top"]} style={{ flex: 1, padding: 16, gap: 14 }}>
          <View style={{ gap: 4 }}>
            <Eyebrow>step 1 · calibrate</Eyebrow>
            <Text style={{ fontFamily: font.displaySemi, fontSize: 22, color: colors.ink }}>
              Drag the dots to the card&apos;s long edge
            </Text>
          </View>
          <MeasureCanvas
            key="cal"
            uri={photo.uri}
            boxW={bw}
            boxH={bh}
            tint={colors.pop}
            initial={{ a: { x: bw * 0.2, y: bh * 0.5 }, b: { x: bw * 0.8, y: bh * 0.5 } }}
            onDistance={setLivePx}
          />
          <Text style={{ fontFamily: font.bodyMd, fontSize: 14, color: colors.subtle, textAlign: "center" }}>
            Card edge = 85.6&nbsp;mm
          </Text>
          <Button
            label="Set scale"
            disabled={livePx < 8}
            onPress={() => {
              setCardPxWidth(livePx);
              setNailIndex(0);
              setLivePx(0);
              setPhase("nail");
            }}
          />
        </SafeAreaView>
      </View>
    );
  }

  // ---- nail (manual fallback) ----
  if (phase === "nail") {
    const finger = FINGERS[nailIndex];
    const mm = factor ? clampMm(pxToMm(livePx, factor)) : 0;
    const last = nailIndex === FINGERS.length - 1;
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <SafeAreaView edges={["top"]} style={{ flex: 1, padding: 16, gap: 14 }}>
          <View style={{ gap: 4 }}>
            <Eyebrow>{`step 2 · nail ${nailIndex + 1} of 5`}</Eyebrow>
            <Text style={{ fontFamily: font.displaySemi, fontSize: 22, color: colors.ink }}>
              Measure your {FINGER_LABELS[finger]}
            </Text>
          </View>
          <MeasureCanvas
            key={`nail-${nailIndex}`}
            uri={photo.uri}
            boxW={bw}
            boxH={bh}
            tint={colors.accent}
            initial={{ a: { x: bw * 0.42, y: bh * 0.5 }, b: { x: bw * 0.58, y: bh * 0.5 } }}
            onDistance={setLivePx}
          />
          <Text style={{ fontFamily: font.display, fontSize: 26, color: colors.ink, textAlign: "center" }}>
            {mm.toFixed(1)} mm
          </Text>
          <Button
            label={last ? "See my size" : "Next nail"}
            disabled={!factor || livePx < 4}
            onPress={() => {
              if (factor) setFingerMm(finger, clampMm(pxToMm(livePx, factor)));
              setLivePx(0);
              if (last) setPhase("result");
              else setNailIndex((n) => n + 1);
            }}
          />
        </SafeAreaView>
      </View>
    );
  }

  // ---- result ----
  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <View style={{ gap: 4, paddingTop: 8 }}>
            <Eyebrow>your fit</Eyebrow>
            <Text style={{ fontFamily: font.display, fontSize: 30, color: colors.ink, letterSpacing: -0.5 }}>
              You&apos;re a {size ?? "—"}
            </Text>
          </View>
          <Card style={{ padding: 20, gap: 10 }}>
            {FINGERS.map((f) => (
              <View key={f} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <Text style={{ fontFamily: font.bodyMd, fontSize: 14, color: colors.subtle, textTransform: "capitalize" }}>
                  {FINGER_LABELS[f]}
                </Text>
                <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: colors.ink }}>
                  {typeof fingerMm[f] === "number" ? `${fingerMm[f]!.toFixed(1)} mm` : "—"}
                </Text>
              </View>
            ))}
          </Card>

          {recs.length && size ? (
            <View style={{ gap: 12, paddingTop: 4 }}>
              <Eyebrow>{`recommended in your ${size}`}</Eyebrow>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                {recs.map((p, i) => (
                  <View key={p.id} style={{ width: "47.5%" }}>
                    <ProductCard product={p} index={i} />
                  </View>
                ))}
              </View>
              <Text style={{ fontFamily: font.bodyMd, fontSize: 12.5, color: colors.subtle, textAlign: "center" }}>
                Tap a set — your {size} is locked in, ready to add.
              </Text>
            </View>
          ) : null}

          <Button label="Browse all sets" variant="ink" onPress={() => router.push("/")} />
          <Button label="Measure again" variant="ghost" onPress={backToStart} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

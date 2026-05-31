import { useRef, useState } from "react";
import { Dimensions, Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";

import { Button, Card, Eyebrow } from "@/components/ui";
import { MeasureCanvas } from "@/components/measure-canvas";
import {
  FINGERS,
  clampMm,
  pxToMm,
  type FingerKey,
} from "@nailismo/fit-sizing";
import { useFit } from "@/store/fit";
import { colors, font, radii, shadow } from "@/theme";

const { width, height } = Dimensions.get("window");

const FINGER_LABELS: Record<FingerKey, string> = {
  thumb: "thumb",
  index: "index finger",
  middle: "middle finger",
  ring: "ring finger",
  pinky: "pinky",
};

type Photo = { uri: string; w: number; h: number };
type Phase = "intro" | "capture" | "calibrate" | "nail" | "result";

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
  const [nailIndex, setNailIndex] = useState(0);
  const [livePx, setLivePx] = useState(0);

  const setCardPxWidth = useFit((s) => s.setCardPxWidth);
  const setFingerMm = useFit((s) => s.setFingerMm);
  const factor = useFit((s) => s.factor)();
  const size = useFit((s) => s.size)();
  const fingerMm = useFit((s) => s.fingerMm);
  const reset = useFit((s) => s.reset);

  async function openCamera() {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) return;
    }
    setPhase("capture");
  }

  async function capture() {
    const pic = await camRef.current?.takePictureAsync({ quality: 0.85 });
    if (pic) {
      setPhoto({ uri: pic.uri, w: pic.width, h: pic.height });
      setLivePx(0);
      setPhase("calibrate");
    }
  }

  // ---- intro ----
  if (phase === "intro") {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg }}>
        <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
            <View style={{ gap: 6, paddingTop: 8 }}>
              <Eyebrow>find my size</Eyebrow>
              <Text style={{ fontFamily: font.display, fontSize: 32, color: colors.ink, letterSpacing: -0.5 }}>
                Measure with a card
              </Text>
              <Text style={{ fontFamily: font.body, fontSize: 15, lineHeight: 23, color: colors.subtle }}>
                Any bank or credit card is exactly 85.6&nbsp;mm wide — a perfect ruler. Lay one flat
                next to your hand, snap one photo, and drag to measure.
              </Text>
            </View>
            <Card style={{ padding: 20, gap: 12 }}>
              {[
                "Put a card flat beside your hand, fingers spread.",
                "Take one photo with both in frame.",
                "Line the dots up with the card, then each nail.",
              ].map((t, i) => (
                <View key={i} style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
                  <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: colors.pop, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontFamily: font.bodyBold, color: colors.ink }}>{i + 1}</Text>
                  </View>
                  <Text style={{ flex: 1, fontFamily: font.body, fontSize: 14, color: colors.ink }}>{t}</Text>
                </View>
              ))}
            </Card>
            <Button label="Open camera" onPress={openCamera} />
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
            Card + hand in frame, then tap
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

  if (!photo) return null;
  const { bw, bh } = fitBox(photo);

  // ---- calibrate ----
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

  // ---- nail ----
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
          <Button label="Shop your size" onPress={() => router.push("/")} />
          <Button
            label="Measure again"
            variant="ghost"
            onPress={() => {
              reset();
              setPhoto(null);
              setNailIndex(0);
              setLivePx(0);
              setPhase("intro");
            }}
          />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

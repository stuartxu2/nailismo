import { Image } from "expo-image";
import { Text } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  type SharedValue,
} from "react-native-reanimated";

import { font } from "@/theme";

export type SegmentInit = {
  /** "card" or a finger key — identifies the live px reported back. */
  id: string;
  label: string;
  tint: string;
  /** Endpoints in display-box px. */
  a: { x: number; y: number };
  b: { x: number; y: number };
  /** Draw a nail-bed capsule hint behind the width line (nails only). */
  patch?: boolean;
  /** Low-confidence styling — dashed, dimmed, to invite a check. */
  dim?: boolean;
};

const HANDLE = 30;

/**
 * The captured photo with auto-detected, fully draggable measurement segments —
 * one per nail (width axis) plus the reference card edge. Each segment reports
 * its live px length so the screen can recompute mm as the user nudges. The
 * displayed image MUST be the same processed image sent for detection, so the
 * normalized coordinates map cleanly onto these display-px positions.
 */
export function ScanOverlay({
  uri,
  boxW,
  boxH,
  segments,
  onChange,
}: {
  uri: string;
  boxW: number;
  boxH: number;
  segments: SegmentInit[];
  onChange: (id: string, px: number) => void;
}) {
  return (
    <Animated.View
      style={{
        width: boxW,
        height: boxH,
        borderRadius: 16,
        overflow: "hidden",
        backgroundColor: "#000",
      }}
    >
      <Image source={{ uri }} style={{ width: boxW, height: boxH }} contentFit="cover" />
      {segments.map((s) => (
        <Segment key={s.id} seg={s} boxW={boxW} boxH={boxH} onChange={onChange} />
      ))}
    </Animated.View>
  );
}

function Segment({
  seg,
  boxW,
  boxH,
  onChange,
}: {
  seg: SegmentInit;
  boxW: number;
  boxH: number;
  onChange: (id: string, px: number) => void;
}) {
  const ax = useSharedValue(seg.a.x);
  const ay = useSharedValue(seg.a.y);
  const bx = useSharedValue(seg.b.x);
  const by = useSharedValue(seg.b.y);

  const dist = useDerivedValue(() => Math.hypot(bx.value - ax.value, by.value - ay.value));
  useAnimatedReaction(
    () => dist.value,
    (d) => runOnJS(onChange)(seg.id, d),
  );

  const makePan = (x: SharedValue<number>, y: SharedValue<number>) =>
    Gesture.Pan().onChange((e) => {
      "worklet";
      x.value = Math.min(boxW, Math.max(0, x.value + e.changeX));
      y.value = Math.min(boxH, Math.max(0, y.value + e.changeY));
    });

  const lineStyle = useAnimatedStyle(() => {
    const mx = (ax.value + bx.value) / 2;
    const my = (ay.value + by.value) / 2;
    const len = Math.hypot(bx.value - ax.value, by.value - ay.value);
    const ang = Math.atan2(by.value - ay.value, bx.value - ax.value);
    return {
      width: len,
      left: mx - len / 2,
      top: my - 1.5,
      transform: [{ rotateZ: `${ang}rad` }],
    };
  });

  // Capsule hint over the nail bed: spans the measured width along the line and
  // a taller perpendicular axis as a soft "this is your nail" cue (not measured).
  const patchStyle = useAnimatedStyle(() => {
    const mx = (ax.value + bx.value) / 2;
    const my = (ay.value + by.value) / 2;
    const len = Math.hypot(bx.value - ax.value, by.value - ay.value);
    const h = Math.max(len * 1.4, 18);
    const ang = Math.atan2(by.value - ay.value, bx.value - ax.value);
    return {
      width: len,
      height: h,
      left: mx - len / 2,
      top: my - h / 2,
      borderRadius: Math.min(len, h) / 2,
      transform: [{ rotateZ: `${ang}rad` }],
    };
  });

  const labelStyle = useAnimatedStyle(() => {
    const mx = (ax.value + bx.value) / 2;
    const my = Math.min(ay.value, by.value);
    return { left: mx - 40, top: my - 26 };
  });

  const handleStyle = (x: SharedValue<number>, y: SharedValue<number>) =>
    useAnimatedStyle(() => ({
      transform: [
        { translateX: x.value - HANDLE / 2 },
        { translateY: y.value - HANDLE / 2 },
      ],
    }));

  return (
    <>
      {seg.patch ? (
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: "absolute",
              borderWidth: 1.5,
              borderColor: seg.tint,
              borderStyle: seg.dim ? "dashed" : "solid",
              backgroundColor: `${seg.tint}22`,
            },
            patchStyle,
          ]}
        />
      ) : null}

      <Animated.View
        pointerEvents="none"
        style={[
          { position: "absolute", height: 3, backgroundColor: seg.tint, borderRadius: 2 },
          lineStyle,
        ]}
      />

      <Animated.View pointerEvents="none" style={[{ position: "absolute", width: 80, alignItems: "center" }, labelStyle]}>
        <Text
          style={{
            fontFamily: font.bodyBold,
            fontSize: 10,
            letterSpacing: 0.5,
            color: "#fff",
            backgroundColor: seg.dim ? "rgba(190,40,40,0.85)" : "rgba(0,0,0,0.55)",
            paddingHorizontal: 7,
            paddingVertical: 2,
            borderRadius: 8,
            overflow: "hidden",
            textTransform: "capitalize",
          }}
        >
          {seg.label}
        </Text>
      </Animated.View>

      <GestureDetector gesture={makePan(ax, ay)}>
        <Animated.View style={[styles.handle, { borderColor: seg.tint }, handleStyle(ax, ay)]} />
      </GestureDetector>
      <GestureDetector gesture={makePan(bx, by)}>
        <Animated.View style={[styles.handle, { borderColor: seg.tint }, handleStyle(bx, by)]} />
      </GestureDetector>
    </>
  );
}

const styles = {
  handle: {
    position: "absolute" as const,
    width: HANDLE,
    height: HANDLE,
    borderRadius: HANDLE / 2,
    borderWidth: 3,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
};

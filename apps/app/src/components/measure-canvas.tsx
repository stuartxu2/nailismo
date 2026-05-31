import { Image } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";
import { colors } from "@/theme";

export type Pt = { x: number; y: number };

const HANDLE = 28;

/**
 * A captured photo with two draggable handles. The pixel distance between them
 * is reported continuously (display-space px). Calibration and every nail are
 * measured on the SAME displayed photo, so one px→mm factor applies throughout.
 * Remount (via `key`) to reset the handles for the next finger.
 */
export function MeasureCanvas({
  uri,
  boxW,
  boxH,
  initial,
  onDistance,
  tint = colors.accent,
}: {
  uri: string;
  boxW: number;
  boxH: number;
  initial: { a: Pt; b: Pt };
  onDistance: (px: number) => void;
  tint?: string;
}) {
  const ax = useSharedValue(initial.a.x);
  const ay = useSharedValue(initial.a.y);
  const bx = useSharedValue(initial.b.x);
  const by = useSharedValue(initial.b.y);

  const dist = useDerivedValue(() => Math.hypot(bx.value - ax.value, by.value - ay.value));
  useAnimatedReaction(
    () => dist.value,
    (d) => runOnJS(onDistance)(d),
  );

  const makePan = (x: typeof ax, y: typeof ay) =>
    Gesture.Pan().onChange((e) => {
      "worklet";
      x.value = Math.min(boxW, Math.max(0, x.value + e.changeX));
      y.value = Math.min(boxH, Math.max(0, y.value + e.changeY));
    });

  const handleStyle = (x: typeof ax, y: typeof ay) =>
    useAnimatedStyle(() => ({
      transform: [{ translateX: x.value - HANDLE / 2 }, { translateY: y.value - HANDLE / 2 }],
    }));

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

  return (
    <Animated.View style={{ width: boxW, height: boxH, borderRadius: 16, overflow: "hidden", backgroundColor: "#000" }}>
      <Image source={{ uri }} style={{ width: boxW, height: boxH }} contentFit="cover" />

      <Animated.View
        pointerEvents="none"
        style={[{ position: "absolute", height: 3, backgroundColor: tint, borderRadius: 2 }, lineStyle]}
      />

      <GestureDetector gesture={makePan(ax, ay)}>
        <Animated.View style={[styles.handle, { borderColor: tint }, handleStyle(ax, ay)]} />
      </GestureDetector>
      <GestureDetector gesture={makePan(bx, by)}>
        <Animated.View style={[styles.handle, { borderColor: tint }, handleStyle(bx, by)]} />
      </GestureDetector>
    </Animated.View>
  );
}

const styles = {
  handle: {
    position: "absolute" as const,
    width: HANDLE,
    height: HANDLE,
    borderRadius: HANDLE / 2,
    borderWidth: 3,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
};

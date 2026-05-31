import { Pressable, Text, View, type StyleProp, type ViewStyle, type TextStyle } from "react-native";
import { colors, font, radii, shadow } from "@/theme";

/** Mono uppercase label — the brand's "eyebrow" / cap style. */
export function Eyebrow({ children, style }: { children: string; style?: StyleProp<TextStyle> }) {
  return (
    <Text
      style={[
        {
          fontFamily: font.bodyBold,
          fontSize: 11,
          letterSpacing: 2,
          textTransform: "uppercase",
          color: colors.muted,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Button({
  label,
  onPress,
  variant = "pop",
  disabled,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: "pop" | "ghost" | "ink";
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = variant === "pop" ? colors.pop : variant === "ink" ? colors.ink : "transparent";
  const fg = variant === "pop" ? colors.onPop : variant === "ink" ? colors.onAccent : colors.ink;
  const border = variant === "ghost" ? colors.ink : bg;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: 1.5,
          borderRadius: radii.pill,
          paddingVertical: 15,
          paddingHorizontal: 24,
          alignItems: "center",
          justifyContent: "center",
        },
        variant === "pop" && shadow.pop,
        pressed && { transform: [{ scale: 0.97 }], opacity: 0.92 },
        disabled && { opacity: 0.45 },
        style,
      ]}
    >
      <Text
        style={{
          fontFamily: font.bodyBold,
          fontSize: 14,
          letterSpacing: 0.5,
          color: fg,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.border,
        },
        shadow.card,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Pill({ children, tint }: { children: string; tint?: string }) {
  return (
    <View
      style={{
        backgroundColor: tint ?? colors.pop,
        borderRadius: radii.pill,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: "flex-start",
      }}
    >
      <Text
        style={{
          fontFamily: font.bodyBold,
          fontSize: 10,
          letterSpacing: 1,
          textTransform: "uppercase",
          color: colors.ink,
        }}
      >
        {children}
      </Text>
    </View>
  );
}

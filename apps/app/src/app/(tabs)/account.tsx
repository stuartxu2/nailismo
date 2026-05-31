import { ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { Button, Card, Eyebrow } from "@/components/ui";
import { FINGERS, SIZE_CHART } from "@nailismo/fit-sizing";
import { useFit } from "@/store/fit";
import { colors, font, radii } from "@/theme";

const FINGER_LABELS: Record<string, string> = {
  thumb: "Thumb",
  index: "Index",
  middle: "Middle",
  ring: "Ring",
  pinky: "Pinky",
};

export default function AccountScreen() {
  const size = useFit((s) => s.size)();
  const fingerMm = useFit((s) => s.fingerMm);
  const reset = useFit((s) => s.reset);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <View style={{ gap: 6, paddingTop: 8 }}>
            <Eyebrow>you</Eyebrow>
            <Text style={{ fontFamily: font.display, fontSize: 30, color: colors.ink, letterSpacing: -0.5 }}>
              Account
            </Text>
          </View>

          <Card style={{ padding: 20, gap: 14 }}>
            <Eyebrow>your size</Eyebrow>
            {size ? (
              <>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
                  <Text style={{ fontFamily: font.display, fontSize: 56, color: colors.ink }}>{size}</Text>
                  <Text style={{ fontFamily: font.body, fontSize: 14, color: colors.subtle }}>set size</Text>
                </View>
                <View style={{ gap: 6 }}>
                  {FINGERS.map((f) => (
                    <View key={f} style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontFamily: font.bodyMd, fontSize: 14, color: colors.subtle }}>
                        {FINGER_LABELS[f]}
                      </Text>
                      <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: colors.ink }}>
                        {typeof fingerMm[f] === "number" ? `${fingerMm[f]!.toFixed(1)} mm` : "—"}
                      </Text>
                    </View>
                  ))}
                </View>
                <Button label="Re-measure" variant="ghost" onPress={() => router.push("/measure")} />
                <Button label="Clear my size" variant="ghost" onPress={reset} />
              </>
            ) : (
              <>
                <Text style={{ fontFamily: font.body, fontSize: 15, color: colors.subtle }}>
                  You haven&apos;t measured yet. Use your phone camera and any bank card to find your
                  perfect fit in under a minute.
                </Text>
                <Button label="Find my size" onPress={() => router.push("/measure")} />
              </>
            )}
          </Card>

          <Card style={{ padding: 20, gap: 8 }}>
            <Eyebrow>orders &amp; sign in</Eyebrow>
            <Text style={{ fontFamily: font.body, fontSize: 14, color: colors.subtle, lineHeight: 21 }}>
              Order history and accounts are coming soon. For now, checkout runs through secure
              Shopify checkout from your bag.
            </Text>
          </Card>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

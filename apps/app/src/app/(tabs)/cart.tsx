import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";

import { Button, Eyebrow } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import { useCart } from "@/store/cart";
import { colors, font, radii, shadow } from "@/theme";

function QtyButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          width: 32,
          height: 32,
          borderRadius: radii.sm,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.surface,
        },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={{ fontFamily: font.bodyBold, fontSize: 16, color: colors.ink }}>{label}</Text>
    </Pressable>
  );
}

export default function CartScreen() {
  const cart = useCart((s) => s.cart);
  const updateLine = useCart((s) => s.updateLine);
  const removeLine = useCart((s) => s.removeLine);

  const lines = cart?.lines.nodes ?? [];
  const empty = lines.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, gap: 6 }}>
          <Eyebrow>your bag</Eyebrow>
          <Text style={{ fontFamily: font.display, fontSize: 30, color: colors.ink, letterSpacing: -0.5 }}>
            Cart
          </Text>
        </View>

        {empty ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 32 }}>
            <Text style={{ fontFamily: font.body, fontSize: 16, color: colors.subtle, textAlign: "center" }}>
              Your bag is empty. Go pick a flavor.
            </Text>
            <Button label="Shop the rack" onPress={() => router.push("/")} />
          </View>
        ) : (
          <>
            <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
              {lines.map((line) => {
                const sizeOpt = line.merchandise.selectedOptions.find((o) => o.name === "Size");
                return (
                  <View
                    key={line.id}
                    style={[
                      {
                        flexDirection: "row",
                        gap: 12,
                        backgroundColor: colors.surface,
                        borderRadius: radii.lg,
                        borderWidth: 1,
                        borderColor: colors.border,
                        padding: 10,
                      },
                      shadow.soft,
                    ]}
                  >
                    <View style={{ width: 72, height: 72, borderRadius: radii.md, overflow: "hidden", backgroundColor: colors.bg }}>
                      {line.merchandise.image ? (
                        <Image source={{ uri: line.merchandise.image.url }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
                      ) : null}
                    </View>
                    <View style={{ flex: 1, justifyContent: "space-between" }}>
                      <View style={{ gap: 2 }}>
                        <Text numberOfLines={1} style={{ fontFamily: font.displaySemi, fontSize: 15, color: colors.ink }}>
                          {line.merchandise.product.title}
                        </Text>
                        {sizeOpt ? (
                          <Text style={{ fontFamily: font.body, fontSize: 13, color: colors.subtle }}>
                            Size {sizeOpt.value}
                          </Text>
                        ) : null}
                        <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: colors.accent }}>
                          {formatMoney(line.cost.totalAmount)}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <QtyButton label="−" onPress={() => updateLine(line.id, line.quantity - 1)} />
                        <Text style={{ fontFamily: font.bodyBold, fontSize: 15, color: colors.ink, minWidth: 18, textAlign: "center" }}>
                          {line.quantity}
                        </Text>
                        <QtyButton label="+" onPress={() => updateLine(line.id, line.quantity + 1)} />
                        <Pressable onPress={() => removeLine(line.id)} style={({ pressed }) => [{ marginLeft: "auto" }, pressed && { opacity: 0.6 }]}>
                          <Text style={{ fontFamily: font.bodyMd, fontSize: 13, color: colors.subtle }}>Remove</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>

            <View style={{ padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bg }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontFamily: font.bodyMd, fontSize: 15, color: colors.subtle }}>Subtotal</Text>
                <Text style={{ fontFamily: font.display, fontSize: 22, color: colors.ink }}>
                  {cart ? formatMoney(cart.cost.subtotalAmount) : "—"}
                </Text>
              </View>
              <Button
                label="Checkout"
                onPress={() => {
                  if (cart?.checkoutUrl) WebBrowser.openBrowserAsync(cart.checkoutUrl);
                }}
              />
            </View>
          </>
        )}
      </SafeAreaView>
    </View>
  );
}

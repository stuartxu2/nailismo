import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Image } from "expo-image";
import { SafeAreaView } from "react-native-safe-area-context";
import { Link, router, useLocalSearchParams } from "expo-router";

import { Button, Eyebrow } from "@/components/ui";
import { formatMoney } from "@/lib/format";
import {
  storefrontFetch,
  PRODUCT_BY_HANDLE_QUERY,
  type ProductByHandleQueryResult,
  type ShopifyProductDetail,
} from "@/lib/shopify";
import { useCart } from "@/store/cart";
import { useFit } from "@/store/fit";
import { colors, font, radii, shadow } from "@/theme";

const { width } = Dimensions.get("window");

function SizeChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          minWidth: 54,
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: radii.md,
          borderWidth: 1.5,
          alignItems: "center",
          backgroundColor: active ? colors.ink : colors.surface,
          borderColor: active ? colors.ink : colors.border,
        },
        pressed && { transform: [{ scale: 0.96 }] },
      ]}
    >
      <Text
        style={{
          fontFamily: font.bodyBold,
          fontSize: 15,
          color: active ? colors.onAccent : colors.ink,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export default function ProductScreen() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  const [product, setProduct] = useState<ShopifyProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const addLine = useCart((s) => s.addLine);
  const savedSize = useFit((s) => s.size)();

  const [size, setSize] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await storefrontFetch<ProductByHandleQueryResult>(
          PRODUCT_BY_HANDLE_QUERY,
          { handle },
          { revalidate: 0 },
        );
        if (alive) setProduct(data.product);
      } catch (err) {
        console.warn("[pdp] load failed:", err);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [handle]);

  const sizeOption = product?.options.find((o) => o.name === "Size");

  // Preselect the user's measured size when this product offers it.
  useEffect(() => {
    if (sizeOption && savedSize && sizeOption.values.includes(savedSize)) {
      setSize((prev) => prev ?? savedSize);
    }
  }, [sizeOption, savedSize]);

  const variant = useMemo(() => {
    if (!product) return null;
    if (sizeOption) {
      if (!size) return null;
      return (
        product.variants.nodes.find((v) =>
          v.selectedOptions.some((o) => o.name === "Size" && o.value === size),
        ) ?? null
      );
    }
    return product.variants.nodes[0] ?? null;
  }, [product, sizeOption, size]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, alignItems: "center", justifyContent: "center", gap: 16 }}>
        <Text style={{ fontFamily: font.displaySemi, fontSize: 20, color: colors.ink }}>Not found</Text>
        <Button label="Back to shop" variant="ghost" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  const images = product.images.nodes.length ? product.images.nodes : product.featuredImage ? [product.featuredImage] : [];
  const price = variant?.price ?? product.priceRange.minVariantPrice;
  const description = product.descriptionHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const canAdd = !!variant && variant.availableForSale;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Back"
          style={({ pressed }) => [
            {
              position: "absolute",
              top: 8,
              left: 16,
              zIndex: 10,
              backgroundColor: colors.surface,
              borderRadius: radii.pill,
              width: 40,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
              borderWidth: 1,
              borderColor: colors.border,
            },
            shadow.soft,
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={{ fontSize: 18, color: colors.ink }}>‹</Text>
        </Pressable>

        <ScrollView contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>
            {images.map((img, i) => (
              <Image
                key={i}
                source={{ uri: img.url }}
                style={{ width, height: width }}
                contentFit="cover"
                transition={200}
                accessibilityLabel={img.altText ?? product.title}
              />
            ))}
          </ScrollView>

          <View style={{ padding: 20, gap: 14 }}>
            <View style={{ gap: 6 }}>
              <Eyebrow>press-on set</Eyebrow>
              <Text style={{ fontFamily: font.display, fontSize: 28, color: colors.ink, letterSpacing: -0.5 }}>
                {product.title}
              </Text>
              <Text style={{ fontFamily: font.bodyBold, fontSize: 18, color: colors.accent }}>
                {formatMoney(price)}
              </Text>
            </View>

            {sizeOption ? (
              <View style={{ gap: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Eyebrow>choose size</Eyebrow>
                  <Link href="/measure" asChild>
                    <Pressable>
                      <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: colors.accent }}>
                        Find my size →
                      </Text>
                    </Pressable>
                  </Link>
                </View>
                <View style={{ flexDirection: "row", gap: 10 }}>
                  {sizeOption.values.map((v) => (
                    <SizeChip key={v} label={v} active={size === v} onPress={() => setSize(v)} />
                  ))}
                </View>
              </View>
            ) : null}

            {description ? (
              <Text style={{ fontFamily: font.body, fontSize: 15, lineHeight: 23, color: colors.subtle }}>
                {description}
              </Text>
            ) : null}

            <Button
              label={
                adding
                  ? "Adding…"
                  : sizeOption && !size
                    ? "Select a size"
                    : !canAdd
                      ? "Sold out"
                      : "Add to Bag"
              }
              disabled={!canAdd || adding}
              onPress={async () => {
                if (!variant) return;
                setAdding(true);
                await addLine(variant.id, 1);
                setAdding(false);
                router.push("/cart");
              }}
              style={{ marginTop: 6 }}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

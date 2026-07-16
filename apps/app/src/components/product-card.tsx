import { Link } from "expo-router";
import { Image } from "expo-image";
import { Dimensions, Pressable, Text, View } from "react-native";
import type { ShopifyProduct } from "@/lib/shopify";
import { formatMoney } from "@/lib/format";
import { tagDots } from "@/lib/tag-colors";
import { colors, font, radii, shadow, tileTints } from "@/theme";

// Square image height = the 2-up column width (16px gutters + 12px gap). Computed
// rather than `aspectRatio: 1`, which fails to lay out in this RN/Fabric build.
const IMG = (Dimensions.get("window").width - 16 * 2 - 12) / 2;

export function ProductCard({ product, index }: { product: ShopifyProduct; index: number }) {
  const tint = tileTints[index % tileTints.length];
  const dots = tagDots(product.tags);

  return (
    <Link href={{ pathname: "/product/[handle]", params: { handle: product.handle } }} asChild>
      <Pressable style={({ pressed }) => [{ flex: 1 }, pressed && { transform: [{ scale: 0.97 }] }]}>
        <View
          style={[
            {
              backgroundColor: tint,
              borderRadius: radii.lg,
              padding: 10,
              borderWidth: 1,
              borderColor: colors.border,
            },
            shadow.card,
          ]}
        >
          <View
            style={{
              height: IMG,
              borderRadius: radii.md,
              overflow: "hidden",
              backgroundColor: colors.surface,
            }}
          >
            {product.featuredImage ? (
              <Image
                source={{ uri: product.featuredImage.url }}
                style={{ width: "100%", height: "100%" }}
                contentFit="cover"
                transition={200}
                accessibilityLabel={product.featuredImage.altText ?? product.title}
              />
            ) : null}
          </View>

          <View style={{ paddingTop: 10, gap: 6 }}>
            <Text
              numberOfLines={1}
              style={{ fontFamily: font.displaySemi, fontSize: 16, color: colors.ink }}
            >
              {product.title}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: colors.accent }}>
                {formatMoney(product.priceRange.minVariantPrice)}
              </Text>
              <View style={{ flexDirection: "row", gap: 4 }}>
                {dots.slice(0, 4).map((d) => (
                  <View
                    key={d.tag}
                    style={{
                      width: 12,
                      height: 12,
                      borderRadius: 6,
                      backgroundColor: d.hex,
                      borderWidth: 1,
                      borderColor: colors.border,
                    }}
                  />
                ))}
              </View>
            </View>
          </View>
        </View>
      </Pressable>
    </Link>
  );
}

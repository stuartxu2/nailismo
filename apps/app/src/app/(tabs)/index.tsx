import { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ProductCard } from "@/components/product-card";
import { Eyebrow } from "@/components/ui";
import {
  storefrontFetch,
  PRODUCTS_QUERY,
  type ProductsQueryResult,
  type ShopifyProduct,
} from "@/lib/shopify";
import { colors, font } from "@/theme";

function Header() {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16, gap: 6 }}>
      <Eyebrow>press on · show off</Eyebrow>
      <Text style={{ fontFamily: font.display, fontSize: 38, color: colors.ink, letterSpacing: -1 }}>
        nailismo
      </Text>
      <Text style={{ fontFamily: font.body, fontSize: 15, color: colors.subtle }}>
        Nails that are pure fun — ready in minutes.
      </Text>
    </View>
  );
}

export default function ShopScreen() {
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await storefrontFetch<ProductsQueryResult>(
        PRODUCTS_QUERY,
        { first: 30 },
        { revalidate: 0 },
      );
      setProducts(data.products.nodes);
    } catch (err) {
      console.warn("[shop] load failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <FlatList
          data={products}
          keyExtractor={(p) => p.id}
          numColumns={2}
          columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
          contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
          ListHeaderComponent={Header}
          renderItem={({ item, index }) => <ProductCard product={item} index={index} />}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={load} tintColor={colors.accent} />
          }
        />
      </SafeAreaView>
    </View>
  );
}

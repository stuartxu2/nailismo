import { Tabs } from "expo-router";
import type { ColorValue } from "react-native";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { colors } from "@nailismo/theme";

function TabIcon({ name, color }: { name: SymbolViewProps["name"]; color: ColorValue }) {
  return <SymbolView name={name} tintColor={color as string} size={26} type="hierarchical" />;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Shop",
          tabBarIcon: ({ color }) => <TabIcon name="bag.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="measure"
        options={{
          title: "Measure",
          tabBarIcon: ({ color }) => <TabIcon name="wand.and.rays" color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarIcon: ({ color }) => <TabIcon name="cart.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color }) => <TabIcon name="person.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}

// Mobile design language. Colors come from the shared brand tokens (the live
// candy-editorial scheme: lilac / plum / lime / slate). Fonts are Fredoka
// (display) + Nunito (body), loaded via expo-google-fonts in the root layout.
import { colors, radii, spacing, hairlines } from "@nailismo/theme";

export { colors, radii, spacing, hairlines };

export const font = {
  display: "Fredoka_700Bold",
  displaySemi: "Fredoka_600SemiBold",
  body: "Nunito_400Regular",
  bodyMd: "Nunito_600SemiBold",
  bodyBold: "Nunito_700Bold",
} as const;

// Candy-tinted, layered shadows — never a flat gray drop shadow.
export const shadow = {
  card: {
    shadowColor: "#B98CFF",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  pop: {
    shadowColor: "#7BC400",
    shadowOpacity: 0.45,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  soft: {
    shadowColor: "#271028",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
} as const;

// Rotating candy tile backgrounds for product cards (soft pastel pops).
export const tileTints = ["#F7E6FF", "#E6F7FF", "#FFF6D6", "#E6FBEF", "#FFE9F5"] as const;

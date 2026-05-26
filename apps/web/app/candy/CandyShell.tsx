import { Nunito } from "next/font/google";
import localFont from "next/font/local";
import "./candy.css";

const ekster = localFont({
  variable: "--font-ekster",
  display: "swap",
  src: [
    { path: "../../public/fonts/Ekster/Ekster_Thin.woff2", weight: "200", style: "normal" },
    { path: "../../public/fonts/Ekster/Ekster_Light.woff2", weight: "300", style: "normal" },
    { path: "../../public/fonts/Ekster/Ekster_Regular.woff2", weight: "400", style: "normal" },
  ],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

/** Wraps the candy-themed homepage: loads its fonts, applies the scoped
 *  `.candy` design system, and isolates it from the rest of the site. */
export function CandyShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={`candy ${ekster.variable} ${nunito.variable}`}>
      {children}
    </div>
  );
}

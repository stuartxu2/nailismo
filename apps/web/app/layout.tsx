import type { Metadata } from "next";
import localFont from "next/font/local";
import { Noto_Serif } from "next/font/google";
import "./globals.css";

const geograph = localFont({
  variable: "--font-geograph",
  display: "swap",
  src: [
    { path: "../public/fonts/Geograph/geograph-light.woff2", weight: "300", style: "normal" },
    { path: "../public/fonts/Geograph/geograph-light-italic.woff2", weight: "300", style: "italic" },
    { path: "../public/fonts/Geograph/geograph-regular.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/Geograph/geograph-regular-italic.woff2", weight: "400", style: "italic" },
    { path: "../public/fonts/Geograph/geograph-medium.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/Geograph/geograph-bold.woff2", weight: "700", style: "normal" },
  ],
});

const akkuratMono = localFont({
  variable: "--font-akkurat-mono",
  display: "swap",
  src: [
    { path: "../public/fonts/AkkuratMono/Akkurat-Mono.otf", weight: "400", style: "normal" },
  ],
});

const notoSerif = Noto_Serif({
  variable: "--font-noto-serif",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nailismo.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Nailismo | Press-On Manicures for Men",
  description:
    "Press-on manicures designed for men's hands. Shop masculine, minimalist, and statement nail sets built for daily wear, nightlife, and modern style.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Nailismo | Press-On Manicures for Men",
    description:
      "Press-on manicures designed for men's hands. Shop masculine, minimalist, and statement nail sets built for daily wear, nightlife, and modern style.",
    url: siteUrl,
    siteName: "Nailismo",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geograph.variable} ${akkuratMono.variable} ${notoSerif.variable}`}
    >
      <body className="bg-paper text-tetsu">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
import localFont from "next/font/local";
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

const ekster = localFont({
  variable: "--font-ekster-local",
  display: "swap",
  src: [
    { path: "../public/fonts/Ekster/Ekster_Thin.woff2", weight: "200", style: "normal" },
    { path: "../public/fonts/Ekster/Ekster_Light.woff2", weight: "300", style: "normal" },
    { path: "../public/fonts/Ekster/Ekster_Regular.woff2", weight: "400", style: "normal" },
  ],
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
      className={`${geograph.variable} ${akkuratMono.variable} ${ekster.variable}`}
    >
      <body className="bg-paper text-tetsu">{children}</body>
    </html>
  );
}

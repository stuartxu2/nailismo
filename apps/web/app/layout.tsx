import type { Metadata } from "next";
import localFont from "next/font/local";
import { Nunito, Fredoka } from "next/font/google";
import "./globals.css";
import { CandyShell } from "./candy/CandyShell";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

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

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nailismo.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Nailismo | Press-On Nails — Press On, Show Off",
  description:
    "Press-on nail sets for every hand. Minimalist, statement, and expressive looks built for daily wear, nightlife, and modern style. 10 premium nails + toolkit, on in minutes, lasts up to 7 days.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Nailismo | Press-On Nails — Press On, Show Off",
    description:
      "Press-on nail sets for every hand. Minimalist, statement, and expressive looks built for daily wear, nightlife, and modern style. 10 premium nails + toolkit, on in minutes, lasts up to 7 days.",
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
      className={`${geograph.variable} ${akkuratMono.variable} ${fredoka.variable} ${nunito.variable}`}
    >
      <body className="bg-paper text-tetsu">
        <CandyShell>{children}</CandyShell>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { CandyShell } from "./candy/CandyShell";
import CandyHome from "./candy/CandyHome";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Nailismo | Press On. Show Off.",
  description:
    "Press-on nails that are pure fun — ready in minutes. Bright, collectible sets in every flavor. Easy to wear, easy to remove, impossible to resist.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Nailismo | Press On. Show Off.",
    description:
      "Press-on nails that are pure fun — ready in minutes. Easy to wear, easy to remove, impossible to resist.",
    type: "website",
  },
};

export default function Home() {
  return (
    <CandyShell>
      <CandyHome />
    </CandyShell>
  );
}

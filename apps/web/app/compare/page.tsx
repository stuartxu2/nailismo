import Link from "next/link";
import type { Metadata } from "next";
import { CompareBoard } from "./CompareBoard";

// Favorites live in localStorage, so this page reads no cookies/searchParams and
// stays statically prerendered. The board hydrates the saved list on the client.
export const metadata: Metadata = {
  title: "Compare & Favorites · Nailismo",
  description:
    "Line up your saved press-on sets side by side, then add your picks to the bag in one tap.",
  alternates: { canonical: "/compare" },
  robots: { index: false, follow: true },
};

export default function ComparePage() {
  return (
    <main className="candy-wrap candy-sec" style={{ paddingTop: 36 }}>
      <nav style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        <Link href="/" className="candy-crumb">Home</Link>
        <span className="candy-crumb" aria-current="page" style={{ background: "var(--lemon)" }}>
          Compare
        </span>
      </nav>

      <div className="candy-pagehead">
        <span className="candy-eyebrow">Favorites</span>
        <h1 style={{ marginTop: 10 }}>Compare your picks</h1>
        <p>
          Line up to four saved sets side by side, tick the ones you love, and drop
          them in your bag together. The rest stay saved here.
        </p>
      </div>

      <CompareBoard />
    </main>
  );
}

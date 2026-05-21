import Link from "next/link";
import { AnnouncementTicker } from "@/app/components/AnnouncementTicker";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";

export default function NotFound() {
  return (
    <>
      <AnnouncementTicker />
      <Header />
      <main className="bg-paper relative overflow-hidden">
        <section className="sec">
          <div className="nail-container">
            <div className="grid grid-cols-12 gap-6 items-end mb-16">
              <div className="col-span-12 md:col-span-8">
                <div className="flex items-center gap-3 mb-6">
                  <span className="cap">N°404</span>
                  <span className="cap">Off the shelf</span>
                </div>
                <h1 className="font-display font-light tracking-display leading-[0.85] text-[clamp(80px,14vw,220px)]">
                  404
                  <span className="text-akane">.</span>
                </h1>
              </div>
              <div className="col-span-12 md:col-span-4">
                <p className="text-rikyu max-w-[420px]">
                  This page slipped the inventory. Either the link is stale, or
                  the set has been retired. Try one of the doors below.
                </p>
              </div>
            </div>

            <div className="border-t border-hair pt-12 grid grid-cols-12 gap-6">
              <Link
                href="/shop"
                className="col-span-12 md:col-span-4 border border-hair p-8 bg-paper relative group hover:bg-tetsu hover:text-paper transition-colors"
              >
                <span className="corner-mark top-4 right-4 group-hover:text-[rgba(245,245,245,0.55)]">
                  01
                </span>
                <span className="cap mb-3 block group-hover:text-[rgba(245,245,245,0.55)]">
                  Full Index
                </span>
                <h2 className="font-display text-[28px] leading-[1.1]">
                  Browse every set
                </h2>
              </Link>
              <Link
                href="/search"
                className="col-span-12 md:col-span-4 border border-hair p-8 bg-paper relative group hover:bg-tetsu hover:text-paper transition-colors"
              >
                <span className="corner-mark top-4 right-4 group-hover:text-[rgba(245,245,245,0.55)]">
                  02
                </span>
                <span className="cap mb-3 block group-hover:text-[rgba(245,245,245,0.55)]">
                  Search
                </span>
                <h2 className="font-display text-[28px] leading-[1.1]">
                  Look for something specific
                </h2>
              </Link>
              <Link
                href="/"
                className="col-span-12 md:col-span-4 border border-hair p-8 bg-paper relative group hover:bg-tetsu hover:text-paper transition-colors"
              >
                <span className="corner-mark top-4 right-4 group-hover:text-[rgba(245,245,245,0.55)]">
                  03
                </span>
                <span className="cap mb-3 block group-hover:text-[rgba(245,245,245,0.55)]">
                  Home
                </span>
                <h2 className="font-display text-[28px] leading-[1.1]">
                  Back to the front
                </h2>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

import type { Metadata } from "next";
import { AnnouncementTicker } from "@/app/components/AnnouncementTicker";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";
export const metadata: Metadata = {
  title: "Order Confirmed · Nailismo",
  description: "Order received. What happens next.",
  alternates: { canonical: "/thank-you" },
  robots: { index: false, follow: true },
};

export const dynamic = "force-dynamic";

type SearchParams = { order?: string; email?: string };

const NEXT_STEPS = [
  {
    num: "01",
    label: "Confirmation Email",
    body: "Receipt and tracking link land in your inbox within minutes. Check spam if it doesn't show.",
  },
  {
    num: "02",
    label: "Ships in 24h",
    body: "Orders placed before 2pm ET ship same business day from Brooklyn. Tracking starts the moment the label prints.",
  },
  {
    num: "03",
    label: "Apply With Confidence",
    body: "Each set ships with sizing tabs, prep wipes, and a one-page application card. Or watch the 90-second guide.",
  },
];

export default async function ThankYouPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { order, email } = await searchParams;

  return (
    <>
      <AnnouncementTicker />
      <Header />
      <main className="bg-paper relative overflow-hidden">
        <section className="sec pb-0">
          <div className="nail-container">
            <nav className="mb-10 flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase font-mono text-rikyu">
              <a href="/" className="ulink">Home</a>
              <span>/</span>
              <span className="text-tetsu">Confirmation</span>
            </nav>

            <div className="grid grid-cols-12 gap-6 items-end">
              <div className="col-span-12 md:col-span-8">
                <div className="flex items-center gap-3 mb-6">
                  <span className="tape">Order Placed</span>
                  <span className="cap">Confirmation · {new Date().getFullYear()}</span>
                </div>
                <h1 className="font-display font-light tracking-display leading-[0.9] text-[clamp(48px,7vw,108px)]">
                  Thank
                  <br />
                  <span className="italic font-serif font-light">you</span>
                  <span className="text-akane">.</span>
                </h1>
              </div>
              <div className="col-span-12 md:col-span-4">
                <p className="text-rikyu max-w-[420px]">
                  Order received. You&apos;ll get a confirmation email shortly with
                  tracking. Shopify clears your cart automatically.
                </p>
                {(order || email) && (
                  <div className="mt-6 border-t border-hair pt-4 space-y-1 text-[13px]">
                    {order && (
                      <div>
                        <span className="cap mr-2">Order</span>
                        <span className="font-mono text-tetsu">{order}</span>
                      </div>
                    )}
                    {email && (
                      <div>
                        <span className="cap mr-2">Sent to</span>
                        <span className="text-tetsu">{email}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="sec pt-12 md:pt-16">
          <div className="nail-container">
            <div className="border-t border-hair pt-12 mb-12">
              <span className="cap mb-8 block">What Happens Next</span>
              <div className="grid grid-cols-12 gap-6">
                {NEXT_STEPS.map((s) => (
                  <article
                    key={s.num}
                    className="col-span-12 md:col-span-4 border border-hair p-8 bg-paper relative"
                  >
                    <span className="corner-mark top-4 right-4">{s.num}</span>
                    <span className="cap mb-3 block">{s.label}</span>
                    <p className="font-display text-[20px] leading-[1.2] text-tetsu">
                      {s.body}
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <div className="bg-tetsu text-paper p-10 md:p-14 grid grid-cols-12 gap-8 items-center">
              <div className="col-span-12 md:col-span-7">
                <span className="cap cap-dark mb-3 block">While You Wait</span>
                <h2 className="font-display text-[32px] md:text-[44px] leading-[1.05]">
                  Pick your next set
                  <span className="text-akane">.</span>
                </h2>
                <p className="mt-4 text-[15px] text-[rgba(245,245,245,0.78)] max-w-[480px]">
                  Most men build a rotation of three: daily stealth, weekend
                  signal, statement night. Get the next two in queue.
                </p>
              </div>
              <div className="col-span-12 md:col-span-5 flex md:justify-end gap-3 flex-wrap">
                <a href="/shop" className="btn-on-dark">
                  Open The Index <span className="arrow">→</span>
                </a>
                <a href="/lookbook" className="btn-ghost-on-dark">
                  Lookbook <span className="arrow">→</span>
                </a>
              </div>
            </div>

            <div className="mt-12 flex items-center justify-between flex-wrap gap-3 border-t border-hair pt-8">
              <span className="cap">Need help? hello@nailismo.com</span>
              <a href="/account" className="ulink cap">Track in account →</a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

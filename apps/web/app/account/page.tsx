import Link from "next/link";
import type { Metadata } from "next";
import { AnnouncementTicker } from "@/app/components/AnnouncementTicker";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";

export const metadata: Metadata = {
  title: "Account · Nailismo",
  description:
    "Sign in to your Nailismo account. Track orders, manage addresses, reorder favorites.",
  alternates: { canonical: "/account" },
  robots: { index: false, follow: true },
};

const shopDomain = process.env.SHOPIFY_STORE_DOMAIN ?? "";
const loginUrl = shopDomain ? `https://${shopDomain}/account/login` : "#";
const registerUrl = shopDomain ? `https://${shopDomain}/account/register` : "#";
const ordersUrl = shopDomain ? `https://${shopDomain}/account/orders` : "#";

export default function AccountPage() {
  return (
    <>
      <AnnouncementTicker />
      <Header />
      <main className="bg-paper relative overflow-hidden">
        <section className="sec pb-0">
          <div className="nail-container">
            <nav className="mb-10 flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase font-mono text-rikyu">
              <Link href="/" className="ulink">Home</Link>
              <span>/</span>
              <span className="text-tetsu">Account</span>
            </nav>

            <div className="grid grid-cols-12 gap-6 items-end">
              <div className="col-span-12 md:col-span-7">
                <div className="flex items-center gap-3 mb-6">
                  <span className="cap">N°00</span>
                  <span className="cap">Account · Members</span>
                </div>
                <h1 className="font-display font-light tracking-display leading-[0.9] text-[clamp(48px,7vw,108px)]">
                  Your
                  <br />
                  <span className="italic font-serif font-light">account</span>
                  <span className="text-akane">.</span>
                </h1>
              </div>
              <div className="col-span-12 md:col-span-5">
                <p className="text-rikyu max-w-[420px]">
                  Sign-in, order history, and address management run on
                  Shopify&apos;s secure account portal. Same credentials work for
                  checkout.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="sec pt-12 md:pt-16">
          <div className="nail-container">
            <div className="border-t border-hair pt-12 grid grid-cols-12 gap-8">
              <div className="col-span-12 md:col-span-6 border border-hair p-8 bg-toriko relative">
                <span className="corner-mark top-4 right-4">01 · Returning</span>
                <span className="cap mb-3 block">Sign in</span>
                <h2 className="font-display text-[28px] md:text-[32px] leading-[1.05]">
                  Already have an account?
                </h2>
                <p className="mt-3 text-rikyu text-[14px] max-w-[340px]">
                  Pull up past orders, addresses, and saved sets.
                </p>
                <a href={loginUrl} className="btn-primary mt-8 inline-flex">
                  Sign In <span className="arrow">→</span>
                </a>
              </div>
              <div className="col-span-12 md:col-span-6 border border-hair p-8 bg-paper relative">
                <span className="corner-mark top-4 right-4">02 · New</span>
                <span className="cap mb-3 block">Create</span>
                <h2 className="font-display text-[28px] md:text-[32px] leading-[1.05]">
                  First time here?
                </h2>
                <p className="mt-3 text-rikyu text-[14px] max-w-[340px]">
                  Build an account in 30 seconds. Faster checkout, order tracking,
                  early access to drops.
                </p>
                <a href={registerUrl} className="btn-ghost mt-8 inline-flex">
                  Create Account <span className="arrow">→</span>
                </a>
              </div>
            </div>

            <div className="mt-16 border border-hair p-8 grid grid-cols-12 gap-8 items-center">
              <div className="col-span-12 md:col-span-7">
                <span className="cap mb-3 block">Order Lookup</span>
                <h3 className="font-display text-[24px] md:text-[28px] leading-[1.1]">
                  Guest checkout? Track your order with the link in your
                  confirmation email — or sign in to view all orders in one place.
                </h3>
              </div>
              <div className="col-span-12 md:col-span-5 flex md:justify-end">
                <a href={ordersUrl} className="btn-ghost">
                  Open Orders <span className="arrow">→</span>
                </a>
              </div>
            </div>

            <div className="mt-12 flex items-center justify-between flex-wrap gap-3 border-t border-hair pt-8">
              <span className="cap">Secure · Shopify customer accounts</span>
              <Link href="/shop" className="ulink cap">Back to shop →</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

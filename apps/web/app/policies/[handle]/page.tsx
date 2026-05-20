import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { storefrontFetch, ShopifyConfigError } from "@/lib/shopify/client";
import { SHOP_POLICIES_QUERY } from "@/lib/shopify/queries";
import type { ShopPoliciesQueryResult, ShopifyPolicy } from "@/lib/shopify/types";
import { AnnouncementTicker } from "@/app/components/AnnouncementTicker";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";

type Params = { handle: string };

const SLUG_MAP: Record<string, keyof ShopPoliciesQueryResult["shop"]> = {
  privacy: "privacyPolicy",
  "privacy-policy": "privacyPolicy",
  returns: "refundPolicy",
  refund: "refundPolicy",
  "refund-policy": "refundPolicy",
  shipping: "shippingPolicy",
  "shipping-policy": "shippingPolicy",
  terms: "termsOfService",
  "terms-of-service": "termsOfService",
  subscription: "subscriptionPolicy",
};

async function fetchPolicies(): Promise<ShopPoliciesQueryResult["shop"] | null> {
  try {
    const data = await storefrontFetch<ShopPoliciesQueryResult>(
      SHOP_POLICIES_QUERY,
      {},
      { revalidate: 3600 },
    );
    return data.shop;
  } catch (err) {
    if (!(err instanceof ShopifyConfigError)) {
      console.error("[shopify] policies fetch failed:", err);
    }
    return null;
  }
}

const FALLBACK_POLICIES: Record<string, ShopifyPolicy> = {
  shipping: {
    handle: "shipping",
    title: "Shipping",
    url: "",
    body: `
      <p>Every order ships from our Brooklyn warehouse within one business day. You'll get tracking the moment your label prints.</p>
      <h2>Domestic (US)</h2>
      <ul>
        <li><strong>Standard</strong> · 3–5 business days · Free on orders over $60</li>
        <li><strong>Express</strong> · 1–2 business days · $14 flat</li>
      </ul>
      <h2>International</h2>
      <p>We ship to 38 countries via DHL Express. Rates calculated at checkout. Import duties may apply at delivery.</p>
      <h2>Order Cutoff</h2>
      <p>Orders placed before 2pm ET ship same day, Monday through Friday. Weekend orders ship Monday.</p>
      <h2>Lost or Delayed</h2>
      <p>Tracking stuck for more than 7 business days? Email <a href="mailto:hello@nailismo.com">hello@nailismo.com</a> — we'll re-ship at no charge.</p>
    `,
  },
  returns: {
    handle: "returns",
    title: "Returns",
    url: "",
    body: `
      <p>If your set doesn't fit your hands, your finish, or your life, we'll take it back within 30 days of delivery.</p>
      <h2>What's eligible</h2>
      <ul>
        <li>Unopened sets in original packaging</li>
        <li>Defective or damaged-in-transit items (no return required — send a photo)</li>
      </ul>
      <h2>What's not</h2>
      <ul>
        <li>Sets that have been worn, glued, or removed from sealed trays</li>
        <li>Adhesive and removal accessories (hygiene)</li>
      </ul>
      <h2>How to start</h2>
      <p>Email <a href="mailto:hello@nailismo.com">hello@nailismo.com</a> with your order number. We'll send a prepaid return label and refund within 5 business days of receipt.</p>
      <h2>Exchanges</h2>
      <p>Sizing off? Tell us your nail measurements and we'll cross-ship the correct fit before the original returns.</p>
    `,
  },
  terms: {
    handle: "terms",
    title: "Terms of Service",
    url: "",
    body: `
      <p>By using nailismo.com you agree to these terms. They cover orders, intellectual property, and the limits of our liability.</p>
      <h2>Orders</h2>
      <p>We may refuse or cancel any order at our discretion, including for suspected fraud, pricing errors, or limited availability.</p>
      <h2>Pricing & Promotions</h2>
      <p>Prices are listed in USD and may change without notice. Promotional codes are single-use unless stated otherwise.</p>
      <h2>Intellectual Property</h2>
      <p>All content — copy, imagery, product design, and the Nailismo wordmark — is owned by Nailismo Inc. Don't reproduce without written permission.</p>
      <h2>User Content</h2>
      <p>By tagging us in your photos, you grant Nailismo a non-exclusive license to repost with credit.</p>
      <h2>Limitation of Liability</h2>
      <p>To the maximum extent permitted by law, Nailismo is not liable for indirect, incidental, or consequential damages arising from product use.</p>
      <h2>Governing Law</h2>
      <p>These terms are governed by the laws of the State of New York.</p>
      <h2>Contact</h2>
      <p>Questions? <a href="mailto:hello@nailismo.com">hello@nailismo.com</a></p>
    `,
  },
  privacy: {
    handle: "privacy",
    title: "Privacy Policy",
    url: "",
    body: `
      <p>We collect the minimum data needed to run the store: name, email, shipping address, and payment method (processed by Shopify, never stored on our servers).</p>
      <h2>What we collect</h2>
      <ul>
        <li>Order and account details you provide at checkout or signup</li>
        <li>Basic analytics (page views, referrers) via privacy-friendly tooling</li>
      </ul>
      <h2>How we use it</h2>
      <ul>
        <li>Fulfill orders and provide customer service</li>
        <li>Send order updates and (with consent) marketing emails</li>
      </ul>
      <h2>Your rights</h2>
      <p>Email <a href="mailto:hello@nailismo.com">hello@nailismo.com</a> to request access, correction, or deletion of your data.</p>
    `,
  },
};

function resolvePolicy(
  shop: ShopPoliciesQueryResult["shop"] | null,
  handle: string,
): ShopifyPolicy | null {
  if (shop) {
    const key = SLUG_MAP[handle];
    if (key && shop[key]) return shop[key];
    for (const policy of Object.values(shop)) {
      if (policy && policy.handle === handle) return policy;
    }
  }
  const FALLBACK_ALIAS: Record<string, string> = {
    "privacy-policy": "privacy",
    "refund-policy": "returns",
    refund: "returns",
    "shipping-policy": "shipping",
    "terms-of-service": "terms",
  };
  const fallbackKey = FALLBACK_ALIAS[handle] ?? handle;
  return FALLBACK_POLICIES[fallbackKey] ?? null;
}

export async function generateStaticParams(): Promise<Params[]> {
  return Object.keys(SLUG_MAP).map((handle) => ({ handle }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { handle } = await params;
  const shop = await fetchPolicies();
  const policy = resolvePolicy(shop, handle);
  if (!policy) return { title: "Policy Not Found · Nailismo" };
  return {
    title: `${policy.title} · Nailismo`,
    description: policy.body.replace(/<[^>]+>/g, "").slice(0, 160),
    alternates: { canonical: `/policies/${handle}` },
  };
}

const POLICY_INDEX = [
  { slug: "shipping", label: "Shipping" },
  { slug: "returns", label: "Returns" },
  { slug: "privacy", label: "Privacy" },
  { slug: "terms", label: "Terms" },
];

export default async function PolicyPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { handle } = await params;
  const shop = await fetchPolicies();
  const policy = resolvePolicy(shop, handle);
  if (!policy) notFound();

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
              <a href="/policies/shipping" className="ulink">Policies</a>
              <span>/</span>
              <span className="text-tetsu">{policy.title}</span>
            </nav>

            <div className="grid grid-cols-12 gap-6 items-end">
              <div className="col-span-12 md:col-span-8">
                <div className="flex items-center gap-3 mb-6">
                  <span className="cap">Policy</span>
                  <span className="cap">{policy.handle}</span>
                </div>
                <h1 className="font-display font-light tracking-display leading-[0.9] text-[clamp(40px,6vw,88px)]">
                  {policy.title}
                  <span className="text-akane">.</span>
                </h1>
              </div>
              <div className="col-span-12 md:col-span-4">
                <p className="text-rikyu max-w-[420px]">
                  Plain-language policy text, kept in sync with our Shopify store.
                  Questions? <a href="/contact" className="ulink text-tetsu">Get in touch</a>.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="sec pt-12 md:pt-16">
          <div className="nail-container">
            <div className="border-t border-hair pt-12 grid grid-cols-12 gap-10">
              <aside className="col-span-12 md:col-span-3">
                <span className="cap mb-4 block">Index</span>
                <ul className="space-y-2 text-[14px]">
                  {POLICY_INDEX.map((p) => {
                    const active = p.slug === handle || (handle === "privacy-policy" && p.slug === "privacy");
                    return (
                      <li key={p.slug}>
                        <a
                          href={`/policies/${p.slug}`}
                          className={`ulink ${active ? "text-akane" : "text-tetsu"}`}
                        >
                          {p.label}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </aside>
              <article className="col-span-12 md:col-span-9">
                <div
                  className="text-[16px] text-tetsu leading-[1.75] max-w-[720px] [&_h1]:font-display [&_h1]:text-[28px] [&_h1]:mt-10 [&_h1]:mb-4 [&_h2]:font-display [&_h2]:text-[22px] [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:font-display [&_h3]:text-[18px] [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-4 [&_a]:underline [&_a:hover]:text-akane [&_strong]:font-semibold"
                  dangerouslySetInnerHTML={{ __html: policy.body }}
                />
                <div className="mt-12 pt-6 border-t border-hair flex items-center justify-between flex-wrap gap-3">
                  <span className="cap">Source · Shopify store policies</span>
                  <a href="/contact" className="ulink cap">Questions →</a>
                </div>
              </article>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

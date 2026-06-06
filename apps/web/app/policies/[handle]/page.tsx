import Link from "next/link";
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
        <li><strong>Standard</strong> · 3–5 business days · Free on orders over $35</li>
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
  const description = policy.body.replace(/<[^>]+>/g, "").slice(0, 160);
  return {
    title: `${policy.title} · Nailismo`,
    description,
    alternates: { canonical: `/policies/${handle}` },
    openGraph: {
      title: `${policy.title} · Nailismo`,
      description,
      type: "article",
      url: `/policies/${handle}`,
    },
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
      <main className="candy-wrap candy-sec" style={{ paddingTop: 36 }}>
        <nav style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          <Link href="/" className="candy-crumb">Home</Link>
          <Link href="/policies/shipping" className="candy-crumb">Policies</Link>
          <span className="candy-crumb" aria-current="page" style={{ background: "var(--lemon)" }}>{policy.title}</span>
        </nav>

        <div className="candy-pagehead">
          <span className="candy-eyebrow">Policy</span>
          <h1 style={{ marginTop: 10 }}>{policy.title}</h1>
          <p>Plain-language policy, kept in sync with our store. Questions? <Link href="/contact" style={{ color: "var(--soda)", textDecoration: "underline", textUnderlineOffset: 3 }}>Get in touch</Link>.</p>
        </div>

        <div className="grid grid-cols-12 gap-8 md:gap-10" style={{ marginTop: 40 }}>
          <aside className="col-span-12 md:col-span-3">
            <span className="candy-eyebrow" style={{ display: "block", marginBottom: 12 }}>Index</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {POLICY_INDEX.map((p) => {
                const active = p.slug === handle || (handle === "privacy-policy" && p.slug === "privacy");
                return (
                  <Link key={p.slug} href={`/policies/${p.slug}`} className={`candy-chip ${active ? "is-active" : ""}`}>{p.label}</Link>
                );
              })}
            </div>
          </aside>
          <article className="col-span-12 md:col-span-9">
            <div className="candy-prose" dangerouslySetInnerHTML={{ __html: policy.body }} />
            <div style={{ marginTop: 40, paddingTop: 24, borderTop: "2px solid var(--marshmallow)", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <span className="candy-eyebrow">Synced from store policies</span>
              <Link href="/contact" className="candy-btn is-ghost" style={{ padding: "10px 18px", fontSize: 14 }}>Questions</Link>
            </div>
          </article>
        </div>
      </main>
      <Footer />
    </>
  );
}

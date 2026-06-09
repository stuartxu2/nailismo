import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { storefrontFetch, ShopifyConfigError } from "@/lib/shopify/client";
import { SHOP_POLICIES_QUERY } from "@/lib/shopify/queries";
import type { ShopPoliciesQueryResult, ShopifyPolicy } from "@/lib/shopify/types";

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
      <p>Every order ships from our Los Angeles warehouse within one business day. You'll get tracking the moment your label prints.</p>
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
      <p>All content — copy, imagery, product design, and the Nailismo wordmark — is owned by Premium Purring LLC. Don't reproduce without written permission.</p>
      <h2>User Content</h2>
      <p>By tagging us in your photos, you grant Nailismo a non-exclusive license to repost with credit.</p>
      <h2>Limitation of Liability</h2>
      <p>To the maximum extent permitted by law, Nailismo is not liable for indirect, incidental, or consequential damages arising from product use.</p>
      <h2>Governing Law</h2>
      <p>These terms are governed by the laws of the State of California.</p>
      <h2>Contact</h2>
      <p>Questions? <a href="mailto:hello@nailismo.com">hello@nailismo.com</a></p>
    `,
  },
  privacy: {
    handle: "privacy",
    title: "Privacy Policy",
    url: "",
    body: `
      <p><strong>Effective June 9, 2026.</strong> This Privacy Policy explains how Premium Purring LLC ("Nailismo," "we," "us") collects, uses, and shares personal information when you visit nailismo.com or place an order, and the rights you have under California law (CCPA/CPRA).</p>
      <h2>Who we are</h2>
      <p>The business responsible for your personal information is Premium Purring LLC, 3900 W 1st St., Los Angeles, CA 90004, USA. Reach us anytime at <a href="mailto:hello@nailismo.com">hello@nailismo.com</a>.</p>
      <h2>Information we collect</h2>
      <ul>
        <li><strong>Identifiers</strong> — name, email, shipping and billing address, phone number.</li>
        <li><strong>Order &amp; commercial data</strong> — products purchased, order history, transaction amounts.</li>
        <li><strong>Payment data</strong> — processed by Shopify and its payment partners; we never see or store full card numbers on our servers.</li>
        <li><strong>Internet activity</strong> — pages viewed, referrers, device and browser type, and similar analytics.</li>
        <li><strong>Approximate location</strong> — coarse location inferred from your IP address.</li>
      </ul>
      <p>We do not request, and do not knowingly collect, sensitive personal information.</p>
      <h2>Where it comes from</h2>
      <p>Directly from you — at checkout, signup, or when you contact us — and automatically from your device via cookies and similar technologies.</p>
      <h2>How we use it</h2>
      <ul>
        <li>Fulfill and ship your orders, and provide customer service.</li>
        <li>Send order and shipping updates.</li>
        <li>Send marketing emails where you have opted in (unsubscribe anytime).</li>
        <li>Measure and improve the store, and keep it secure and fraud-free.</li>
        <li>Comply with our legal obligations.</li>
      </ul>
      <h2>Who we share it with</h2>
      <p>We share personal information only with service providers that help us run the store, under contracts that limit how they use it:</p>
      <ul>
        <li><strong>Shopify Inc.</strong> — catalog, checkout, and payment processing.</li>
        <li><strong>Vercel Inc.</strong> — website hosting.</li>
        <li><strong>Shipping carriers</strong> — to deliver your order.</li>
        <li><strong>Email &amp; analytics providers</strong> — to send updates and understand site usage.</li>
      </ul>
      <p><strong>We do not sell your personal information for money.</strong> If we ever share information for cross-context behavioral advertising, we will honor your right to opt out (below). We may also disclose information when required by law or to protect our rights.</p>
      <h2>Cookies &amp; tracking</h2>
      <p>We use cookies and similar technologies for essential site function, to remember your cart, and for basic analytics. You can control cookies through your browser settings; blocking some may affect how the store works.</p>
      <h2>How long we keep it</h2>
      <p>We keep order records as long as needed to fulfill the order and meet tax, accounting, and legal requirements, then delete or anonymize them. Marketing data is kept until you unsubscribe.</p>
      <h2>Your California privacy rights</h2>
      <p>If you are a California resident, you have the right to:</p>
      <ul>
        <li><strong>Know</strong> what personal information we collect, use, and share.</li>
        <li><strong>Access</strong> a copy of your personal information.</li>
        <li><strong>Delete</strong> your personal information.</li>
        <li><strong>Correct</strong> inaccurate personal information.</li>
        <li><strong>Opt out</strong> of any "sale" or "sharing" of personal information.</li>
        <li><strong>Non-discrimination</strong> — we will not treat you differently for exercising these rights.</li>
      </ul>
      <p>To exercise any right, email <a href="mailto:hello@nailismo.com">hello@nailismo.com</a> with the subject "Privacy Request." We verify your identity using your order or account details before acting, and you may use an authorized agent. We respond within the timeframes required by law.</p>
      <h2>Children</h2>
      <p>The store is not directed to children under 16, and we do not knowingly collect their personal information.</p>
      <h2>Security</h2>
      <p>We use reasonable technical and organizational measures to protect personal information. No method of transmission or storage is 100% secure, but we work to keep your data safe.</p>
      <h2>Changes</h2>
      <p>We may update this policy from time to time. The "Effective" date above reflects the latest version.</p>
      <h2>Contact</h2>
      <p>Questions about your privacy? Email <a href="mailto:hello@nailismo.com">hello@nailismo.com</a> or write to Premium Purring LLC, 3900 W 1st St., Los Angeles, CA 90004, USA.</p>
    `,
  },
  "legal-notice": {
    handle: "legal-notice",
    title: "Legal Notice",
    url: "",
    body: `
      <p>This legal notice identifies the publisher of nailismo.com and the party responsible for its content.</p>
      <h2>Publisher</h2>
      <p>The website nailismo.com ("the Site") is published by:</p>
      <ul>
        <li><strong>Legal entity:</strong> Premium Purring LLC</li>
        <li><strong>Registered address:</strong> 3900 W 1st St., Los Angeles, CA 90004, USA</li>
        <li><strong>Business registration:</strong> EIN 99-2677551</li>
      </ul>
      <h2>Contact</h2>
      <p>Email <a href="mailto:hello@nailismo.com">hello@nailismo.com</a> for any question regarding the Site or its content.</p>
      <h2>Hosting</h2>
      <p>The Site is hosted by Vercel Inc., San Francisco, California, USA — <a href="https://vercel.com" rel="nofollow">vercel.com</a>. Catalog, checkout, and payment processing are operated by Shopify Inc.</p>
      <h2>Intellectual property</h2>
      <p>All content on the Site — copy, imagery, product design, and the Nailismo wordmark — is the property of Premium Purring LLC and protected by intellectual-property law. Reproduction without written permission is prohibited. See our <a href="/policies/terms">Terms of Service</a> for details.</p>
      <h2>Personal data</h2>
      <p>How we handle personal data is described in our <a href="/policies/privacy">Privacy Policy</a>.</p>
      <h2>Governing law</h2>
      <p>The Site and this notice are governed by the laws of the State of California, USA.</p>
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

// Custom pages with no Shopify-native policy field (resolved from FALLBACK_POLICIES).
const CUSTOM_SLUGS = ["legal-notice"];

export async function generateStaticParams(): Promise<Params[]> {
  return [...Object.keys(SLUG_MAP), ...CUSTOM_SLUGS].map((handle) => ({ handle }));
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
  { slug: "legal-notice", label: "Legal" },
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
    </>
  );
}

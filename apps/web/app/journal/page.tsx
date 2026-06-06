import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { storefrontFetch, ShopifyConfigError } from "@/lib/shopify/client";
import { ARTICLES_QUERY } from "@/lib/shopify/queries";
import type { ArticlesQueryResult, ShopifyArticleSummary } from "@/lib/shopify/types";

export const metadata: Metadata = {
  title: "Journal · Nailismo",
  description:
    "Notes on finish, fit, and form. Essays, application guides, and field reports from the Nailismo desk.",
  alternates: { canonical: "/journal" },
};

async function fetchArticles(): Promise<ShopifyArticleSummary[]> {
  try {
    const data = await storefrontFetch<ArticlesQueryResult>(
      ARTICLES_QUERY,
      { first: 50 },
      { revalidate: 600 },
    );
    return data.articles.nodes;
  } catch (err) {
    if (!(err instanceof ShopifyConfigError)) {
      console.error("[shopify] articles fetch failed:", err);
    }
    return [];
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function JournalPage() {
  const articles = await fetchArticles();
  const [hero, ...rest] = articles;

  return (
    <>
      <main className="candy-wrap candy-sec" style={{ paddingTop: 36 }}>
        <nav style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <Link href="/" className="candy-crumb">Home</Link>
          <span className="candy-crumb" aria-current="page" style={{ background: "var(--lemon)" }}>Journal</span>
        </nav>

        <div className="candy-pagehead">
          <span className="candy-eyebrow">Notes &amp; guides</span>
          <h1 style={{ marginTop: 10 }}>The journal</h1>
          <p>Styling ideas, application tips, and behind-the-scenes from the Nailismo desk. <strong>{articles.length}</strong> {articles.length === 1 ? "entry" : "entries"}.</p>
        </div>

        <div style={{ marginTop: 40 }}>
          {articles.length === 0 ? (
            <div className="candy-empty">
              <div className="emoji" aria-hidden>📓</div>
              <h2>First entries drop soon</h2>
              <p>Join the candy club to get the first one in your inbox.</p>
              <Link href="/#newsletter" className="candy-btn" style={{ marginTop: 22 }}>Join the list</Link>
            </div>
          ) : (
            <>
              {hero && (
                <Link href={`/journal/${hero.handle}`} className="candy-card" style={{ marginBottom: 32, padding: 16 }}>
                  <div className="grid grid-cols-12 gap-6 md:gap-8 items-center">
                    <div className="col-span-12 md:col-span-7" style={{ position: "relative", aspectRatio: "16/10", borderRadius: 18, overflow: "hidden", border: "2px solid var(--ink)" }}>
                      {hero.image && (
                        <Image src={hero.image.url} alt={hero.image.altText ?? hero.title} fill sizes="(max-width:768px) 100vw, 60vw" style={{ objectFit: "cover" }} />
                      )}
                      <span className="candy-sticker is-gum" style={{ position: "absolute", top: 12, left: 12 }}>Featured</span>
                    </div>
                    <div className="col-span-12 md:col-span-5" style={{ padding: "8px 8px 8px 0" }}>
                      <span className="candy-eyebrow">{formatDate(hero.publishedAt)}{hero.authorV2?.name ? ` · ${hero.authorV2.name}` : ""}</span>
                      <h2 style={{ fontSize: "clamp(28px,3.4vw,48px)", marginTop: 10 }}>{hero.title}</h2>
                      {hero.excerpt && <p style={{ marginTop: 12, fontWeight: 600, color: "var(--ink-soft)", lineHeight: 1.6 }}>{hero.excerpt}</p>}
                      <span className="candy-chip" style={{ marginTop: 16, cursor: "pointer" }}>Read entry →</span>
                    </div>
                  </div>
                </Link>
              )}

              {rest.length > 0 && (
                <div className="candy-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
                  {rest.map((a) => (
                    <Link key={a.id} href={`/journal/${a.handle}`} className="candy-card">
                      <div className="candy-card-img" style={{ aspectRatio: "4/3" }}>
                        {a.image && (
                          <Image src={a.image.url} alt={a.image.altText ?? a.title} fill sizes="(max-width:640px) 100vw, 33vw" />
                        )}
                      </div>
                      <div style={{ padding: "16px 6px 6px" }}>
                        <span className="candy-eyebrow" style={{ fontSize: 11 }}>{formatDate(a.publishedAt)}</span>
                        <h3 style={{ fontSize: 22, marginTop: 8 }}>{a.title}</h3>
                        {a.excerpt && <p style={{ marginTop: 8, fontSize: 14, fontWeight: 600, color: "var(--ink-soft)", lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{a.excerpt}</p>}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </>
  );
}

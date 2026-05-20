import type { Metadata } from "next";
import { storefrontFetch, ShopifyConfigError } from "@/lib/shopify/client";
import { ARTICLES_QUERY } from "@/lib/shopify/queries";
import type { ArticlesQueryResult, ShopifyArticleSummary } from "@/lib/shopify/types";
import { AnnouncementTicker } from "@/app/components/AnnouncementTicker";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";

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
      <AnnouncementTicker />
      <Header />
      <main className="bg-paper relative overflow-hidden">
        <section className="sec pb-0">
          <div className="nail-container">
            <nav className="mb-10 flex items-center gap-2 text-[11px] tracking-[0.22em] uppercase font-mono text-rikyu">
              <a href="/" className="ulink">Home</a>
              <span>/</span>
              <span className="text-tetsu">Journal</span>
            </nav>

            <div className="grid grid-cols-12 gap-6 items-end">
              <div className="col-span-12 md:col-span-7">
                <div className="flex items-center gap-3 mb-6">
                  <span className="cap">N°00</span>
                  <span className="cap">Notes · Field Reports</span>
                </div>
                <h1 className="font-display font-light tracking-display leading-[0.9] text-[clamp(48px,7vw,108px)]">
                  The
                  <br />
                  <span className="italic font-serif font-light">journal</span>
                  <span className="text-akane">.</span>
                </h1>
              </div>
              <div className="col-span-12 md:col-span-5">
                <p className="text-rikyu max-w-[420px]">
                  Essays on finish, fit, and the politics of a manicured hand.
                  Application guides. Notes from the desk.
                </p>
                <div className="mt-6 cap">
                  {articles.length} {articles.length === 1 ? "entry" : "entries"}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="sec pt-12 md:pt-16">
          <div className="nail-container">
            {articles.length === 0 ? (
              <div className="border-t border-hair pt-12">
                <div className="border border-hair py-24 text-center">
                  <span className="cap block mb-4">Coming Soon</span>
                  <p className="font-display text-[32px] text-tetsu max-w-[480px] mx-auto leading-[1.15]">
                    First field reports drop next week.
                  </p>
                  <p className="text-rikyu mt-3 max-w-[360px] mx-auto text-[14px]">
                    Subscribe below to get the inaugural essay in your inbox.
                  </p>
                  <a href="/#newsletter" className="btn-primary mt-8 inline-flex">
                    Join The List <span className="arrow">→</span>
                  </a>
                </div>
              </div>
            ) : (
              <>
                {hero && (
                  <a
                    href={`/journal/${hero.handle}`}
                    className="block border-t border-hair pt-12 mb-16 group"
                  >
                    <div className="grid grid-cols-12 gap-8 items-center">
                      <div className="col-span-12 md:col-span-7 relative aspect-[16/10] overflow-hidden bg-shiracha border border-hair">
                        {hero.image && (
                          <img
                            src={hero.image.url}
                            alt={hero.image.altText ?? hero.title}
                            className="img-cover edit-image"
                          />
                        )}
                        <span className="absolute top-3 left-3 cap text-paper bg-tetsu px-2 py-1">
                          Featured
                        </span>
                      </div>
                      <div className="col-span-12 md:col-span-5">
                        <div className="flex items-center gap-3 mb-4">
                          <span className="cap">{formatDate(hero.publishedAt)}</span>
                          {hero.authorV2?.name && (
                            <>
                              <span aria-hidden>·</span>
                              <span className="cap">{hero.authorV2.name}</span>
                            </>
                          )}
                        </div>
                        <h2 className="font-display text-[clamp(32px,4vw,56px)] leading-[1.05] tracking-display ulink">
                          {hero.title}
                        </h2>
                        {hero.excerpt && (
                          <p className="mt-4 text-rikyu text-[16px] leading-[1.65] max-w-[460px]">
                            {hero.excerpt}
                          </p>
                        )}
                        <span className="mt-6 inline-block cap text-tetsu">
                          Read entry →
                        </span>
                      </div>
                    </div>
                  </a>
                )}

                {rest.length > 0 && (
                  <div className="border-t border-hair pt-12 grid grid-cols-12 gap-6">
                    {rest.map((a) => (
                      <article
                        key={a.id}
                        className="col-span-12 md:col-span-6 lg:col-span-4 border border-hair bg-paper flex flex-col edit-card"
                      >
                        <a
                          href={`/journal/${a.handle}`}
                          className="relative aspect-[4/3] overflow-hidden bg-shiracha block"
                        >
                          {a.image && (
                            <img
                              src={a.image.url}
                              alt={a.image.altText ?? a.title}
                              className="img-cover edit-image"
                            />
                          )}
                        </a>
                        <div className="p-6 flex flex-col flex-1">
                          <span className="cap mb-2">{formatDate(a.publishedAt)}</span>
                          <h3 className="font-display text-[22px] leading-[1.15]">
                            <a href={`/journal/${a.handle}`} className="ulink">
                              {a.title}
                            </a>
                          </h3>
                          {a.excerpt && (
                            <p className="mt-3 text-rikyu text-[14px] leading-[1.6] line-clamp-3">
                              {a.excerpt}
                            </p>
                          )}
                          <div className="mt-auto pt-4">
                            <a
                              href={`/journal/${a.handle}`}
                              className="ulink text-[10px] tracking-[0.18em] uppercase font-medium"
                            >
                              Read →
                            </a>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { storefrontFetch, ShopifyConfigError } from "@/lib/shopify/client";
import {
  ARTICLE_BY_HANDLE_QUERY,
  ARTICLE_HANDLES_QUERY,
  ARTICLES_QUERY,
} from "@/lib/shopify/queries";
import type {
  ArticleByHandleQueryResult,
  ArticleHandlesQueryResult,
  ArticlesQueryResult,
  ShopifyArticleDetail,
  ShopifyArticleSummary,
} from "@/lib/shopify/types";
import { AnnouncementTicker } from "@/app/components/AnnouncementTicker";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";

type Params = { handle: string };

export async function generateStaticParams(): Promise<Params[]> {
  try {
    const data = await storefrontFetch<ArticleHandlesQueryResult>(
      ARTICLE_HANDLES_QUERY,
      { first: 100 },
      { revalidate: 600 },
    );
    return data.articles.nodes.map((n) => ({ handle: n.handle }));
  } catch (err) {
    if (!(err instanceof ShopifyConfigError)) {
      console.error("[shopify] article handles failed:", err);
    }
    return [];
  }
}

async function fetchArticle(handle: string): Promise<ShopifyArticleDetail | null> {
  try {
    const handles = await storefrontFetch<ArticleHandlesQueryResult>(
      ARTICLE_HANDLES_QUERY,
      { first: 100 },
      { revalidate: 600 },
    );
    const match = handles.articles.nodes.find((n) => n.handle === handle);
    if (!match) return null;
    const data = await storefrontFetch<ArticleByHandleQueryResult>(
      ARTICLE_BY_HANDLE_QUERY,
      { blog: match.blog.handle, handle },
      { revalidate: 600 },
    );
    return data.blog?.articleByHandle ?? null;
  } catch (err) {
    if (!(err instanceof ShopifyConfigError)) {
      console.error(`[shopify] article fetch failed for ${handle}:`, err);
    }
    return null;
  }
}

async function fetchRelated(excludeId: string): Promise<ShopifyArticleSummary[]> {
  try {
    const data = await storefrontFetch<ArticlesQueryResult>(
      ARTICLES_QUERY,
      { first: 4 },
      { revalidate: 600 },
    );
    return data.articles.nodes.filter((a) => a.id !== excludeId).slice(0, 3);
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { handle } = await params;
  const article = await fetchArticle(handle);
  if (!article) return { title: "Entry Not Found · Nailismo" };
  const description =
    article.excerpt?.slice(0, 160) ||
    article.contentHtml.replace(/<[^>]+>/g, "").slice(0, 160);
  return {
    title: `${article.title} · Journal · Nailismo`,
    description,
    alternates: { canonical: `/journal/${article.handle}` },
    openGraph: {
      title: article.title,
      description,
      type: "article",
      publishedTime: article.publishedAt,
      images: article.image ? [{ url: article.image.url }] : undefined,
      authors: article.authorV2?.name ? [article.authorV2.name] : undefined,
    },
  };
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { handle } = await params;
  const article = await fetchArticle(handle);
  if (!article) notFound();
  const related = await fetchRelated(article.id);

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
              <a href="/journal" className="ulink">Journal</a>
              <span>/</span>
              <span className="text-tetsu">{article.title}</span>
            </nav>

            <div className="max-w-[820px] mx-auto text-center">
              <div className="flex items-center justify-center gap-3 mb-8">
                <span className="cap">{formatDate(article.publishedAt)}</span>
                {article.authorV2?.name && (
                  <>
                    <span aria-hidden className="text-rikyu">·</span>
                    <span className="cap">{article.authorV2.name}</span>
                  </>
                )}
              </div>
              <h1 className="font-display font-light tracking-display leading-[0.95] text-[clamp(40px,6vw,84px)]">
                {article.title}
                <span className="text-akane">.</span>
              </h1>
              {article.excerpt && (
                <p className="mt-8 font-serif italic text-rikyu text-[20px] md:text-[22px] leading-[1.55] max-w-[640px] mx-auto">
                  {article.excerpt}
                </p>
              )}
            </div>
          </div>
        </section>

        {article.image && (
          <section className="mt-12 md:mt-16">
            <div className="nail-container">
              <div className="relative aspect-[16/9] overflow-hidden bg-shiracha border border-hair">
                <img
                  src={article.image.url}
                  alt={article.image.altText ?? article.title}
                  className="img-cover"
                />
              </div>
            </div>
          </section>
        )}

        <section className="sec">
          <div className="nail-container">
            <article
              className="max-w-[720px] mx-auto text-[17px] text-tetsu leading-[1.75] [&_h1]:font-display [&_h1]:text-[36px] [&_h1]:mt-12 [&_h1]:mb-4 [&_h1]:tracking-display [&_h2]:font-display [&_h2]:text-[28px] [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:tracking-display [&_h3]:font-display [&_h3]:text-[22px] [&_h3]:mt-8 [&_h3]:mb-2 [&_p]:mb-5 [&_blockquote]:font-serif [&_blockquote]:italic [&_blockquote]:text-[22px] [&_blockquote]:border-l-2 [&_blockquote]:border-akane [&_blockquote]:pl-6 [&_blockquote]:my-8 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-5 [&_a]:underline [&_a:hover]:text-akane [&_img]:my-8 [&_strong]:font-semibold"
              dangerouslySetInnerHTML={{ __html: article.contentHtml }}
            />

            {article.tags.length > 0 && (
              <div className="max-w-[720px] mx-auto mt-12 pt-8 border-t border-hair">
                <span className="cap mb-4 block">Tags</span>
                <div className="flex flex-wrap gap-2">
                  {article.tags.map((t) => (
                    <span key={t} className="edit-pill">{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {related.length > 0 && (
          <section className="sec pt-0">
            <div className="nail-container">
              <div className="border-t border-hair pt-12 mb-8 flex items-end justify-between flex-wrap gap-4">
                <h2 className="font-display text-[28px] md:text-[36px] leading-[1.05]">
                  More from the desk
                  <span className="text-akane">.</span>
                </h2>
                <a href="/journal" className="ulink cap">All entries →</a>
              </div>
              <div className="grid grid-cols-12 gap-6">
                {related.map((a) => (
                  <article
                    key={a.id}
                    className="col-span-12 md:col-span-4 border border-hair bg-paper flex flex-col edit-card"
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
                    <div className="p-5 flex flex-col flex-1">
                      <span className="cap mb-2">{formatDate(a.publishedAt)}</span>
                      <h3 className="font-display text-[20px] leading-[1.15]">
                        <a href={`/journal/${a.handle}`} className="ulink">
                          {a.title}
                        </a>
                      </h3>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}

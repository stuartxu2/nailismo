import Link from "next/link";
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
import Image from "next/image";
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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nailismo.com";
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: article.title,
    description:
      article.excerpt?.slice(0, 200) ||
      article.contentHtml.replace(/<[^>]+>/g, "").slice(0, 200),
    image: article.image ? [article.image.url] : undefined,
    datePublished: article.publishedAt,
    author: article.authorV2?.name
      ? { "@type": "Person", name: article.authorV2.name }
      : { "@type": "Organization", name: "Nailismo" },
    publisher: {
      "@type": "Organization",
      name: "Nailismo",
      logo: { "@type": "ImageObject", url: `${siteUrl}/icon.png` },
    },
    mainEntityOfPage: `${siteUrl}/journal/${article.handle}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <AnnouncementTicker />
      <Header />
      <main className="candy-wrap candy-sec" style={{ paddingTop: 36 }}>
        <nav style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          <Link href="/" className="candy-crumb">Home</Link>
          <Link href="/journal" className="candy-crumb">Journal</Link>
          <span className="candy-crumb" aria-current="page" style={{ background: "var(--lemon)" }}>{article.title}</span>
        </nav>

        <div style={{ maxWidth: 820, margin: "0 auto", textAlign: "center" }}>
          <span className="candy-eyebrow">{formatDate(article.publishedAt)}{article.authorV2?.name ? ` · ${article.authorV2.name}` : ""}</span>
          <h1 style={{ fontSize: "clamp(36px,6vw,72px)", marginTop: 12 }}>{article.title}</h1>
          {article.excerpt && (
            <p style={{ marginTop: 18, fontFamily: "var(--display)", fontStyle: "italic", fontSize: 22, color: "var(--ink-soft)", lineHeight: 1.5, maxWidth: 640, marginInline: "auto" }}>
              {article.excerpt}
            </p>
          )}
        </div>

        {article.image && (
          <div style={{ position: "relative", aspectRatio: "16/9", borderRadius: 28, overflow: "hidden", border: "2.5px solid var(--ink)", boxShadow: "var(--shadow-candy)", marginTop: 36 }}>
            <Image src={article.image.url} alt={article.image.altText ?? article.title} fill sizes="100vw" style={{ objectFit: "cover" }} />
          </div>
        )}

        <article className="candy-prose" style={{ margin: "44px auto 0" }} dangerouslySetInnerHTML={{ __html: article.contentHtml }} />

        {article.tags.length > 0 && (
          <div style={{ maxWidth: 720, margin: "40px auto 0", paddingTop: 24, borderTop: "2px solid var(--marshmallow)" }}>
            <span className="candy-eyebrow" style={{ display: "block", marginBottom: 12 }}>Tags</span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {article.tags.map((t) => (
                <span key={t} className="candy-chip" style={{ cursor: "default" }}>{t}</span>
              ))}
            </div>
          </div>
        )}

        {related.length > 0 && (
          <section style={{ marginTop: 64 }}>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
              <h2 style={{ fontSize: "clamp(26px,4vw,40px)" }}>More from the desk</h2>
              <Link href="/journal" className="candy-btn is-ghost" style={{ padding: "10px 18px", fontSize: 14 }}>All entries</Link>
            </div>
            <div className="candy-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
              {related.map((a) => (
                <Link key={a.id} href={`/journal/${a.handle}`} className="candy-card">
                  <div className="candy-card-img" style={{ aspectRatio: "4/3" }}>
                    {a.image && (
                      <Image src={a.image.url} alt={a.image.altText ?? a.title} fill sizes="(max-width:640px) 100vw, 33vw" />
                    )}
                  </div>
                  <div style={{ padding: "16px 6px 6px" }}>
                    <span className="candy-eyebrow" style={{ fontSize: 11 }}>{formatDate(a.publishedAt)}</span>
                    <h3 style={{ fontSize: 20, marginTop: 8 }}>{a.title}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}

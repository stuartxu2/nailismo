const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nailismo.com";

// Sitewide brand-entity + site graph. Establishes Nailismo as a recognizable
// entity for the Knowledge Graph and AI answer engines, and exposes a
// sitelinks search box via WebSite.SearchAction.
const schema = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Nailismo",
    url: siteUrl,
    logo: `${siteUrl}/icon.png`,
    description:
      "Press-on nail sets for every hand — minimalist, statement, and expressive looks built for daily wear, nightlife, and modern style.",
    email: "hello@nailismo.com",
    sameAs: [
      "https://instagram.com/shopnailismo",
      "https://tiktok.com/@shopnailismo",
      "https://x.com/shopnailismo",
      "https://pinterest.com/shopnailismo",
    ],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Nailismo",
    url: siteUrl,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  },
];

export function SiteSchema() {
  // Emit one <script> per object (not a single array) so every JSON-LD block
  // is an object with its own "@context" — array-form blocks break naive
  // consumers that read parsed["@context"] per script.
  return (
    <>
      {schema.map((node, i) => (
        <script
          key={`site-ld-${i}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(node) }}
        />
      ))}
    </>
  );
}

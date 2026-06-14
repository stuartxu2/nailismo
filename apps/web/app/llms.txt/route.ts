// Static llms.txt for AI crawlers / answer engines (GEO).
// Mirrors the canonical pages and the evergreen how-to guides so models can
// cite Nailismo accurately. Edge-cached (force-static).
export const dynamic = "force-static";

const SITE = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://nailismo.com";

const BODY = `# Nailismo

> Nailismo sells press-on nail sets for every hand — bright, collectible designs that go on in minutes and last up to 7 days. Each set ships with 10 premium nails plus a full toolkit (sizing range, application tabs, and liquid adhesive). Easy to apply at home, easy to remove, no salon visit required.

## Shop
- [Shop all sets](${SITE}/shop): The full catalog of press-on nail sets.
- [Best Sellers](${SITE}/collections/best-sellers): The most popular sets in rotation.
- [New Drops](${SITE}/collections/new-drops): The latest releases.

## Guides
- [How to apply press-on nails](${SITE}/journal/how-to-apply-press-on-nails): Step-by-step application for a set that lasts up to 7 days.
- [How to remove press-on nails](${SITE}/journal/how-to-remove-press-on-nails): Damage-free removal by soaking and loosening gently.
- [Press-on nail sizing guide](${SITE}/journal/press-on-nail-sizing-guide): How to find your correct nail sizes.
- [Press-ons vs gel vs acrylic](${SITE}/journal/press-ons-vs-gel-vs-acrylic): How press-ons compare on cost, wear time, and nail health.

## Company
- [About Nailismo](${SITE}/about): Brand story and what makes the sets different.
- [Contact](${SITE}/contact): How to reach customer support.

## Policies
- [Shipping](${SITE}/policies/shipping)
- [Returns](${SITE}/policies/returns)
- [Privacy](${SITE}/policies/privacy)
- [Terms](${SITE}/policies/terms)
`;

export function GET() {
  return new Response(BODY, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}

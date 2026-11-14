#!/usr/bin/env python3
"""Create / top up the "Holiday Gift Guide" collection (`holiday-gift-guide`).

Manual collection: the four holiday sets, every ACTIVE non-gift-card Best
Seller, the gift card and nail glue. Published to Online Store + the headless
storefront only (not Pinterest / Google / POS / Shop) so
/collections/holiday-gift-guide can read it.

Owner edits win: the tool only ADDS missing members and only sets the
description when it creates the collection; it never removes members or
overwrites copy. The description is evergreen (no dates); dated offer and
cutoff lines are rendered by the site from apps/web/lib/promo/holiday.ts.

  python tools/shopify_gift_guide.py            # dry-run
  python tools/shopify_gift_guide.py --apply    # create / add members / publish

Idempotent. Env loaded from apps/web/.env.local via shopify_auth.
"""
from __future__ import annotations

import argparse
import sys
from typing import Any

from shopify_auth import get_admin_token, load_env
from shopify_new_drops_refresh import gql

HANDLE = "holiday-gift-guide"
TITLE = "Holiday Gift Guide"
HOLIDAY_SETS = ["arctic-holiday", "christmas-classics", "first-frost", "sweater-weather"]
GIFT_EXTRAS = ["nailismo-gift-card", "nail-glue"]
DESCRIPTION_HTML = (
    "<p>Gifting nails to someone who's never tried press-ons? Easy. Every Nailismo set comes with "
    "10 hand-painted nails plus a full toolkit (sizing range, application tabs and liquid glue), so "
    "it's ready to wear straight out of the box. No salon visit needed.</p>"
    "<p>This edit pulls together our coziest seasonal sets, from frosty silvers to festive red and "
    "green, alongside our best sellers. Short and minimal or loud and glittery, there's a set here "
    "for every hand and every style, whoever you're shopping for.</p>"
    "<p>Not sure of their size? Send a gift card instead. It arrives by email and lets them pick "
    "their own set and fit. Add a bottle of nail glue as a stocking stuffer for longer wear.</p>"
)

Row = dict[str, Any]

COLLECTION_Q = """
query($q: String!) {
  collections(first: 1, query: $q) {
    nodes { id handle products(first: 100) { nodes { handle isGiftCard status } } }
  }
}
"""
PRODUCT_Q = "query($h: String!){ productByHandle(handle:$h){ id handle } }"
PUBLICATIONS_Q = "{ publications(first: 10) { nodes { id name } } }"
PUBLISHED_Q = "query($id: ID!, $p: ID!){ collection(id:$id){ publishedOnPublication(publicationId:$p) } }"
CREATE_M = """
mutation($input: CollectionInput!) {
  collectionCreate(input: $input) { collection { id handle } userErrors { field message } }
}
"""
ADD_M = """
mutation($id: ID!, $productIds: [ID!]!) {
  collectionAddProducts(id: $id, productIds: $productIds) { userErrors { field message } }
}
"""
PUBLISH_M = """
mutation($id: ID!, $input: [PublicationInput!]!) {
  publishablePublish(id: $id, input: $input) { userErrors { field message } }
}
"""


def desired_members(best_sellers: list[Row]) -> list[str]:
    """Holiday sets, then non-gift-card Best Sellers, then gift card + glue; deduped, order kept."""
    picks = [p["handle"] for p in best_sellers if not p["isGiftCard"] and p["status"] == "ACTIVE"]
    ordered = HOLIDAY_SETS + picks + GIFT_EXTRAS
    return list(dict.fromkeys(ordered))


def storefront_publications(publications: list[Row]) -> list[Row]:
    """Only the channels the website reads: Online Store and the headless storefront."""
    return [p for p in publications if p["name"] == "Online Store" or "Headless" in p["name"]]


def missing_members(desired: list[str], current: list[str]) -> list[str]:
    """Desired handles not yet in the collection. Never proposes removals."""
    have = set(current)
    return [h for h in desired if h not in have]


def find_collection(env: dict[str, str], token: str, handle: str) -> Row | None:
    nodes = gql(env, token, COLLECTION_Q, {"q": f"handle:{handle}"})["collections"]["nodes"]
    return next((c for c in nodes if c["handle"] == handle), None)


def check(errors: list[Row], what: str) -> int:
    if errors:
        print(f"  ! {what}: {errors}")
    return 1 if errors else 0


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="write changes (default: dry-run)")
    args = parser.parse_args()

    env = load_env()
    token = get_admin_token(env)
    print(f"Store {env['SHOPIFY_STORE_DOMAIN']} | API {env['SHOPIFY_API_VERSION']}")
    print("MODE:", "APPLY" if args.apply else "DRY-RUN", f"| collection='{HANDLE}'")

    best = find_collection(env, token, "best-sellers")
    desired = desired_members(best["products"]["nodes"] if best else [])
    guide = find_collection(env, token, HANDLE)
    current = [p["handle"] for p in guide["products"]["nodes"]] if guide else []
    to_add = missing_members(desired, current)
    publications = storefront_publications(gql(env, token, PUBLICATIONS_Q)["publications"]["nodes"])
    unpublished = [
        pub for pub in publications
        if not guide or not gql(env, token, PUBLISHED_Q, {"id": guide["id"], "p": pub["id"]})
        ["collection"]["publishedOnPublication"]
    ]

    print(f"\n== Collection: {'exists' if guide else 'MISSING -> create'} ==")
    print(f"== Add members ({len(to_add)}): {', '.join(to_add) or '-'}")
    print(f"== Publish to ({len(unpublished)}): {', '.join(p['name'] for p in unpublished) or '-'}")
    if not args.apply:
        print(f"\nDRY-RUN: {'create, ' if not guide else ''}{len(to_add)} add, "
              f"{len(unpublished)} publish. Re-run with --apply.")
        return

    failures = 0
    ids = []
    for h in to_add:
        node = gql(env, token, PRODUCT_Q, {"h": h})["productByHandle"]
        if node:
            ids.append(node["id"])
        else:
            print(f"  ! product not found: {h}")
            failures += 1
    if not guide:
        res = gql(env, token, CREATE_M, {"input": {
            "title": TITLE, "handle": HANDLE, "descriptionHtml": DESCRIPTION_HTML, "products": ids,
        }})["collectionCreate"]
        failures += check(res["userErrors"], "collectionCreate")
        guide_id = res["collection"]["id"] if res["collection"] else None
    else:
        guide_id = guide["id"]
        if ids:
            failures += check(gql(env, token, ADD_M, {"id": guide_id, "productIds": ids})
                              ["collectionAddProducts"]["userErrors"], "collectionAddProducts")
    if guide_id and unpublished:
        failures += check(gql(env, token, PUBLISH_M, {
            "id": guide_id, "input": [{"publicationId": p["id"]} for p in unpublished],
        })["publishablePublish"]["userErrors"], "publishablePublish")
    print(f"\nAPPLIED: {len(ids)} add, {len(unpublished)} publish, {failures} failed.")
    if failures:
        sys.exit(1)


if __name__ == "__main__":
    main()

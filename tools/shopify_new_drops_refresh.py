#!/usr/bin/env python3
"""Keep the "New Drops" collection stocked with the newest nail sets.

`new-drops` is a smart collection with the rule TAG = "New Arrival". Nothing
re-tags products over time, so the collection drifts (it had shrunk to one
2025 set). This tool tags the newest N ACTIVE nail sets with "New Arrival" and
removes the tag from every other product, so the collection always mirrors the
latest releases. N defaults to 10 to match the homepage "New flavors" shelf.

Excluded: gift cards, care essentials, and the made-to-order Custom Nail Set
(mirrors ESSENTIAL_HANDLES in apps/web/lib/shopify/product-class.ts and
CUSTOM_PRODUCT_ID in apps/web/lib/customize/product.ts).

  python tools/shopify_new_drops_refresh.py               # dry-run, count=10
  python tools/shopify_new_drops_refresh.py --count 16    # dry-run, 16 sets
  python tools/shopify_new_drops_refresh.py --apply       # write tags

Idempotent: a second --apply run plans zero changes. Env loaded from
apps/web/.env.local via shopify_auth.
"""
from __future__ import annotations

import argparse
import json
import sys
import urllib.error
import urllib.request
from typing import Any

from shopify_auth import get_admin_token, load_env

NEW_TAG = "New Arrival"
EXCLUDED_HANDLES = frozenset({"nail-glue", "glue-remover", "custom-nail-set"})

Product = dict[str, Any]

PRODUCTS_Q = """
query($after: String) {
  products(first: 100, after: $after) {
    nodes { id handle tags status isGiftCard createdAt }
    pageInfo { hasNextPage endCursor }
  }
}
"""
TAGS_ADD_M = "mutation($id: ID!, $tags: [String!]!){ tagsAdd(id:$id, tags:$tags){ userErrors{ field message } } }"
TAGS_REMOVE_M = "mutation($id: ID!, $tags: [String!]!){ tagsRemove(id:$id, tags:$tags){ userErrors{ field message } } }"


def select_new_drops(products: list[Product], count: int) -> list[Product]:
    """Newest `count` active nail sets, newest first."""
    eligible = [
        p
        for p in products
        if p["status"] == "ACTIVE" and not p["isGiftCard"] and p["handle"] not in EXCLUDED_HANDLES
    ]
    eligible.sort(key=lambda p: p["createdAt"], reverse=True)
    return eligible[:count]


def plan_changes(
    products: list[Product], selected: list[Product], tag: str
) -> tuple[list[Product], list[Product]]:
    """(products that need the tag added, products that need it removed)."""
    keep = {p["id"] for p in selected}
    to_add = [p for p in selected if tag not in p["tags"]]
    to_remove = [p for p in products if tag in p["tags"] and p["id"] not in keep]
    return to_add, to_remove


def gql(env: dict[str, str], token: str, query: str, variables: dict[str, Any] | None = None) -> dict[str, Any]:
    url = f"https://{env['SHOPIFY_STORE_DOMAIN']}/admin/api/{env['SHOPIFY_API_VERSION']}/graphql.json"
    body = json.dumps({"query": query, "variables": variables or {}}).encode()
    req = urllib.request.Request(
        url, data=body, headers={"Content-Type": "application/json", "X-Shopify-Access-Token": token}
    )
    try:
        with urllib.request.urlopen(req) as resp:
            payload = json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        sys.exit(f"admin API error: HTTP {exc.code}: {exc.read().decode()[:600]}")
    if payload.get("errors"):
        sys.exit(f"GraphQL errors: {json.dumps(payload['errors'])[:600]}")
    return payload["data"]


def all_products(env: dict[str, str], token: str) -> list[Product]:
    out: list[Product] = []
    after = None
    while True:
        data = gql(env, token, PRODUCTS_Q, {"after": after})["products"]
        out.extend(data["nodes"])
        if not data["pageInfo"]["hasNextPage"]:
            return out
        after = data["pageInfo"]["endCursor"]


def mutate(env: dict[str, str], token: str, mutation: str, field: str, product: Product) -> bool:
    errors = gql(env, token, mutation, {"id": product["id"], "tags": [NEW_TAG]})[field]["userErrors"]
    if errors:
        print(f"      ! {product['handle']}: {errors}")
    return not errors


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--count", type=int, default=10, help="number of newest sets to tag (default 10)")
    parser.add_argument("--apply", action="store_true", help="write tag changes (default: dry-run)")
    args = parser.parse_args()

    env = load_env()
    token = get_admin_token(env)
    print(f"Store {env['SHOPIFY_STORE_DOMAIN']} | API {env['SHOPIFY_API_VERSION']}")
    print("MODE:", "APPLY" if args.apply else "DRY-RUN", f"| count={args.count} | tag='{NEW_TAG}'")

    products = all_products(env, token)
    selected = select_new_drops(products, args.count)
    to_add, to_remove = plan_changes(products, selected, NEW_TAG)

    print(f"\n== New Drops ({len(selected)} sets, newest first) ==")
    for p in selected:
        print(f"  {'+' if p in to_add else '='} {p['handle']}  ({p['createdAt'][:10]})")
    print(f"\n== Remove '{NEW_TAG}' ({len(to_remove)}) ==")
    for p in to_remove:
        print(f"  - {p['handle']}  ({p['createdAt'][:10]})")

    if not args.apply:
        print(f"\nDRY-RUN: {len(to_add)} add, {len(to_remove)} remove. Re-run with --apply.")
        return

    failures = 0
    for p in to_add:
        failures += not mutate(env, token, TAGS_ADD_M, "tagsAdd", p)
    for p in to_remove:
        failures += not mutate(env, token, TAGS_REMOVE_M, "tagsRemove", p)
    print(f"\nAPPLIED: {len(to_add)} add, {len(to_remove)} remove, {failures} failed.")
    if failures:
        sys.exit(1)


if __name__ == "__main__":
    main()

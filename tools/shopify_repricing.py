#!/usr/bin/env python3
"""Reprice the catalog to the Gen Z pricing strategy (charm pricing + tiers).

Sets every variant of a product to its tier price. Idempotent: variants already
at the target price are skipped, so re-running writes nothing. Gift cards are
never touched (denomination variants are intentional).

Tiers (verified against catalog 2026-05-26):
  premium  $24.99  molten-steel, rebel-king, arctic-holiday, urban-jungle
  consumable $6.99 nail-glue, glue-remover
  seasonal $12.99  christmas-classics
  core     $17.99  every other nail set
  (skip)           nailismo-gift-card

Env (loaded from apps/web/.env.local via shopify_auth):
  SHOPIFY_STORE_DOMAIN, SHOPIFY_API_VERSION,
  SHOPIFY_ADMIN_CLIENT_ID, SHOPIFY_ADMIN_CLIENT_SECRET

Usage:
  python tools/shopify_repricing.py            # dry-run, prints planned changes
  python tools/shopify_repricing.py --apply     # write new prices
"""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request

from shopify_auth import get_admin_token, load_env

# Per-handle overrides. Anything not listed and not skipped falls to CORE_PRICE.
PREMIUM = {"molten-steel", "rebel-king", "arctic-holiday", "urban-jungle"}
CONSUMABLE = {"nail-glue", "glue-remover"}
SEASONAL = {"christmas-classics"}
SKIP = {"nailismo-gift-card"}

PREMIUM_PRICE = "24.99"
CONSUMABLE_PRICE = "6.99"
SEASONAL_PRICE = "12.99"
CORE_PRICE = "17.99"


def target_price(handle: str) -> str | None:
    """Return the tier price for a handle, or None to skip the product."""
    if handle in SKIP:
        return None
    if handle in PREMIUM:
        return PREMIUM_PRICE
    if handle in CONSUMABLE:
        return CONSUMABLE_PRICE
    if handle in SEASONAL:
        return SEASONAL_PRICE
    return CORE_PRICE


def gql(env: dict[str, str], token: str, query: str, variables: dict | None = None) -> dict:
    url = f"https://{env['SHOPIFY_STORE_DOMAIN']}/admin/api/{env['SHOPIFY_API_VERSION']}/graphql.json"
    body = json.dumps({"query": query, "variables": variables or {}}).encode()
    req = urllib.request.Request(
        url,
        data=body,
        headers={"Content-Type": "application/json", "X-Shopify-Access-Token": token},
    )
    try:
        with urllib.request.urlopen(req) as resp:
            payload = json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        sys.exit(f"admin API error: HTTP {exc.code}: {exc.read().decode()[:500]}")
    if payload.get("errors"):
        sys.exit(f"GraphQL errors: {json.dumps(payload['errors'])[:500]}")
    return payload["data"]


PRODUCTS_QUERY = """
{ products(first:100){ edges{ node{
  id title handle
  variants(first:50){ edges{ node{ id title price } } }
} } } }
"""

BULK_UPDATE = """
mutation($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
  productVariantsBulkUpdate(productId: $productId, variants: $variants) {
    userErrors { field message }
  }
}
"""


def main() -> None:
    apply = "--apply" in sys.argv
    env = load_env()
    token = get_admin_token(env)

    products = gql(env, token, PRODUCTS_QUERY)["products"]["edges"]
    total_changes = 0

    for edge in products:
        p = edge["node"]
        price = target_price(p["handle"])
        if price is None:
            print(f"SKIP  {p['title']} ({p['handle']})")
            continue

        updates = []
        for v in p["variants"]["edges"]:
            vn = v["node"]
            if vn["price"] != price:
                updates.append({"id": vn["id"], "price": price})
                vlabel = vn["title"] if vn["title"] != "Default Title" else ""
                print(f"  {p['title']:22} {vlabel:14} {vn['price']:>7} -> {price}")

        if not updates:
            continue
        total_changes += len(updates)

        if apply:
            res = gql(env, token, BULK_UPDATE, {"productId": p["id"], "variants": updates})
            errs = res["productVariantsBulkUpdate"]["userErrors"]
            if errs:
                sys.exit(f"userErrors on {p['handle']}: {json.dumps(errs)}")

    mode = "APPLIED" if apply else "DRY-RUN (no writes)"
    print(f"\n{mode}: {total_changes} variant price change(s).")
    if not apply and total_changes:
        print("Re-run with --apply to write.")


if __name__ == "__main__":
    main()

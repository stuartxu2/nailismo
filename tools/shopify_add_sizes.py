#!/usr/bin/env python3
"""Add a Size option (S/M/L/XL) to the press-on designs that are still single-variant.

The catalog already sells 11 designs as S/M/L/XL trays. Seven more press-on
designs are still single-variant ("Title" only), so the app's shop-your-size flow
can't add them. This script brings them in line with the sized designs: one Size
option, four variants (S, M, L, XL), each at the product's CURRENT price, with
inventory untracked (mirrors the existing sized designs, which are tracked=False /
always available).

Consumables (nail-glue, glue-remover) and the gift card are intentionally NOT
sized and are excluded.

Idempotent: a product that already has a Size option is skipped, so re-running
writes nothing. Prices are read live per product, never hardcoded.

Env (loaded from apps/web/.env.local via shopify_auth):
  SHOPIFY_STORE_DOMAIN, SHOPIFY_API_VERSION,
  SHOPIFY_ADMIN_CLIENT_ID, SHOPIFY_ADMIN_CLIENT_SECRET   (scope: write_products)

Usage:
  python tools/shopify_add_sizes.py            # dry-run, prints the plan
  python tools/shopify_add_sizes.py --apply     # write the new options/variants
  python tools/shopify_add_sizes.py --only molten-steel   # limit to one handle (test)
"""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request

from shopify_auth import get_admin_token, load_env

# Press-on designs to bring up to S/M/L/XL. Consumables + gift card excluded.
TARGET_HANDLES = [
    "molten-steel",       # liquid chrome
    "rebel-king",         # rebel rizz
    "frost-voltage",      # frostbite
    "arctic-holiday",     # snow szn
    "christmas-classics", # santa slay
    "liquid-metal",       # chrome szn
    "liquid-ice",         # iced out
]

SIZES = ["S", "M", "L", "XL"]


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


PRODUCT_QUERY = """
query($handle: String!) {
  productByHandle(handle: $handle) {
    id
    title
    handle
    hasOnlyDefaultVariant
    options { name }
    variants(first: 1) { nodes { price } }
  }
}
"""

# productSet synchronizes the variant list: providing these four variants removes
# the existing "Default Title" variant and leaves exactly S/M/L/XL.
# `synchronous` defaults to true (blocks until the write completes), so we omit it.
PRODUCT_SET = """
mutation($input: ProductSetInput!) {
  productSet(input: $input) {
    product {
      id
      options { name optionValues { name } }
      variants(first: 10) { nodes { title price selectedOptions { name value } } }
    }
    userErrors { field message code }
  }
}
"""


def build_input(product_id: str, price: str) -> dict:
    return {
        "id": product_id,
        "productOptions": [
            {"name": "Size", "position": 1, "values": [{"name": s} for s in SIZES]}
        ],
        "variants": [
            {
                "optionValues": [{"optionName": "Size", "name": s}],
                "price": price,
                "inventoryItem": {"tracked": False},
            }
            for s in SIZES
        ],
    }


def main() -> None:
    apply = "--apply" in sys.argv
    only = None
    if "--only" in sys.argv:
        only = sys.argv[sys.argv.index("--only") + 1]

    env = load_env()
    token = get_admin_token(env)
    print(f"API version: {env['SHOPIFY_API_VERSION']}\n")

    handles = [only] if only else TARGET_HANDLES
    planned = 0
    skipped = 0

    for handle in handles:
        p = gql(env, token, PRODUCT_QUERY, {"handle": handle})["productByHandle"]
        if not p:
            print(f"MISSING  {handle}  (not found, skipping)")
            continue

        existing = [o["name"] for o in p["options"]]
        if "Size" in existing:
            print(f"SKIP     {p['title']} ({handle})  already has Size {existing}")
            skipped += 1
            continue

        price = p["variants"]["nodes"][0]["price"]
        print(f"PLAN     {p['title']} ({handle})  +Size {SIZES} @ ${price} each (untracked)")
        planned += 1

        if apply:
            res = gql(env, token, PRODUCT_SET, {"input": build_input(p["id"], price)})
            errs = res["productSet"]["userErrors"]
            if errs:
                sys.exit(f"userErrors on {handle}: {json.dumps(errs)}")
            got = res["productSet"]["product"]["variants"]["nodes"]
            sizes = [v["selectedOptions"][0]["value"] for v in got if v["selectedOptions"]]
            print(f"  -> wrote variants: {sizes}")

    mode = "APPLIED" if apply else "DRY-RUN (no writes)"
    print(f"\n{mode}: {planned} product(s) to size, {skipped} already sized.")
    if not apply and planned:
        print("Re-run with --apply to write (or --only <handle> to test one).")


if __name__ == "__main__":
    main()

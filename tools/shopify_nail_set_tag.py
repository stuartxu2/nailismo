#!/usr/bin/env python3
"""Tag bundle-eligible nail sets and keep the hidden `nail-sets` collection.

The "Any 3 sets for $45" offer (Every Possible Discount, Buy X for $Y) targets
the smart collection `nail-sets` (rule TAG = "Nail Set"). This tool tags every
ACTIVE nail set with "Nail Set", removes the tag from anything else, and
creates the collection if it is missing. The collection is never published, so
it stays out of the storefront, sitemap and menus.

Eligible: ACTIVE, not a gift card, not a care essential / Custom Nail Set
(EXCLUDED_HANDLES from shopify_new_drops_refresh), and min variant price above
$15 so every 3-pack at $45 is a genuine saving.

  python tools/shopify_nail_set_tag.py           # dry-run
  python tools/shopify_nail_set_tag.py --apply   # write tags + create collection

Idempotent: a second --apply run plans zero changes. Env loaded from
apps/web/.env.local via shopify_auth.
"""
from __future__ import annotations

import argparse
import sys
from typing import Any

from shopify_auth import get_admin_token, load_env
from shopify_new_drops_refresh import EXCLUDED_HANDLES, gql, plan_changes

TAG = "Nail Set"
COLLECTION_HANDLE = "nail-sets"
COLLECTION_TITLE = "Nail Sets (bundle eligibility)"
MIN_PRICE = 15.0

Product = dict[str, Any]

PRODUCTS_Q = """
query($after: String) {
  products(first: 100, after: $after) {
    nodes { id handle tags status isGiftCard priceRangeV2 { minVariantPrice { amount } } }
    pageInfo { hasNextPage endCursor }
  }
}
"""
COLLECTION_Q = "query($q: String!){ collections(first:1, query:$q){ nodes{ id handle title } } }"
COLLECTION_CREATE_M = """
mutation($input: CollectionInput!) {
  collectionCreate(input: $input) { collection { id handle } userErrors { field message } }
}
"""
TAGS_ADD_M = "mutation($id: ID!, $tags: [String!]!){ tagsAdd(id:$id, tags:$tags){ userErrors{ field message } } }"
TAGS_REMOVE_M = "mutation($id: ID!, $tags: [String!]!){ tagsRemove(id:$id, tags:$tags){ userErrors{ field message } } }"


def select_nail_sets(products: list[Product]) -> list[Product]:
    """Products that count toward the 3-for-$45 bundle, input order preserved."""
    return [
        p
        for p in products
        if p["status"] == "ACTIVE"
        and not p["isGiftCard"]
        and p["handle"] not in EXCLUDED_HANDLES
        and float(p["priceRangeV2"]["minVariantPrice"]["amount"]) > MIN_PRICE
    ]


def all_products(env: dict[str, str], token: str) -> list[Product]:
    out: list[Product] = []
    after = None
    while True:
        data = gql(env, token, PRODUCTS_Q, {"after": after})["products"]
        out.extend(data["nodes"])
        if not data["pageInfo"]["hasNextPage"]:
            return out
        after = data["pageInfo"]["endCursor"]


def find_collection(env: dict[str, str], token: str) -> Product | None:
    nodes = gql(env, token, COLLECTION_Q, {"q": f"handle:{COLLECTION_HANDLE}"})["collections"]["nodes"]
    return next((c for c in nodes if c["handle"] == COLLECTION_HANDLE), None)


def run_tag_mutation(env: dict[str, str], token: str, mutation: str, field: str, product: Product) -> bool:
    errors = gql(env, token, mutation, {"id": product["id"], "tags": [TAG]})[field]["userErrors"]
    if errors:
        print(f"      ! {product['handle']}: {errors}")
    return not errors


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--apply", action="store_true", help="write changes (default: dry-run)")
    args = parser.parse_args()

    env = load_env()
    token = get_admin_token(env)
    print(f"Store {env['SHOPIFY_STORE_DOMAIN']} | API {env['SHOPIFY_API_VERSION']}")
    print("MODE:", "APPLY" if args.apply else "DRY-RUN", f"| tag='{TAG}' | collection='{COLLECTION_HANDLE}'")

    products = all_products(env, token)
    selected = select_nail_sets(products)
    to_add, to_remove = plan_changes(products, selected, TAG)
    collection = find_collection(env, token)

    print(f"\n== Eligible nail sets: {len(selected)} ==")
    for p in to_add:
        print(f"  + {p['handle']}")
    print(f"== Remove '{TAG}': {len(to_remove)} ==")
    for p in to_remove:
        print(f"  - {p['handle']}")
    print(f"== Collection '{COLLECTION_HANDLE}': {'exists' if collection else 'MISSING -> create (unpublished)'} ==")

    if not args.apply:
        print(f"\nDRY-RUN: {len(to_add)} add, {len(to_remove)} remove, "
              f"collection {'exists' if collection else 'missing'}. Re-run with --apply.")
        return

    failures = 0
    for p in to_add:
        failures += not run_tag_mutation(env, token, TAGS_ADD_M, "tagsAdd", p)
    for p in to_remove:
        failures += not run_tag_mutation(env, token, TAGS_REMOVE_M, "tagsRemove", p)
    if not collection:
        rule_set = {
            "appliedDisjunctively": False,
            "rules": [{"column": "TAG", "relation": "EQUALS", "condition": TAG}],
        }
        result = gql(env, token, COLLECTION_CREATE_M, {"input": {
            "title": COLLECTION_TITLE, "handle": COLLECTION_HANDLE, "ruleSet": rule_set,
        }})["collectionCreate"]
        if result["userErrors"]:
            print(f"  ! collectionCreate: {result['userErrors']}")
            failures += 1
        else:
            print(f"  > created {result['collection']['handle']} ({result['collection']['id']})")
    print(f"\nAPPLIED: {len(to_add)} add, {len(to_remove)} remove, {failures} failed.")
    if failures:
        sys.exit(1)


if __name__ == "__main__":
    main()

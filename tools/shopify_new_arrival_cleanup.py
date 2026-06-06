#!/usr/bin/env python3
"""Dedupe the New Arrival / New Arrivals tags and prune dead collections.

The store auto-applies the singular tag "New Arrival" to new products; older
tooling also stamped the plural "New Arrivals", so most products carry both.
This consolidates on the singular tag and repoints the live "new-drops"
collection rule to match. Optional --prune deletes a duplicate/empty set of
collections (explicitly listed; safe-listed by handle).

  python tools/shopify_new_arrival_cleanup.py                 # dry-run
  python tools/shopify_new_arrival_cleanup.py --apply          # tags + rule
  python tools/shopify_new_arrival_cleanup.py --apply --prune  # also delete collections

Idempotent. Env loaded from apps/web/.env.local via shopify_auth.
"""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request

from shopify_auth import get_admin_token, load_env

OLD_TAG = "New Arrivals"   # plural — remove
NEW_TAG = "New Arrival"    # singular — keep (store auto-applies this)

# Products that carry only the plural tag — add singular first so membership
# is preserved when the plural tag is stripped.
ADD_SINGULAR_TO = ["midnight-circuit", "galaxy-glitch"]

# Live collection whose rule must follow the surviving tag.
NEW_DROPS_HANDLE = "new-drops"

# Collections to delete with --prune: the unreferenced duplicate of new-drops
# plus empty legacy men's-brand manual collections. Handles only.
PRUNE_HANDLES = [
    "new-arrivals",      # duplicate rule of new-drops, not used by the storefront
]


def gql(env, token, query, variables=None):
    url = f"https://{env['SHOPIFY_STORE_DOMAIN']}/admin/api/{env['SHOPIFY_API_VERSION']}/graphql.json"
    body = json.dumps({"query": query, "variables": variables or {}}).encode()
    req = urllib.request.Request(
        url, data=body,
        headers={"Content-Type": "application/json", "X-Shopify-Access-Token": token},
    )
    try:
        with urllib.request.urlopen(req) as resp:
            payload = json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        sys.exit(f"admin API error: HTTP {exc.code}: {exc.read().decode()[:600]}")
    if payload.get("errors"):
        sys.exit(f"GraphQL errors: {json.dumps(payload['errors'])[:600]}")
    return payload["data"]


PRODUCTS_Q = """
query($q: String!, $after: String) {
  products(first: 100, query: $q, after: $after) {
    nodes { id handle tags }
    pageInfo { hasNextPage endCursor }
  }
}
"""
TAGS_ADD_M = "mutation($id: ID!, $tags: [String!]!){ tagsAdd(id:$id, tags:$tags){ userErrors{ field message } } }"
TAGS_REMOVE_M = "mutation($id: ID!, $tags: [String!]!){ tagsRemove(id:$id, tags:$tags){ userErrors{ field message } } }"
COLLECTION_BY_HANDLE_Q = "query($q: String!){ collections(first:1, query:$q){ nodes{ id handle title productsCount{ count } ruleSet{ rules{ column relation condition } } } } }"
COLLECTION_UPDATE_M = """
mutation($input: CollectionInput!) {
  collectionUpdate(input: $input) { collection { handle ruleSet { rules { column relation condition } } } userErrors { field message } }
}
"""
COLLECTION_DELETE_M = "mutation($input: CollectionDeleteInput!){ collectionDelete(input:$input){ deletedCollectionId userErrors{ field message } } }"


def all_products(env, token):
    out, after = [], None
    while True:
        data = gql(env, token, PRODUCTS_Q, {"q": "vendor:Nailismo*", "after": after})["products"]
        out.extend(data["nodes"])
        if not data["pageInfo"]["hasNextPage"]:
            return out
        after = data["pageInfo"]["endCursor"]


def collection_by_handle(env, token, handle):
    nodes = gql(env, token, COLLECTION_BY_HANDLE_Q, {"q": f"handle:{handle}"})["collections"]["nodes"]
    return nodes[0] if nodes else None


def main():
    apply = "--apply" in sys.argv
    prune = "--prune" in sys.argv
    env = load_env()
    token = get_admin_token(env)
    print(f"Store {env['SHOPIFY_STORE_DOMAIN']} | API {env['SHOPIFY_API_VERSION']}")
    print("MODE:", "APPLY" if apply else "DRY-RUN", "+PRUNE" if prune else "")

    products = all_products(env, token)
    by_handle = {p["handle"]: p for p in products}

    print("\n== ADD singular tag (preserve membership) ==")
    for h in ADD_SINGULAR_TO:
        p = by_handle.get(h)
        if not p:
            print(f"  ! not found: {h}")
            continue
        if NEW_TAG in p["tags"]:
            print(f"  = {h}: already has '{NEW_TAG}'")
            continue
        print(f"  {'>' if apply else '~'} {h}: +'{NEW_TAG}'")
        if apply:
            r = gql(env, token, TAGS_ADD_M, {"id": p["id"], "tags": [NEW_TAG]})["tagsAdd"]
            if r["userErrors"]:
                print(f"      errors: {r['userErrors']}")

    print(f"\n== REMOVE plural tag '{OLD_TAG}' ==")
    holders = [p for p in products if OLD_TAG in p["tags"]]
    print(f"  {len(holders)} product(s) carry '{OLD_TAG}'")
    for p in holders:
        print(f"  {'>' if apply else '~'} {p['handle']}")
        if apply:
            r = gql(env, token, TAGS_REMOVE_M, {"id": p["id"], "tags": [OLD_TAG]})["tagsRemove"]
            if r["userErrors"]:
                print(f"      errors: {r['userErrors']}")

    print(f"\n== REPOINT '{NEW_DROPS_HANDLE}' rule -> TAG = '{NEW_TAG}' ==")
    col = collection_by_handle(env, token, NEW_DROPS_HANDLE)
    if not col:
        print(f"  ! collection not found: {NEW_DROPS_HANDLE}")
    else:
        rules = col.get("ruleSet", {}).get("rules", []) if col.get("ruleSet") else []
        cur = rules[0]["condition"] if rules else None
        if cur == NEW_TAG:
            print(f"  = already TAG='{NEW_TAG}'")
        else:
            print(f"  {'>' if apply else '~'} {cur!r} -> '{NEW_TAG}'")
            if apply:
                inp = {"id": col["id"], "ruleSet": {"appliedDisjunctively": False,
                       "rules": [{"column": "TAG", "relation": "EQUALS", "condition": NEW_TAG}]}}
                r = gql(env, token, COLLECTION_UPDATE_M, {"input": inp})["collectionUpdate"]
                if r["userErrors"]:
                    print(f"      errors: {r['userErrors']}")
                else:
                    print(f"      now: {r['collection']['ruleSet']['rules']}")

    print("\n== PRUNE collections ==" + ("" if prune else "  (skipped; pass --prune)"))
    if prune:
        for h in PRUNE_HANDLES:
            col = collection_by_handle(env, token, h)
            if not col:
                print(f"  = {h}: not found (already gone)")
                continue
            n = col["productsCount"]["count"]
            print(f"  {'>' if apply else '~'} delete {h} ('{col['title']}', {n} products)")
            if apply:
                r = gql(env, token, COLLECTION_DELETE_M, {"input": {"id": col["id"]}})["collectionDelete"]
                if r["userErrors"]:
                    print(f"      errors: {r['userErrors']}")

    print("\n" + ("APPLIED." if apply else "DRY-RUN complete. Re-run with --apply (add --prune to delete collections)."))


if __name__ == "__main__":
    main()

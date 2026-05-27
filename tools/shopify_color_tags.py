#!/usr/bin/env python3
"""Apply color tags to nail-set products and create automated color collections.

Idempotent: re-running adds no duplicate tags and never recreates an existing
collection (matched by handle). Read-only by default; pass --apply to mutate.

Env (loaded from apps/web/.env.local via shopify_auth):
  SHOPIFY_STORE_DOMAIN, SHOPIFY_API_VERSION,
  SHOPIFY_ADMIN_CLIENT_ID, SHOPIFY_ADMIN_CLIENT_SECRET

Usage:
  python tools/shopify_color_tags.py            # dry-run, prints planned changes
  python tools/shopify_color_tags.py --apply     # write tags + create collections
"""
from __future__ import annotations

import json
import sys
import urllib.request
import urllib.error

from shopify_auth import get_admin_token, load_env

# Dominant color first, then accents. Verified by image inspection 2026-05-26.
COLOR_MAP: dict[str, list[str]] = {
    "midnight-circuit": ["Black", "White"],
    "molten-steel": ["Silver", "Nude"],
    "monochrome-edge": ["White", "Black"],
    "rebel-king": ["White", "Black"],
    "crimson-impact-red-silver-graphic-press-on-nails-for-men": ["Red", "Silver"],
    "frost-voltage": ["Blue", "Silver"],
    "arctic-holiday": ["White", "Silver"],
    "christmas-classics": ["Red", "Green"],
    "safari-stripes": ["Green", "Brown"],
    "ocean-drive": ["Blue", "Silver"],
    "urban-jungle": ["Green", "Gold"],
    "galaxy-glitch": ["Black", "Silver"],
    "liquid-metal": ["Silver"],
    "liquid-ice": ["Blue", "Silver"],
    "bold-horizon": ["Blue", "Silver"],
    "concrete-clarity": ["Grey", "Silver"],
    "forest-ember": ["Green", "Red"],
    "crimson-authority": ["Red", "Black", "Gold"],
}

# Bad tags to strip from specific products (data cleanup).
STRIP_TAGS: dict[str, list[str]] = {
    "safari-stripes": ["gift card"],
}

# One automated collection per color. handle -> (title, color condition).
COLLECTION_COLORS = ["Black", "White", "Silver", "Gold", "Red", "Blue", "Green", "Grey", "Brown"]


def gql(env: dict[str, str], query: str, variables: dict) -> dict:
    url = f"https://{env['SHOPIFY_STORE_DOMAIN']}/admin/api/{env['SHOPIFY_API_VERSION']}/graphql.json"
    body = json.dumps({"query": query, "variables": variables}).encode()
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/json",
            "X-Shopify-Access-Token": get_admin_token(env),
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            payload = json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        sys.exit(f"HTTP {exc.code}: {exc.read().decode()[:500]}")
    if payload.get("errors"):
        sys.exit(f"GraphQL error: {json.dumps(payload['errors'])[:500]}")
    return payload["data"]


PRODUCTS_Q = """
query($q: String!) {
  products(first: 100, query: $q) { edges { node { id handle title tags } } }
}
"""

TAGS_ADD_M = """
mutation($id: ID!, $tags: [String!]!) {
  tagsAdd(id: $id, tags: $tags) { userErrors { field message } }
}
"""

TAGS_REMOVE_M = """
mutation($id: ID!, $tags: [String!]!) {
  tagsRemove(id: $id, tags: $tags) { userErrors { field message } }
}
"""

COLLECTION_BY_HANDLE_Q = """
query($q: String!) { collections(first: 1, query: $q) { edges { node { id handle title } } } }
"""

COLLECTION_CREATE_M = """
mutation($input: CollectionInput!) {
  collectionCreate(input: $input) {
    collection { id handle title }
    userErrors { field message }
  }
}
"""

PUBLICATIONS_Q = "{ publications(first: 25) { edges { node { id name } } } }"

PUBLISH_M = """
mutation($id: ID!, $input: [PublicationInput!]!) {
  publishablePublish(id: $id, input: $input) { userErrors { field message } }
}
"""

# A new collection is invisible to the Storefront API until published to the
# storefront sales channels. Publish to the online store + any headless channel.
PUBLISH_TO = ("Online Store", "Headless")


def storefront_publication_ids(env: dict[str, str]) -> list[str]:
    data = gql(env, PUBLICATIONS_Q, {})
    ids = []
    for edge in data["publications"]["edges"]:
        name = edge["node"]["name"]
        if any(want.lower() in name.lower() for want in PUBLISH_TO):
            ids.append(edge["node"]["id"])
    return ids


def fetch_products(env: dict[str, str]) -> dict[str, dict]:
    data = gql(env, PRODUCTS_Q, {"q": "vendor:Nailismo*"})
    out: dict[str, dict] = {}
    for edge in data["products"]["edges"]:
        node = edge["node"]
        out[node["handle"]] = node
    return out


def apply_tags(env: dict[str, str], products: dict[str, dict], apply: bool) -> None:
    print("\n== TAGS ==")
    for handle, colors in COLOR_MAP.items():
        prod = products.get(handle)
        if not prod:
            print(f"  ! product not found: {handle}")
            continue
        existing = set(prod["tags"])
        to_add = [c for c in colors if c not in existing]
        to_remove = [t for t in STRIP_TAGS.get(handle, []) if t in existing]
        if not to_add and not to_remove:
            print(f"  = {prod['title']}: up to date ({', '.join(colors)})")
            continue
        msg = []
        if to_add:
            msg.append(f"+{to_add}")
        if to_remove:
            msg.append(f"-{to_remove}")
        print(f"  {'>' if apply else '~'} {prod['title']}: {' '.join(msg)}")
        if apply:
            if to_add:
                res = gql(env, TAGS_ADD_M, {"id": prod["id"], "tags": to_add})
                errs = res["tagsAdd"]["userErrors"]
                if errs:
                    print(f"      tagsAdd errors: {errs}")
            if to_remove:
                res = gql(env, TAGS_REMOVE_M, {"id": prod["id"], "tags": to_remove})
                errs = res["tagsRemove"]["userErrors"]
                if errs:
                    print(f"      tagsRemove errors: {errs}")


def ensure_collections(env: dict[str, str], apply: bool) -> None:
    print("\n== COLLECTIONS (automated, rule: tag = <Color>) ==")
    pub_ids = storefront_publication_ids(env) if apply else []
    for color in COLLECTION_COLORS:
        data = gql(env, COLLECTION_BY_HANDLE_Q, {"q": f"handle:{color.lower()}"})
        edges = data["collections"]["edges"]
        if edges:
            print(f"  = {color}: exists ({edges[0]['node']['handle']})")
            continue
        print(f"  {'>' if apply else '~'} {color}: create automated collection + publish")
        if apply:
            inp = {
                "title": color,
                "handle": color.lower(),
                "descriptionHtml": f"<p>Every Nailismo set in {color.lower()}.</p>",
                "ruleSet": {
                    "appliedDisjunctively": False,
                    "rules": [{"column": "TAG", "relation": "EQUALS", "condition": color}],
                },
            }
            res = gql(env, COLLECTION_CREATE_M, {"input": inp})
            errs = res["collectionCreate"]["userErrors"]
            if errs:
                print(f"      collectionCreate errors: {errs}")
                continue
            cid = res["collectionCreate"]["collection"]["id"]
            pres = gql(env, PUBLISH_M, {"id": cid, "input": [{"publicationId": p} for p in pub_ids]})
            perrs = pres["publishablePublish"]["userErrors"]
            if perrs:
                print(f"      publish errors: {perrs}")


def main() -> None:
    apply = "--apply" in sys.argv
    env = load_env()
    products = fetch_products(env)
    print(f"Loaded {len(products)} products from store {env['SHOPIFY_STORE_DOMAIN']}")
    print("MODE:", "APPLY (writing)" if apply else "DRY-RUN (no writes)")
    apply_tags(env, products, apply)
    ensure_collections(env, apply)
    print("\nDone." + ("" if apply else "  Re-run with --apply to write."))


if __name__ == "__main__":
    main()

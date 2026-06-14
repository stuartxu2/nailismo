#!/usr/bin/env python3
"""Seed/manage genuine product reviews in the Shopify `custom.reviews` metafield.

The PDP reads this metafield (Storefront PUBLIC_READ) and only then renders a
review section + AggregateRating/Review schema. This tool never invents review
content — it stores text the owner provides from real early customers.

Subcommands:
  setup-definition                 create the custom.reviews metafield definition (idempotent)
  list   --product <handle>        print current reviews for a product
  add    --product <handle> --author "Riley P." --rating 5 --body "..." \\
         [--title "..."] [--date YYYY-MM-DD] [--verified] [--incentivized]
  clear  --product <handle>        remove all reviews for a product

Env: loaded by shopify_auth.load_env() from apps/web/.env.local.
"""
from __future__ import annotations

import argparse
import datetime as _dt
import json
import sys
import urllib.error
import urllib.request

from shopify_auth import load_env, get_admin_token

NAMESPACE = "custom"
KEY = "reviews"


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


DEFINITION_CREATE = """
mutation($def: MetafieldDefinitionInput!) {
  metafieldDefinitionCreate(definition: $def) {
    createdDefinition { id name }
    userErrors { field message code }
  }
}
"""

PRODUCT_BY_HANDLE = """
query($q: String!) {
  products(first: 1, query: $q) {
    edges { node { id title metafield(namespace: "custom", key: "reviews") { value } } }
  }
}
"""

METAFIELDS_SET = """
mutation($mf: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $mf) {
    metafields { id }
    userErrors { field message code }
  }
}
"""


def setup_definition(env: dict[str, str], token: str) -> None:
    data = gql(env, token, DEFINITION_CREATE, {
        "def": {
            "name": "Reviews",
            "namespace": NAMESPACE,
            "key": KEY,
            "type": "json",
            "ownerType": "PRODUCT",
            "access": {"storefront": "PUBLIC_READ"},
        },
    })
    res = data["metafieldDefinitionCreate"]
    errs = res["userErrors"]
    if errs:
        # "TAKEN" means the definition already exists — idempotent success.
        if all(e.get("code") == "TAKEN" for e in errs):
            print("[reviews] definition already exists — ok")
            return
        sys.exit(f"definition errors: {json.dumps(errs)}")
    print(f"[reviews] created definition {res['createdDefinition']['id']}")


def _product(env: dict[str, str], token: str, handle: str) -> tuple[str, list[dict]]:
    data = gql(env, token, PRODUCT_BY_HANDLE, {"q": f"handle:{handle}"})
    edges = data["products"]["edges"]
    if not edges:
        sys.exit(f"no product with handle '{handle}'")
    node = edges[0]["node"]
    raw = node["metafield"]["value"] if node["metafield"] else None
    reviews = json.loads(raw) if raw else []
    if not isinstance(reviews, list):
        reviews = []
    return node["id"], reviews


def _write(env: dict[str, str], token: str, product_id: str, reviews: list[dict]) -> None:
    data = gql(env, token, METAFIELDS_SET, {
        "mf": [{
            "ownerId": product_id,
            "namespace": NAMESPACE,
            "key": KEY,
            "type": "json",
            "value": json.dumps(reviews, ensure_ascii=False),
        }],
    })
    errs = data["metafieldsSet"]["userErrors"]
    if errs:
        sys.exit(f"metafieldsSet errors: {json.dumps(errs)}")


def cmd_list(env, token, args) -> None:
    _, reviews = _product(env, token, args.product)
    print(json.dumps(reviews, indent=2, ensure_ascii=False))
    print(f"[reviews] {len(reviews)} review(s) on '{args.product}'")


def cmd_add(env, token, args) -> None:
    if not (1 <= args.rating <= 5):
        sys.exit("--rating must be 1..5")
    product_id, reviews = _product(env, token, args.product)
    entry = {
        "author": args.author,
        "rating": args.rating,
        "body": args.body,
        "date": args.date or _dt.date.today().isoformat(),
        "verified": bool(args.verified),
        "incentivized": bool(args.incentivized),
    }
    if args.title:
        entry["title"] = args.title
    reviews.append(entry)
    _write(env, token, product_id, reviews)
    print(f"[reviews] added review by {args.author} to '{args.product}' (now {len(reviews)})")


def cmd_clear(env, token, args) -> None:
    product_id, reviews = _product(env, token, args.product)
    _write(env, token, product_id, [])
    print(f"[reviews] cleared {len(reviews)} review(s) from '{args.product}'")


def main() -> None:
    parser = argparse.ArgumentParser(description="Manage Shopify custom.reviews metafield")
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("setup-definition")

    p_list = sub.add_parser("list")
    p_list.add_argument("--product", required=True)

    p_add = sub.add_parser("add")
    p_add.add_argument("--product", required=True)
    p_add.add_argument("--author", required=True)
    p_add.add_argument("--rating", type=int, required=True)
    p_add.add_argument("--body", required=True)
    p_add.add_argument("--title")
    p_add.add_argument("--date")
    p_add.add_argument("--verified", action="store_true")
    p_add.add_argument("--incentivized", action="store_true")

    p_clear = sub.add_parser("clear")
    p_clear.add_argument("--product", required=True)

    args = parser.parse_args()
    env = load_env()
    token = get_admin_token(env)

    if args.cmd == "setup-definition":
        setup_definition(env, token)
    elif args.cmd == "list":
        cmd_list(env, token, args)
    elif args.cmd == "add":
        cmd_add(env, token, args)
    elif args.cmd == "clear":
        cmd_clear(env, token, args)


if __name__ == "__main__":
    main()

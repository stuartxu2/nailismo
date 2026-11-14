#!/usr/bin/env python3
"""Verify the "Any 3 sets for $45" discount prices correctly in Storefront carts.

Builds real Storefront API carts (no checkout, no orders: abandoned carts only)
for each scenario and checks the discount the cart reports BEFORE checkout and
the total the shopper sees (pre-discount value minus the expected saving),
which is what the headless site shows. Gate for shipping any offer UI
(docs/superpowers/specs/2026-11-14-holiday-package-design.md, section 1).

  python tools/verify_bundle_discount.py

Exit 0 when every gated case matches; 1 otherwise. `mixed_four` is report-only
(records whether the app bundles the highest- or lowest-priced sets).
Env (apps/web/.env.local): SHOPIFY_STORE_DOMAIN, SHOPIFY_API_VERSION, and
SHOPIFY_STOREFRONT_PRIVATE_TOKEN or SHOPIFY_STOREFRONT_PUBLIC_TOKEN.
"""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request
from typing import Any

from shopify_auth import load_env

Cart = dict[str, Any]
# (name, [(handle, quantity)], expected savings or None for report-only)
CASES: list[tuple[str, list[tuple[str, int]], float | None]] = [
    ("two_sets", [("midnight-circuit", 1), ("monochrome-edge", 1)], 0.00),
    ("three_core", [("midnight-circuit", 1), ("monochrome-edge", 1), ("rebel-king", 1)], 8.97),
    ("same_set_x3", [("midnight-circuit", 3)], 8.97),
    ("mixed_three", [("midnight-circuit", 1), ("monochrome-edge", 1), ("molten-steel", 1)], 15.97),
    ("three_premium", [("molten-steel", 1), ("urban-jungle", 1), ("power-up", 1)], 29.97),
    ("four_core", [("midnight-circuit", 1), ("monochrome-edge", 1), ("rebel-king", 1), ("safari-stripes", 1)], 8.97),
    ("six_core", [("midnight-circuit", 1), ("monochrome-edge", 1), ("rebel-king", 1),
                  ("safari-stripes", 1), ("galaxy-glitch", 1), ("wave-check", 1)], 17.94),
    ("gift_plus_two", [("nailismo-gift-card", 1), ("midnight-circuit", 1), ("monochrome-edge", 1)], 0.00),
    ("glue_plus_two", [("nail-glue", 1), ("midnight-circuit", 1), ("monochrome-edge", 1)], 0.00),
    ("mixed_four", [("molten-steel", 1), ("urban-jungle", 1), ("power-up", 1), ("midnight-circuit", 1)], None),
]
GIFT_CARD_PRICE = 25.0

VARIANTS_Q = """
query($h: String!) { productByHandle(handle: $h) {
  isGiftCard variants(first: 10) { nodes { id availableForSale price { amount } } } } }
"""
CART_CREATE_M = """
mutation($input: CartInput!) { cartCreate(input: $input) {
  cart {
    cost { totalAmount { amount currencyCode } subtotalAmount { amount currencyCode } }
    discountAllocations { discountedAmount { amount currencyCode } }
    lines(first: 20) { nodes {
      quantity
      cost { subtotalAmount { amount currencyCode } }
      discountAllocations { discountedAmount { amount currencyCode } }
    } }
  }
  userErrors { field message }
} }
"""


def summarize(cart: Cart) -> tuple[float, float]:
    """(cart total, total discount across cart-level and line-level allocations)."""
    def total(allocs: list[Cart]) -> float:
        return sum(float(a["discountedAmount"]["amount"]) for a in allocs)

    savings = total(cart["discountAllocations"]) + sum(
        total(line["discountAllocations"]) for line in cart["lines"]["nodes"]
    )
    return float(cart["cost"]["totalAmount"]["amount"]), round(savings, 2)


def pre_discount(cart: Cart) -> float:
    """Merchandise value before any discount (line subtotals precede line-level discounts)."""
    return round(sum(float(line["cost"]["subtotalAmount"]["amount"]) for line in cart["lines"]["nodes"]), 2)


def verdict(total: float, pre: float, saved: float, expected: float | None) -> str:
    """PASS only when the discount AND the total the shopper sees both match (spec section 1 gate)."""
    if expected is None:
        return "REPORT"
    savings_ok = abs(saved - expected) <= 0.01
    total_ok = abs(total - (pre - expected)) <= 0.01
    return "PASS" if savings_ok and total_ok else "FAIL"


def storefront(env: dict[str, str], query: str, variables: dict[str, Any]) -> dict[str, Any]:
    headers = {"Content-Type": "application/json"}
    if env.get("SHOPIFY_STOREFRONT_PRIVATE_TOKEN"):
        headers["Shopify-Storefront-Private-Token"] = env["SHOPIFY_STOREFRONT_PRIVATE_TOKEN"]
    else:
        headers["X-Shopify-Storefront-Access-Token"] = env["SHOPIFY_STOREFRONT_PUBLIC_TOKEN"]
    url = f"https://{env['SHOPIFY_STORE_DOMAIN']}/api/{env['SHOPIFY_API_VERSION']}/graphql.json"
    req = urllib.request.Request(url, data=json.dumps({"query": query, "variables": variables}).encode(),
                                 headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            payload = json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        sys.exit(f"storefront API error: HTTP {exc.code}: {exc.read().decode()[:400]}")
    if payload.get("errors"):
        sys.exit(f"GraphQL errors: {json.dumps(payload['errors'])[:400]}")
    return payload["data"]


def variant_for(env: dict[str, str], handle: str) -> str:
    product = storefront(env, VARIANTS_Q, {"h": handle})["productByHandle"]
    if not product:
        sys.exit(f"product not found on storefront: {handle}")
    nodes = [v for v in product["variants"]["nodes"] if v["availableForSale"]]
    if product["isGiftCard"]:
        nodes = [v for v in nodes if float(v["price"]["amount"]) == GIFT_CARD_PRICE] or nodes
    if not nodes:
        sys.exit(f"no available variant: {handle}")
    return nodes[0]["id"]


def main() -> None:
    env = load_env()
    cache: dict[str, str] = {}
    failures = 0
    print(f"{'case':<15} {'pre':>8} {'subtot':>8} {'total':>8} {'saved':>8} {'expected':>9}  result")
    for name, lines, expected in CASES:
        cart_lines = []
        for handle, qty in lines:
            cache.setdefault(handle, variant_for(env, handle))
            cart_lines.append({"merchandiseId": cache[handle], "quantity": qty})
        res = storefront(env, CART_CREATE_M, {"input": {"lines": cart_lines}})["cartCreate"]
        if res["userErrors"]:
            print(f"{name:<15} userErrors: {res['userErrors']}")
            failures += 1
            continue
        cart = res["cart"]
        total, saved = summarize(cart)
        pre = pre_discount(cart)
        subtotal = float(cart["cost"]["subtotalAmount"]["amount"])
        result = verdict(total, pre, saved, expected)
        failures += result == "FAIL"
        exp = "-" if expected is None else f"{expected:.2f}"
        print(f"{name:<15} {pre:>8.2f} {subtotal:>8.2f} {total:>8.2f} {saved:>8.2f} {exp:>9}  {result}")
    print("\nGATE:", "PASS" if failures == 0 else f"FAIL ({failures} case(s))")
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()

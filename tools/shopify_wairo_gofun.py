#!/usr/bin/env python3
"""Upload the gofun 胡粉 off-white matte set — the 9th wairo 和色 design.

Source folder: Dropbox/Nailismo/Designs/white. Featured image is the product
flat lay; the two model shots follow. Reuses the proven single-product flow from
shopify_upload_product.py (stagedUploadsCreate -> POST bytes -> resourceUrl,
productSet with a Size option, every variant tracked at 10 on hand at the primary
location, status ACTIVE, then publishablePublish to Online Store + Headless).

The wairo collection (handle "wairo") is a MANUAL collection with no ruleSet, so
the new product is explicitly joined to it via collectionAddProducts.

  python tools/shopify_wairo_gofun.py            # dry-run, prints the plan
  python tools/shopify_wairo_gofun.py --apply    # create + upload + publish + add to wairo

Idempotent: if the handle already exists the create is skipped; the collection
join is still attempted (collectionAddProducts is a no-op if already a member).
"""
from __future__ import annotations

import os
import sys

import shopify_upload_product as up
from shopify_auth import get_admin_token, load_env

IMG_DIR = os.path.expanduser("~/Library/CloudStorage/Dropbox/Nailismo/Designs/white")

WAIRO_COLLECTION_ID = "gid://shopify/Collection/275512786993"  # "wairo 和色" (manual)

PRODUCT: dict = {
    "handle": "gofun",
    "title": "gofun 胡粉 🐚",
    "price": "17.99",  # core solid-matte tier (Gen Z pricing)
    "tags": ["White", "New Arrival"],
    "desc": (
        "胡粉 — gofun, the soft chalk-white ground from oyster shells, the base "
        "white of Japanese painting for centuries. A warm off-white (#FFFFFB) in a "
        "matte soft-square full set. Velvet, no-shine finish that reads clean and "
        "quiet and lands genderless. One clean color, salon-grade hold, reusable, "
        "on in minutes."
    ),
    "images": [
        ("hf_20260605_061143_2a8fb9e4-be39-4725-8db8-99954f4920ed.png",
         "gofun press-on nails — matte oyster-shell off-white soft-square full set, flat lay"),
        ("hf_20260608_094722_a7274e22-feab-4c8b-8bd1-3ddba0e6217f.png",
         "gofun press-on nails worn — matte off-white square nails, hands at the collar"),
        ("hf_20260608_095638_2cedf3f9-43e2-4b5c-8be2-c5b410733a21.png",
         "gofun press-on nails worn — matte off-white square nails in a grey knit"),
    ],
}

COLLECTION_ADD = """
mutation($id: ID!, $productIds: [ID!]!) {
  collectionAddProducts(id: $id, productIds: $productIds) {
    collection { id title productsCount { count } }
    userErrors { field message }
  }
}
"""

PRODUCT_BY_HANDLE_FULL = "query($h: String!){ productByHandle(handle:$h){ id handle title } }"


def main() -> None:
    apply = "--apply" in sys.argv
    spec = PRODUCT
    up.IMG_DIR = IMG_DIR  # redirect the reused build_input/stage_and_upload

    for fname, _ in spec["images"]:
        p = os.path.join(IMG_DIR, fname)
        if not os.path.exists(p):
            sys.exit(f"missing image file: {p}")

    env = load_env()
    token = get_admin_token(env)
    location_id = up.primary_location_id(env, token)
    pub_ids = up.storefront_pub_ids(env, token)
    print(f"Store {env['SHOPIFY_STORE_DOMAIN']} | API {env['SHOPIFY_API_VERSION']}")
    print(f"storefront publications: {len(pub_ids)} | sizes: {up.SIZES} @ {up.QTY_PER_SIZE} ea")
    print("MODE:", "APPLY (writing)" if apply else "DRY-RUN (no writes)")
    print(f"images from: {IMG_DIR}\n")

    existing = up.gql(env, token, PRODUCT_BY_HANDLE_FULL, {"h": spec["handle"]})["productByHandle"]
    pid = existing["id"] if existing else None

    if existing:
        print(f"SKIP   create: {spec['handle']} exists ({existing['title']})")
    else:
        print(f"{'CREATE' if apply else 'PLAN  '} {spec['handle']:8} {spec['title']:16} "
              f"${spec['price']}  {len(up.SIZES)}×{up.QTY_PER_SIZE}  tags={spec['tags']}")
        print(f"       images: {[f for f, _ in spec['images']]}")
        if apply:
            inp = up.build_input(env, token, spec, location_id, apply=True)
            res = up.gql(env, token, up.PRODUCT_SET, {"input": inp})["productSet"]
            if res["userErrors"]:
                sys.exit(f"productSet errors: {res['userErrors']}")
            pid = res["product"]["id"]
            print(f"       -> created {pid}  totalInventory={res['product']['totalInventory']}")
            pres = up.gql(env, token, up.PUBLISH_M,
                          {"id": pid, "input": [{"publicationId": x} for x in pub_ids]})
            perr = pres["publishablePublish"]["userErrors"]
            print(f"       -> published to {len(pub_ids)} channel(s)" if not perr
                  else f"       publish errors: {perr}")

    print(f"\n{'ADD   ' if apply else 'PLAN  '} -> wairo collection {WAIRO_COLLECTION_ID}")
    if apply:
        if not pid:
            sys.exit("no product id to add to collection")
        ares = up.gql(env, token, COLLECTION_ADD,
                      {"id": WAIRO_COLLECTION_ID, "productIds": [pid]})["collectionAddProducts"]
        if ares["userErrors"]:
            sys.exit(f"collectionAddProducts errors: {ares['userErrors']}")
        c = ares["collection"]
        print(f"       -> {c['title']} now has {c['productsCount']['count']} products")
        print("\nAPPLIED.")
    else:
        print("\nDRY-RUN complete. Re-run with --apply to write.")


if __name__ == "__main__":
    main()

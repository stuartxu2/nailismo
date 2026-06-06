#!/usr/bin/env python3
"""Upload the Japanese-traditional-color matte press-on series to Shopify.

Source folder: Dropbox/Nailismo/Designs/xu20260605. Each design ships as a
PAIR of files — a product render (matte nails, soft-square full set) and a
color card (tall phone screenshot with kanji + hex). Only the PRODUCT render
is uploaded; the color card is used solely to name/describe the product.

Reuses the proven single-product flow from shopify_upload_product.py
(stagedUploadsCreate -> POST bytes -> resourceUrl, productSet with a Size
option, every variant tracked at 10 on hand at the primary location, status
ACTIVE, then publishablePublish to Online Store + Headless).

  python tools/shopify_jp_matte_series.py            # dry-run, prints the plan
  python tools/shopify_jp_matte_series.py --apply     # create + upload + publish
  python tools/shopify_jp_matte_series.py --only kaba # one handle

Idempotent: a product whose handle already exists is skipped (no duplicate).
"""
from __future__ import annotations

import os
import sys

import shopify_upload_product as up
from shopify_auth import get_admin_token, load_env

IMG_DIR = os.path.expanduser(
    "~/Library/CloudStorage/Dropbox/Nailismo/Designs/xu20260605"
)

PRICE = "17.99"  # core solid-matte tier (Gen Z pricing)

# Each: handle, title, image filename (the PRODUCT render only), color tags
# (nearest match from apps/web/lib/product-colors.ts), and description seeded
# from the color card (kanji, romaji, hex, meaning). Cards are NOT uploaded.
PRODUCTS: list[dict] = [
    {
        "handle": "chitosemidori",
        "title": "chitosemidori 千歳緑 🌲",
        "tags": ["Green", "New Arrival"],
        "image": "CHITOSEMIDORIc.png",
        "alt": "chitosemidori press-on nails — matte thousand-year-green soft-square full set, flat lay",
        "desc": (
            "千歳緑 — \"thousand-year green,\" the deep evergreen of a pine that never fades. "
            "A matte forest green (#36563C), edge to edge, in a soft-square full set. Velvet, "
            "no-shine finish that reads quiet and expensive and lands genderless. One clean color, "
            "salon-grade hold, reusable, on in minutes."
        ),
    },
    {
        "handle": "hanada",
        "title": "hanada 縹 🌊",
        "tags": ["Blue", "Green", "New Arrival"],
        "image": "HANADAc.png",
        "alt": "hanada press-on nails — matte deep teal-blue soft-square full set, flat lay",
        "desc": (
            "縹 — hanada, the old deep indigo-teal of dyed cloth. A saturated blue-green (#006284) "
            "in a matte soft-square full set. Velvet, no-shine finish that goes with denim and "
            "everything else. One clean color, salon-grade hold, reusable, genderless."
        ),
    },
    {
        "handle": "konkikyo",
        "title": "konkikyo 紺桔梗 🪻",
        "tags": ["Blue", "New Arrival"],
        "image": "KONKIKYOc.png",
        "alt": "konkikyo press-on nails — matte deep navy bellflower soft-square full set, flat lay",
        "desc": (
            "紺桔梗 — konkikyo, the deep navy of a bellflower at dusk. A dark indigo (#211E55) in a "
            "matte soft-square full set. Velvet, no-shine finish — the everyday set that goes with the "
            "grey knit and a black coat. Salon-grade hold, reusable, genderless."
        ),
    },
    {
        "handle": "kurotsurubami",
        "title": "kurotsurubami 黒橡 🖤",
        "tags": ["Black", "New Arrival"],
        "image": "KUROTSURUBAMI.png",
        "alt": "kurotsurubami press-on nails — matte blackened-oak soft-square full set, flat lay",
        "desc": (
            "黒橡 — kurotsurubami, the deepest blackened-oak dye in the old palette. A true matte "
            "black (#0B1013), edge to edge, in a soft-square full set. Velvet, no-shine finish that "
            "reads sharp on anyone. One clean color, salon-grade hold, reusable, genderless."
        ),
    },
    {
        "handle": "mirucha",
        "title": "mirucha 海松茶 🫒",
        "tags": ["Green", "Brown", "New Arrival"],
        "image": "MIRUCHAc.png",
        "alt": "mirucha press-on nails — matte seaweed-olive soft-square full set, flat lay",
        "desc": (
            "海松茶 — mirucha, a brown-tinged \"seaweed\" green. A muted olive khaki (#62592C) in a "
            "matte soft-square full set. Velvet, no-shine finish that reads earthy and quiet and lands "
            "genderless. One clean color, salon-grade hold, reusable, on in minutes."
        ),
    },
    {
        "handle": "ominaeshi",
        "title": "ominaeshi 女郎花 🌼",
        "tags": ["Gold", "New Arrival"],
        "image": "OMINAESHIc.png",
        "alt": "ominaeshi press-on nails — matte golden-yellow soft-square full set, flat lay",
        "desc": (
            "女郎花 — ominaeshi, named for the golden valerian flower of late summer. A warm bright "
            "yellow (#DDD23B) in a matte soft-square full set. Velvet, no-shine finish that pops "
            "without screaming. One clean color, salon-grade hold, reusable, genderless."
        ),
    },
    {
        "handle": "tsutsuji",
        "title": "tsutsuji 躑躅 🌸",
        "tags": ["Red", "New Arrival"],
        "image": "TSUTSUJI.png",
        "alt": "tsutsuji press-on nails — matte azalea hot-pink soft-square full set, flat lay",
        "desc": (
            "躑躅 — tsutsuji, the vivid pink of azalea in full bloom. A saturated matte magenta-pink "
            "(#E03C8A) in a soft-square full set. Velvet, no-shine finish — loud color, clean lines, "
            "genderless. Salon-grade hold, reusable, on in minutes."
        ),
    },
    {
        "handle": "kaba",
        "title": "kaba 樺 🍂",
        "tags": ["Brown", "New Arrival"],
        "image": "КАВА.png",
        "alt": "kaba press-on nails — matte birch terracotta soft-square full set, flat lay",
        "desc": (
            "樺 — kaba, the warm red-brown of birch bark. A matte terracotta (#C1693C) in a soft-square "
            "full set. Velvet, no-shine finish that reads warm and grounded and lands genderless. "
            "One clean color, salon-grade hold, reusable, on in minutes."
        ),
    },
]


def _spec(p: dict) -> dict:
    """Adapt a row to the shape shopify_upload_product.build_input expects."""
    return {
        "handle": p["handle"],
        "title": p["title"],
        "price": PRICE,
        "tags": p["tags"],
        "desc": p["desc"],
        "images": [(p["image"], p["alt"])],
    }


def main() -> None:
    apply = "--apply" in sys.argv
    only = None
    if "--only" in sys.argv:
        only = sys.argv[sys.argv.index("--only") + 1]

    up.IMG_DIR = IMG_DIR  # redirect the reused build_input/stage_and_upload

    rows = [p for p in PRODUCTS if not only or p["handle"] == only]
    if only and not rows:
        sys.exit(f"--only {only}: no such handle")

    for p in rows:
        path = os.path.join(IMG_DIR, p["image"])
        if not os.path.exists(path):
            sys.exit(f"missing image file: {path}")

    env = load_env()
    token = get_admin_token(env)
    location_id = up.primary_location_id(env, token)
    pub_ids = up.storefront_pub_ids(env, token)
    print(f"Store {env['SHOPIFY_STORE_DOMAIN']} | API {env['SHOPIFY_API_VERSION']}")
    print(f"storefront publications: {len(pub_ids)} | sizes: {up.SIZES} @ {up.QTY_PER_SIZE} ea")
    print("MODE:", "APPLY (writing)" if apply else "DRY-RUN (no writes)")
    print(f"images from: {IMG_DIR}\n")

    created = skipped = 0
    for p in rows:
        spec = _spec(p)
        existing = up.gql(env, token, up.PRODUCT_BY_HANDLE_Q, {"h": spec["handle"]})["productByHandle"]
        if existing:
            print(f"SKIP   {spec['handle']:16} exists ({existing['title']})")
            skipped += 1
            continue

        print(f"{'CREATE' if apply else 'PLAN  '} {spec['handle']:16} {spec['title']:22} "
              f"${spec['price']}  {len(up.SIZES)}×{up.QTY_PER_SIZE}  tags={spec['tags']}  img={p['image']}")
        if not apply:
            continue

        inp = up.build_input(env, token, spec, location_id, apply=True)
        res = up.gql(env, token, up.PRODUCT_SET, {"input": inp})["productSet"]
        if res["userErrors"]:
            sys.exit(f"productSet errors ({spec['handle']}): {res['userErrors']}")
        pid = res["product"]["id"]
        print(f"       -> {pid}  totalInventory={res['product']['totalInventory']}")
        pres = up.gql(env, token, up.PUBLISH_M,
                      {"id": pid, "input": [{"publicationId": x} for x in pub_ids]})
        perr = pres["publishablePublish"]["userErrors"]
        print(f"       -> published to {len(pub_ids)} channel(s)" if not perr else f"       publish errors: {perr}")
        created += 1

    print(f"\n{'APPLIED' if apply else 'DRY-RUN'}: {created} created, {skipped} skipped, {len(rows)} total."
          + ("" if apply else "  Re-run with --apply to write."))


if __name__ == "__main__":
    main()

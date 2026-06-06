#!/usr/bin/env python3
"""Create the new press-on designs that aren't in the catalog yet, then build the
Gen-Z collections and publish everything to the storefront.

Source images live in the local Listing folder (LISTING_DIR). For each new design
this tool:
  1. stages + uploads its image(s) to Shopify's CDN (stagedUploadsCreate -> POST
     bytes -> resourceUrl),
  2. creates the product via productSet with a Size option (S/M/L/XL) — Halloween
     also gets a Color option — every variant tracked with 10 on hand at the
     primary location, priced by tier, status ACTIVE,
  3. publishes the product to the storefront sales channels.

Then it creates the Gen-Z collections (smart "New Drops" + manual edits) and
publishes them.

Idempotent:
  - A product whose handle already exists is skipped (no duplicate, no re-upload).
  - A collection whose handle already exists is not recreated; for manual
    collections any missing member products are added.

Brand note: the store abstracts artist references (no "G-Dragon"/"Coldplay" in
titles) — matches the existing catalog naming.

Env (loaded from apps/web/.env.local via shopify_auth):
  SHOPIFY_STORE_DOMAIN, SHOPIFY_API_VERSION,
  SHOPIFY_ADMIN_CLIENT_ID, SHOPIFY_ADMIN_CLIENT_SECRET   (scope: write_products)

Usage:
  python tools/shopify_new_products.py                 # dry-run, prints the plan
  python tools/shopify_new_products.py --apply          # create + upload + publish
  python tools/shopify_new_products.py --only mercury    # one product (test)
  python tools/shopify_new_products.py --collections-only # skip product creation
"""
from __future__ import annotations

import json
import mimetypes
import os
import sys
import urllib.error
import urllib.request
import uuid

from shopify_auth import get_admin_token, load_env

LISTING_DIR = os.path.expanduser(
    "~/Library/CloudStorage/Dropbox/Nailismo/Listing20250730"
)

SIZES = ["S", "M", "L", "XL"]
QTY_PER_SIZE = 10

# Tier prices (match the live catalog's Gen-Z pricing strategy).
CORE = "17.99"
PREMIUM = "24.99"

# ---------------------------------------------------------------------------
# New designs not yet in the catalog. Titles abstract any artist reference.
# `images`: first is the featured image; alt doubles as a11y/SEO text.
# ---------------------------------------------------------------------------
NEW_PRODUCTS: list[dict] = [
    {
        "handle": "power-up",
        "title": "power up 🔋",
        "price": PREMIUM,
        "tags": ["Black", "Red", "New Arrival"],
        "desc": "Loud, loaded, unapologetic. A mixed-mani set stacked with studs, a crystal cluster, polka dots and a peace-sign moment — every nail its own flex. Glossy gel finish, salon-grade hold, zero commitment.",
        "images": [
            ("G-DRAGON Power press on nails.jpg", "power up press-on nails — mixed black, yellow, red and white nails with studs, polka dots and a crystal cluster"),
            ("G-DRAGON Power press on nails 1.JPG", "power up press-on nails — close-up detail of the studded mixed-mani set"),
        ],
    },
    {
        "handle": "main-stage",
        "title": "main stage 🌼",
        "price": PREMIUM,
        "tags": ["Black", "Green", "New Arrival"],
        "desc": "Built for the front row. Hand-finished daisies, crowns and lightning bolts across a high-shine black base with a crystal accent nail. A statement set that hits different under the lights.",
        "images": [
            ("G-DRAGON concert press on nails.jpg", "main stage press-on nails — black and neon set with hand-painted daisy, crown and lightning art plus a crystal nail"),
            ("G-DRAGON concert press on nails 1.JPG", "main stage press-on nails — close-up detail of the daisy and crown art"),
        ],
    },
    {
        "handle": "amber-glow",
        "title": "amber glow 🍯",
        "price": CORE,
        "tags": ["Brown", "Gold", "New Arrival"],
        "desc": "Warm caramel and cream swirls streaked with real gold-leaf brushwork. Glossy, glassy and quietly expensive — the everyday set that goes with everything.",
        "images": [
            ("amber and gold press on nails.jpg", "amber glow press-on nails — caramel and cream marble with gold-leaf accents"),
            ("amber and gold press on nails 1.jpg", "amber glow press-on nails — close-up of the gold-leaf brushwork"),
        ],
    },
    {
        "handle": "pet-pals",
        "title": "pet pals 🐾",
        "price": CORE,
        "tags": ["Black", "White", "New Arrival"],
        "desc": "Doodle-core, fully unhinged. Hand-drawn cats, dogs, bows and hearts in black-and-white with 3D star and heart charms. Cute with a little chaos.",
        "images": [
            ("cat and dog press on nails.jpg", "pet pals press-on nails — black-and-white set with hand-drawn cats, dogs, bows and 3D charms"),
            ("cat and dog press on nails 1.JPG", "pet pals press-on nails — close-up of the doodle pet art"),
        ],
    },
    {
        "handle": "cherry-chrome",
        "title": "cherry chrome 🍒",
        "price": CORE,
        "tags": ["Red", "New Arrival"],
        "desc": "Deep cherry-red cat-eye that catches the light and moves with you. One clean color, all gloss, maximum impact. The red-nail theory, handled.",
        "images": [
            ("cat eye gel red press on nails.jpg", "cherry chrome press-on nails — glossy deep-red cat-eye set"),
            ("cat eye gel red press on nails 1.JPG", "cherry chrome press-on nails — close-up of the red cat-eye shimmer"),
        ],
    },
    {
        "handle": "doodle-pop",
        "title": "doodle pop 👾",
        "price": CORE,
        "tags": ["Blue", "Red", "New Arrival"],
        "desc": "Primary-color chaos in the best way — ghosts, stars, hearts and scribbles across blue, red and yellow. Playground energy, gallery finish.",
        "images": [
            ("cold play press on nails.jpg", "doodle pop press-on nails — primary blue, red and yellow nails with hand-drawn ghosts, stars and hearts"),
            ("cold play press on nails 1.JPG", "doodle pop press-on nails — close-up of the doodle icon art"),
        ],
    },
    {
        "handle": "comic-relief",
        "title": "comic relief 💥",
        "price": CORE,
        "tags": ["Grey", "Blue", "New Arrival"],
        "desc": "Smudgy grey-blue gradients tagged with hand-drawn comic faces — X-eyes, smirks, little hearts. Meme-coded, low-key, all gloss.",
        "images": [
            ("comics press on nails.jpg", "comic relief press-on nails — grey and blue gradient nails with hand-drawn comic faces"),
            ("comics press on nails 1.jpg", "comic relief press-on nails — close-up of the comic-face line art"),
        ],
    },
    {
        "handle": "midas-touch",
        "title": "midas touch 🪙",
        "price": PREMIUM,
        "tags": ["Gold", "Brown", "New Arrival"],
        "desc": "Molten golds, olive shimmer and chunky glitter over earthy marble. A heavy, glassy, light-catching set that reads pure luxe. Everything you touch.",
        "images": [
            ("dazzling gold press on nails.jpg", "midas touch press-on nails — gold, olive and cream marble with chunky glitter and foil"),
            ("dazzling gold press on nails 1.jpg", "midas touch press-on nails — close-up of the gold glitter and foil"),
        ],
    },
    {
        "handle": "latte-mode",
        "title": "latte mode ☕",
        "price": CORE,
        "tags": ["Brown", "Silver", "New Arrival"],
        "desc": "The latte-nail trend, done right. Warm browns and cream cow-print with silver glitter cat-eye accents. Cozy, neutral, quietly iconic.",
        "images": [
            ("latte cat eye press on nails.jpg", "latte mode press-on nails — brown and cream cow-print with silver glitter cat-eye"),
            ("latte cat eye press on nails 1.jpg", "latte mode press-on nails — close-up of the cow-print and glitter"),
        ],
    },
    {
        "handle": "moss-fade",
        "title": "moss fade 🌿",
        "price": CORE,
        "tags": ["Green", "Grey", "New Arrival"],
        "desc": "Muted taupe melting into deep teal-green tips, with tiny minimalist dots. Understated, moody, easy to wear with literally anything.",
        "images": [
            ("ombre green press on nails.jpg", "moss fade press-on nails — taupe-to-teal-green ombre with minimalist dots"),
            ("ombre green press on nails 1.JPG", "moss fade press-on nails — close-up of the green ombre tips"),
        ],
    },
    {
        "handle": "champagne",
        "title": "champagne 🥂",
        "price": CORE,
        "tags": ["Nude", "Gold", "New Arrival"],
        "desc": "Soft ivory with gold-fleck glitter and a single silver line. Clean, glassy and celebration-ready — the soft-launch set.",
        "images": [
            ("paris story press on nails.jpg", "champagne press-on nails — ivory nails with gold-fleck glitter and a silver line accent"),
            ("paris story press on nails 1.jpg", "champagne press-on nails — close-up of the gold glitter accent"),
        ],
    },
    {
        "handle": "mercury",
        "title": "mercury 🪞",
        "price": CORE,
        "tags": ["Silver", "Nude", "New Arrival"],
        "desc": "Liquid silver chrome swirled over a nude base — mirror-finish marble that looks wet. Futuristic, sleek, genderless.",
        "images": [
            ("pink and silver press on nails.jpg", "mercury press-on nails — nude base with liquid silver chrome marble swirls"),
            ("pink and silver press on nails 1.JPG", "mercury press-on nails — close-up of the chrome marble finish"),
        ],
    },
    {
        "handle": "static",
        "title": "static 🌫️",
        "price": CORE,
        "tags": ["Grey", "Black", "New Arrival"],
        "desc": "Smoky greys, black and amber marble streaked with silver foil. A true unisex set — neutral, moody and impossible to clock as basic.",
        "images": [
            ("unisex press on nails.jpg", "static press-on nails — grey, black and amber smoky marble with silver foil"),
            ("unisex press on nails 1.JPG", "static press-on nails — close-up of the smoky marble and foil"),
        ],
    },
    {
        "handle": "slashed",
        "title": "slashed 🔪",
        "price": CORE,
        "tags": ["Nude", "Black", "New Arrival"],
        "desc": "Bare nude base ripped through with black, silver and red brush-slash graphics and tiny hand-drawn marks. Quiet base, loud detail.",
        "images": [
            ("press on nails.jpg", "slashed press-on nails — nude base with black, silver and red brush-slash graphics"),
            ("press on nails 1.JPG", "slashed press-on nails — close-up of the brush-slash detail"),
        ],
    },
]

# Halloween: one product, Color x Size. Each color carries its own image.
HALLOWEEN = {
    "handle": "cursed",
    "title": "cursed 💀",
    "price": PREMIUM,
    "tags": ["Black", "Green", "New Arrival", "Halloween"],
    "desc": "Gothic chrome cat-eye loaded with 3D crosses, skulls and evil-eye charms. Seven cursed colorways — pick your poison. Handmade, high-shine, a little possessed.",
    "hero": ("halloween press on nails 1.jpg",
             "cursed press-on nails — gothic green chrome cat-eye set with skull, cross and evil-eye charms"),
    # display color name -> (filename, alt)
    "colors": [
        ("Black", "Halloween press on nials black.jpg", "cursed press-on nails in black — gothic chrome cat-eye with cross and skull charms"),
        ("Purple", "Halloween press on nails purple.jpg", "cursed press-on nails in purple — gothic chrome cat-eye with cross and winged-heart charms"),
        ("Green", "halloween press on nails green.jpg", "cursed press-on nails in green — gothic chrome cat-eye with cross and skull charms"),
        ("Blue", "Halloween press on nails blue.jpg", "cursed press-on nails in blue — gothic chrome cat-eye with cross and skull charms"),
        ("Orange", "Halloween press on nails orange.jpg", "cursed press-on nails in orange — gothic chrome cat-eye with cross and skull charms"),
        ("Pink", "Halloween press on nails pink.jpg", "cursed press-on nails in pink — gothic chrome cat-eye with cross and skull charms"),
        ("Yellow", "Halloween press on nails yellow.jpg", "cursed press-on nails in yellow — gothic chrome cat-eye with cross and skull charms"),
    ],
}

# ---------------------------------------------------------------------------
# Gen-Z collections. "smart" auto-populates by tag; "manual" lists member handles
# (new + existing). Existing per-color collections (black/white/...) are untouched.
# ---------------------------------------------------------------------------
COLLECTIONS: list[dict] = [
    {
        "handle": "new-drops",
        "title": "New Drops",
        "desc": "Fresh off the rack. The latest press-on sets to land at Nailismo — restocked and rotated often.",
        "smart_tag": "New Arrival",
        "sort": "CREATED_DESC",
    },
    {
        "handle": "chrome-club",
        "title": "Chrome Club",
        "desc": "Mirror finishes, cat-eye shimmer and liquid metal. The high-shine sets that catch every light.",
        "members": [
            "liquid-metal", "galaxy-glitch", "liquid-ice", "molten-steel",
            "frost-voltage", "cherry-chrome", "latte-mode", "mercury",
        ],
    },
    {
        "handle": "loud-and-graphic",
        "title": "Loud & Graphic",
        "desc": "Hand-drawn art, street graphics and statement charms. Sets that do the talking.",
        "members": [
            "rebel-king", "midnight-circuit", "monochrome-edge",
            "crimson-impact-red-silver-graphic-press-on-nails-for-men",
            "doodle-pop", "comic-relief", "power-up", "main-stage",
            "slashed", "pet-pals", "cursed",
        ],
    },
    {
        "handle": "latte-and-neutrals",
        "title": "Latte & Neutrals",
        "desc": "Warm browns, creams and smoky greys. The latte-core neutrals that go with everything.",
        "members": [
            "amber-glow", "midas-touch", "champagne", "static",
            "moss-fade", "latte-mode", "mercury", "concrete-clarity",
        ],
    },
    {
        "handle": "best-sellers",
        "title": "Best Sellers",
        "desc": "The sets everyone's reaching for. Crowd favorites, always in rotation.",
        "members": [
            "rebel-king", "liquid-metal", "midnight-circuit", "liquid-ice",
            "urban-jungle", "cherry-chrome", "amber-glow", "cursed",
        ],
    },
]

PUBLISH_TO = ("Online Store", "Headless")


# --------------------------------------------------------------------------- #
# GraphQL plumbing
# --------------------------------------------------------------------------- #
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


# Token lacks read_locations (name/isActive denied); id is readable. Single-location store.
LOCATIONS_Q = "{ locations(first: 5) { nodes { id } } }"
PUBLICATIONS_Q = "{ publications(first: 25) { edges { node { id name } } } }"
PRODUCT_BY_HANDLE_Q = "query($h: String!){ productByHandle(handle:$h){ id handle title } }"
PRODUCTS_Q = "{ products(first: 100) { nodes { id handle } } }"
COLLECTION_BY_HANDLE_Q = "query($q:String!){ collections(first:1, query:$q){ nodes{ id handle title } } }"

STAGED_UPLOADS = """
mutation($input: [StagedUploadInput!]!) {
  stagedUploadsCreate(input: $input) {
    stagedTargets { url resourceUrl parameters { name value } }
    userErrors { field message }
  }
}
"""

PRODUCT_SET = """
mutation($input: ProductSetInput!) {
  productSet(input: $input) {
    product { id handle title totalInventory
      variants(first: 50) { nodes { title price inventoryQuantity } } }
    userErrors { field message code }
  }
}
"""

PUBLISH_M = """
mutation($id: ID!, $input: [PublicationInput!]!) {
  publishablePublish(id: $id, input: $input) { userErrors { field message } }
}
"""

COLLECTION_CREATE_M = """
mutation($input: CollectionInput!) {
  collectionCreate(input: $input) {
    collection { id handle title }
    userErrors { field message }
  }
}
"""

COLLECTION_ADD_M = """
mutation($id: ID!, $productIds: [ID!]!) {
  collectionAddProducts(id: $id, productIds: $productIds) {
    collection { id }
    userErrors { field message }
  }
}
"""


# --------------------------------------------------------------------------- #
# Staged upload (one POST per file, cached by path)
# --------------------------------------------------------------------------- #
def _multipart(fields, file_field, filename, content_type, data):
    boundary = f"----nailismo{uuid.uuid4().hex}"
    crlf = b"\r\n"
    out = bytearray()
    for name, value in fields:
        out += b"--" + boundary.encode() + crlf
        out += f'Content-Disposition: form-data; name="{name}"'.encode() + crlf + crlf
        out += value.encode() + crlf
    out += b"--" + boundary.encode() + crlf
    out += f'Content-Disposition: form-data; name="{file_field}"; filename="{filename}"'.encode() + crlf
    out += f"Content-Type: {content_type}".encode() + crlf + crlf
    out += data + crlf
    out += b"--" + boundary.encode() + b"--" + crlf
    return bytes(out), boundary


_UPLOAD_CACHE: dict[str, str] = {}


def stage_and_upload(env, token, path):
    if path in _UPLOAD_CACHE:
        return _UPLOAD_CACHE[path]
    filename = os.path.basename(path)
    mime = mimetypes.guess_type(filename)[0] or "image/jpeg"
    size = os.path.getsize(path)
    staged = gql(env, token, STAGED_UPLOADS, {"input": [{
        "filename": filename, "mimeType": mime, "resource": "IMAGE",
        "httpMethod": "POST", "fileSize": str(size),
    }]})["stagedUploadsCreate"]
    if staged["userErrors"]:
        sys.exit(f"stagedUploadsCreate errors: {json.dumps(staged['userErrors'])}")
    target = staged["stagedTargets"][0]
    with open(path, "rb") as fh:
        data = fh.read()
    fields = [(p["name"], p["value"]) for p in target["parameters"]]
    body, boundary = _multipart(fields, "file", filename, mime, data)
    req = urllib.request.Request(
        target["url"], data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    try:
        urllib.request.urlopen(req)
    except urllib.error.HTTPError as exc:
        sys.exit(f"staged upload POST failed: HTTP {exc.code}: {exc.read().decode()[:500]}")
    _UPLOAD_CACHE[path] = target["resourceUrl"]
    return target["resourceUrl"]


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def primary_location_id(env, token):
    nodes = gql(env, token, LOCATIONS_Q)["locations"]["nodes"]
    if not nodes:
        sys.exit("no location found")
    return nodes[0]["id"], "primary"


def storefront_pub_ids(env, token):
    out = []
    for e in gql(env, token, PUBLICATIONS_Q)["publications"]["edges"]:
        if any(w.lower() in e["node"]["name"].lower() for w in PUBLISH_TO):
            out.append(e["node"]["id"])
    return out


def file_path(name):
    return os.path.join(LISTING_DIR, name)


def validate_files():
    missing = []
    for spec in NEW_PRODUCTS:
        for fname, _ in spec["images"]:
            if not os.path.exists(file_path(fname)):
                missing.append(fname)
    if not os.path.exists(file_path(HALLOWEEN["hero"][0])):
        missing.append(HALLOWEEN["hero"][0])
    for _, fname, _ in HALLOWEEN["colors"]:
        if not os.path.exists(file_path(fname)):
            missing.append(fname)
    if missing:
        sys.exit("missing image files:\n  " + "\n  ".join(missing))


# --------------------------------------------------------------------------- #
# Build productSet inputs
# --------------------------------------------------------------------------- #
def build_simple_input(env, token, spec, location_id, apply):
    """A sized (S/M/L/XL) product with a single design image."""
    files = []
    if apply:
        for fname, alt in spec["images"]:
            files.append({
                "originalSource": stage_and_upload(env, token, file_path(fname)),
                "alt": alt, "contentType": "IMAGE",
            })
    variants = [{
        "optionValues": [{"optionName": "Size", "name": s}],
        "price": spec["price"],
        "inventoryItem": {"tracked": True},
        "inventoryQuantities": [{"locationId": location_id, "name": "available", "quantity": QTY_PER_SIZE}],
    } for s in SIZES]
    inp = {
        "handle": spec["handle"],
        "title": spec["title"],
        "descriptionHtml": f"<p>{spec['desc']}</p>",
        "vendor": "Nailismo.com",
        "status": "ACTIVE",
        "tags": spec["tags"],
        "productOptions": [{"name": "Size", "position": 1, "values": [{"name": s} for s in SIZES]}],
        "variants": variants,
    }
    if files:
        inp["files"] = files
        # featured = first image; bind it to every variant
        for v in variants:
            v["file"] = {"originalSource": files[0]["originalSource"]}
    return inp


def build_halloween_input(env, token, location_id, apply):
    """cursed: Color x Size, each color carries its own image."""
    color_src = {}
    files = []
    if apply:
        hero_src = stage_and_upload(env, token, file_path(HALLOWEEN["hero"][0]))
        files.append({"originalSource": hero_src, "alt": HALLOWEEN["hero"][1], "contentType": "IMAGE"})
        for cname, fname, alt in HALLOWEEN["colors"]:
            src = stage_and_upload(env, token, file_path(fname))
            color_src[cname] = src
            files.append({"originalSource": src, "alt": alt, "contentType": "IMAGE"})
    colors = [c[0] for c in HALLOWEEN["colors"]]
    variants = []
    for cname in colors:
        for s in SIZES:
            v = {
                "optionValues": [
                    {"optionName": "Color", "name": cname},
                    {"optionName": "Size", "name": s},
                ],
                "price": HALLOWEEN["price"],
                "inventoryItem": {"tracked": True},
                "inventoryQuantities": [{"locationId": location_id, "name": "available", "quantity": QTY_PER_SIZE}],
            }
            if apply:
                v["file"] = {"originalSource": color_src[cname]}
            variants.append(v)
    inp = {
        "handle": HALLOWEEN["handle"],
        "title": HALLOWEEN["title"],
        "descriptionHtml": f"<p>{HALLOWEEN['desc']}</p>",
        "vendor": "Nailismo.com",
        "status": "ACTIVE",
        "tags": HALLOWEEN["tags"],
        "productOptions": [
            {"name": "Color", "position": 1, "values": [{"name": c} for c in colors]},
            {"name": "Size", "position": 2, "values": [{"name": s} for s in SIZES]},
        ],
        "variants": variants,
    }
    if files:
        inp["files"] = files
    return inp


def create_product(env, token, spec, inp, pub_ids, apply):
    handle = spec["handle"]
    existing = gql(env, token, PRODUCT_BY_HANDLE_Q, {"h": handle})["productByHandle"]
    if existing:
        print(f"SKIP   product exists: {handle} ({existing['title']})")
        return
    nvar = len(inp["variants"])
    print(f"{'CREATE' if apply else 'PLAN  '} {handle:18} {spec['title']:16} "
          f"${spec['price']}  {nvar} variants @ {QTY_PER_SIZE} ea  tags={spec['tags']}")
    if not apply:
        return
    res = gql(env, token, PRODUCT_SET, {"input": inp})["productSet"]
    if res["userErrors"]:
        sys.exit(f"productSet errors on {handle}: {json.dumps(res['userErrors'])}")
    pid = res["product"]["id"]
    print(f"       -> created {pid}  totalInventory={res['product']['totalInventory']}")
    pres = gql(env, token, PUBLISH_M, {"id": pid, "input": [{"publicationId": p} for p in pub_ids]})
    if pres["publishablePublish"]["userErrors"]:
        print(f"       publish errors: {pres['publishablePublish']['userErrors']}")
    else:
        print(f"       -> published to {len(pub_ids)} channel(s)")


# --------------------------------------------------------------------------- #
# Collections
# --------------------------------------------------------------------------- #
def ensure_collections(env, token, pub_ids, apply):
    print("\n== COLLECTIONS ==")
    id_by_handle = {n["handle"]: n["id"] for n in gql(env, token, PRODUCTS_Q)["products"]["nodes"]}
    for col in COLLECTIONS:
        found = gql(env, token, COLLECTION_BY_HANDLE_Q, {"q": f"handle:{col['handle']}"})["collections"]["nodes"]
        if found:
            cid = found[0]["id"]
            if "members" in col:
                want = [id_by_handle[h] for h in col["members"] if h in id_by_handle]
                print(f"  = {col['title']} exists ({col['handle']}); ensuring {len(want)} members")
                if apply and want:
                    r = gql(env, token, COLLECTION_ADD_M, {"id": cid, "productIds": want})
                    errs = r["collectionAddProducts"]["userErrors"]
                    if errs:
                        print(f"      add errors: {errs}")
            else:
                print(f"  = {col['title']} exists ({col['handle']}); smart, no change")
            continue

        if "smart_tag" in col:
            print(f"  {'>' if apply else '~'} {col['title']} ({col['handle']}) — smart: TAG = {col['smart_tag']}")
        else:
            missing = [h for h in col["members"] if h not in id_by_handle]
            print(f"  {'>' if apply else '~'} {col['title']} ({col['handle']}) — manual: "
                  f"{len(col['members']) - len(missing)} products"
                  + (f"  (not-yet-created: {missing})" if missing else ""))
        if not apply:
            continue

        inp = {
            "title": col["title"], "handle": col["handle"],
            "descriptionHtml": f"<p>{col['desc']}</p>",
        }
        if "smart_tag" in col:
            inp["ruleSet"] = {"appliedDisjunctively": False,
                              "rules": [{"column": "TAG", "relation": "EQUALS", "condition": col["smart_tag"]}]}
            inp["sortOrder"] = col.get("sort", "CREATED_DESC")
        else:
            inp["products"] = [id_by_handle[h] for h in col["members"] if h in id_by_handle]
            inp["sortOrder"] = col.get("sort", "MANUAL")
        res = gql(env, token, COLLECTION_CREATE_M, {"input": inp})["collectionCreate"]
        if res["userErrors"]:
            sys.exit(f"collectionCreate errors on {col['handle']}: {json.dumps(res['userErrors'])}")
        cid = res["collection"]["id"]
        print(f"      -> created {cid}")
        pres = gql(env, token, PUBLISH_M, {"id": cid, "input": [{"publicationId": p} for p in pub_ids]})
        if pres["publishablePublish"]["userErrors"]:
            print(f"      publish errors: {pres['publishablePublish']['userErrors']}")
        else:
            print(f"      -> published to {len(pub_ids)} channel(s)")


def main():
    apply = "--apply" in sys.argv
    collections_only = "--collections-only" in sys.argv
    only = None
    if "--only" in sys.argv:
        only = sys.argv[sys.argv.index("--only") + 1]

    validate_files()
    env = load_env()
    token = get_admin_token(env)
    location_id, location_name = primary_location_id(env, token)
    pub_ids = storefront_pub_ids(env, token)
    print(f"Store {env['SHOPIFY_STORE_DOMAIN']} | API {env['SHOPIFY_API_VERSION']}")
    print(f"Location: {location_name}  |  storefront publications: {len(pub_ids)}")
    print("MODE:", "APPLY (writing)" if apply else "DRY-RUN (no writes)")

    if not collections_only:
        print("\n== PRODUCTS ==")
        specs = NEW_PRODUCTS + [HALLOWEEN]
        for spec in specs:
            if only and spec["handle"] != only:
                continue
            if spec["handle"] == HALLOWEEN["handle"]:
                inp = build_halloween_input(env, token, location_id, apply)
                pseudo = {"handle": HALLOWEEN["handle"], "title": HALLOWEEN["title"],
                          "price": HALLOWEEN["price"], "tags": HALLOWEEN["tags"]}
                create_product(env, token, pseudo, inp, pub_ids, apply)
            else:
                inp = build_simple_input(env, token, spec, location_id, apply)
                create_product(env, token, spec, inp, pub_ids, apply)

    if not only:
        ensure_collections(env, token, pub_ids, apply)

    print("\n" + ("APPLIED." if apply else "DRY-RUN complete. Re-run with --apply to write."))


if __name__ == "__main__":
    main()

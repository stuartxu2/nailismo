#!/usr/bin/env python3
"""Upload a single new press-on design to Shopify (image -> productSet -> publish).

Generic one-product uploader. Reuses the proven flow from shopify_new_products.py
(stagedUploadsCreate -> POST bytes -> resourceUrl, productSet with a Size option,
every variant tracked at 10 on hand, status ACTIVE, then publishablePublish to the
storefront sales channels).

Edit PRODUCT below, then:
  python tools/shopify_upload_product.py            # dry-run, prints the plan
  python tools/shopify_upload_product.py --apply    # create + upload + publish

Idempotent: a product whose handle already exists is skipped (no duplicate).

Env (loaded from apps/web/.env.local via shopify_auth):
  SHOPIFY_STORE_DOMAIN, SHOPIFY_API_VERSION,
  SHOPIFY_ADMIN_CLIENT_ID, SHOPIFY_ADMIN_CLIENT_SECRET   (scope: write_products)
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

SIZES = ["S", "M", "L", "XL"]
QTY_PER_SIZE = 10
PUBLISH_TO = ("Online Store", "Headless")

IMG_DIR = os.path.expanduser(
    "~/Library/CloudStorage/Dropbox/Nailismo/listing20260604"
)

# --------------------------------------------------------------------------- #
# The product to upload. `images`: first is featured; alt doubles as a11y/SEO.
# --------------------------------------------------------------------------- #
PRODUCT: dict = {
    "handle": "deep-end",
    "title": "deep end 🌊",
    "price": "17.99",
    "tags": ["Blue", "Green", "New Arrival"],
    "desc": (
        "Matte petrol teal, edge to edge. A deep blue-green soft-square set with a "
        "velvet, no-shine finish that reads expensive and lands genderless. One clean "
        "color, zero fuss — salon-grade hold, reusable, on in minutes. The everyday "
        "set that goes with the grey knit and everything else."
    ),
    "images": [
        ("hf_20260605_061505_d2094596-6104-4c11-ad76-e620c9ac1c3c.png",
         "deep end press-on nails — matte petrol-teal soft-square full set, flat lay"),
        ("hf_20260605_062550_810de415-bbf7-4421-bdcb-e8a207c4e1d1.png",
         "deep end press-on nails — worn, matte petrol-teal square nails in a grey turtleneck"),
    ],
}


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


LOCATIONS_Q = "{ locations(first: 5) { nodes { id } } }"
PUBLICATIONS_Q = "{ publications(first: 25) { edges { node { id name } } } }"
PRODUCT_BY_HANDLE_Q = "query($h: String!){ productByHandle(handle:$h){ id handle title } }"

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


# --------------------------------------------------------------------------- #
# Staged upload (one POST per file)
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


def stage_and_upload(env, token, path):
    filename = os.path.basename(path)
    mime = mimetypes.guess_type(filename)[0] or "image/png"
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
    return target["resourceUrl"]


# --------------------------------------------------------------------------- #
def primary_location_id(env, token):
    nodes = gql(env, token, LOCATIONS_Q)["locations"]["nodes"]
    if not nodes:
        sys.exit("no location found")
    return nodes[0]["id"]


def storefront_pub_ids(env, token):
    out = []
    for e in gql(env, token, PUBLICATIONS_Q)["publications"]["edges"]:
        if any(w.lower() in e["node"]["name"].lower() for w in PUBLISH_TO):
            out.append(e["node"]["id"])
    return out


def build_input(env, token, spec, location_id, apply):
    files = []
    if apply:
        for fname, alt in spec["images"]:
            files.append({
                "originalSource": stage_and_upload(env, token, os.path.join(IMG_DIR, fname)),
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
        for v in variants:
            v["file"] = {"originalSource": files[0]["originalSource"]}
    return inp


def main():
    apply = "--apply" in sys.argv
    spec = PRODUCT

    for fname, _ in spec["images"]:
        p = os.path.join(IMG_DIR, fname)
        if not os.path.exists(p):
            sys.exit(f"missing image file: {p}")

    env = load_env()
    token = get_admin_token(env)
    location_id = primary_location_id(env, token)
    pub_ids = storefront_pub_ids(env, token)
    print(f"Store {env['SHOPIFY_STORE_DOMAIN']} | API {env['SHOPIFY_API_VERSION']}")
    print(f"storefront publications: {len(pub_ids)}")
    print("MODE:", "APPLY (writing)" if apply else "DRY-RUN (no writes)")

    existing = gql(env, token, PRODUCT_BY_HANDLE_Q, {"h": spec["handle"]})["productByHandle"]
    if existing:
        print(f"SKIP   product exists: {spec['handle']} ({existing['title']})")
        return

    print(f"{'CREATE' if apply else 'PLAN  '} {spec['handle']:12} {spec['title']:14} "
          f"${spec['price']}  {len(SIZES)} variants @ {QTY_PER_SIZE} ea  tags={spec['tags']}")
    print(f"       images: {[f for f, _ in spec['images']]}")
    if not apply:
        print("\nDRY-RUN complete. Re-run with --apply to write.")
        return

    inp = build_input(env, token, spec, location_id, apply)
    res = gql(env, token, PRODUCT_SET, {"input": inp})["productSet"]
    if res["userErrors"]:
        sys.exit(f"productSet errors: {json.dumps(res['userErrors'])}")
    pid = res["product"]["id"]
    print(f"       -> created {pid}  totalInventory={res['product']['totalInventory']}")
    for v in res["product"]["variants"]["nodes"]:
        print(f"          {v['title']:4} ${v['price']}  qty={v['inventoryQuantity']}")
    pres = gql(env, token, PUBLISH_M, {"id": pid, "input": [{"publicationId": p} for p in pub_ids]})
    if pres["publishablePublish"]["userErrors"]:
        print(f"       publish errors: {pres['publishablePublish']['userErrors']}")
    else:
        print(f"       -> published to {len(pub_ids)} channel(s)")
    print("\nAPPLIED.")


if __name__ == "__main__":
    main()

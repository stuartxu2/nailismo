#!/usr/bin/env python3
"""Batch-update product titles and append product images on Shopify.

Built for the "Gen-Z rename + better imagery" catalog pass: rename nail-set
products with slang/drip titles and add more images to the thin galleries.
Images are uploaded via Shopify's staged upload flow (stagedUploadsCreate ->
POST bytes to the returned target -> productCreateMedia with the resourceUrl).

Idempotent:
  - A title is only written when it differs from the current title.
  - An image is only uploaded when no existing media on the product already
    carries the same alt text, so re-running adds nothing.

Env (loaded from apps/web/.env.local via shopify_auth):
  SHOPIFY_STORE_DOMAIN, SHOPIFY_API_VERSION,
  SHOPIFY_ADMIN_CLIENT_ID, SHOPIFY_ADMIN_CLIENT_SECRET

Usage:
  python tools/shopify_product_media.py             # dry-run, prints the plan
  python tools/shopify_product_media.py --apply      # write titles + upload images
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

TMP = os.path.join(os.path.dirname(__file__), "..", ".tmp", "imgcheck")

# handle -> new slang/drip title. Consumables + gift card intentionally excluded.
TITLES = {
    "molten-steel": "liquid chrome 🔥",
    "monochrome-edge": "mono mode 🌀",
    "rebel-king": "rebel rizz 👑",
    "crimson-impact-red-silver-graphic-press-on-nails-for-men": "red alert 🩸",
    "frost-voltage": "frostbite ⚡",
    "arctic-holiday": "snow szn ❄️",
    "christmas-classics": "santa slay 🎅",
    "safari-stripes": "tiger mode 🐯",
    "ocean-drive": "wave check 🌊",
    "urban-jungle": "jungle mode 🐆",
    "galaxy-glitch": "cosmic glitch 🌌",
    "liquid-metal": "chrome szn ✨",
    "liquid-ice": "iced out 🧊",
    "bold-horizon": "navy core 🌃",
    "concrete-clarity": "concrete core 🩶",
    "forest-ember": "forest mode 🌲",
    "crimson-authority": "blood gold ♠️",
}

# handle -> images to append (path is local; alt is idempotency key + a11y/SEO).
IMAGES = {
    "molten-steel": [
        {"path": os.path.join(TMP, "ms_A.jpg"),
         "alt": "liquid chrome press-on nails — close-up of chrome flame art over a nude base"},
        {"path": os.path.join(TMP, "ms_B.jpg"),
         "alt": "liquid chrome press-on nails styled on a black stone tray — moody flat-lay"},
    ],
    "monochrome-edge": [
        {"path": os.path.join(TMP, "me_A.jpg"),
         "alt": "mono mode press-on nails — close-up of black-and-white spiral and line art"},
        {"path": os.path.join(TMP, "me_B.jpg"),
         "alt": "mono mode press-on nails styled on a black stone tray — moody flat-lay"},
    ],
    "rebel-king": [
        {"path": os.path.join(TMP, "rk_A.jpg"),
         "alt": "rebel rizz press-on nails — close-up of stitched-smile and cross street-art graphics"},
        {"path": os.path.join(TMP, "rk_B.jpg"),
         "alt": "rebel rizz press-on nails styled on a black stone tray — moody flat-lay"},
    ],
}


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


PRODUCTS_QUERY = """
{ products(first: 100) {
    edges { node {
      id title handle
      media(first: 50) { edges { node { alt } } }
    } }
} }
"""

STAGED_UPLOADS = """
mutation($input: [StagedUploadInput!]!) {
  stagedUploadsCreate(input: $input) {
    stagedTargets { url resourceUrl parameters { name value } }
    userErrors { field message }
  }
}
"""

CREATE_MEDIA = """
mutation($productId: ID!, $media: [CreateMediaInput!]!) {
  productCreateMedia(productId: $productId, media: $media) {
    media { alt mediaContentType ... on MediaImage { id status } }
    mediaUserErrors { field message }
  }
}
"""

PRODUCT_UPDATE = """
mutation($input: ProductInput!) {
  productUpdate(input: $input) {
    product { id title }
    userErrors { field message }
  }
}
"""


def _multipart_body(fields: list[tuple[str, str]], file_field: str, filename: str,
                    content_type: str, data: bytes) -> tuple[bytes, str]:
    """Build a multipart/form-data body: form fields first, file last."""
    boundary = f"----nailismo{uuid.uuid4().hex}"
    crlf = b"\r\n"
    out = bytearray()
    for name, value in fields:
        out += b"--" + boundary.encode() + crlf
        out += f'Content-Disposition: form-data; name="{name}"'.encode() + crlf + crlf
        out += value.encode() + crlf
    out += b"--" + boundary.encode() + crlf
    out += (
        f'Content-Disposition: form-data; name="{file_field}"; filename="{filename}"'
    ).encode() + crlf
    out += f"Content-Type: {content_type}".encode() + crlf + crlf
    out += data + crlf
    out += b"--" + boundary.encode() + b"--" + crlf
    return bytes(out), boundary


def stage_and_upload(env: dict[str, str], token: str, path: str) -> str:
    """Stage one file and POST its bytes; return the resourceUrl for media create."""
    filename = os.path.basename(path)
    mime = mimetypes.guess_type(filename)[0] or "image/jpeg"
    size = os.path.getsize(path)

    staged = gql(env, token, STAGED_UPLOADS, {
        "input": [{
            "filename": filename,
            "mimeType": mime,
            "resource": "IMAGE",
            "httpMethod": "POST",
            "fileSize": str(size),
        }],
    })["stagedUploadsCreate"]
    if staged["userErrors"]:
        sys.exit(f"stagedUploadsCreate errors: {json.dumps(staged['userErrors'])}")
    target = staged["stagedTargets"][0]

    with open(path, "rb") as fh:
        data = fh.read()
    fields = [(p["name"], p["value"]) for p in target["parameters"]]
    body, boundary = _multipart_body(fields, "file", filename, mime, data)
    req = urllib.request.Request(
        target["url"],
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST",
    )
    try:
        urllib.request.urlopen(req)
    except urllib.error.HTTPError as exc:
        sys.exit(f"staged upload POST failed: HTTP {exc.code}: {exc.read().decode()[:500]}")
    return target["resourceUrl"]


def main() -> None:
    apply = "--apply" in sys.argv
    env = load_env()
    token = get_admin_token(env)

    # Validate every referenced local image exists before any write.
    for imgs in IMAGES.values():
        for img in imgs:
            if not os.path.exists(img["path"]):
                sys.exit(f"missing image file: {img['path']}")

    products = {e["node"]["handle"]: e["node"]
                for e in gql(env, token, PRODUCTS_QUERY)["products"]["edges"]}

    # Surface any configured handle that doesn't exist in the catalog.
    for handle in set(TITLES) | set(IMAGES):
        if handle not in products:
            sys.exit(f"configured handle not found in catalog: {handle}")

    title_writes: list[tuple[str, str, str]] = []   # (pid, handle, new_title)
    media_writes: list[tuple[str, str, list[dict]]] = []  # (pid, handle, [media])

    handles = sorted(set(TITLES) | set(IMAGES))
    for handle in handles:
        node = products[handle]
        pid = node["id"]
        existing_alts = {e["node"]["alt"] for e in node["media"]["edges"] if e["node"]["alt"]}

        new_title = TITLES.get(handle)
        if new_title and node["title"] != new_title:
            title_writes.append((pid, handle, new_title))
            print(f"TITLE  {handle:50} {node['title']!r} -> {new_title!r}")

        pending = []
        for img in IMAGES.get(handle, []):
            if img["alt"] in existing_alts:
                print(f"IMAGE  skip {handle}/{os.path.basename(img['path'])} (alt present)")
                continue
            pending.append(img)
            print(f"IMAGE  {handle:50} + {os.path.basename(img['path'])}")
        if pending:
            media_writes.append((pid, handle, pending))

    if not apply:
        print(f"\nDRY-RUN (no writes). titles={len(title_writes)}, "
              f"image-products={len(media_writes)}, "
              f"images={sum(len(m) for _, _, m in media_writes)}.")
        if title_writes or media_writes:
            print("Re-run with --apply to write.")
        return

    for pid, handle, new_title in title_writes:
        res = gql(env, token, PRODUCT_UPDATE, {"input": {"id": pid, "title": new_title}})
        errs = res["productUpdate"]["userErrors"]
        if errs:
            sys.exit(f"productUpdate errors on {handle}: {json.dumps(errs)}")
        print(f"  title set: {handle} -> {res['productUpdate']['product']['title']!r}")

    for pid, handle, pending in media_writes:
        media = []
        for img in pending:
            resource_url = stage_and_upload(env, token, img["path"])
            media.append({
                "originalSource": resource_url,
                "alt": img["alt"],
                "mediaContentType": "IMAGE",
            })
        res = gql(env, token, CREATE_MEDIA, {"productId": pid, "media": media})
        errs = res["productCreateMedia"]["mediaUserErrors"]
        if errs:
            sys.exit(f"productCreateMedia errors on {handle}: {json.dumps(errs)}")
        print(f"  uploaded {len(media)} image(s) to {handle}")

    print("\nAPPLIED.")


if __name__ == "__main__":
    main()

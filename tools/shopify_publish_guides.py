#!/usr/bin/env python3
"""Publish the 4 Nailismo guide articles to the Shopify `journal` blog.

Idempotent (safe to re-run per CLAUDE.md): each guide is looked up by handle.
If the article exists -> articleUpdate; otherwise -> articleCreate. The lookup
is a read, so it runs in --dry-run too.

Each article gets a hero image: an existing public AVIF asset is converted to
webp via `sips`, staged-uploaded, registered with fileCreate, polled until
READY, and its Shopify CDN url is attached as the article image. The image
path is graceful: any failure logs a warning and the article still publishes
without an image (never aborts the article).

Body HTML is read at runtime from tools/guides/<handle>.html.

Usage (loaded from apps/web/.env.local via shopify_auth):
  python tools/shopify_publish_guides.py --dry-run   # plan only, no mutations
  python tools/shopify_publish_guides.py             # real publish (image + write)

Env: SHOPIFY_STORE_DOMAIN, SHOPIFY_API_VERSION,
     SHOPIFY_ADMIN_CLIENT_ID, SHOPIFY_ADMIN_CLIENT_SECRET   (scope: write_content)
"""
from __future__ import annotations

import datetime
import json
import os
import subprocess
import sys
import time
import urllib.error
import urllib.request
import uuid

from shopify_auth import get_admin_token, load_env

# --------------------------------------------------------------------------- #
# Constants
# --------------------------------------------------------------------------- #
BLOG_ID = "gid://shopify/Blog/81033429041"  # the `journal` blog
AUTHOR_NAME = "Nailismo"

_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
GUIDES_DIR = os.path.join(os.path.dirname(__file__), "guides")
IMAGES_DIR = os.path.join(_REPO_ROOT, "apps", "web", "public", "images")
TMP_DIR = os.path.join(_REPO_ROOT, ".tmp")

FILE_READY_POLL_TRIES = 20
FILE_READY_POLL_SLEEP_S = 1.5

# --------------------------------------------------------------------------- #
# The 4 guides. `image_avif` is relative to apps/web/public/images/.
# tags is a LIST of strings (not a comma string).
# --------------------------------------------------------------------------- #
GUIDES: list[dict] = [
    {
        "handle": "how-to-apply-press-on-nails",
        "title": "How to Apply Press-On Nails So They Last 7 Days",
        "tags": ["guide", "howto", "application"],
        "summary": "The exact routine to apply press-on nails at home so they last up to 7 days.",
        "image_avif": "listing/deep end press on nails model.avif",
        "image_alt": "Hands wearing matte petrol-teal press-on nails, a freshly applied full set",
    },
    {
        "handle": "press-on-nail-sizing-guide",
        "title": "Press-On Nail Sizing Guide: Find Your Exact Fit",
        "tags": ["guide", "howto", "sizing"],
        "summary": "How to measure and size press-on nails so every nail fits edge to edge.",
        "image_avif": "listing/deep end press on nails.avif",
        "image_alt": "Clean studio flat-lay of a press-on nail set laid out by size",
    },
    {
        "handle": "how-to-remove-press-on-nails",
        "title": "How to Remove Press-On Nails Without Damage",
        "tags": ["guide", "howto", "removal"],
        "summary": "The safe way to take off press-on nails without damaging your natural nail.",
        "image_avif": "lookbook/the-blazer.avif",
        "image_alt": "Hands with press-on nails resting on a blazer sleeve, close up",
    },
    {
        "handle": "press-ons-vs-gel-vs-acrylic",
        "title": "Press-Ons vs Gel vs Acrylic: An Honest Comparison",
        "tags": ["guide", "comparison"],
        "summary": "An honest comparison of press-ons, gel, and acrylic on cost, wear, and damage.",
        "image_avif": "listing/black and white press on nails.avif",
        "image_alt": "Clean studio shot of a monochrome black-and-white press-on nail set",
    },
]


# --------------------------------------------------------------------------- #
# GraphQL plumbing (mirrors shopify_upload_product.py)
# --------------------------------------------------------------------------- #
def gql(env: dict, token: str, query: str, variables: dict | None = None) -> dict:
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


ARTICLE_BY_HANDLE_Q = """
query($q: String!) {
  articles(first: 5, query: $q) { nodes { id handle } }
}
"""

STAGED_UPLOADS = """
mutation($input: [StagedUploadInput!]!) {
  stagedUploadsCreate(input: $input) {
    stagedTargets { url resourceUrl parameters { name value } }
    userErrors { field message }
  }
}
"""

FILE_CREATE = """
mutation($files: [FileCreateInput!]!) {
  fileCreate(files: $files) {
    files { id fileStatus alt }
    userErrors { field message }
  }
}
"""

FILE_NODE_Q = """
query($id: ID!) {
  node(id: $id) {
    ... on MediaImage { fileStatus image { url } }
  }
}
"""

ARTICLE_CREATE = """
mutation($article: ArticleCreateInput!) {
  articleCreate(article: $article) {
    article { id handle }
    userErrors { field message }
  }
}
"""

ARTICLE_UPDATE = """
mutation($id: ID!, $article: ArticleUpdateInput!) {
  articleUpdate(id: $id, article: $article) {
    article { id handle }
    userErrors { field message }
  }
}
"""


# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
def read_body(handle: str) -> str:
    path = os.path.join(GUIDES_DIR, f"{handle}.html")
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def find_existing(env: dict, token: str, handle: str) -> str | None:
    """Return the article gid if an article with this exact handle exists."""
    nodes = gql(env, token, ARTICLE_BY_HANDLE_Q, {"q": f"handle:{handle}"})["articles"]["nodes"]
    for node in nodes:
        if node["handle"] == handle:
            return node["id"]
    return None


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


def upload_image(env: dict, token: str, handle: str, avif_rel: str, alt: str) -> str | None:
    """Convert AVIF -> webp, stage upload, fileCreate, poll READY.

    Returns the Shopify CDN image url, or None on any failure (non-fatal).
    """
    avif_path = os.path.join(IMAGES_DIR, avif_rel)
    if not os.path.exists(avif_path):
        print(f"       WARN image: source not found, publishing without image: {avif_rel}")
        return None
    try:
        os.makedirs(TMP_DIR, exist_ok=True)
        webp_name = f"{handle}.webp"
        webp_path = os.path.join(TMP_DIR, webp_name)
        subprocess.run(
            ["sips", "-s", "format", "webp", avif_path, "--out", webp_path],
            check=True, capture_output=True,
        )

        size = os.path.getsize(webp_path)
        staged = gql(env, token, STAGED_UPLOADS, {"input": [{
            "filename": webp_name, "mimeType": "image/webp", "resource": "FILE",
            "httpMethod": "POST", "fileSize": str(size),
        }]})["stagedUploadsCreate"]
        if staged["userErrors"]:
            print(f"       WARN image: stagedUploadsCreate errors: {staged['userErrors']}")
            return None
        target = staged["stagedTargets"][0]

        with open(webp_path, "rb") as fh:
            data = fh.read()
        fields = [(p["name"], p["value"]) for p in target["parameters"]]
        post_body, boundary = _multipart(fields, "file", webp_name, "image/webp", data)
        post_req = urllib.request.Request(
            target["url"], data=post_body,
            headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
            method="POST",
        )
        urllib.request.urlopen(post_req)

        created = gql(env, token, FILE_CREATE, {"files": [{
            "originalSource": target["resourceUrl"], "contentType": "IMAGE", "alt": alt,
        }]})["fileCreate"]
        if created["userErrors"]:
            print(f"       WARN image: fileCreate errors: {created['userErrors']}")
            return None
        file_id = created["files"][0]["id"]

        for _ in range(FILE_READY_POLL_TRIES):
            node = gql(env, token, FILE_NODE_Q, {"id": file_id})["node"]
            if node and node.get("fileStatus") == "READY" and node.get("image"):
                return node["image"]["url"]
            if node and node.get("fileStatus") == "FAILED":
                print("       WARN image: file processing FAILED")
                return None
            time.sleep(FILE_READY_POLL_SLEEP_S)
        print("       WARN image: timed out waiting for READY status")
        return None
    except subprocess.CalledProcessError as exc:
        stderr = exc.stderr.decode()[:200] if exc.stderr else ""
        print(f"       WARN image: sips webp conversion failed: {stderr}")
        return None
    except urllib.error.HTTPError as exc:
        print(f"       WARN image: upload HTTP {exc.code}: {exc.read().decode()[:200]}")
        return None
    except Exception as exc:  # noqa: BLE001 - image step is intentionally non-fatal
        print(f"       WARN image: unexpected error, publishing without image: {exc}")
        return None


def publish(env: dict, token: str, guide: dict, existing_id: str | None) -> None:
    handle = guide["handle"]
    body = read_body(handle)
    image_url = upload_image(env, token, handle, guide["image_avif"], guide["image_alt"])
    image_field = {"url": image_url, "altText": guide["image_alt"]} if image_url else None
    now_iso = datetime.datetime.now(datetime.timezone.utc).replace(microsecond=0).isoformat()

    if existing_id:
        article = {
            "title": guide["title"],
            "handle": handle,
            "body": body,
            "summary": guide["summary"],
            "tags": guide["tags"],
            "isPublished": True,
        }
        if image_field:
            article["image"] = image_field
        res = gql(env, token, ARTICLE_UPDATE, {"id": existing_id, "article": article})["articleUpdate"]
        action = "update"
    else:
        article = {
            "blogId": BLOG_ID,
            "title": guide["title"],
            "author": {"name": AUTHOR_NAME},
            "handle": handle,
            "body": body,
            "summary": guide["summary"],
            "tags": guide["tags"],
            "isPublished": True,
            "publishDate": now_iso,
        }
        if image_field:
            article["image"] = image_field
        res = gql(env, token, ARTICLE_CREATE, {"article": article})["articleCreate"]
        action = "create"

    if res["userErrors"]:
        print(f"  {handle}: {action} FAILED userErrors={res['userErrors']}")
        sys.exit(2)
    art_id = res["article"]["id"]
    img_status = "with image" if image_field else "no image"
    print(f"  {handle}: action={action} id={art_id} ({img_status})")


# --------------------------------------------------------------------------- #
def main() -> None:
    dry_run = "--dry-run" in sys.argv

    # Validate guide bodies + image assets exist up front.
    for g in GUIDES:
        body_path = os.path.join(GUIDES_DIR, f"{g['handle']}.html")
        if not os.path.exists(body_path):
            sys.exit(f"missing guide body: {body_path}")

    env = load_env()
    token = get_admin_token(env)
    print(f"Store {env['SHOPIFY_STORE_DOMAIN']} | API {env['SHOPIFY_API_VERSION']}")
    print(f"blog {BLOG_ID}")
    print("MODE:", "DRY-RUN (no mutations)" if dry_run else "PUBLISH (writing)")

    for g in GUIDES:
        existing_id = find_existing(env, token, g["handle"])  # read; safe in dry-run
        action = "update" if existing_id else "create"
        avif_path = os.path.join(IMAGES_DIR, g["image_avif"])
        img_ok = "ok" if os.path.exists(avif_path) else "MISSING"
        body = read_body(g["handle"])

        if dry_run:
            print(f"  {g['handle']}:")
            print(f"       action : {action}" + (f" (id={existing_id})" if existing_id else ""))
            print(f"       image  : {g['image_avif']} [{img_ok}]")
            print(f"       tags   : {g['tags']}")
            print(f"       body   : {len(body)} chars")
        else:
            publish(env, token, g, existing_id)

    if dry_run:
        print("\nDRY-RUN complete. Re-run without --dry-run to publish.")
    else:
        print("\nPUBLISHED.")


if __name__ == "__main__":
    main()

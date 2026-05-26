#!/usr/bin/env python3
"""Register Shopify product webhooks that revalidate the storefront.

Subscribes products/create, products/update, products/delete to the Next route
`/api/webhooks/shopify`, which verifies HMAC and calls revalidatePath. Idempotent:
an existing subscription for the same topic+URL is left alone; a subscription for
the topic pointing at a different URL is updated to the new callback.

HMAC note: app webhooks created this way are signed with the app's client secret
(SHOPIFY_ADMIN_CLIENT_SECRET) — the route uses that same value to verify.

Env (loaded from apps/web/.env.local via shopify_auth):
  SHOPIFY_STORE_DOMAIN, SHOPIFY_API_VERSION,
  SHOPIFY_ADMIN_CLIENT_ID, SHOPIFY_ADMIN_CLIENT_SECRET

Usage:
  python tools/shopify_webhooks.py                       # dry-run, lists current + planned
  python tools/shopify_webhooks.py --apply               # create/update subscriptions
  python tools/shopify_webhooks.py --callback <url>      # override callback (default below)
"""
from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request

from shopify_auth import get_admin_token, load_env

DEFAULT_CALLBACK = "https://nailismo.com/api/webhooks/shopify"
TOPICS = ["PRODUCTS_CREATE", "PRODUCTS_UPDATE", "PRODUCTS_DELETE"]


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


LIST_QUERY = """
{ webhookSubscriptions(first:100){ edges{ node{
  id topic
  endpoint{ __typename ... on WebhookHttpEndpoint { callbackUrl } }
} } } }
"""

CREATE = """
mutation($topic: WebhookSubscriptionTopic!, $url: URL!) {
  webhookSubscriptionCreate(topic: $topic, webhookSubscription: { callbackUrl: $url, format: JSON }) {
    webhookSubscription { id }
    userErrors { field message }
  }
}
"""

UPDATE = """
mutation($id: ID!, $url: URL!) {
  webhookSubscriptionUpdate(id: $id, webhookSubscription: { callbackUrl: $url }) {
    webhookSubscription { id }
    userErrors { field message }
  }
}
"""


def main() -> None:
    apply = "--apply" in sys.argv
    callback = DEFAULT_CALLBACK
    if "--callback" in sys.argv:
        callback = sys.argv[sys.argv.index("--callback") + 1]

    env = load_env()
    token = get_admin_token(env)

    existing: dict[str, tuple[str, str]] = {}  # topic -> (id, callbackUrl)
    for edge in gql(env, token, LIST_QUERY)["webhookSubscriptions"]["edges"]:
        n = edge["node"]
        url = n["endpoint"].get("callbackUrl") if n["endpoint"] else None
        existing[n["topic"]] = (n["id"], url or "")

    print(f"callback: {callback}\n")
    for topic in TOPICS:
        cur = existing.get(topic)
        if cur and cur[1] == callback:
            print(f"OK    {topic} -> already points here")
            continue
        if cur:
            print(f"UPDATE {topic}: {cur[1]} -> {callback}")
            if apply:
                res = gql(env, token, UPDATE, {"id": cur[0], "url": callback})
                errs = res["webhookSubscriptionUpdate"]["userErrors"]
                if errs:
                    sys.exit(f"userErrors: {json.dumps(errs)}")
        else:
            print(f"CREATE {topic} -> {callback}")
            if apply:
                res = gql(env, token, CREATE, {"topic": topic, "url": callback})
                errs = res["webhookSubscriptionCreate"]["userErrors"]
                if errs:
                    sys.exit(f"userErrors: {json.dumps(errs)}")

    print(f"\n{'APPLIED' if apply else 'DRY-RUN (no writes)'}.")
    if not apply:
        print("Re-run with --apply to write.")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Shopify Admin API auth helper (client credentials grant).

Shopify removed static `shpat_` tokens from the custom-app UI. Dev Dashboard
apps now expose only a Client ID + Client Secret, which you exchange for a
short-lived Admin API access token (~24h) via the client credentials grant.

This module fetches that token on demand and caches it under .tmp/ until it
nears expiry, so tools never embed a static (and now non-existent) token.

Constraint: client credentials grant only works when the app and the store
belong to the same Shopify organization in the Dev Dashboard.

Env (loaded from apps/web/.env.local):
  SHOPIFY_STORE_DOMAIN          e.g. nailismo.myshopify.com
  SHOPIFY_API_VERSION           e.g. 2026-04
  SHOPIFY_ADMIN_CLIENT_ID
  SHOPIFY_ADMIN_CLIENT_SECRET

Usage (from another tool):
  from shopify_auth import load_env, get_admin_token
  env = load_env()
  token = get_admin_token(env)   # pass into X-Shopify-Access-Token

Run directly to print a fresh token's scopes + expiry (never prints the token):
  python tools/shopify_auth.py
"""
from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ENV_PATH = os.path.join(os.path.dirname(__file__), "..", "apps", "web", ".env.local")
# Token cache lives in disposable .tmp/ (gitignored per CLAUDE.md).
CACHE_PATH = os.path.join(os.path.dirname(__file__), "..", ".tmp", "shopify_admin_token.json")
# Refetch this many seconds before the real expiry to avoid edge-of-expiry 401s.
EXPIRY_BUFFER_S = 300

_REQUIRED = (
    "SHOPIFY_STORE_DOMAIN",
    "SHOPIFY_API_VERSION",
    "SHOPIFY_ADMIN_CLIENT_ID",
    "SHOPIFY_ADMIN_CLIENT_SECRET",
)


def load_env() -> dict[str, str]:
    """Parse apps/web/.env.local and validate the keys this helper needs."""
    env: dict[str, str] = {}
    with open(os.path.abspath(ENV_PATH), encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip().strip('"').strip("'")
    missing = [k for k in _REQUIRED if not env.get(k)]
    if missing:
        sys.exit(
            "ERROR: missing required env var(s): "
            + ", ".join(missing)
            + " (set in apps/web/.env.local)"
        )
    return env


def _read_cache(domain: str) -> str | None:
    """Return a still-valid cached token for this store, else None."""
    try:
        with open(os.path.abspath(CACHE_PATH), encoding="utf-8") as fh:
            cached = json.load(fh)
    except (FileNotFoundError, json.JSONDecodeError):
        return None
    if cached.get("domain") != domain:
        return None  # cache belongs to a different store
    if cached.get("expires_at", 0) - time.time() <= EXPIRY_BUFFER_S:
        return None  # expired or about to
    token = cached.get("access_token")
    return token if isinstance(token, str) and token else None


def _write_cache(domain: str, token: str, expires_in: int) -> None:
    path = os.path.abspath(CACHE_PATH)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    payload = {
        "domain": domain,
        "access_token": token,
        "expires_at": time.time() + expires_in,
    }
    # Write then chmod 600 — token is a secret even inside gitignored .tmp/.
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh)
    os.chmod(path, 0o600)


def _fetch_token(env: dict[str, str]) -> tuple[str, int]:
    """Exchange client_id/client_secret for an Admin API access token."""
    url = f"https://{env['SHOPIFY_STORE_DOMAIN']}/admin/oauth/access_token"
    body = urllib.parse.urlencode(
        {
            "grant_type": "client_credentials",
            "client_id": env["SHOPIFY_ADMIN_CLIENT_ID"],
            "client_secret": env["SHOPIFY_ADMIN_CLIENT_SECRET"],
        }
    ).encode()
    req = urllib.request.Request(
        url,
        data=body,
        headers={
            "Content-Type": "application/x-www-form-urlencoded",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req) as resp:
            payload = json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        # Never echo the request body (contains the secret); only the response.
        sys.exit(f"token fetch failed: HTTP {exc.code}: {exc.read().decode()[:500]}")
    token = payload.get("access_token")
    if not token:
        sys.exit(f"token fetch: no access_token in response: {json.dumps(payload)[:300]}")
    # Default to ~24h if Shopify omits expires_in.
    return token, int(payload.get("expires_in", 86400))


def get_admin_token(env: dict[str, str], *, force_refresh: bool = False) -> str:
    """Return a valid Admin API access token, fetching/caching as needed."""
    domain = env["SHOPIFY_STORE_DOMAIN"]
    if not force_refresh:
        cached = _read_cache(domain)
        if cached:
            return cached
    token, expires_in = _fetch_token(env)
    _write_cache(domain, token, expires_in)
    return token


def main() -> None:
    env = load_env()
    token, expires_in = _fetch_token(env)
    _write_cache(env["SHOPIFY_STORE_DOMAIN"], token, expires_in)
    print(f"OK: fetched Admin API token for {env['SHOPIFY_STORE_DOMAIN']}")
    print(f"  expires_in: {expires_in}s (~{expires_in // 3600}h)")
    print(f"  cached at:  {os.path.relpath(os.path.abspath(CACHE_PATH))}")
    print("  (token value not printed)")


if __name__ == "__main__":
    main()

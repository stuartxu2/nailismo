from shopify_new_drops_refresh import plan_changes, select_new_drops

TAG = "New Arrival"


def product(handle: str, created: str, **extra: object) -> dict:
    base = {
        "id": f"gid://shopify/Product/{handle}",
        "handle": handle,
        "createdAt": created,
        "status": "ACTIVE",
        "isGiftCard": False,
        "tags": [],
    }
    base.update(extra)
    return base


def test_select_newest_active_nail_sets_only() -> None:
    products = [
        product("old-set", "2025-01-01T00:00:00Z"),
        product("newest-set", "2026-06-20T00:00:00Z"),
        product("custom-nail-set", "2026-06-19T00:00:00Z"),
        product("nailismo-gift-card", "2026-06-18T00:00:00Z", isGiftCard=True),
        product("nail-glue", "2026-06-17T00:00:00Z"),
        product("draft-set", "2026-06-16T00:00:00Z", status="DRAFT"),
        product("mid-set", "2026-03-01T00:00:00Z"),
    ]
    picked = select_new_drops(products, count=2)
    assert [p["handle"] for p in picked] == ["newest-set", "mid-set"]


def test_plan_adds_missing_and_removes_stale_tags() -> None:
    keep = product("keep", "2026-06-20T00:00:00Z", tags=[TAG])
    add = product("add", "2026-06-19T00:00:00Z", tags=["Blue"])
    stale = product("stale", "2025-12-12T00:00:00Z", tags=["Blue", TAG])
    untouched = product("untouched", "2025-01-01T00:00:00Z", tags=["Red"])
    to_add, to_remove = plan_changes([keep, add, stale, untouched], [keep, add], TAG)
    assert [p["handle"] for p in to_add] == ["add"]
    assert [p["handle"] for p in to_remove] == ["stale"]


def test_plan_is_idempotent_once_applied() -> None:
    a = product("a", "2026-06-20T00:00:00Z", tags=[TAG])
    b = product("b", "2025-01-01T00:00:00Z", tags=[])
    assert plan_changes([a, b], [a], TAG) == ([], [])

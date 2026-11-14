from shopify_nail_set_tag import select_nail_sets


def product(handle: str, price: str, **extra: object) -> dict:
    base = {
        "id": f"gid://shopify/Product/{handle}",
        "handle": handle,
        "tags": [],
        "status": "ACTIVE",
        "isGiftCard": False,
        "priceRangeV2": {"minVariantPrice": {"amount": price}},
    }
    base.update(extra)
    return base


def test_select_nail_sets_filters_inactive_gift_excluded_and_cheap() -> None:
    products = [
        product("core-set", "17.99"),
        product("premium-set", "24.99"),
        product("draft-set", "17.99", status="DRAFT"),
        product("nailismo-gift-card", "10.0", isGiftCard=True),
        product("nail-glue", "6.99"),
        product("custom-nail-set", "69.0"),
        product("cheap-seasonal", "12.99"),
    ]
    assert [p["handle"] for p in select_nail_sets(products)] == ["core-set", "premium-set"]


def test_select_nail_sets_price_boundary() -> None:
    products = [product("at-floor", "15.00"), product("above-floor", "15.01")]
    assert [p["handle"] for p in select_nail_sets(products)] == ["above-floor"]

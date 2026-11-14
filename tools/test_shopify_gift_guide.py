from shopify_gift_guide import desired_members, missing_members, storefront_publications


def test_desired_members_orders_holiday_then_best_sellers_then_gifts_and_dedupes() -> None:
    best_sellers = [
        {"handle": "nailismo-gift-card", "isGiftCard": True, "status": "ACTIVE"},
        {"handle": "rebel-king", "isGiftCard": False, "status": "ACTIVE"},
        {"handle": "christmas-classics", "isGiftCard": False, "status": "ACTIVE"},  # already a holiday pick
    ]
    assert desired_members(best_sellers) == [
        "arctic-holiday",
        "christmas-classics",
        "first-frost",
        "sweater-weather",
        "rebel-king",
        "nailismo-gift-card",
        "nail-glue",
    ]


def test_desired_members_skips_inactive_best_sellers() -> None:
    best_sellers = [
        {"handle": "cursed", "isGiftCard": False, "status": "DRAFT"},
        {"handle": "rebel-king", "isGiftCard": False, "status": "ACTIVE"},
    ]
    members = desired_members(best_sellers)
    assert "cursed" not in members
    assert "rebel-king" in members


def test_storefront_publications_only_online_store_and_headless() -> None:
    pubs = [
        {"id": "1", "name": "Online Store"},
        {"id": "2", "name": "Shop"},
        {"id": "3", "name": "Point of Sale"},
        {"id": "4", "name": "Pinterest"},
        {"id": "5", "name": "Nailismo.Com Headless"},
        {"id": "6", "name": "Google & YouTube"},
    ]
    assert [p["id"] for p in storefront_publications(pubs)] == ["1", "5"]


def test_missing_members_only_adds_never_removes() -> None:
    desired = ["a", "b", "c"]
    current = ["b", "owner-added"]
    assert missing_members(desired, current) == ["a", "c"]


def test_missing_members_empty_when_complete() -> None:
    assert missing_members(["a", "b"], ["b", "a", "x"]) == []

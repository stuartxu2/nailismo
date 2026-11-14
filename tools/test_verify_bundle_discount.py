from verify_bundle_discount import CASES, summarize


def money(amount: str) -> dict:
    return {"amount": amount, "currencyCode": "USD"}


def test_summarize_sums_line_and_cart_allocations() -> None:
    cart = {
        "cost": {"totalAmount": money("45.00")},
        "discountAllocations": [{"discountedAmount": money("3.00")}],
        "lines": {"nodes": [
            {"discountAllocations": [{"discountedAmount": money("2.50")}]},
            {"discountAllocations": [{"discountedAmount": money("2.50")}]},
        ]},
    }
    assert summarize(cart) == (45.0, 8.0)


def test_summarize_no_allocations() -> None:
    cart = {
        "cost": {"totalAmount": money("35.98")},
        "discountAllocations": [],
        "lines": {"nodes": [{"discountAllocations": []}, {"discountAllocations": []}]},
    }
    assert summarize(cart) == (35.98, 0.0)


def test_cases_cover_the_gate_scenarios() -> None:
    names = {c[0] for c in CASES}
    assert {"two_sets", "three_core", "same_set_x3", "mixed_three", "three_premium",
            "four_core", "six_core", "gift_plus_two", "glue_plus_two", "mixed_four"} <= names

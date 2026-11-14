from verify_bundle_discount import CASES, pre_discount, summarize, verdict


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


def test_pre_discount_sums_line_subtotals_before_line_discounts() -> None:
    cart = {"lines": {"nodes": [
        {"cost": {"subtotalAmount": money("17.99")}},
        {"cost": {"subtotalAmount": money("35.98")}},
    ]}}
    assert pre_discount(cart) == 53.97


def test_verdict_passes_only_when_savings_and_total_both_match() -> None:
    assert verdict(total=45.0, pre=53.97, saved=8.97, expected=8.97) == "PASS"
    # savings right but the shopper's total isn't (e.g. discount applied twice)
    assert verdict(total=36.03, pre=53.97, saved=8.97, expected=8.97) == "FAIL"
    assert verdict(total=53.97, pre=53.97, saved=0.0, expected=8.97) == "FAIL"
    assert verdict(total=35.98, pre=35.98, saved=0.0, expected=0.0) == "PASS"


def test_verdict_report_only_case() -> None:
    assert verdict(total=80.0, pre=92.95, saved=12.95, expected=None) == "REPORT"

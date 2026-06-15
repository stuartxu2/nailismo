import { describe, it, expect, vi, beforeEach } from "vitest";

const { adminFetch } = vi.hoisted(() => ({ adminFetch: vi.fn() }));
vi.mock("../shopify/admin", () => ({ adminFetch }));

import { accountHandle, addSessionToAccount, listSessionIds, linkShopifyCustomer } from "./account";

beforeEach(() => {
  process.env.CUSTOMIZE_AUTH_SECRET = "test-secret";
  adminFetch.mockReset();
});

describe("accountHandle", () => {
  it("is deterministic, prefixed, case/space-insensitive", () => {
    const a = accountHandle(" A@B.com ");
    const b = accountHandle("a@b.com");
    expect(a).toBe(b);
    expect(a).toMatch(/^acct-[0-9a-f]{16}$/);
  });
});

describe("listSessionIds", () => {
  it("returns [] when no account exists", async () => {
    adminFetch.mockResolvedValueOnce({ metaobjectByHandle: null });
    expect(await listSessionIds("a@b.com")).toEqual([]);
  });

  it("parses the stored session_ids JSON", async () => {
    adminFetch.mockResolvedValueOnce({
      metaobjectByHandle: { fields: [{ key: "session_ids", value: '["s1","s2"]' }] },
    });
    expect(await listSessionIds("a@b.com")).toEqual(["s1", "s2"]);
  });
});

describe("addSessionToAccount", () => {
  it("appends a new id (read then upsert with email + ids)", async () => {
    adminFetch
      .mockResolvedValueOnce({ metaobjectByHandle: { fields: [{ key: "session_ids", value: '["s1"]' }] } })
      .mockResolvedValueOnce({ metaobjectUpsert: { userErrors: [] } });
    await addSessionToAccount("a@b.com", "s2");
    const upsertVars = adminFetch.mock.calls[1][1] as { metaobject: { fields: { key: string; value: string }[] } };
    const fields = new Map(upsertVars.metaobject.fields.map((f) => [f.key, f.value]));
    expect(JSON.parse(fields.get("session_ids")!)).toEqual(["s1", "s2"]);
    expect(fields.get("email")).toBe("a@b.com");
  });

  it("is idempotent — a duplicate id does not re-upsert", async () => {
    adminFetch.mockResolvedValueOnce({
      metaobjectByHandle: { fields: [{ key: "session_ids", value: '["s1"]' }] },
    });
    await addSessionToAccount("a@b.com", "s1");
    expect(adminFetch).toHaveBeenCalledTimes(1); // read only, no upsert
  });
});

describe("linkShopifyCustomer", () => {
  it("upserts the email's account with the Shopify customer id (merge preserves ids)", async () => {
    adminFetch.mockResolvedValueOnce({ metaobjectUpsert: { userErrors: [] } });
    await linkShopifyCustomer(" Buyer@X.com ", "gid://shopify/Customer/42");
    const vars = adminFetch.mock.calls[0][1] as {
      handle: { handle: string };
      metaobject: { fields: { key: string; value: string }[] };
    };
    expect(vars.handle.handle).toBe(accountHandle("buyer@x.com"));
    const fields = new Map(vars.metaobject.fields.map((f) => [f.key, f.value]));
    expect(fields.get("shopify_customer_id")).toBe("gid://shopify/Customer/42");
    expect(fields.get("email")).toBe("buyer@x.com");
  });
});

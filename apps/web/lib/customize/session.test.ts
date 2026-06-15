import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the Admin client so CRUD tests never touch the network. The specifier
// must match what session.ts imports ("../shopify/admin").
vi.mock("../shopify/admin", () => ({
  adminFetch: vi.fn(),
  ShopifyAdminConfigError: class extends Error {},
}));

import { adminFetch } from "../shopify/admin";
import {
  canTransition,
  newSessionId,
  toFields,
  fromFields,
  getSession,
  upsertSession,
  transitionSession,
} from "./session";
import type { CustomizeSession } from "./types";

const mockFetch = adminFetch as unknown as ReturnType<typeof vi.fn>;

beforeEach(() => mockFetch.mockReset());

describe("canTransition", () => {
  it("allows the happy path", () => {
    expect(canTransition("pending_payment", "generating")).toBe(true);
    expect(canTransition("generating", "ready")).toBe(true);
    expect(canTransition("ready", "selected")).toBe(true);
    expect(canTransition("selected", "ordered")).toBe(true);
  });

  it("allows same-state (idempotent writes)", () => {
    expect(canTransition("generating", "generating")).toBe(true);
  });

  it("rejects illegal jumps", () => {
    expect(canTransition("generating", "ordered")).toBe(false);
    expect(canTransition("pending_payment", "ready")).toBe(false);
    expect(canTransition("ordered", "selected")).toBe(false);
  });
});

describe("newSessionId", () => {
  it("is handle-safe (lowercase, hex + hyphens)", () => {
    const id = newSessionId();
    expect(id).toMatch(/^[a-z0-9-]+$/);
    expect(id.length).toBeGreaterThan(10);
    expect(newSessionId()).not.toBe(id);
  });
});

describe("toFields / fromFields", () => {
  const full: CustomizeSession = {
    sessionId: "abc-123",
    email: "a@b.com",
    status: "ready",
    uploadUrl: "https://blob/x",
    referenceDescriptor: "warm coral, palm motifs",
    shape: "medium almond",
    note: "add gold",
    paymentIntentId: "pi_123",
    jobs: [
      { seed: 101, status: "ready", resultUrl: "https://blob/1.png" },
      { seed: 202, status: "ready", resultUrl: "https://blob/2.png" },
      { seed: 303, status: "failed" },
    ],
    selectedIndex: 0,
    discountCode: "C2O-XYZ",
  };

  it("round-trips a full session", () => {
    expect(fromFields(toFields(full))).toEqual(full);
  });

  it("omits absent / empty values", () => {
    const keys = toFields({ sessionId: "abc-123", status: "pending_payment" }).map((f) => f.key);
    expect(keys).toEqual(["session_id", "status"]);
  });

  it("serializes jobs as JSON and selected_index as a string", () => {
    const fields = toFields(full);
    const jobs = fields.find((f) => f.key === "jobs");
    const idx = fields.find((f) => f.key === "selected_index");
    expect(jobs && JSON.parse(jobs.value)).toHaveLength(3);
    expect(idx?.value).toBe("0");
  });

  it("defaults status and tolerates malformed jobs JSON", () => {
    const s = fromFields([{ key: "jobs", value: "{not json" }]);
    expect(s.status).toBe("pending_payment");
    expect(s.jobs).toBeUndefined();
  });

  it("treats null/empty fields as absent (real Shopify read shape)", () => {
    // metaobjectByHandle returns every defined field, unset ones as value:null.
    const s = fromFields([
      { key: "session_id", value: "abc" },
      { key: "status", value: "pending_payment" },
      { key: "selected_index", value: null },
      { key: "email", value: null },
      { key: "shape", value: "" },
    ]);
    expect(s.selectedIndex).toBeUndefined(); // not 0
    expect(s.email).toBeUndefined();
    expect(s.shape).toBeUndefined();
  });
});

describe("getSession", () => {
  it("parses a found metaobject", async () => {
    mockFetch.mockResolvedValueOnce({
      metaobjectByHandle: {
        fields: [
          { key: "session_id", value: "abc" },
          { key: "status", value: "generating" },
        ],
      },
    });
    const s = await getSession("abc");
    expect(s?.status).toBe("generating");
  });

  it("returns null when absent", async () => {
    mockFetch.mockResolvedValueOnce({ metaobjectByHandle: null });
    expect(await getSession("nope")).toBeNull();
  });
});

describe("upsertSession", () => {
  it("posts handle + fields and throws on userErrors", async () => {
    mockFetch.mockResolvedValueOnce({ metaobjectUpsert: { userErrors: [] } });
    await upsertSession({ sessionId: "abc", status: "generating" });
    const [, variables] = mockFetch.mock.calls[0];
    expect(variables.handle).toEqual({ type: "customize_session", handle: "abc" });
    expect(variables.metaobject.fields).toContainEqual({ key: "status", value: "generating" });

    mockFetch.mockResolvedValueOnce({
      metaobjectUpsert: { userErrors: [{ message: "boom" }] },
    });
    await expect(upsertSession({ sessionId: "abc", status: "ready" })).rejects.toThrow(/boom/);
  });
});

describe("transitionSession", () => {
  it("writes a legal transition", async () => {
    mockFetch
      .mockResolvedValueOnce({ metaobjectByHandle: { fields: [{ key: "status", value: "generating" }] } })
      .mockResolvedValueOnce({ metaobjectUpsert: { userErrors: [] } });
    await transitionSession("abc", "ready", { jobs: [] });
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const [, upsertVars] = mockFetch.mock.calls[1];
    expect(upsertVars.metaobject.fields).toContainEqual({ key: "status", value: "ready" });
  });

  it("refuses an illegal transition without writing", async () => {
    mockFetch.mockResolvedValueOnce({
      metaobjectByHandle: { fields: [{ key: "status", value: "generating" }] },
    });
    await expect(transitionSession("abc", "ordered")).rejects.toThrow(/illegal transition/);
    expect(mockFetch).toHaveBeenCalledTimes(1); // only the read, no write
  });
});

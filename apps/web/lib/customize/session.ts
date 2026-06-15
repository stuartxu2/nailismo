// CRUD + state machine for the `customize_session` metaobject.
//
// Identity is the metaobject *handle* = sessionId, so writes are idempotent
// upserts keyed on it (webhook retries can't create duplicates). The pure
// helpers (field mapping, transition guard, id minting) are exported separately
// so they can be unit-tested without touching the Admin API.

import { adminFetch } from "../shopify/admin";
import type { CustomizeSession, DesignJob, SessionStatus } from "./types";

const TYPE = "customize_session";

// ---------------------------------------------------------------------------
// Pure helpers (no I/O)
// ---------------------------------------------------------------------------

// Writes always emit string values; reads return every *defined* field, with
// `value: null` for unset ones — so reads must treat null as absent.
type MetaobjectField = { key: string; value: string };
type MetaobjectReadField = { key: string; value: string | null };

/** Allowed status transitions. Same-state is always allowed (idempotent writes). */
const TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  pending_payment: ["generating", "failed", "refunded"],
  generating: ["ready", "failed", "refunded"],
  ready: ["selected", "failed", "refunded"],
  selected: ["ordered", "refunded", "failed"],
  ordered: [],
  refunded: [],
  failed: ["refunded"],
};

export function canTransition(from: SessionStatus, to: SessionStatus): boolean {
  if (from === to) return true;
  return TRANSITIONS[from]?.includes(to) ?? false;
}

/** Handle-safe random id (lowercase hex + hyphens) for a new session. */
export function newSessionId(): string {
  return crypto.randomUUID();
}

function safeParseJobs(raw: string): DesignJob[] | undefined {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DesignJob[]) : undefined;
  } catch {
    return undefined;
  }
}

/** Map a (partial) session to metaobject fields, omitting absent values. */
export function toFields(s: Partial<CustomizeSession>): MetaobjectField[] {
  const fields: MetaobjectField[] = [];
  const put = (key: string, v: string | undefined) => {
    if (v !== undefined && v !== "") fields.push({ key, value: v });
  };
  put("session_id", s.sessionId);
  put("email", s.email);
  put("status", s.status);
  put("upload_url", s.uploadUrl);
  put("reference_descriptor", s.referenceDescriptor);
  put("shape", s.shape);
  put("note", s.note);
  put("finish", s.finish);
  put("feel", s.feel);
  put("occasion", s.occasion);
  put("detail", s.detail);
  put("interpretation", s.interpretation);
  put("payment_intent_id", s.paymentIntentId);
  if (s.jobs !== undefined) fields.push({ key: "jobs", value: JSON.stringify(s.jobs) });
  if (s.selectedIndex !== undefined) {
    fields.push({ key: "selected_index", value: String(s.selectedIndex) });
  }
  put("discount_code", s.discountCode);
  put("shopify_order_id", s.shopifyOrderId);
  put("shopify_customer_id", s.shopifyCustomerId);
  return fields;
}

/** Rebuild a session from metaobject fields. */
export function fromFields(fields: MetaobjectReadField[]): CustomizeSession {
  // Drop null/empty so unset fields read as undefined (not "" or Number(null)=0).
  const m = new Map(
    fields
      .filter((f): f is { key: string; value: string } => f.value != null && f.value !== "")
      .map((f) => [f.key, f.value]),
  );
  const jobsRaw = m.get("jobs");
  const idxRaw = m.get("selected_index");
  return {
    sessionId: m.get("session_id") ?? "",
    email: m.get("email"),
    status: (m.get("status") as SessionStatus) ?? "pending_payment",
    uploadUrl: m.get("upload_url"),
    referenceDescriptor: m.get("reference_descriptor"),
    shape: m.get("shape"),
    note: m.get("note"),
    finish: m.get("finish"),
    feel: m.get("feel"),
    occasion: m.get("occasion"),
    detail: m.get("detail"),
    interpretation: m.get("interpretation"),
    paymentIntentId: m.get("payment_intent_id"),
    jobs: jobsRaw ? safeParseJobs(jobsRaw) : undefined,
    selectedIndex: idxRaw !== undefined && idxRaw !== "" ? Number(idxRaw) : undefined,
    discountCode: m.get("discount_code"),
    shopifyOrderId: m.get("shopify_order_id"),
    shopifyCustomerId: m.get("shopify_customer_id"),
  };
}

// ---------------------------------------------------------------------------
// I/O (Admin API)
// ---------------------------------------------------------------------------

const UPSERT_MUTATION = /* GraphQL */ `
  mutation Upsert($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
    metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
      metaobject { handle }
      userErrors { field message code }
    }
  }
`;

const BY_HANDLE_QUERY = /* GraphQL */ `
  query ByHandle($handle: MetaobjectHandleInput!) {
    metaobjectByHandle(handle: $handle) {
      handle
      fields { key value }
    }
  }
`;

type UpsertResult = {
  metaobjectUpsert: { userErrors: Array<{ message: string }> };
};
type ByHandleResult = {
  metaobjectByHandle: { fields: MetaobjectReadField[] } | null;
};

/** Create-or-update a session, keyed idempotently on its sessionId/handle. */
export async function upsertSession(
  patch: Partial<CustomizeSession> & { sessionId: string },
): Promise<void> {
  const data = await adminFetch<UpsertResult>(UPSERT_MUTATION, {
    handle: { type: TYPE, handle: patch.sessionId },
    metaobject: { fields: toFields(patch) },
  });
  const errs = data.metaobjectUpsert.userErrors;
  if (errs.length) {
    throw new Error(`metaobjectUpsert failed: ${errs.map((e) => e.message).join("; ")}`);
  }
}

/** Fetch a session by id, or null if it doesn't exist. */
export async function getSession(sessionId: string): Promise<CustomizeSession | null> {
  const data = await adminFetch<ByHandleResult>(BY_HANDLE_QUERY, {
    handle: { type: TYPE, handle: sessionId },
  });
  const node = data.metaobjectByHandle;
  return node ? fromFields(node.fields) : null;
}

/**
 * Move a session to a new status, guarded by the transition table, applying any
 * extra field changes in the same write. Throws on an illegal transition or a
 * missing session.
 */
export async function transitionSession(
  sessionId: string,
  to: SessionStatus,
  extra: Partial<CustomizeSession> = {},
): Promise<void> {
  const current = await getSession(sessionId);
  if (!current) throw new Error(`session not found: ${sessionId}`);
  if (!canTransition(current.status, to)) {
    throw new Error(`illegal transition ${current.status} -> ${to}`);
  }
  await upsertSession({ ...extra, sessionId, status: to });
}

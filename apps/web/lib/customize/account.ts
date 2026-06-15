// Email → [sessionId] index, backed by a `customize_account` metaobject (handle
// = acct-<hmac8(email)>). Reliable aggregate lookup without depending on
// Shopify metaobject field-querying. Server-only (Admin API + secret).

import { createHmac } from "node:crypto";
import { adminFetch } from "../shopify/admin";

const TYPE = "customize_account";

function normEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function accountHandle(email: string): string {
  const salt = process.env.CUSTOMIZE_AUTH_SECRET || "acct";
  const h = createHmac("sha256", salt).update(normEmail(email)).digest("hex").slice(0, 16);
  return `acct-${h}`;
}

const BY_HANDLE = /* GraphQL */ `
  query AcctByHandle($handle: MetaobjectHandleInput!) {
    metaobjectByHandle(handle: $handle) { fields { key value } }
  }
`;
const UPSERT = /* GraphQL */ `
  mutation AcctUpsert($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
    metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
      metaobject { handle }
      userErrors { field message code }
    }
  }
`;

type ByHandle = { metaobjectByHandle: { fields: { key: string; value: string | null }[] } | null };
type Upsert = { metaobjectUpsert: { userErrors: { message: string }[] } };

async function readIds(email: string): Promise<string[]> {
  const data = await adminFetch<ByHandle>(BY_HANDLE, {
    handle: { type: TYPE, handle: accountHandle(email) },
  });
  const raw = data.metaobjectByHandle?.fields.find((f) => f.key === "session_ids")?.value;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export async function listSessionIds(email: string): Promise<string[]> {
  return readIds(email);
}

export async function addSessionToAccount(email: string, sessionId: string): Promise<void> {
  const ids = await readIds(email);
  if (ids.includes(sessionId)) return; // idempotent
  const next = [...ids, sessionId];
  const data = await adminFetch<Upsert>(UPSERT, {
    handle: { type: TYPE, handle: accountHandle(email) },
    metaobject: {
      fields: [
        { key: "email", value: normEmail(email) },
        { key: "session_ids", value: JSON.stringify(next) },
      ],
    },
  });
  const errs = data.metaobjectUpsert.userErrors;
  if (errs.length) throw new Error(`account upsert failed: ${errs.map((e) => e.message).join("; ")}`);
}

/**
 * Soft-link the email's designs account to its Shopify customer. Upsert merges,
 * so `session_ids` is preserved. Idempotent.
 */
export async function linkShopifyCustomer(email: string, shopifyCustomerId: string): Promise<void> {
  const data = await adminFetch<Upsert>(UPSERT, {
    handle: { type: TYPE, handle: accountHandle(email) },
    metaobject: {
      fields: [
        { key: "email", value: normEmail(email) },
        { key: "shopify_customer_id", value: shopifyCustomerId },
      ],
    },
  });
  const errs = data.metaobjectUpsert.userErrors;
  if (errs.length) throw new Error(`account link failed: ${errs.map((e) => e.message).join("; ")}`);
}

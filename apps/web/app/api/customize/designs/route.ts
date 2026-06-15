// Native "My designs" feed. Authenticates with the app's Shopify Storefront
// customerAccessToken (header), resolves it to an email, and returns that
// account's session summaries. Mirrors the data on the web /account/designs page
// without the cookie/magic-link path (which the native client can't carry).

import { storefrontFetch } from "@/lib/shopify/client";
import { listSessionIds } from "@/lib/customize/account";
import { getSession } from "@/lib/customize/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CUSTOMER_EMAIL = /* GraphQL */ `
  query CustomerEmail($token: String!) {
    customer(customerAccessToken: $token) { email }
  }
`;

export async function GET(req: Request): Promise<Response> {
  const token = req.headers.get("x-shopify-customer-token");
  if (!token) return Response.json({ error: "unauthorized" }, { status: 401 });

  let email: string | null = null;
  try {
    const data = await storefrontFetch<{ customer: { email: string | null } | null }>(
      CUSTOMER_EMAIL,
      { token },
      { revalidate: 0 },
    );
    email = data.customer?.email ?? null;
  } catch {
    email = null;
  }
  if (!email) return Response.json({ error: "unauthorized" }, { status: 401 });

  const ids = await listSessionIds(email);
  const sessions = (await Promise.all(ids.map((id) => getSession(id).catch(() => null)))).filter(
    (s): s is NonNullable<typeof s> => s != null,
  );
  const designs = sessions.map((s) => ({
    sessionId: s.sessionId,
    status: s.status,
    thumbUrl: s.jobs?.find((j) => j.status === "ready" && j.resultUrl)?.resultUrl,
  }));

  return Response.json({ designs }, { headers: { "Cache-Control": "no-store" } });
}

// Polled by the Generating screen for progressive reveal: returns the session
// status + per-slot job status/result URLs as they land.

import { getSession } from "@/lib/customize/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ sessionId: string }> },
): Promise<Response> {
  const { sessionId } = await ctx.params;
  const session = await getSession(sessionId);
  if (!session) {
    return Response.json({ error: "not found" }, { status: 404 });
  }
  return Response.json(
    {
      status: session.status,
      jobs: (session.jobs ?? []).map((j) => ({ status: j.status, resultUrl: j.resultUrl })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

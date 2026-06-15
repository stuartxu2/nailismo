import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { readSessionEmail } from "@/lib/customize/auth";
import { listSessionIds } from "@/lib/customize/account";
import { getSession } from "@/lib/customize/session";

export const dynamic = "force-dynamic"; // reads the per-user cookie
export const metadata: Metadata = {
  title: "My designs | Nailismo",
  robots: { index: false },
};

const STATUS_LABEL: Record<string, string> = {
  ready: "Ready — pick your favorite",
  selected: "Design chosen — finish checkout",
  ordered: "Ordered 🎉",
  generating: "Generating…",
  pending_payment: "Awaiting deposit",
  refunded: "Refunded",
  failed: "Generation failed",
};

export default async function DesignsPage() {
  const email = await readSessionEmail();
  if (!email) redirect("/account/login");

  const ids = await listSessionIds(email);
  const sessions = (await Promise.all(ids.map((id) => getSession(id).catch(() => null)))).filter(
    (s): s is NonNullable<typeof s> => s != null,
  );

  return (
    <main className="candy-wrap" style={{ paddingBlock: "clamp(40px, 6vw, 88px)", maxWidth: 820 }}>
      <header className="candy-rise">
        <span className="candy-eyebrow">Your account</span>
        <h1 style={{ fontSize: "clamp(34px, 7vw, 64px)", marginTop: 14 }}>
          My <span className="lb-hl">designs</span>.
        </h1>
      </header>

      {sessions.length === 0 ? (
        <p className="candy-empty" style={{ marginTop: 28 }}>
          No designs yet. <Link href="/customize">Start your custom set →</Link>
        </p>
      ) : (
        <ul
          className="candy-rise candy-d1"
          style={{ display: "grid", gap: 16, listStyle: "none", padding: 0, marginTop: 28 }}
        >
          {sessions.map((s) => {
            const thumb = s.jobs?.find((j) => j.status === "ready" && j.resultUrl)?.resultUrl;
            return (
              <li key={s.sessionId}>
                <Link
                  href={`/customize/result/${s.sessionId}`}
                  style={{
                    display: "flex",
                    gap: 16,
                    alignItems: "center",
                    textDecoration: "none",
                    color: "inherit",
                    background: "#fff",
                    borderRadius: 18,
                    padding: 14,
                    boxShadow: "0 12px 32px -20px rgba(0,0,0,.4)",
                  }}
                >
                  {thumb ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumb}
                      alt=""
                      width={88}
                      height={88}
                      style={{ borderRadius: 14, objectFit: "cover", flexShrink: 0 }}
                    />
                  ) : (
                    <div style={{ width: 88, height: 88, borderRadius: 14, background: "#f1f1f1", flexShrink: 0 }} />
                  )}
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 17 }}>
                      {STATUS_LABEL[s.status] ?? s.status}
                    </div>
                    <div style={{ color: "var(--ink-soft)", fontSize: 14, fontWeight: 700, marginTop: 4 }}>
                      Resume →
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BF_END,
  BF_START,
  EXPRESS_CUTOFF,
  OFFER_END,
  SEASON_END,
  STANDARD_CUTOFF,
} from "@/lib/promo/holiday";

const { revalidatePath } = vi.hoisted(() => ({ revalidatePath: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { GET } from "./route";

function get(auth?: string): Request {
  return new Request("http://localhost/api/cron/promo-refresh", {
    headers: auth ? { authorization: auth } : {},
  });
}

beforeEach(() => {
  process.env.CRON_SECRET = "cron-test-secret";
  revalidatePath.mockReset();
});

describe("GET /api/cron/promo-refresh", () => {
  it("rejects a request without the cron secret", async () => {
    expect((await GET(get())).status).toBe(401);
    expect((await GET(get("Bearer wrong"))).status).toBe(401);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rejects everything when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;
    expect((await GET(get("Bearer undefined"))).status).toBe(401);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("marks every page stale so seasonal copy flips on the next visit", async () => {
    const res = await GET(get("Bearer cron-test-secret"));
    expect(res.status).toBe(200);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });
});

describe("vercel.json crons", () => {
  const crons: { path: string; schedule: string }[] = JSON.parse(
    readFileSync(join(__dirname, "../../../../vercel.json"), "utf8"),
  ).crons;

  it("fire within the hour of every promo boundary (UTC)", () => {
    const hours = crons
      .filter((c) => c.path === "/api/cron/promo-refresh")
      .map((c) => c.schedule.split(" "))
      .filter(([m, , dom, mon, dow]) => m === "0" && dom === "*" && mon === "*" && dow === "*")
      .map(([, h]) => Number(h));
    for (const b of [BF_START, BF_END, STANDARD_CUTOFF, OFFER_END, EXPRESS_CUTOFF, SEASON_END]) {
      expect(b.getUTCMinutes()).toBe(0);
      expect(hours).toContain(b.getUTCHours());
    }
  });
});

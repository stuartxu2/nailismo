import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendDesignsReady, sendMagicLink } from "./email";
import type { DesignJob } from "./types";

const JOBS: DesignJob[] = [
  { seed: 101, status: "ready", resultUrl: "https://blob/r0.png" },
  { seed: 202, status: "ready", resultUrl: "https://blob/r1.png" },
  { seed: 303, status: "failed" },
];

beforeEach(() => {
  process.env.RESEND_API_KEY = "re_test";
  vi.restoreAllMocks();
});

describe("sendDesignsReady", () => {
  it("POSTs to Resend with the link, ready thumbnails, and the credit line", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    const ok = await sendDesignsReady({ email: "a@b.com", jobs: JOBS, loginUrl: "https://nailismo.com/account/verify?token=T" });
    expect(ok).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.from).toContain("hello@nailismo.com");
    expect(body.to).toEqual(["a@b.com"]);
    expect(body.html).toContain("https://nailismo.com/account/verify?token=T");
    expect(body.html).toContain("https://blob/r0.png");
    expect(body.html).toContain("https://blob/r1.png");
    expect(body.html).not.toContain("https://blob/r2"); // failed job has no thumb
    expect(body.html.toLowerCase()).toContain("$2");
    expect((init as RequestInit).headers).toMatchObject({ Authorization: "Bearer re_test" });
  });

  it("returns false (swallows) when the API errors or the key is missing", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response("nope", { status: 500 }));
    expect(await sendDesignsReady({ email: "a@b.com", jobs: JOBS, loginUrl: "u" })).toBe(false);
    delete process.env.RESEND_API_KEY;
    expect(await sendDesignsReady({ email: "a@b.com", jobs: JOBS, loginUrl: "u" })).toBe(false);
  });
});

describe("sendMagicLink", () => {
  it("POSTs a login link email", async () => {
    const fetchMock = vi.spyOn(global, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    expect(await sendMagicLink("a@b.com", "https://nailismo.com/account/verify?token=T")).toBe(true);
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.to).toEqual(["a@b.com"]);
    expect(body.html).toContain("https://nailismo.com/account/verify?token=T");
  });
});

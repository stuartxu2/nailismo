import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendDesignsReady, sendMagicLink } from "./email";
import type { DesignJob } from "./types";

const JOBS: DesignJob[] = [
  { seed: 101, status: "ready", resultUrl: "https://blob/r0.png" },
  { seed: 202, status: "ready", resultUrl: "https://blob/r1.png" },
  { seed: 303, status: "failed" },
];

/** Mock the 3-step JMAP flow: session GET, discover POST, send POST. */
function mockJmapOk() {
  return vi.spyOn(global, "fetch").mockImplementation(async (url, init) => {
    const u = String(url);
    if (u.endsWith("/jmap/session")) {
      return new Response(
        JSON.stringify({
          apiUrl: "https://api.fastmail.com/jmap/api/",
          primaryAccounts: { "urn:ietf:params:jmap:mail": "acct1" },
        }),
        { status: 200 },
      );
    }
    const body = JSON.parse((init as RequestInit).body as string);
    const methods = body.methodCalls.map((c: [string]) => c[0]);
    if (methods.includes("Mailbox/get")) {
      return new Response(
        JSON.stringify({
          methodResponses: [
            ["Mailbox/get", { list: [{ id: "mb-sent", role: "sent" }, { id: "mb-inbox", role: "inbox" }] }, "0"],
            ["Identity/get", { list: [{ id: "id-1", email: "hello@nailismo.com" }] }, "1"],
          ],
        }),
        { status: 200 },
      );
    }
    return new Response(
      JSON.stringify({
        methodResponses: [
          ["Email/set", { created: { msg: { id: "em-1" } } }, "0"],
          ["EmailSubmission/set", { created: { sub: { id: "sub-1" } } }, "1"],
        ],
      }),
      { status: 200 },
    );
  });
}

/** Extract the Email/set create payload from the send (3rd) call. */
function sentMessage(fetchMock: ReturnType<typeof vi.spyOn>) {
  const calls = fetchMock.mock.calls as [unknown, RequestInit?][];
  const call = calls.find((c) => c[1] && String(c[1].body).includes("Email/set"));
  const parsed = JSON.parse(call![1]!.body as string);
  return parsed.methodCalls[0][1].create.msg;
}

beforeEach(() => {
  process.env.FASTMAIL_API_TOKEN = "fmu-test";
  vi.restoreAllMocks();
});

describe("sendDesignsReady", () => {
  it("sends via JMAP from hello@nailismo.com with link, ready thumbs, credit line", async () => {
    const fetchMock = mockJmapOk();
    const loginUrl = "https://nailismo.com/account/verify?token=T";
    const ok = await sendDesignsReady({ email: "a@b.com", jobs: JOBS, loginUrl });
    expect(ok).toBe(true);

    // session GET first, then bearer auth on every call
    expect(String(fetchMock.mock.calls[0][0])).toContain("/jmap/session");
    expect((fetchMock.mock.calls[0][1] as RequestInit).headers).toMatchObject({
      Authorization: "Bearer fmu-test",
    });

    const msg = sentMessage(fetchMock);
    expect(msg.from[0].email).toBe("hello@nailismo.com");
    expect(msg.to[0].email).toBe("a@b.com");
    const html = msg.bodyValues.body.value as string;
    expect(html).toContain(loginUrl);
    expect(html).toContain("https://blob/r0.png");
    expect(html).toContain("https://blob/r1.png");
    expect(html).not.toContain("https://blob/r2"); // failed job has no thumb
    expect(html.toLowerCase()).toContain("$2");
  });

  it("returns false when the token is missing", async () => {
    delete process.env.FASTMAIL_API_TOKEN;
    expect(await sendDesignsReady({ email: "a@b.com", jobs: JOBS, loginUrl: "u" })).toBe(false);
  });

  it("returns false (swallows) when JMAP session errors", async () => {
    vi.spyOn(global, "fetch").mockResolvedValue(new Response("nope", { status: 401 }));
    expect(await sendDesignsReady({ email: "a@b.com", jobs: JOBS, loginUrl: "u" })).toBe(false);
  });

  it("returns false when the submission is notCreated", async () => {
    vi.spyOn(global, "fetch").mockImplementation(async (url, init) => {
      const u = String(url);
      if (u.endsWith("/jmap/session"))
        return new Response(
          JSON.stringify({ apiUrl: "https://x/api/", primaryAccounts: { "urn:ietf:params:jmap:mail": "a" } }),
          { status: 200 },
        );
      const methods = JSON.parse((init as RequestInit).body as string).methodCalls.map((c: [string]) => c[0]);
      if (methods.includes("Mailbox/get"))
        return new Response(
          JSON.stringify({
            methodResponses: [
              ["Mailbox/get", { list: [{ id: "s", role: "sent" }] }, "0"],
              ["Identity/get", { list: [{ id: "i", email: "hello@nailismo.com" }] }, "1"],
            ],
          }),
          { status: 200 },
        );
      return new Response(
        JSON.stringify({
          methodResponses: [
            ["Email/set", { created: { msg: { id: "em" } } }, "0"],
            ["EmailSubmission/set", { notCreated: { sub: { type: "forbiddenFrom" } } }, "1"],
          ],
        }),
        { status: 200 },
      );
    });
    expect(await sendDesignsReady({ email: "a@b.com", jobs: JOBS, loginUrl: "u" })).toBe(false);
  });
});

describe("sendMagicLink", () => {
  it("sends a login-link email via JMAP", async () => {
    const fetchMock = mockJmapOk();
    expect(await sendMagicLink("a@b.com", "https://nailismo.com/account/verify?token=T")).toBe(true);
    const msg = sentMessage(fetchMock);
    expect(msg.to[0].email).toBe("a@b.com");
    expect(msg.bodyValues.body.value).toContain("https://nailismo.com/account/verify?token=T");
  });
});

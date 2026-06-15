import { describe, it, expect, vi, beforeEach } from "vitest";

const { getSession, upsertSession } = vi.hoisted(() => ({
  getSession: vi.fn(),
  upsertSession: vi.fn(),
}));
const { generateDesign } = vi.hoisted(() => ({ generateDesign: vi.fn() }));
const { putResult } = vi.hoisted(() => ({ putResult: vi.fn() }));
const { refundDeposit } = vi.hoisted(() => ({ refundDeposit: vi.fn() }));

vi.mock("./session", () => ({ getSession, upsertSession }));
vi.mock("./imagegen", () => ({ generateDesign }));
vi.mock("./blob", () => ({ putResult }));
vi.mock("./stripe", () => ({ refundDeposit }));

import { startGeneration } from "./generation";

const SESSION = {
  sessionId: "s1",
  status: "generating",
  uploadUrl: "https://blob/upload",
  referenceDescriptor: "coral, palms",
  shape: "almond",
  paymentIntentId: "pi_1",
};

beforeEach(() => {
  getSession.mockReset();
  upsertSession.mockReset();
  generateDesign.mockReset();
  putResult.mockReset();
  refundDeposit.mockReset();
});

describe("startGeneration", () => {
  it("does nothing without an upload", async () => {
    getSession.mockResolvedValueOnce({ sessionId: "s1", status: "generating" });
    await startGeneration("s1");
    expect(generateDesign).not.toHaveBeenCalled();
    expect(upsertSession).not.toHaveBeenCalled();
  });

  it("renders 3 slots, stores them, and marks the session ready", async () => {
    getSession.mockResolvedValueOnce(SESSION);
    generateDesign.mockResolvedValue("data:image/png;base64,QUJD"); // "ABC"
    putResult.mockImplementation(async (_s: string, slot: number) => `https://blob/r${slot}.png`);

    await startGeneration("s1");

    expect(generateDesign).toHaveBeenCalledTimes(3);
    expect(putResult).toHaveBeenCalledTimes(3);
    const arg = upsertSession.mock.calls.at(-1)![0];
    expect(arg.status).toBe("ready");
    expect(arg.jobs).toHaveLength(3);
    expect(arg.jobs.every((j: { status: string }) => j.status === "ready")).toBe(true);
    expect(arg.jobs.map((j: { resultUrl: string }) => j.resultUrl)).toEqual([
      "https://blob/r0.png",
      "https://blob/r1.png",
      "https://blob/r2.png",
    ]);
    expect(refundDeposit).not.toHaveBeenCalled();
  });

  it("passes the customer upload + brand asset as refs, with the seed", async () => {
    getSession.mockResolvedValueOnce(SESSION);
    generateDesign.mockResolvedValue("data:image/png;base64,QUJD");
    putResult.mockResolvedValue("https://blob/r.png");

    await startGeneration("s1");

    // slot 0 (flat-lay): upload + flatlay brand asset, seed 101
    const [, refs0, opts0] = [
      generateDesign.mock.calls[0][0],
      generateDesign.mock.calls[0][1],
      generateDesign.mock.calls[0][2],
    ];
    expect(refs0[0]).toBe("https://blob/upload");
    expect(refs0[1]).toContain("/brand/flatlay.jpg");
    expect(opts0.seed).toBe(101);
    // slot 2 (minimal): no brand asset
    expect(generateDesign.mock.calls[2][1]).toEqual(["https://blob/upload"]);
  });

  it("counts a slot failed only after both attempts fail (others still ready)", async () => {
    getSession.mockResolvedValueOnce(SESSION);
    // slot 0 (seed 101) fails on both attempts; slots 1 & 2 succeed. Target by
    // seed since the 3 slots render in parallel (call order isn't stable).
    generateDesign.mockImplementation(async (_p: string, _refs: string[], opts: { seed: number }) => {
      if (opts.seed === 101) throw new Error("boom");
      return "data:image/png;base64,QUJD";
    });
    putResult.mockResolvedValue("https://blob/r.png");

    await startGeneration("s1");
    const arg = upsertSession.mock.calls.at(-1)![0];
    expect(arg.status).toBe("ready"); // 2 of 3 still usable
    expect(arg.jobs.filter((j: { status: string }) => j.status === "ready")).toHaveLength(2);
    expect(arg.jobs.find((j: { seed: number }) => j.seed === 101).status).toBe("failed");
  });

  it("fails the session and refunds when all 3 fail", async () => {
    getSession.mockResolvedValueOnce(SESSION);
    generateDesign.mockRejectedValue(new Error("down"));

    await startGeneration("s1");

    const arg = upsertSession.mock.calls.at(-1)![0];
    expect(arg.status).toBe("failed");
    expect(refundDeposit).toHaveBeenCalledWith("pi_1");
    expect(putResult).not.toHaveBeenCalled();
  });
});

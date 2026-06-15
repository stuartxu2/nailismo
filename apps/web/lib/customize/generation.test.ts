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

  it("renders 3 views, stores them, and marks the session ready", async () => {
    getSession.mockResolvedValueOnce(SESSION);
    generateDesign.mockResolvedValue("data:image/png;base64,QUJD"); // "ABC"
    putResult.mockImplementation(async (_s: string, slot: number) => `https://blob/r${slot}.png`);

    await startGeneration("s1");

    expect(generateDesign).toHaveBeenCalledTimes(3); // 1 canonical + 2 derived
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

  it("anchors slot 0 on the upload, then slots 1 & 2 on slot 0's output image", async () => {
    getSession.mockResolvedValueOnce(SESSION);
    generateDesign.mockResolvedValue("data:image/png;base64,QUJD");
    putResult.mockResolvedValue("https://blob/r.png");

    await startGeneration("s1");

    // call[0] = canonical slot 0: upload + flatlay brand asset, seed 101
    expect(generateDesign.mock.calls[0][1][0]).toBe("https://blob/upload");
    expect(generateDesign.mock.calls[0][1][1]).toContain("/brand/flatlay.jpg");
    expect(generateDesign.mock.calls[0][2].seed).toBe(101);
    // call[1] = hand: anchored on slot 0's output data URL only, seed 202
    expect(generateDesign.mock.calls[1][1]).toEqual(["data:image/png;base64,QUJD"]);
    expect(generateDesign.mock.calls[1][2].seed).toBe(202);
    // call[2] = package: slot 0's output + package brand asset, seed 303
    expect(generateDesign.mock.calls[2][1][0]).toBe("data:image/png;base64,QUJD");
    expect(generateDesign.mock.calls[2][1][1]).toContain("/brand/package.jpg");
    expect(generateDesign.mock.calls[2][2].seed).toBe(303);
  });

  it("a derived view can fail (after retry) while the others stay ready", async () => {
    getSession.mockResolvedValueOnce(SESSION);
    // package (seed 303) fails both attempts; canonical + hand succeed.
    generateDesign.mockImplementation(async (_p: string, _refs: string[], opts: { seed: number }) => {
      if (opts.seed === 303) throw new Error("boom");
      return "data:image/png;base64,QUJD";
    });
    putResult.mockResolvedValue("https://blob/r.png");

    await startGeneration("s1");
    const arg = upsertSession.mock.calls.at(-1)![0];
    expect(arg.status).toBe("ready"); // canonical + hand still usable
    expect(arg.jobs.filter((j: { status: string }) => j.status === "ready")).toHaveLength(2);
    expect(arg.jobs.find((j: { seed: number }) => j.seed === 303).status).toBe("failed");
  });

  it("fails the session and refunds when the canonical design can't be made", async () => {
    getSession.mockResolvedValueOnce(SESSION);
    // slot 0 fails both attempts → can't derive the views → fail everything.
    generateDesign.mockImplementation(async (_p: string, _refs: string[], opts: { seed: number }) => {
      if (opts.seed === 101) throw new Error("down");
      return "data:image/png;base64,QUJD";
    });

    await startGeneration("s1");

    const arg = upsertSession.mock.calls.at(-1)![0];
    expect(arg.status).toBe("failed");
    expect(arg.jobs.every((j: { status: string }) => j.status === "failed")).toBe(true);
    expect(refundDeposit).toHaveBeenCalledWith("pi_1");
    expect(putResult).not.toHaveBeenCalled();
  });
});

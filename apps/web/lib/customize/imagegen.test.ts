import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { extractImageUrl, extractText, generateDesign, describeReference } from "./imagegen";

describe("extractImageUrl", () => {
  it("pulls the first image data URL from a chat response", () => {
    const json = {
      choices: [
        {
          message: {
            images: [
              { image_url: { url: "data:image/png;base64,AAAA" } },
              { image_url: { url: "data:image/png;base64,BBBB" } },
            ],
          },
        },
      ],
    };
    expect(extractImageUrl(json)).toBe("data:image/png;base64,AAAA");
  });

  it("returns null when there is no image", () => {
    expect(extractImageUrl({ choices: [{ message: { content: "hi" } }] })).toBeNull();
    expect(extractImageUrl({})).toBeNull();
    expect(extractImageUrl(null)).toBeNull();
  });

  it("ignores non-data-url image entries", () => {
    const json = { choices: [{ message: { images: [{ image_url: { url: "nope" } }] } }] };
    expect(extractImageUrl(json)).toBeNull();
  });
});

describe("extractText", () => {
  it("returns trimmed assistant content", () => {
    expect(extractText({ choices: [{ message: { content: "  coral, palms  " } }] })).toBe("coral, palms");
  });
  it("returns empty string when absent", () => {
    expect(extractText({})).toBe("");
  });
});

describe("network calls", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubEnv("AI_GATEWAY_API_KEY", "test-key");
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  const ok = (body: unknown) =>
    ({ ok: true, status: 200, json: async () => body }) as unknown as Response;

  it("generateDesign returns the image url and posts refs + seed", async () => {
    fetchMock.mockResolvedValueOnce(
      ok({ choices: [{ message: { images: [{ image_url: { url: "data:image/png;base64,ZZ" } }] } }] }),
    );
    const url = await generateDesign("prompt", ["data:image/jpeg;base64,REF"], { seed: 202 });
    expect(url).toBe("data:image/png;base64,ZZ");
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.model).toBe("google/gemini-3-pro-image");
    expect(body.seed).toBe(202);
    expect(body.messages[0].content).toContainEqual({
      type: "image_url",
      image_url: { url: "data:image/jpeg;base64,REF" },
    });
  });

  it("generateDesign throws when the response carries no image", async () => {
    fetchMock.mockResolvedValueOnce(ok({ choices: [{ message: { content: "sorry" } }] }));
    await expect(generateDesign("p", [])).rejects.toThrow(/no image/);
  });

  it("generateDesign throws on a non-ok status", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 429 } as unknown as Response);
    await expect(generateDesign("p", [])).rejects.toThrow(/429/);
  });

  it("describeReference returns the vision descriptor", async () => {
    fetchMock.mockResolvedValueOnce(ok({ choices: [{ message: { content: "coral, palms, warm" } }] }));
    expect(await describeReference("data:image/jpeg;base64,X")).toBe("coral, palms, warm");
  });
});

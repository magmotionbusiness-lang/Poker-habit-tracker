import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";
import { mergeUtm, parseUtm } from "./utm";

describe("rate limiter", () => {
  it("allows N per window then blocks with retry-after", () => {
    const check = createRateLimiter(2, 60_000);
    expect(check("ip", 0).ok).toBe(true);
    expect(check("ip", 1).ok).toBe(true);
    expect(check("ip", 2)).toEqual({ ok: false, retryAfter: 60 });
    expect(check("other", 2).ok).toBe(true);
    expect(check("ip", 60_000).ok).toBe(true);
  });
});

describe("utm", () => {
  it("parses known keys only and keeps first touch", () => {
    expect(parseUtm("?utm_source=ig&utm_campaign=c8&x=1")).toEqual({
      utm_source: "ig",
      utm_campaign: "c8",
    });
    expect(parseUtm("?x=1")).toBeNull();
    expect(mergeUtm({ utm_source: "a" }, { utm_source: "b" })).toEqual({ utm_source: "a" });
    expect(mergeUtm(null, { utm_source: "b" })).toEqual({ utm_source: "b" });
  });
});

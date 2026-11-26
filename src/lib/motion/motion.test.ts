import { describe, expect, it } from "vitest";
import { effectiveMotion } from "./motion";

describe("motion policy", () => {
  it("auto follows the OS; explicit choices win", () => {
    expect(effectiveMotion("auto", false)).toBe("full");
    expect(effectiveMotion("auto", true)).toBe("gentle");
    expect(effectiveMotion(undefined, true)).toBe("gentle");
    expect(effectiveMotion("full", true)).toBe("full");
    expect(effectiveMotion("gentle", false)).toBe("gentle");
  });
});

describe("boot script", () => {
  it("is plain script text that sets data-motion", async () => {
    const { MOTION_BOOT } = await import("./boot");
    expect(typeof MOTION_BOOT).toBe("string");
    expect(() => new Function(MOTION_BOOT)).not.toThrow();
    expect(MOTION_BOOT).toContain("dataset.motion");
  });
});

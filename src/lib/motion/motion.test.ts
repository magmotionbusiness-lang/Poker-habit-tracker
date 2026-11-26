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

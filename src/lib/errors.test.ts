import { describe, expect, it } from "vitest";
import { z } from "zod";
import { errorMessage } from "./errors";

describe("errorMessage", () => {
  it("unwraps Zod issues, Errors and strings", () => {
    const r = z
      .object({ a: z.number().refine((v) => v > 0, "Must be positive") })
      .safeParse({ a: -1 });
    expect(errorMessage(r.error)).toBe("Must be positive");
    expect(errorMessage(new Error("boom"))).toBe("boom");
    expect(errorMessage("plain")).toBe("plain");
    expect(errorMessage(42)).toBe("Something went wrong");
  });
});

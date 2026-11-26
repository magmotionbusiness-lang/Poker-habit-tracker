import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-redirect";

describe("safeNext", () => {
  it.each([
    [null, "/today"],
    ["", "/today"],
    ["/hands?id=1", "/hands?id=1"],
    ["https://evil.example", "/today"],
    ["//evil.example", "/today"],
    ["/\\evil.example", "/today"],
    ["/\tevil", "/today"],
    ["javascript:alert(1)", "/today"],
  ])("%s → %s", (input, out) => expect(safeNext(input)).toBe(out));
});

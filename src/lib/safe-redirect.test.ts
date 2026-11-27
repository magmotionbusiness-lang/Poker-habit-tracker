import { describe, expect, it } from "vitest";
import { safeNext } from "./safe-redirect";

describe("safeNext", () => {
  it.each([
    [null, "/home"],
    ["", "/home"],
    ["/hands?id=1", "/hands?id=1"],
    ["https://evil.example", "/home"],
    ["//evil.example", "/home"],
    ["/\\evil.example", "/home"],
    ["/\tevil", "/home"],
    ["javascript:alert(1)", "/home"],
  ])("%s → %s", (input, out) => expect(safeNext(input)).toBe(out));
});

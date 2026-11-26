import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "./csv";

describe("csv", () => {
  it("escapes quotes, commas and newlines", () => {
    expect(csvCell('Crown "high roller", room 2')).toBe('"Crown ""high roller"", room 2"');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
    expect(csvCell(null)).toBe("");
  });
  it("neutralises formula injection but keeps negative numbers", () => {
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell("@cmd")).toBe("'@cmd");
    expect(csvCell("-41.00")).toBe("-41.00");
    expect(csvCell(-4100)).toBe("-4100");
  });
  it("writes a header and CRLF rows", () => {
    const out = toCsv(
      [{ a: 1, b: "x" }],
      [
        { header: "A", value: (r) => r.a },
        { header: "B", value: (r) => r.b },
      ],
    );
    expect(out).toBe("A,B\r\n1,x\r\n");
  });
});

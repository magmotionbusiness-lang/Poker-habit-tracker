import { describe, expect, it } from "vitest";
import { _publicSchema, _serverSchema } from "./env";

describe("env schema", () => {
  it("accepts an empty environment (guest-only build)", () => {
    expect(() => _publicSchema.parse({})).not.toThrow();
    expect(_serverSchema.parse({}).EMAIL_PROVIDER).toBe("none");
  });

  it("treats empty strings as unset", () => {
    expect(
      _publicSchema.parse({ NEXT_PUBLIC_SUPABASE_URL: "" }).NEXT_PUBLIC_SUPABASE_URL,
    ).toBeUndefined();
  });

  it("rejects malformed URLs and unknown providers", () => {
    expect(() => _publicSchema.parse({ NEXT_PUBLIC_SUPABASE_URL: "not a url" })).toThrow();
    expect(() => _serverSchema.parse({ EMAIL_PROVIDER: "sendgrid" })).toThrow();
  });
});

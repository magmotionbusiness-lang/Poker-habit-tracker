import { describe, expect, it } from "vitest";
import { sceneFor } from "./ambient-background";

describe("ambient scenes", () => {
  it("maps routes to colour scenes", () => {
    expect(sceneFor("/today")).toBe("today");
    expect(sceneFor("/bankroll")).toBe("bankroll");
    expect(sceneFor("/session")).toBe("bankroll");
    expect(sceneFor("/hands/view")).toBe("hands");
    expect(sceneFor("/progress")).toBe("progress");
    expect(sceneFor("/more/data")).toBe("more");
    expect(sceneFor("/")).toBe("welcome");
  });
});

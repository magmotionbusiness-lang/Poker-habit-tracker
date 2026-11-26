import { describe, expect, it } from "vitest";
import { makeSession } from "@/lib/test/factories";
import { whatsWorking } from "./whats-working";

const tz = "UTC";
const mk = (rating: "A" | "C", out: number, i: number) =>
  makeSession({
    id: `${rating}${i}`,
    game_rating: rating,
    buy_in_minor: 30_000,
    cash_out_minor: out,
    hours: 4,
    started_at: `2026-10-0${i + 1}T18:00:00Z`,
  });

describe("what's working", () => {
  it("finds the A-game vs C-game gap per hour", () => {
    const list = [0, 1, 2].flatMap((i) => [mk("A", 42_000, i), mk("C", 14_000, i)]);
    const ins = whatsWorking(list, "USD", {}, tz, () => undefined);
    const rating = ins.find((x) => x.dimension === "rating")!;
    expect(rating.best).toMatchObject({ label: "A-game", hourly: 3_000, sessions: 3 });
    expect(rating.worst).toMatchObject({ label: "C-game", hourly: -4_000 });
    expect(rating.spread).toBe(7_000);
    expect(ins[0]!.spread).toBeGreaterThanOrEqual(ins.at(-1)!.spread);
  });

  it("needs enough sessions per group and ignores tournaments", () => {
    const list = [mk("A", 42_000, 0), mk("A", 42_000, 1), mk("C", 14_000, 0), mk("C", 14_000, 1)];
    expect(
      whatsWorking(list, "USD", {}, tz, () => undefined).find((x) => x.dimension === "rating"),
    ).toBeUndefined();
    const mtts = [0, 1, 2].flatMap((i) => [
      { ...mk("A", 0, i), format: "mtt" as const },
      { ...mk("C", 0, i), format: "mtt" as const },
    ]);
    expect(whatsWorking(mtts, "USD", {}, tz, () => undefined)).toEqual([]);
  });
});

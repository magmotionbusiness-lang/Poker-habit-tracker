import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StakersDB, setDbForTests } from "./db";
import {
  addStackUpdate,
  addTransaction,
  createBankroll,
  createHabitsFromPresets,
  endSession,
  pauseSession,
  resumeSession,
  saveGoal,
  setHabitValue,
  startSession,
} from "./actions";

let d: StakersDB;
beforeEach(() => {
  d = new StakersDB(`actions-${Math.random()}`);
  setDbForTests(d);
});
afterEach(() => {
  vi.useRealTimers();
  d.close();
  setDbForTests(null);
});

describe("sessions", () => {
  it("allows one running session, records the buy-in as the first stack, add-ons count as rebuys", async () => {
    const s = await startSession({
      currency: "USD",
      buy_in_minor: 30000,
      stakes_sb_minor: 100,
      stakes_bb_minor: 200,
    });
    await expect(startSession({ currency: "USD" })).rejects.toThrow(/already running/);
    await addStackUpdate(s.id, 12000, 20000);
    const updates = await d.stackUpdates.where("session_id").equals(s.id).sortBy("at");
    expect(updates.map((u) => [u.stack_minor, u.addon_minor])).toEqual([
      [30000, 0],
      [12000, 20000],
    ]);
    expect((await d.sessions.get(s.id))!.rebuys_minor).toBe(20000);
  });

  it("pauses don't count as playing time", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-11-26T18:00:00Z"));
    let s = await startSession({ currency: "USD" });
    vi.setSystemTime(new Date("2026-11-26T19:00:00Z"));
    s = await pauseSession(s);
    vi.setSystemTime(new Date("2026-11-26T19:30:00Z"));
    s = await resumeSession(s);
    expect(s.paused_ms).toBe(30 * 60_000);
    vi.setSystemTime(new Date("2026-11-26T20:00:00Z"));
    const done = await endSession(s, { cash_out_minor: 50000 });
    expect(done).toMatchObject({
      status: "finished",
      ended_at: "2026-11-26T20:00:00.000Z",
      paused_ms: 1_800_000,
    });
  });

  it("validates impossible tournament results", async () => {
    const s = await startSession({ currency: "USD", format: "mtt" });
    await expect(endSession(s, { finish_position: 500, field_size: 400 })).rejects.toThrow(
      /bigger than the field/,
    );
  });
});

describe("transactions", () => {
  it("stores magnitudes and blocks bad transfers", async () => {
    const a = await createBankroll({ name: "Live", currency: "USD" });
    const b = await createBankroll({ name: "Online", currency: "EUR" });
    const t = await addTransaction({
      bankroll_id: a.id,
      type: "withdrawal",
      amount_minor: -5000,
      currency: "USD",
      occurred_at: new Date().toISOString(),
    });
    expect(t.amount_minor).toBe(5000);
    await expect(
      addTransaction({
        bankroll_id: a.id,
        type: "transfer",
        transfer_bankroll_id: b.id,
        amount_minor: 100,
        currency: "USD",
        occurred_at: new Date().toISOString(),
      }),
    ).rejects.toThrow(/same currency/);
    await expect(
      addTransaction({
        bankroll_id: a.id,
        type: "transfer",
        transfer_bankroll_id: a.id,
        amount_minor: 100,
        currency: "USD",
        occurred_at: new Date().toISOString(),
      }),
    ).rejects.toThrow(/different bankroll/);
    await expect(createBankroll({ name: "", currency: "USD" })).rejects.toThrow();
  });
});

describe("habits & goals", () => {
  it("creates presets once and keeps one log per habit per day", async () => {
    await createHabitsFromPresets(["review_hands", "study"]);
    await createHabitsFromPresets(["review_hands", "warm_up"]);
    const habits = await d.habits.toArray();
    expect(habits.map((h) => h.key).sort()).toEqual(["review_hands", "study", "warm_up"]);
    const review = habits.find((h) => h.key === "review_hands")!;
    expect(review.target_value).toBe(3);
    await setHabitValue(review.id, "2026-11-26", 1);
    await setHabitValue(review.id, "2026-11-26", 2);
    expect(await d.habitLogs.count()).toBe(1);
    expect((await d.habitLogs.toArray())[0]!.value).toBe(2);
  });

  it("only one main goal at a time", async () => {
    const base = {
      type: "profit" as const,
      title: "x",
      target_value: 1,
      start_value: 0,
      manual_value: null,
      currency: "USD",
      unit: "minor" as const,
      starts_at: new Date().toISOString(),
      deadline: null,
      status: "active" as const,
      achieved_at: null,
    };
    await saveGoal({ ...base, is_main: true });
    await saveGoal({ ...base, title: "y", is_main: true });
    const mains = (await d.goals.toArray()).filter((g) => g.is_main);
    expect(mains.map((g) => g.title)).toEqual(["y"]);
  });
});

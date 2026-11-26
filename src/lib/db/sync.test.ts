import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { StakersDB, setDbForTests, type OutboxEntry } from "./db";
import { deleteRows, getSettings, putRow, saveSettings, wipeLocalData } from "./repo";
import { fromRemote, planPush, toRemote } from "./sync";

describe("planPush", () => {
  const e = (
    seq: number,
    table: OutboxEntry["table"],
    op: OutboxEntry["op"],
    rowId: string,
  ): OutboxEntry => ({ seq, table, op, rowId, at: "" });
  it("keeps only the last op per row and orders parents before children", () => {
    const { plan, maxSeq } = planPush([
      e(1, "transactions", "upsert", "t1"),
      e(2, "bankrolls", "upsert", "b1"),
      e(3, "transactions", "upsert", "t1"),
      e(4, "sessions", "upsert", "s1"),
      e(5, "sessions", "delete", "s1"),
      e(6, "habitLogs", "upsert", "l1"),
    ]);
    expect(maxSeq).toBe(6);
    expect(plan).toEqual([
      { table: "bankrolls", upserts: ["b1"], deletes: [] },
      { table: "sessions", upserts: [], deletes: ["s1"] },
      { table: "transactions", upserts: ["t1"], deletes: [] },
      { table: "habitLogs", upserts: ["l1"], deletes: [] },
    ]);
  });
  it("an upsert after a delete resurrects the row", () => {
    const { plan } = planPush([e(1, "goals", "delete", "g"), e(2, "goals", "upsert", "g")]);
    expect(plan).toEqual([{ table: "goals", upserts: ["g"], deletes: [] }]);
  });
});

describe("row mapping", () => {
  it("adds user_id on the way up and strips server-only fields on the way down", () => {
    expect(toRemote("bankrolls", { id: "b" }, "u1")).toEqual({ id: "b", user_id: "u1" });
    expect(fromRemote({ id: "s", user_id: "u1", client_id: null, fx_rate: 1.1 })).toEqual({
      id: "s",
      fx_rate: "1.1",
    });
  });
});

describe("repository + outbox (IndexedDB)", () => {
  let d: StakersDB;
  beforeEach(() => {
    d = new StakersDB(`test-${Math.random()}`);
    setDbForTests(d);
  });
  afterEach(async () => {
    d.close();
    setDbForTests(null);
  });

  it("every write is queued atomically with the data", async () => {
    await putRow("bankrolls", {
      id: "b1",
      name: "Live",
      currency: "USD",
      archived: false,
      sort_order: 0,
      created_at: "",
      updated_at: "",
    });
    await deleteRows("bankrolls", ["b1"]);
    expect(await d.bankrolls.count()).toBe(0);
    const ops = (await d.outbox.toArray()).map((o) => [o.table, o.op, o.rowId]);
    expect(ops).toEqual([
      ["bankrolls", "upsert", "b1"],
      ["bankrolls", "delete", "b1"],
    ]);
  });

  it("stamps updated_at on write", async () => {
    const r = await putRow("goals", { id: "g", updated_at: "1970-01-01T00:00:00.000Z" });
    expect(r.updated_at > "2020").toBe(true);
  });

  it("settings default, persist and mark dirty", async () => {
    expect((await getSettings()).onboardingDone).toBe(false);
    await saveSettings({ onboardingDone: true, restWeekdays: [7] });
    expect(await getSettings()).toMatchObject({ onboardingDone: true, restWeekdays: [7] });
    expect((await d.meta.get("settingsDirty"))?.value).toBe(true);
    await wipeLocalData();
    expect((await getSettings()).onboardingDone).toBe(false);
  });
});

import "fake-indexeddb/auto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { StakersDB, setDbForTests } from "./db";
import { putRow } from "./repo";
import { pull } from "./sync";

/** Minimal PostgREST-shaped fake: from().select().gt().order().limit() → { data, error }. */
function fakeClient(tables: Record<string, Array<Record<string, unknown>>>): SupabaseClient {
  const builder = (rows: Array<Record<string, unknown>>) => {
    let out = [...rows];
    const b = {
      select: () => b,
      limit: () => b,
      order: (col: string) => {
        out.sort((x, y) => String(x[col]).localeCompare(String(y[col])));
        return b;
      },
      gt: (col: string, v: string) => {
        out = out.filter((r) => String(r[col]) > v);
        return b;
      },
      then: (resolve: (r: { data: unknown; error: null }) => void) =>
        resolve({ data: out, error: null }),
    };
    return b;
  };
  return { from: (name: string) => builder(tables[name] ?? []) } as unknown as SupabaseClient;
}

let d: StakersDB;
beforeEach(() => {
  d = new StakersDB(`pull-${Math.random()}`);
  setDbForTests(d);
});
afterEach(() => {
  d.close();
  setDbForTests(null);
});

const collection = (id: string, name: string, updated_at: string) => ({
  id,
  user_id: "u1",
  name,
  emoji: null,
  sort_order: 0,
  created_at: updated_at,
  updated_at,
});

describe("pull", () => {
  it("merges remote rows and strips server-only fields", async () => {
    await pull(
      fakeClient({ hand_collections: [collection("c1", "Ask Nelson", "2026-11-26T10:00:00Z")] }),
    );
    const row = await d.handCollections.get("c1");
    expect(row?.name).toBe("Ask Nelson");
    expect(row).not.toHaveProperty("user_id");
  });

  it("keeps a local change that hasn't been pushed yet", async () => {
    await putRow("handCollections", collection("c1", "Local name", "2026-11-26T09:00:00Z"));
    await pull(
      fakeClient({ hand_collections: [collection("c1", "Remote name", "2026-11-26T12:00:00Z")] }),
    );
    expect((await d.handCollections.get("c1"))?.name).toBe("Local name");
  });

  it("applies deletes from other devices, unless there's a pending local edit", async () => {
    await d.handCollections.bulkPut([
      { ...collection("c1", "A", "2026-11-26T10:00:00Z") },
      { ...collection("c2", "B", "2026-11-26T10:00:00Z") },
    ] as never);
    await putRow("handCollections", collection("c3", "Edited here", "2026-11-26T10:00:00Z"));
    await pull(
      fakeClient({
        tombstones: [
          { table_name: "hand_collections", row_id: "c1", deleted_at: "2026-11-26T11:00:00Z" },
          { table_name: "hand_collections", row_id: "c3", deleted_at: "2026-11-26T11:00:00Z" },
        ],
      }),
    );
    expect(await d.handCollections.get("c1")).toBeUndefined();
    expect(await d.handCollections.get("c2")).toBeDefined();
    expect(await d.handCollections.get("c3")).toBeDefined(); // local edit wins until pushed
    const cursors = (await d.meta.get("pullCursors"))?.value as Record<string, string>;
    expect(cursors.__tombstones).toBe("2026-11-26T11:00:00Z");
  });
});

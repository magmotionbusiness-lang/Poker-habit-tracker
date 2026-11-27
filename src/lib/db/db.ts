import Dexie, { type EntityTable } from "dexie";
import type {
  Bankroll,
  Goal,
  Habit,
  Hand,
  HandCollection,
  Rule,
  Opponent,
  HabitLog,
  PokerSession,
  SessionShortcut,
  StackUpdate,
  StudySession,
  Transaction,
  Venue,
} from "@/lib/domain/types";
import type { UserSettings } from "./settings";

export type OutboxEntry = {
  seq?: number;
  table: SyncTable;
  op: "upsert" | "delete";
  rowId: string;
  at: string;
};

export type FxRateRow = {
  base: string;
  quote: string;
  rate: string;
  day: string;
  fetched_at: string;
};
export type MetaRow = { key: string; value: unknown };
export type SettingsRow = UserSettings & { key: "me" };

/** Tables that sync to Supabase, in parent → child order. */
export const SYNC_TABLES = [
  "bankrolls",
  "venues",
  "opponents",
  "sessions",
  "shortcuts",
  "habits",
  "goals",
  "handCollections",
  "hands",
  "rules",
  "transactions",
  "stackUpdates",
  "habitLogs",
  "studySessions",
] as const;
export type SyncTable = (typeof SYNC_TABLES)[number];

export class StakersDB extends Dexie {
  bankrolls!: EntityTable<Bankroll, "id">;
  transactions!: EntityTable<Transaction, "id">;
  venues!: EntityTable<Venue, "id">;
  sessions!: EntityTable<PokerSession, "id">;
  stackUpdates!: EntityTable<StackUpdate, "id">;
  shortcuts!: EntityTable<SessionShortcut, "id">;
  habits!: EntityTable<Habit, "id">;
  habitLogs!: EntityTable<HabitLog, "id">;
  studySessions!: EntityTable<StudySession, "id">;
  goals!: EntityTable<Goal, "id">;
  hands!: EntityTable<Hand, "id">;
  handCollections!: EntityTable<HandCollection, "id">;
  rules!: EntityTable<Rule, "id">;
  opponents!: EntityTable<Opponent, "id">;
  settings!: EntityTable<SettingsRow, "key">;
  outbox!: EntityTable<OutboxEntry, "seq">;
  fxRates!: EntityTable<FxRateRow, "base">;
  meta!: EntityTable<MetaRow, "key">;

  constructor(name = "stakers") {
    super(name);
    this.version(1).stores({
      bankrolls: "id, archived, sort_order",
      transactions: "id, bankroll_id, occurred_at",
      venues: "id, name",
      sessions: "id, status, started_at, bankroll_id",
      stackUpdates: "id, session_id, at",
      shortcuts: "id, sort_order",
      habits: "id, sort_order, key",
      habitLogs: "id, &[habit_id+date], date",
      studySessions: "id, started_at",
      goals: "id, status, is_main",
      settings: "key",
      outbox: "++seq, [table+rowId]",
      fxRates: "[base+quote], day",
      meta: "key",
    });
    // Phase 2: hand journal, custom sections, Leak Book.
    this.version(2).stores({
      hands:
        "id, played_at, review_status, session_id, starred, *collection_ids, *user_tags, *auto_tags",
      handCollections: "id, sort_order",
      rules: "id, status, category",
    });
    // Intelligence layer: player database; hands link to opponents.
    this.version(3).stores({
      opponents: "id, nickname, updated_at",
      hands:
        "id, played_at, review_status, session_id, starred, *collection_ids, *user_tags, *auto_tags, *opponent_ids",
    });
  }
}

let instance: StakersDB | null = null;

/** The device database. Browser-only; throws during SSR on purpose. */
export function db(): StakersDB {
  if (typeof indexedDB === "undefined") throw new Error("IndexedDB is not available here");
  instance ??= new StakersDB();
  return instance;
}

/** For tests: use an isolated database. */
export function setDbForTests(next: StakersDB | null) {
  instance = next;
}

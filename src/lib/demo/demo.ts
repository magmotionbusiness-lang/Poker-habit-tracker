import type {
  Bankroll,
  Goal,
  Habit,
  HabitLog,
  Hand,
  HandCollection,
  ISODate,
  PokerSession,
  Rule,
  SessionShortcut,
  StackUpdate,
  StudySession,
  Transaction,
  Venue,
} from "@/lib/domain/types";
import { addDays, dateRange, isoWeekday } from "@/lib/dates/dates";
import { sessionCosts, sessionResult } from "@/lib/stats/session-math";
import { generateDemoHands } from "./demo-hands";

/**
 * Deterministic demo player for screenshots and Nelson demos (BUILD-PROMPT §9):
 * ~3 months of live sessions, a 23-day habit streak and a $10k bankroll goal at 64%.
 * Pure: same `today` + seed → same data. Hands arrive with Phase 2.
 */
export type DemoData = {
  bankrolls: Bankroll[];
  transactions: Transaction[];
  venues: Venue[];
  sessions: PokerSession[];
  stackUpdates: StackUpdate[];
  shortcuts: SessionShortcut[];
  habits: Habit[];
  habitLogs: HabitLog[];
  studySessions: StudySession[];
  goals: Goal[];
  hands: Hand[];
  handCollections: HandCollection[];
  rules: Rule[];
};

export const DEMO = {
  days: 92,
  streak: 23,
  startBankroll: 400_000, // $4,000
  endBankroll: 640_000, // $6,400 → 64% of $10k
  goalTarget: 1_000_000,
  hands: 60,
};

function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Local wall time on a date → UTC ISO, good enough for demo data (approximate offset). */
function at(date: ISODate, hour: number, minute = 0): string {
  return new Date(
    `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00Z`,
  ).toISOString();
}

export function generateDemo(today: ISODate, seed = 42): DemoData {
  const r = rng(seed);
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)]!;
  // Deterministic, valid v4-shaped UUIDs (the database columns are uuid).
  const hex = (len: number) =>
    Array.from({ length: len }, () => Math.floor(r() * 16).toString(16)).join("");
  const id = () =>
    `${hex(8)}-${hex(4)}-4${hex(3)}-${"89ab"[Math.floor(r() * 4)]}${hex(3)}-${hex(12)}`;
  const start = addDays(today, -DEMO.days);
  const created = at(start, 9);

  const bankroll: Bankroll = {
    id: id(),
    name: "Live bankroll",
    currency: "USD",
    archived: false,
    sort_order: 0,
    created_at: created,
    updated_at: created,
  };
  const venues: Venue[] = [
    {
      id: id(),
      name: "The Grand Card Room",
      type: "live",
      location: null,
      photo_url: null,
      created_at: created,
      updated_at: created,
    },
    {
      id: id(),
      name: "Riverside Casino",
      type: "live",
      location: null,
      photo_url: null,
      created_at: created,
      updated_at: created,
    },
  ];
  const transactions: Transaction[] = [
    {
      id: id(),
      bankroll_id: bankroll.id,
      type: "deposit",
      amount_minor: DEMO.startBankroll,
      currency: "USD",
      fx_rate_to_display: null,
      transfer_bankroll_id: null,
      note: "Starting bankroll",
      occurred_at: at(start, 10),
      created_at: created,
      updated_at: created,
    },
  ];

  // Sessions: ~3 a week, Tue/Thu/Sat evenings, 1/2 and 1/3 live cash.
  const sessions: PokerSession[] = [];
  const stackUpdates: StackUpdate[] = [];
  for (const date of dateRange(addDays(start, 1), addDays(today, -1))) {
    const wd = isoWeekday(date);
    if (![2, 4, 6].includes(wd) || r() < 0.15) continue;
    const big = r() < 0.35;
    const bb = big ? 300 : 200;
    const hours = 3 + Math.floor(r() * 5);
    const rating = pick(["A", "A", "B", "B", "B", "C"] as const);
    const edge = rating === "A" ? 0.45 : rating === "B" ? 0.1 : -0.55;
    // Live cash results are whole dollars (chips), never cents.
    const swing = Math.round(((r() - 0.5 + edge) * bb * 120 * Math.sqrt(hours / 4)) / 100) * 100;
    const buyIn = bb * 150;
    const rebuy = swing < -buyIn ? buyIn : 0;
    const cashOut = Math.max(0, buyIn + rebuy + swing);
    const started = at(date, 18 + Math.floor(r() * 2), Math.floor(r() * 4) * 15);
    const ended = new Date(Date.parse(started) + hours * 3_600_000).toISOString();
    const s: PokerSession = {
      id: id(),
      created_at: started,
      updated_at: ended,
      bankroll_id: bankroll.id,
      venue_id: pick(venues).id,
      format: "cash",
      is_live: true,
      game: "NLHE",
      stakes_sb_minor: big ? 100 : 100,
      stakes_bb_minor: bb,
      straddle_minor: null,
      buy_in_minor: buyIn,
      rebuys_minor: rebuy,
      cash_out_minor: cashOut,
      prize_minor: 0,
      bounties_minor: 0,
      fees_minor: 0,
      tips_minor: cashOut > buyIn ? 500 : 0,
      expenses:
        r() < 0.3 ? [{ kind: "food", amount_minor: 1500 + Math.floor(r() * 10) * 100 }] : [],
      currency: "USD",
      fx_rate: null,
      started_at: started,
      ended_at: ended,
      paused_ms: 0,
      paused_at: null,
      hands_played: null,
      finish_position: null,
      field_size: null,
      focus_rating: 2 + Math.floor(r() * 4),
      tilt_rating: rating === "C" ? 3 + Math.floor(r() * 3) : 1 + Math.floor(r() * 2),
      energy_rating: 2 + Math.floor(r() * 4),
      sleep_rating: 2 + Math.floor(r() * 4),
      game_rating: rating,
      focus_point: pick([
        "Don't call 3-bets OOP light",
        "Value bet thinner vs stations",
        "Respect river raises",
        null,
      ]),
      followed_focus: r() < 0.7,
      stop_loss_minor: buyIn * 2,
      max_length_min: 480,
      takeaway: pick([
        "Patient. Good folds.",
        "Tilted after the cooler — took a walk.",
        "Missed value on the river twice.",
        null,
      ]),
      notes: null,
      tags: [],
      status: "finished",
    };
    sessions.push(s);
    // A few stack updates for the chip graph.
    let stack = buyIn;
    for (let k = 1; k <= 3; k++) {
      stack = Math.max(
        0,
        stack + Math.round(((cashOut - buyIn) / 4) * k * 0.4 + (r() - 0.5) * bb * 30),
      );
      stackUpdates.push({
        id: id(),
        session_id: s.id,
        stack_minor: stack,
        addon_minor: 0,
        at: new Date(Date.parse(started) + (hours * 3_600_000 * k) / 4).toISOString(),
      });
    }
  }

  // Land exactly on $6,400 by spreading the difference over every session in whole dollars
  // (no single suspicious spike), then putting the remainder on the biggest cash-out.
  const netOf = () => sessions.reduce((a, s) => a + sessionResult(s) - sessionCosts(s), 0);
  const need = DEMO.endBankroll - DEMO.startBankroll - netOf();
  const per = Math.trunc(need / sessions.length / 100) * 100;
  for (const s of sessions) {
    if (s.cash_out_minor + per >= 0) s.cash_out_minor += per;
  }
  const biggest = sessions.reduce(
    (m, s) => (s.cash_out_minor > m.cash_out_minor ? s : m),
    sessions[0]!,
  );
  biggest.cash_out_minor += DEMO.endBankroll - DEMO.startBankroll - netOf();

  const shortcuts: SessionShortcut[] = [
    {
      id: id(),
      label: "Grand $1/2",
      preset: {
        format: "cash",
        is_live: true,
        game: "NLHE",
        stakes_sb_minor: 100,
        stakes_bb_minor: 200,
        buy_in_minor: 30000,
        currency: "USD",
        bankroll_id: bankroll.id,
        venue_id: venues[0]!.id,
      },
      sort_order: 0,
      created_at: created,
      updated_at: created,
    },
    {
      id: id(),
      label: "Riverside $1/3",
      preset: {
        format: "cash",
        is_live: true,
        game: "NLHE",
        stakes_sb_minor: 100,
        stakes_bb_minor: 300,
        buy_in_minor: 45000,
        currency: "USD",
        bankroll_id: bankroll.id,
        venue_id: venues[1]!.id,
      },
      sort_order: 1,
      created_at: created,
      updated_at: created,
    },
  ];

  // Habits: review 3 hands, study 30 min, warm-up (play days).
  const mk = (
    key: string,
    name: string,
    unit: Habit["unit"],
    target: number,
    order: number,
  ): Habit => ({
    id: id(),
    kind: "preset",
    key,
    name,
    target_value: target,
    unit,
    days_of_week: [1, 2, 3, 4, 5, 6, 7],
    sort_order: order,
    active: true,
    created_at: created,
    updated_at: created,
  });
  const habits = [
    mk("review_hands", "Review hands", "count", 3, 0),
    mk("study", "Study", "minutes", 30, 1),
    mk("warm_up", "Pre-session warm-up", "boolean", 1, 2),
  ];
  const [review, studyH, warm] = habits as [Habit, Habit, Habit];
  const sessionDays = new Set(sessions.map((s) => s.started_at.slice(0, 10)));
  const habitLogs: HabitLog[] = [];
  const studySessions: StudySession[] = [];
  const streakStart = addDays(today, -DEMO.streak);
  const log = (h: Habit, date: ISODate, value: number) =>
    habitLogs.push({
      id: id(),
      habit_id: h.id,
      date,
      value,
      source: "manual",
      updated_at: at(date, 21),
    });

  for (const date of dateRange(start, addDays(today, -1))) {
    const inStreak = date >= streakStart;
    // Three missed days right before the streak: no freeze or repair can bridge them.
    const breakDay = date >= addDays(streakStart, -3) && date < streakStart;
    const active = inStreak || (!breakDay && r() < 0.68);
    if (!active) continue;
    log(review, date, inStreak ? 3 + (r() < 0.3 ? 2 : 0) : 1 + Math.floor(r() * 4));
    if (r() < 0.75 || inStreak) {
      const minutes = 20 + Math.floor(r() * 50);
      studySessions.push({
        id: id(),
        started_at: at(date, 12),
        minutes,
        category: pick(["solver", "course", "ranges", "hand_review"] as const),
        note: null,
        created_at: at(date, 13),
      });
    }
    if (sessionDays.has(date)) log(warm, date, 1);
  }
  log(review, today, 1); // today in progress
  void studyH;

  const goals: Goal[] = [
    {
      id: id(),
      type: "bankroll",
      title: "Reach a $10k bankroll",
      target_value: DEMO.goalTarget,
      start_value: DEMO.startBankroll,
      manual_value: null,
      currency: "USD",
      unit: "minor",
      starts_at: at(start, 10),
      deadline: addDays(today, 200),
      is_main: true,
      status: "active",
      achieved_at: null,
      created_at: created,
      updated_at: created,
    },
    {
      id: id(),
      type: "profit",
      title: "Make my first $50k from poker",
      target_value: 5_000_000,
      start_value: 0,
      manual_value: null,
      currency: "USD",
      unit: "minor",
      starts_at: at(start, 10),
      deadline: null,
      is_main: false,
      status: "active",
      achieved_at: null,
      created_at: created,
      updated_at: created,
    },
  ];

  // 60 hands played through the real engine across these sessions (Phase 2).
  const journal = generateDemoHands(sessions, r, id, DEMO.hands);

  return {
    bankrolls: [bankroll],
    transactions,
    venues,
    sessions,
    stackUpdates,
    shortcuts,
    habits,
    habitLogs,
    studySessions,
    goals,
    hands: journal.hands,
    handCollections: journal.collections,
    rules: journal.rules,
  };
}

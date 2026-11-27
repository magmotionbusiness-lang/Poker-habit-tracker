/**
 * Domain records. Field names mirror the Postgres columns (snake_case) so the same
 * object can live in IndexedDB, travel through the sync outbox and land in Supabase
 * without a mapping layer. `user_id` is attached at sync time.
 */
export type ISODate = string; // "2026-11-26" — a calendar day in the user's timezone
export type Timestamp = string; // ISO-8601 UTC instant

type Row = { id: string; created_at: Timestamp; updated_at: Timestamp };

export type Bankroll = Row & {
  name: string;
  currency: string;
  archived: boolean;
  sort_order: number;
};

export type TransactionType = "deposit" | "withdrawal" | "transfer" | "adjustment";
export type Transaction = Row & {
  bankroll_id: string;
  type: TransactionType;
  /** Positive magnitude, except `adjustment`, which is signed. Transfers move money from bankroll_id → transfer_bankroll_id (same currency). */
  amount_minor: number;
  currency: string;
  fx_rate_to_display: string | null;
  transfer_bankroll_id: string | null;
  note: string | null;
  occurred_at: Timestamp;
};

export type Venue = Row & {
  name: string;
  type: "live" | "online";
  location: string | null;
  photo_url: string | null;
};

export type SessionFormat = "cash" | "mtt" | "sng" | "spin";
export type GameRating = "A" | "B" | "C";
export type Expense = {
  kind: "food" | "travel" | "hotel" | "other";
  amount_minor: number;
  note?: string;
};

export type PokerSession = Row & {
  bankroll_id: string | null;
  venue_id: string | null;
  format: SessionFormat;
  is_live: boolean;
  game: string;
  stakes_sb_minor: number | null;
  stakes_bb_minor: number | null;
  straddle_minor: number | null;
  buy_in_minor: number;
  rebuys_minor: number;
  cash_out_minor: number;
  prize_minor: number;
  bounties_minor: number;
  fees_minor: number;
  tips_minor: number;
  expenses: Expense[];
  currency: string;
  /** Rate from the session currency to its bankroll's currency, as a decimal string. Null when they match. */
  fx_rate: string | null;
  started_at: Timestamp;
  ended_at: Timestamp | null;
  paused_ms: number;
  /** Set while paused; not synced as a column (kept inside the running session only). */
  paused_at?: Timestamp | null;
  hands_played: number | null;
  finish_position: number | null;
  field_size: number | null;
  focus_rating: number | null;
  tilt_rating: number | null;
  energy_rating: number | null;
  sleep_rating: number | null;
  game_rating: GameRating | null;
  focus_point: string | null;
  followed_focus: boolean | null;
  stop_loss_minor: number | null;
  max_length_min: number | null;
  takeaway: string | null;
  notes: string | null;
  tags: string[];
  status: "running" | "finished";
  /** Post-session mood 1 (tilted) … 5 (great); correlated with results in insights. */
  mood?: number | null;
};

export type StackUpdate = {
  id: string;
  session_id: string;
  stack_minor: number;
  addon_minor: number;
  at: Timestamp;
};

export type SessionShortcut = {
  id: string;
  label: string;
  preset: Partial<
    Pick<
      PokerSession,
      | "format"
      | "is_live"
      | "game"
      | "stakes_sb_minor"
      | "stakes_bb_minor"
      | "straddle_minor"
      | "buy_in_minor"
      | "fees_minor"
      | "currency"
      | "bankroll_id"
      | "venue_id"
    >
  >;
  sort_order: number;
  created_at: Timestamp;
  updated_at: Timestamp;
};

export type HabitUnit = "count" | "minutes" | "boolean";
export type Habit = Row & {
  kind: "preset" | "custom";
  key: string | null;
  name: string;
  target_value: number;
  unit: HabitUnit;
  /** ISO weekdays, 1 = Monday … 7 = Sunday */
  days_of_week: number[];
  sort_order: number;
  active: boolean;
};

export type HabitLog = {
  id: string;
  habit_id: string;
  date: ISODate;
  value: number;
  source: "manual" | "auto";
  updated_at: Timestamp;
};

export type StudyCategory =
  "solver" | "course" | "ranges" | "hand_review" | "group" | "coaching" | "other";
export type StudySession = {
  id: string;
  started_at: Timestamp;
  minutes: number;
  category: StudyCategory;
  note: string | null;
  created_at: Timestamp;
};

export type GoalType = "profit" | "bankroll" | "stake" | "volume" | "study" | "reviews" | "custom";
export type GoalUnit = "minor" | "hours" | "sessions" | "minutes" | "hands" | "count";
export type Goal = Row & {
  type: GoalType;
  title: string;
  target_value: number;
  start_value: number;
  /** For manual goals (stake, custom): progress the user enters. */
  manual_value: number | null;
  currency: string | null;
  unit: GoalUnit;
  starts_at: Timestamp;
  deadline: ISODate | null;
  is_main: boolean;
  status: "active" | "achieved" | "archived";
  achieved_at: Timestamp | null;
};

/* ---------- Hands (Phase 2) ---------- */

export type ReviewStatus = "unreviewed" | "reviewed" | "lesson";
export type RuleCategory =
  | "preflop"
  | "flop"
  | "turn"
  | "river"
  | "exploitative"
  | "multiway"
  | "mental"
  | "bankroll"
  | "other";

/** Answers to the guided review template (labels live in content/review.ts). */
export type HandReview = {
  answers: Record<string, string>;
  rule: { category: RuleCategory; text: string; rule_id: string | null } | null;
  reviewed_at: Timestamp;
};

export type Hand = Row & {
  session_id: string | null;
  source: "import" | "manual" | "quick_note";
  site: string | null;
  external_hand_id: string | null;
  played_at: Timestamp;
  game: string;
  stakes: string | null;
  hero_position: string | null;
  hero_cards: string | null;
  /** Normalised hand (see lib/poker/hand-types). Null for quick notes. */
  ohh: import("@/lib/poker/hand-types").HandHistory | null;
  quick_note: string | null;
  net_minor: number | null;
  currency: string | null;
  net_bb: number | null;
  pot_bb: number | null;
  auto_tags: string[];
  user_tags: string[];
  starred: boolean;
  review_status: ReviewStatus;
  review: HandReview | null;
  share_slug: string | null;
  is_public: boolean;
  /** Custom sections this hand is in. */
  collection_ids: string[];
  /** Opponents in this hand (player database). */
  opponent_ids?: string[];
};

export type OpponentStyle =
  | "unknown"
  | "tight_passive"
  | "tight_aggressive"
  | "loose_passive"
  | "loose_aggressive"
  | "maniac"
  | "rock"
  | "calling_station";

/** A tendency you've observed, with how many hands back it up (fact vs assumption). */
export type Trait = { level: "low" | "medium" | "high"; evidence: number };

export type Opponent = Row & {
  nickname: string;
  venue_id: string | null;
  description: string | null;
  tags: string[];
  notes: string | null;
  style: OpponentStyle | null;
  traits: Record<string, Trait>;
  avatar: string | null;
};

export type HandCollection = Row & { name: string; emoji: string | null; sort_order: number };

export type Rule = Row & {
  category: RuleCategory;
  text: string;
  status: "working" | "fixed";
  times_seen: number;
  last_surfaced_at: Timestamp | null;
  hand_ids: string[];
};

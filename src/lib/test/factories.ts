import type { PokerSession } from "@/lib/domain/types";

let n = 0;
/** Finished live $1/$2 cash session by default; override what the test cares about. */
export function makeSession(over: Partial<PokerSession> & { hours?: number } = {}): PokerSession {
  const { hours = 4, ...rest } = over;
  const started_at = rest.started_at ?? "2026-11-02T18:00:00Z";
  const ended_at =
    rest.ended_at ?? new Date(Date.parse(started_at) + hours * 3_600_000).toISOString();
  n++;
  return {
    id: `s${n}`,
    created_at: started_at,
    updated_at: started_at,
    bankroll_id: "br1",
    venue_id: null,
    format: "cash",
    is_live: true,
    game: "NLHE",
    stakes_sb_minor: 100,
    stakes_bb_minor: 200,
    straddle_minor: null,
    buy_in_minor: 0,
    rebuys_minor: 0,
    cash_out_minor: 0,
    prize_minor: 0,
    bounties_minor: 0,
    fees_minor: 0,
    tips_minor: 0,
    expenses: [],
    currency: "USD",
    fx_rate: null,
    paused_ms: 0,
    hands_played: null,
    finish_position: null,
    field_size: null,
    focus_rating: null,
    tilt_rating: null,
    energy_rating: null,
    sleep_rating: null,
    game_rating: null,
    focus_point: null,
    followed_focus: null,
    stop_loss_minor: null,
    max_length_min: null,
    takeaway: null,
    notes: null,
    tags: [],
    status: "finished",
    ...rest,
    started_at,
    ended_at: rest.status === "running" ? null : ended_at,
  };
}

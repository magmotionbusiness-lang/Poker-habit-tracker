import type { PokerSession } from "@/lib/domain/types";
import { localHour } from "@/lib/dates/dates";
import { sessionDurationMs, sessionResult, stakesLabel } from "@/lib/stats/session-math";

/**
 * "Don't tilt" signals for a running session: neutral, analytical notes when the session
 * drifts outside the player's own normal pattern. Never "YOU ARE TILTING".
 */
export type TiltSignal = { id: string; text: string };

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) / 2)]!;
};

export function tiltSignals(
  s: PokerSession,
  history: readonly PokerSession[],
  now: number,
  tz: string,
  stack: number | null,
  fmtDuration: (ms: number) => string,
): TiltSignal[] {
  const out: TiltSignal[] = [];
  const past = history.filter((h) => h.status === "finished" && h.id !== s.id).slice(-40);

  // Re-buys: total invested vs the first buy-in.
  if (s.format === "cash" && s.buy_in_minor > 0) {
    const buyIns = Math.round((s.buy_in_minor + s.rebuys_minor) / s.buy_in_minor);
    if (buyIns >= 3)
      out.push({ id: "rebuys", text: `You've bought in ${buyIns} times this session.` });
  }

  // Length vs your normal.
  const normal = median(past.map((p) => sessionDurationMs(p)));
  const dur = sessionDurationMs(s, now);
  if (normal && past.length >= 5 && dur > Math.max(normal * 1.5, normal + 90 * 60_000))
    out.push({
      id: "length",
      text: `Your normal session is ${fmtDuration(normal)}. You're at ${fmtDuration(dur)}.`,
    });

  // Late night.
  const hour = localHour(now, tz);
  if (hour >= 1 && hour < 6)
    out.push({
      id: "late",
      text: "It's late. Decisions after a long day are harder for everyone.",
    });

  // Stake above your usual.
  const usual = median(
    past.filter((p) => p.format === "cash" && p.stakes_bb_minor).map((p) => p.stakes_bb_minor!),
  );
  if (usual && s.stakes_bb_minor && s.stakes_bb_minor >= usual * 1.5 && past.length >= 5)
    out.push({
      id: "stake",
      text: `This is above your usual stake (${stakesLabel({ ...s, stakes_bb_minor: usual, stakes_sb_minor: Math.round(usual / 2) })}).`,
    });

  // Down 3+ buy-ins.
  if (stack !== null && s.format === "cash" && s.buy_in_minor > 0) {
    const down = s.buy_in_minor + s.rebuys_minor - stack;
    if (down >= s.buy_in_minor * 3)
      out.push({ id: "down", text: `You're down ${Math.floor(down / s.buy_in_minor)} buy-ins.` });
  }

  // Losing session followed by moving up (escalation).
  const last = [...past].sort((a, b) => (a.started_at < b.started_at ? 1 : -1))[0];
  if (
    last &&
    sessionResult(last) < 0 &&
    s.stakes_bb_minor &&
    last.stakes_bb_minor &&
    s.stakes_bb_minor > last.stakes_bb_minor &&
    now - Date.parse(last.ended_at ?? last.started_at) < 24 * 3_600_000
  )
    out.push({ id: "escalation", text: "You moved up a stake right after a losing session." });

  return out;
}

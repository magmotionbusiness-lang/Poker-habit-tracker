import type { Card } from "./cards";
import { evaluate, handName, type HandValue } from "./evaluator";
import { STREETS, type HandAction, type HandHistory, type Street } from "./hand-types";
import { blindSeats, seatPositions, seatsFromButton } from "./positions";

/**
 * Pure no-limit/pot-limit betting engine. `replay(hand, n)` rebuilds the table after the
 * first n actions — used by manual entry (who acts next, what's legal), the animated
 * replayer and the result calculation. Nothing here mutates its inputs.
 */

export type SeatState = {
  seat: number;
  name: string;
  position: string;
  isHero: boolean;
  stack: number; // behind
  committed: number; // live money in front of the player this street
  contributed: number; // total put in this hand (incl. antes)
  folded: boolean;
  allIn: boolean;
  cards: Card[] | null;
  lastAction: HandAction | null;
};

export type TableState = {
  street: Street;
  /** Board cards visible at this point. */
  board: Card[];
  /** Money already collected into the middle (previous streets + antes). */
  pot: number;
  seats: SeatState[];
  toAct: number | null;
  maxBet: number;
  lastRaise: number;
  /** Seats that still need to act this street. */
  pending: number[];
  /** Number of actions applied (posts included). */
  applied: number;
  handOver: boolean;
  showdown: boolean;
  lastActor: number | null;
  /** Index into `actions` of the last applied action (for highlighting), -1 if none. */
  lastIndex: number;
};

const BOARD_SIZE: Record<Street, number> = { preflop: 0, flop: 3, turn: 4, river: 5 };

/** Blinds, antes, straddle and bomb-pot antes for a fresh hand. */
export function postingActions(
  h: Pick<HandHistory, "players" | "button" | "sb" | "bb" | "ante" | "straddle" | "bomb_pot">,
): HandAction[] {
  const seats = h.players.map((p) => p.seat);
  const order = seatsFromButton(seats, h.button);
  const out: HandAction[] = [];
  if (h.bomb_pot > 0) {
    for (const s of order)
      out.push({ seat: s, street: "preflop", type: "post", post: "ante", to: h.bomb_pot });
    return out;
  }
  if (h.ante > 0)
    for (const s of order)
      out.push({ seat: s, street: "preflop", type: "post", post: "ante", to: h.ante });
  const { sb, bb } = blindSeats(seats, h.button);
  if (h.sb > 0) out.push({ seat: sb, street: "preflop", type: "post", post: "sb", to: h.sb });
  out.push({ seat: bb, street: "preflop", type: "post", post: "bb", to: h.bb });
  if (h.straddle > 0 && order.length > 2) {
    const utg = order[(order.indexOf(bb) + 1) % order.length]!;
    out.push({ seat: utg, street: "preflop", type: "post", post: "straddle", to: h.straddle });
  }
  return out;
}

function nextFrom(
  order: readonly number[],
  from: number,
  candidates: ReadonlySet<number>,
): number | null {
  const i = order.indexOf(from);
  for (let k = 1; k <= order.length; k++) {
    const s = order[(i + k) % order.length]!;
    if (candidates.has(s)) return s;
  }
  return null;
}

export function replay(h: HandHistory, upTo = h.actions.length): TableState {
  const order = [...h.players.map((p) => p.seat)].sort((a, b) => a - b);
  const positions = seatPositions(order, h.button);
  const seats = new Map<number, SeatState>(
    h.players.map((p) => [
      p.seat,
      {
        seat: p.seat,
        name: p.name,
        position: positions.get(p.seat) ?? "",
        isHero: p.seat === h.hero,
        stack: p.stack,
        committed: 0,
        contributed: 0,
        folded: false,
        allIn: false,
        cards: p.cards,
        lastAction: null,
      },
    ]),
  );
  let street: Street = h.bomb_pot > 0 ? "flop" : "preflop";
  let pot = 0;
  let maxBet = 0;
  let lastRaise = h.bb;
  let pending = new Set<number>();
  let lastActor: number | null = null;
  let roundStarted = false;
  let handOver = false;
  let showdown = false;
  let lastIndex = -1;
  const { bb: bbSeat } = blindSeats(order, h.button);

  const live = () => [...seats.values()].filter((s) => !s.folded);
  const canAct = () =>
    new Set(
      live()
        .filter((s) => !s.allIn)
        .map((s) => s.seat),
    );

  const startRound = () => {
    roundStarted = true;
    pending = canAct();
    if (street === "preflop") {
      // Action starts left of the big blind (or of the straddle).
      const straddler = h.actions.find((a) => a.post === "straddle")?.seat;
      lastActor = straddler ?? bbSeat;
    } else lastActor = h.button;
    // One player left who can act and nobody to call → nothing to do.
    if (pending.size === 1) {
      const only = [...pending][0]!;
      if (seats.get(only)!.committed >= maxBet) pending.clear();
    }
  };

  const collect = () => {
    for (const s of seats.values()) {
      pot += s.committed;
      s.committed = 0;
    }
    maxBet = 0;
    lastRaise = h.bb;
  };

  const endRoundIfDone = () => {
    if (live().length <= 1) {
      collect();
      handOver = true;
      return;
    }
    if (pending.size > 0) return;
    collect();
    const actors = canAct();
    if (street === "river" || actors.size <= 1) {
      // Showdown (with any remaining board run out).
      street = "river";
      handOver = true;
      showdown = true;
      return;
    }
    street = STREETS[STREETS.indexOf(street) + 1]!;
    startRound();
  };

  const commit = (s: SeatState, to: number) => {
    const add = Math.max(0, Math.min(to - s.committed, s.stack));
    s.stack -= add;
    s.committed += add;
    s.contributed += add;
    if (s.stack === 0) s.allIn = true;
  };

  const n = Math.min(upTo, h.actions.length);
  for (let i = 0; i < n; i++) {
    const a = h.actions[i]!;
    const s = seats.get(a.seat);
    if (!s || handOver) continue;
    lastIndex = i;
    s.lastAction = a;

    if (a.type === "post") {
      const amt = a.to ?? 0;
      if (a.post === "ante") {
        const add = Math.min(amt, s.stack);
        s.stack -= add;
        s.contributed += add;
        pot += add;
        if (s.stack === 0) s.allIn = true;
      } else {
        commit(s, amt);
        if (s.committed > maxBet) {
          lastRaise = Math.max(h.bb, s.committed - maxBet);
          maxBet = s.committed;
        }
      }
      continue;
    }

    if (!roundStarted) startRound();
    // A street change in the data closes the previous round (tolerant replay of imports).
    if (a.street !== street && STREETS.indexOf(a.street) > STREETS.indexOf(street)) {
      pending.clear();
      endRoundIfDone();
      if (handOver) break;
    }

    switch (a.type) {
      case "fold":
        s.folded = true;
        pending.delete(s.seat);
        break;
      case "check":
        pending.delete(s.seat);
        break;
      case "call":
        commit(s, maxBet);
        pending.delete(s.seat);
        break;
      case "bet":
      case "raise": {
        const to = Math.max(a.to ?? 0, s.committed);
        commit(s, to);
        const raise = s.committed - maxBet;
        if (raise > 0) {
          if (raise >= lastRaise) lastRaise = raise;
          maxBet = s.committed;
          pending = canAct();
        }
        pending.delete(s.seat);
        break;
      }
    }
    lastActor = s.seat;
    endRoundIfDone();
  }

  // After only the posts, the first betting round is ready.
  if (!roundStarted && !handOver) startRound();

  const toAct =
    handOver || pending.size === 0 || lastActor === null
      ? null
      : nextFrom(order, lastActor, pending);
  const visible = showdown ? h.board.slice(0, 5) : h.board.slice(0, BOARD_SIZE[street]);

  return {
    street,
    board: visible,
    pot,
    seats: order.map((seat) => seats.get(seat)!),
    toAct,
    maxBet,
    lastRaise,
    pending: [...pending],
    applied: n,
    handOver,
    showdown,
    lastActor,
    lastIndex,
  };
}

/* ---------- What the player to act may do ---------- */

export type Legal = {
  seat: number;
  toCall: number;
  canCheck: boolean;
  canFold: boolean;
  /** "bet" when nobody has bet this street, otherwise "raise". */
  aggressive: "bet" | "raise" | null;
  minTo: number;
  maxTo: number;
  callTo: number;
};

export function legalActions(t: TableState): Legal | null {
  if (t.toAct === null) return null;
  const s = t.seats.find((x) => x.seat === t.toAct)!;
  const toCall = Math.max(0, t.maxBet - s.committed);
  const maxTo = s.committed + s.stack;
  const minRaiseTo = t.maxBet === 0 ? t.lastRaise : t.maxBet + t.lastRaise;
  const othersCanRespond = t.seats.some((o) => o.seat !== s.seat && !o.folded && !o.allIn);
  return {
    seat: s.seat,
    toCall: Math.min(toCall, s.stack),
    canCheck: toCall === 0,
    canFold: toCall > 0,
    aggressive: maxTo > t.maxBet && othersCanRespond ? (t.maxBet === 0 ? "bet" : "raise") : null,
    minTo: Math.min(minRaiseTo, maxTo),
    maxTo,
    callTo: Math.min(t.maxBet, maxTo),
  };
}

/** Total in the middle including live bets. */
export function totalPot(t: TableState): number {
  return t.pot + t.seats.reduce((a, s) => a + s.committed, 0);
}

export type SizePreset = { label: string; to: number };

/** Bet-size chips: ⅓ ½ ⅔ pot for bets; 2.5x 3x pot for raises; always all-in. */
export function sizePresets(
  t: TableState,
  h: Pick<HandHistory, "bb" | "sb" | "game">,
): SizePreset[] {
  const legal = legalActions(t);
  if (!legal?.aggressive) return [];
  const s = t.seats.find((x) => x.seat === legal.seat)!;
  const pot = totalPot(t);
  const chip = h.bb >= 100 ? 100 : Math.max(1, h.sb || 1);
  const round = (v: number) => Math.max(chip, Math.round(v / chip) * chip);
  const raw: SizePreset[] =
    legal.aggressive === "bet"
      ? [
          { label: "⅓", to: round(pot / 3) },
          { label: "½", to: round(pot / 2) },
          { label: "⅔", to: round((pot * 2) / 3) },
          { label: "¾", to: round((pot * 3) / 4) },
          { label: "Pot", to: round(pot) },
        ]
      : [
          { label: "2.5x", to: round(t.maxBet * 2.5) },
          { label: "3x", to: round(t.maxBet * 3) },
          { label: "Pot", to: round(t.maxBet + pot + (t.maxBet - s.committed)) },
        ];
  const potLimit = h.game.startsWith("PLO");
  const potMax = t.maxBet + pot + (t.maxBet - s.committed);
  const cap = potLimit ? Math.min(legal.maxTo, potMax) : legal.maxTo;
  const out = raw.filter((p) => p.to >= legal.minTo && p.to < cap);
  out.push({ label: potLimit && cap < legal.maxTo ? "Pot (max)" : "All-in", to: cap });
  // De-duplicate identical amounts, keeping the first label.
  return out.filter((p, i) => out.findIndex((q) => q.to === p.to) === i);
}

/** Append an action, normalising bet/raise labels and capping to the stack. */
export function act(
  h: HandHistory,
  type: "fold" | "check" | "call" | "bet" | "raise",
  to?: number,
): HandHistory {
  const t = replay(h);
  const legal = legalActions(t);
  if (!legal) throw new Error("Nobody is left to act");
  let action: HandAction;
  switch (type) {
    case "fold":
      action = { seat: legal.seat, street: t.street, type: legal.canCheck ? "check" : "fold" };
      break;
    case "check":
      if (!legal.canCheck) throw new Error("Can't check facing a bet");
      action = { seat: legal.seat, street: t.street, type: "check" };
      break;
    case "call":
      action = legal.canCheck
        ? { seat: legal.seat, street: t.street, type: "check" }
        : { seat: legal.seat, street: t.street, type: "call", to: legal.callTo };
      break;
    default: {
      if (!legal.aggressive) throw new Error("No raise possible here");
      const amount = Math.min(Math.max(to ?? legal.minTo, legal.minTo), legal.maxTo);
      action = { seat: legal.seat, street: t.street, type: legal.aggressive, to: amount };
    }
  }
  return { ...h, actions: [...h.actions, action] };
}

/** Fold every player in turn until it's `seat`'s decision (the "folds to hero" shortcut). */
export function foldTo(h: HandHistory, seat: number): HandHistory {
  let cur = h;
  for (let guard = 0; guard < 12; guard++) {
    const t = replay(cur);
    if (t.toAct === null || t.toAct === seat) return cur;
    cur = act(cur, "fold");
  }
  return cur;
}

/* ---------- Results ---------- */

export type Pot = { amount: number; eligible: number[]; winners: number[] };
export type Settlement = {
  pots: Pot[];
  payouts: Record<number, number>;
  contributed: Record<number, number>;
  net: Record<number, number>;
  /** False when the winner can't be determined (unknown cards and no manual result). */
  resolved: boolean;
  showdown: boolean;
  values: Record<number, { value: HandValue; name: string }>;
  refund: { seat: number; amount: number } | null;
};

export function settle(h: HandHistory): Settlement {
  const t = replay(h);
  const order = t.seats.map((s) => s.seat);
  const contributed: Record<number, number> = Object.fromEntries(
    t.seats.map((s) => [s.seat, s.contributed]),
  );
  const live = t.seats.filter((s) => !s.folded).map((s) => s.seat);

  // Uncalled bet: the top contributor gets back what nobody matched.
  let refund: Settlement["refund"] = null;
  const sorted = [...t.seats].sort((a, b) => b.contributed - a.contributed);
  if (sorted.length > 1 && sorted[0]!.contributed > sorted[1]!.contributed) {
    const amount = sorted[0]!.contributed - sorted[1]!.contributed;
    contributed[sorted[0]!.seat]! -= amount;
    refund = { seat: sorted[0]!.seat, amount };
  }

  // Side pots by contribution level of players still in.
  const levels = [...new Set(live.map((s) => contributed[s]!))].sort((a, b) => a - b);
  const pots: Pot[] = [];
  let prev = 0;
  for (const level of levels) {
    const amount = order.reduce(
      (acc, s) => acc + Math.max(0, Math.min(contributed[s]!, level) - prev),
      0,
    );
    if (amount > 0)
      pots.push({ amount, eligible: live.filter((s) => contributed[s]! >= level), winners: [] });
    prev = level;
  }
  const assigned = pots.reduce((a, p) => a + p.amount, 0);
  const total = order.reduce((a, s) => a + contributed[s]!, 0);
  if (pots.length && total > assigned) pots[pots.length - 1]!.amount += total - assigned;
  if (pots.length && h.rake > 0) pots[0]!.amount -= Math.min(h.rake, pots[0]!.amount);

  const values: Settlement["values"] = {};
  const boardComplete = h.board.length === 5;
  const cardsNeeded = h.game === "PLO5" ? 5 : h.game === "PLO" ? 4 : 2;
  const known = (seat: number) => {
    const p = h.players.find((x) => x.seat === seat);
    return p?.cards && p.cards.length === cardsNeeded ? p.cards : null;
  };
  const bestOf = (eligible: number[], board: Card[]): number[] | null => {
    if (board.length !== 5 || eligible.some((s) => !known(s))) return null;
    const scored = eligible.map((s) => ({ s, v: evaluate(h.game, known(s)!, board) }));
    const top = Math.max(...scored.map((x) => x.v.score));
    return scored.filter((x) => x.v.score === top).map((x) => x.s);
  };
  if (t.showdown && boardComplete) {
    for (const s of live) {
      const c = known(s);
      if (c) {
        const v = evaluate(h.game, c, h.board);
        values[s] = { value: v, name: handName(v) };
      }
    }
  }

  let resolved = true;
  const payouts: Record<number, number> = Object.fromEntries(order.map((s) => [s, 0]));
  const pay = (winners: number[], amount: number) => {
    const ordered = seatsFromButton(order, h.button)
      .slice(1)
      .concat(h.button)
      .filter((s) => winners.includes(s));
    const share = Math.floor(amount / ordered.length);
    let rest = amount - share * ordered.length;
    for (const s of ordered) {
      payouts[s]! += share + (rest > 0 ? 1 : 0);
      if (rest > 0) rest--;
    }
  };

  for (const pot of pots) {
    if (pot.eligible.length === 1) {
      pot.winners = pot.eligible;
      pay(pot.winners, pot.amount);
      continue;
    }
    const runs = h.board2 && boardComplete ? [h.board, h.board2] : [h.board];
    const results = runs.map((b) => bestOf(pot.eligible, b));
    if (results.every((r) => r !== null)) {
      const half = Math.ceil(pot.amount / runs.length);
      results.forEach((winners, i) => pay(winners!, i === 0 ? half : pot.amount - half));
      pot.winners = [...new Set(results.flat() as number[])];
      continue;
    }
    const manual = (h.winners ?? []).filter((s) => pot.eligible.includes(s));
    if (manual.length) {
      pot.winners = manual;
      pay(manual, pot.amount);
    } else resolved = false;
  }

  const net: Record<number, number> = Object.fromEntries(
    order.map((s) => [s, payouts[s]! - contributed[s]!]),
  );
  return { pots, payouts, contributed, net, resolved, showdown: t.showdown, values, refund };
}

/* ---------- Decision maths for the replayer ---------- */

export type DecisionInfo = {
  toCall: number;
  potOdds: number | null;
  spr: number | null;
  effective: number;
};

/** Pot odds (share of the final pot you must put in) and SPR for the player to act. */
export function decisionInfo(t: TableState): DecisionInfo | null {
  if (t.toAct === null) return null;
  const s = t.seats.find((x) => x.seat === t.toAct)!;
  const toCall = Math.min(Math.max(0, t.maxBet - s.committed), s.stack);
  const pot = totalPot(t);
  const opponents = t.seats.filter((o) => o.seat !== s.seat && !o.folded);
  const effective = Math.min(
    s.stack + s.committed,
    Math.max(0, ...opponents.map((o) => o.stack + o.committed)),
  );
  return {
    toCall,
    potOdds: toCall > 0 ? toCall / (pot + toCall) : null,
    spr: t.street !== "preflop" && pot > 0 ? Math.round((effective / pot) * 10) / 10 : null,
    effective,
  };
}

/** Street boundaries in the action list (for the scrub bar). */
export function streetMarkers(h: HandHistory): Array<{ street: Street; index: number }> {
  const out: Array<{ street: Street; index: number }> = [];
  let firstBetting = h.actions.findIndex((a) => a.type !== "post");
  if (firstBetting < 0) firstBetting = h.actions.length;
  out.push({ street: h.bomb_pot > 0 ? "flop" : "preflop", index: firstBetting });
  // First action of each later street (the engine moves streets as soon as a round closes).
  h.actions.forEach((a, i) => {
    if (a.type !== "post" && !out.some((m) => m.street === a.street))
      out.push({ street: a.street, index: i });
  });
  return out;
}

export { seatPositions };

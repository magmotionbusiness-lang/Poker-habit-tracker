import type { Card } from "./cards";
import { postingActions } from "./engine";
import type { Game, HandHistory, HandPlayer } from "./hand-types";
import { buttonForPosition, seatPositions } from "./positions";

export type SetupInput = {
  game: Game;
  currency: string;
  sb: number;
  bb: number;
  ante: number;
  straddle: number;
  bombPot?: number;
  tableSize: number;
  heroPosition: string;
  /** Default stack for everyone, in big blinds. */
  stackBb: number;
  heroCards: Card[];
  /** Per-seat overrides (name, stack, known cards). */
  players?: Partial<Record<number, Partial<Pick<HandPlayer, "name" | "stack" | "cards">>>>;
};

/** The hero always takes seat 1; the button moves so the hero gets the chosen position. */
export const HERO_SEAT = 1;

export function buildHand(s: SetupInput): HandHistory {
  const seats = Array.from({ length: s.tableSize }, (_, i) => i + 1);
  const button = buttonForPosition(seats, HERO_SEAT, s.heroPosition);
  const positions = seatPositions(seats, button);
  const players: HandPlayer[] = seats.map((seat) => {
    const o = s.players?.[seat] ?? {};
    return {
      seat,
      name: o.name ?? (seat === HERO_SEAT ? "Hero" : positions.get(seat)!),
      stack: o.stack ?? s.stackBb * s.bb,
      cards: seat === HERO_SEAT ? s.heroCards : (o.cards ?? null),
    };
  });
  const base: HandHistory = {
    v: 1,
    game: s.game,
    currency: s.currency,
    sb: s.sb,
    bb: s.bb,
    ante: s.ante,
    straddle: s.straddle,
    bomb_pot: s.bombPot ?? 0,
    table_size: s.tableSize,
    button,
    hero: HERO_SEAT,
    players,
    actions: [],
    board: [],
    board2: null,
    winners: null,
    rake: 0,
  };
  return { ...base, actions: postingActions(base) };
}

/** Remove the last voluntary action (posts stay). Clears a manual result too. */
export function undoLast(h: HandHistory): HandHistory {
  const last = h.actions.findLastIndex((a) => a.type !== "post");
  if (last < 0) return h;
  return { ...h, actions: h.actions.slice(0, last), winners: null };
}

/** Change a seat's starting stack after setup (keeps the action list). */
export function setPlayer(
  h: HandHistory,
  seat: number,
  patch: Partial<Pick<HandPlayer, "name" | "stack" | "cards">>,
): HandHistory {
  return { ...h, players: h.players.map((p) => (p.seat === seat ? { ...p, ...patch } : p)) };
}

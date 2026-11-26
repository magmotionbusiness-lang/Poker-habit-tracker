import { parseCards } from "./cards";
import { postingActions } from "./engine";
import type { HandHistory } from "./hand-types";

/** A fresh hand at a table: seats 1..n, everyone with `stack`, posts already applied. */
export function newHand(
  over: Partial<HandHistory> & { n?: number; stack?: number } = {},
): HandHistory {
  const { n = 6, stack = 20_000, ...rest } = over;
  const players = Array.from({ length: n }, (_, i) => ({
    seat: i + 1,
    name: `P${i + 1}`,
    stack,
    cards: null,
  }));
  const base: HandHistory = {
    v: 1,
    game: "NLHE",
    currency: "USD",
    sb: 100,
    bb: 200,
    ante: 0,
    straddle: 0,
    bomb_pot: 0,
    table_size: n,
    button: 1,
    hero: 1,
    players,
    actions: [],
    board: [],
    board2: null,
    winners: null,
    rake: 0,
    ...rest,
  };
  return { ...base, actions: rest.actions ?? postingActions(base) };
}

export const cards = parseCards;

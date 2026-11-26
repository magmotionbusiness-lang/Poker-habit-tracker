import { z } from "zod";
import { isCard, type Card } from "./cards";

/**
 * Stakers hand format — a compact, normalised shape modelled on Open Hand History (OHH).
 * Manual entry, imports and the replayer all speak it. Amounts are integer minor units of
 * `currency`; bet/raise/call/post amounts are `to` = the player's total for that street
 * after the action (antes are dead money and don't count toward the street total).
 */
export const STREETS = ["preflop", "flop", "turn", "river"] as const;
export type Street = (typeof STREETS)[number];
export type ActionType = "post" | "fold" | "check" | "call" | "bet" | "raise";
export type PostKind = "sb" | "bb" | "ante" | "straddle";
export type Game = "NLHE" | "PLO" | "PLO5";

export type HandAction = {
  seat: number;
  street: Street;
  type: ActionType;
  to?: number;
  post?: PostKind;
};

export type HandPlayer = {
  seat: number;
  name: string;
  stack: number;
  /** Known hole cards (always for hero; villains only if shown). */
  cards: Card[] | null;
};

export type HandHistory = {
  v: 1;
  game: Game;
  currency: string;
  sb: number;
  bb: number;
  ante: number;
  straddle: number;
  /** Bomb pot: everyone antes this amount and the hand starts on the flop (0 = none). */
  bomb_pot: number;
  table_size: number;
  button: number;
  hero: number;
  players: HandPlayer[];
  actions: HandAction[];
  board: Card[];
  /** Second run-out when players run it twice (full 5-card board, sharing the cards dealt before the all-in). */
  board2: Card[] | null;
  /** Manual result when the showdown can't be computed (villain cards unknown). */
  winners: number[] | null;
  rake: number;
};

export const holeCardCount = (game: Game) => (game === "PLO5" ? 5 : game === "PLO" ? 4 : 2);

const card = z.string().refine(isCard, "Invalid card");
const amount = z.number().int().nonnegative().safe();

export const handHistorySchema = z
  .object({
    v: z.literal(1),
    game: z.enum(["NLHE", "PLO", "PLO5"]),
    currency: z.string().regex(/^[A-Z]{3}$/),
    sb: amount,
    bb: amount.positive(),
    ante: amount,
    straddle: amount,
    bomb_pot: amount,
    table_size: z.number().int().min(2).max(10),
    button: z.number().int().min(1),
    hero: z.number().int().min(1),
    players: z
      .array(
        z.object({
          seat: z.number().int().min(1).max(10),
          name: z.string().max(40),
          stack: amount,
          cards: z.array(card).nullable(),
        }),
      )
      .min(2)
      .max(10),
    actions: z.array(
      z.object({
        seat: z.number().int(),
        street: z.enum(STREETS),
        type: z.enum(["post", "fold", "check", "call", "bet", "raise"]),
        to: amount.optional(),
        post: z.enum(["sb", "bb", "ante", "straddle"]).optional(),
      }),
    ),
    board: z.array(card).max(5),
    board2: z.array(card).length(5).nullable(),
    winners: z.array(z.number().int()).nullable(),
    rake: amount,
  })
  .refine((h) => h.players.some((p) => p.seat === h.hero), "Hero must be seated")
  .refine((h) => h.players.some((p) => p.seat === h.button), "Button must be a seated player")
  .refine((h) => new Set(h.players.map((p) => p.seat)).size === h.players.length, "Duplicate seats")
  .refine((h) => {
    const all = [...h.board, ...h.players.flatMap((p) => p.cards ?? [])];
    return new Set(all).size === all.length;
  }, "The same card appears twice");

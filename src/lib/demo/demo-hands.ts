import type { Hand, HandCollection, PokerSession, Rule, RuleCategory } from "@/lib/domain/types";
import { buildHandRow } from "@/lib/hands/row";
import { DECK, shuffled, type Card } from "@/lib/poker/cards";
import { act, legalActions, replay, sizePresets } from "@/lib/poker/engine";
import type { HandHistory } from "@/lib/poker/hand-types";
import { positionNames } from "@/lib/poker/positions";
import { buildHand } from "@/lib/poker/setup";

const BOARD = { preflop: 0, flop: 3, turn: 4, river: 5 } as const;

const RULES: Array<{ category: RuleCategory; text: string }> = [
  { category: "river", text: "Don't call a river raise from a reg without a very strong hand." },
  { category: "preflop", text: "Stop flatting 3-bets out of position with suited gappers." },
  {
    category: "multiway",
    text: "Multiway, bet for value only — no c-bet bluffs into three players.",
  },
  { category: "mental", text: "After a cooler, take a lap before playing the next hand." },
  { category: "flop", text: "On paired boards as the caller, check-raise less, call more." },
];
const ANSWERS: Array<Record<string, string>> = [
  {
    preflop: "Standard open from position.",
    flop: "Range advantage, small c-bet.",
    opponent: "Loose-passive station.",
    mental: "Focused.",
  },
  {
    preflop: "Too loose a call OOP.",
    turn_river: "Lost the plot on the turn.",
    opponent: "Tight reg.",
    mental: "A bit tired.",
  },
];

/**
 * Plays legal, varied hands through the real engine: 2–3 players see each pot, everyone
 * else folds, bet sizes come from the same presets the app offers, and villain cards are
 * shown at showdown so every result is computed (no guessing).
 */
export function generateDemoHands(
  sessions: readonly PokerSession[],
  random: () => number,
  newId: () => string,
  count = 60,
): { hands: Hand[]; collections: HandCollection[]; rules: Rule[] } {
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(random() * xs.length)]!;
  const finished = sessions.filter((s) => s.status === "finished" && s.ended_at);
  const hands: Hand[] = [];

  for (let i = 0; i < count && finished.length; i++) {
    const session = finished[Math.floor((i / count) * finished.length)]!;
    const deck = shuffled(DECK, random);
    const tableSize = 9;
    const heroPosition = pick(positionNames(tableSize));
    let h: HandHistory = buildHand({
      game: "NLHE",
      currency: session.currency,
      sb: session.stakes_sb_minor ?? 100,
      bb: session.stakes_bb_minor ?? 200,
      ante: 0,
      straddle: 0,
      tableSize,
      heroPosition,
      stackBb: 100 + Math.floor(random() * 150),
      heroCards: deck.splice(0, 2),
    });
    const others = h.players.map((p) => p.seat).filter((s) => s !== h.hero);
    const villains = new Set(shuffled(others, random).slice(0, random() < 0.25 ? 2 : 1));
    const raisesThisStreet = new Map<string, number>();

    for (let guard = 0; guard < 120; guard++) {
      const t = replay(h);
      if (h.board.length < BOARD[t.street] || (t.showdown && h.board.length < 5)) {
        h = {
          ...h,
          board: [
            ...h.board,
            ...deck.splice(0, (t.showdown ? 5 : BOARD[t.street]) - h.board.length),
          ],
        };
        continue;
      }
      if (t.handOver) break;
      const legal = legalActions(t)!;
      const inHand = legal.seat === h.hero || villains.has(legal.seat);
      if (!inHand) {
        h = act(h, legal.canCheck ? "check" : "fold");
        continue;
      }
      const raises = raisesThisStreet.get(t.street) ?? 0;
      const r = random();
      const isHero = legal.seat === h.hero;
      if (legal.canCheck) {
        if (r < 0.5 || !legal.aggressive) h = act(h, "check");
        else {
          const sizes = sizePresets(t, h).filter((p) => !p.label.startsWith("All"));
          h = act(h, legal.aggressive, (sizes.length ? pick(sizes) : sizePresets(t, h).at(-1)!).to);
          raisesThisStreet.set(t.street, raises + 1);
        }
      } else {
        const foldP = t.street === "preflop" ? (isHero ? 0.05 : 0.15) : 0.3;
        if (r < foldP) h = act(h, "fold");
        else if (r < 0.82 || raises >= 2 || !legal.aggressive) h = act(h, "call");
        else {
          const sizes = sizePresets(t, h);
          h = act(
            h,
            legal.aggressive,
            pick(sizes.slice(0, 2).length ? sizes.slice(0, 2) : sizes).to,
          );
          raisesThisStreet.set(t.street, raises + 1);
        }
      }
    }

    const end = replay(h);
    if (end.showdown) {
      h = {
        ...h,
        players: h.players.map((p) =>
          p.seat !== h.hero && !end.seats.find((s) => s.seat === p.seat)!.folded
            ? { ...p, cards: deck.splice(0, 2) as Card[] }
            : p,
        ),
      };
    }
    const span = Date.parse(session.ended_at!) - Date.parse(session.started_at);
    const played_at = new Date(
      Date.parse(session.started_at) + ((i % 5) + 1) * (span / 7),
    ).toISOString();
    hands.push(
      buildHandRow(h, {
        id: newId(),
        at: played_at,
        played_at,
        session_id: session.id,
        source: "manual",
      }),
    );
  }

  // Journal flavour: stars, tags, sections, reviews → Leak Book.
  const at = hands[0]?.played_at ?? new Date(0).toISOString();
  const section = (name: string, emoji: string, order: number): HandCollection => ({
    id: newId(),
    name,
    emoji,
    sort_order: order,
    created_at: at,
    updated_at: at,
  });
  const askNelson = section("Ask Nelson", "❓", 0);
  const river = section("River decisions", "🎯", 1);
  const bigPots = section("Big pots", "🔥", 2);
  const ruleRows = new Map<string, Rule>();

  hands.forEach((hand, i) => {
    if (hand.auto_tags.includes("street:river") || hand.auto_tags.includes("street:showdown")) {
      if (i % 2 === 0) hand.collection_ids.push(river.id);
    }
    if ((hand.pot_bb ?? 0) >= 60) hand.collection_ids.push(bigPots.id);
    if (i % 9 === 0) hand.collection_ids.push(askNelson.id);
    if (i % 7 === 0) hand.starred = true;
    if ((hand.net_bb ?? 0) < -40 && hand.auto_tags.includes("showdown"))
      hand.user_tags.push("Cooler");
    if (i % 11 === 3) hand.user_tags.push("Mistake");
    if (i % 4 === 1) {
      const rule = RULES[i % RULES.length]!;
      let row = ruleRows.get(rule.text);
      if (!row) {
        row = {
          id: newId(),
          category: rule.category,
          text: rule.text,
          status: i % 3 === 0 ? "fixed" : "working",
          times_seen: 0,
          last_surfaced_at: null,
          hand_ids: [],
          created_at: hand.played_at,
          updated_at: hand.played_at,
        };
        ruleRows.set(rule.text, row);
      }
      row.times_seen += 1;
      row.hand_ids.push(hand.id);
      hand.review_status = "lesson";
      hand.review = {
        answers: ANSWERS[i % ANSWERS.length]!,
        rule: { category: rule.category, text: rule.text, rule_id: row.id },
        reviewed_at: hand.played_at,
      };
    } else if (i % 4 === 2) {
      hand.review_status = "reviewed";
      hand.review = { answers: ANSWERS[0]!, rule: null, reviewed_at: hand.played_at };
    }
  });

  return { hands, collections: [askNelson, river, bigPots], rules: [...ruleRows.values()] };
}

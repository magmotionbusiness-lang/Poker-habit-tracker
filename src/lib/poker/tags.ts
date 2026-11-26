import { handClass, rankValue, suitOf, type Card } from "./cards";
import { replay, settle } from "./engine";
import type { HandHistory } from "./hand-types";

/**
 * Auto-tags and list fields, computed on save (and re-computable at any time).
 * Tag vocabulary is stable — smart lists and filters key off these strings.
 */
export type HandSummary = {
  hero_position: string;
  hero_cards: string | null;
  net_minor: number | null;
  net_bb: number | null;
  pot_bb: number;
  auto_tags: string[];
  resolved: boolean;
};

export function holeCategory(cards: readonly Card[]): string | null {
  if (cards.length !== 2) return null;
  const [a, b] = [...cards].map(rankValue).sort((x, y) => y - x) as [number, number];
  const suited = suitOf(cards[0]!) === suitOf(cards[1]!);
  if (a === b) return "pocket-pair";
  if (a >= 10 && b >= 10) return suited ? "suited-broadway" : "offsuit-broadway";
  if (suited && a === 14) return "suited-ace";
  if (suited && a - b === 1) return "suited-connector";
  if (suited && a - b === 2) return "suited-gapper";
  return suited ? "suited-other" : "offsuit-other";
}

export function flopTexture(board: readonly Card[]): string[] {
  if (board.length < 3) return [];
  const flop = board.slice(0, 3);
  const suits = new Set(flop.map(suitOf)).size;
  const ranks = flop.map(rankValue).sort((x, y) => y - x);
  const tags = [suits === 1 ? "monotone" : suits === 2 ? "two-tone" : "rainbow"];
  if (new Set(ranks).size < 3) tags.push("paired");
  const span = ranks[0]! - ranks[2]!;
  const wheelish = ranks[0] === 14 && ranks[1]! <= 5 && ranks[1]! - ranks[2]! <= 3;
  if ((new Set(ranks).size === 3 && span <= 4) || wheelish) tags.push("connected");
  tags.push(ranks.filter((r) => r >= 10).length >= 2 ? "high" : ranks[0]! <= 8 ? "low" : "mid");
  return tags.map((t) => `flop:${t}`);
}

export function summarize(h: HandHistory): HandSummary {
  const full = replay(h);
  const hero = full.seats.find((s) => s.seat === h.hero)!;
  const r = settle(h);
  const tags = new Set<string>();

  // Result
  const net = r.resolved ? (r.net[h.hero] ?? 0) : null;
  if (net === null) tags.add("unresolved");
  else if (net > 0) tags.add("won");
  else if (net < 0) tags.add("lost");
  else if (hero.contributed > 0) tags.add("chopped");

  // Preflop pot type and who was the aggressor
  const pf = h.actions.filter((a) => a.street === "preflop" && a.type !== "post");
  const raises = pf.filter((a) => a.type === "raise" || a.type === "bet");
  tags.add(
    raises.length === 0
      ? pf.some((a) => a.type === "call")
        ? "limped"
        : "walk"
      : raises.length === 1
        ? "srp"
        : raises.length === 2
          ? "3bet"
          : "4bet+",
  );
  if (h.bomb_pot > 0) tags.add("bomb-pot");
  if (h.straddle > 0) tags.add("straddle");
  const lastRaiser = raises.at(-1)?.seat;
  if (lastRaiser === h.hero) tags.add("pf-aggressor");
  else if (pf.some((a) => a.seat === h.hero && a.type === "call")) tags.add("pf-caller");

  // How far it went and with how many players
  const sawFlop = new Set(h.actions.filter((a) => a.street !== "preflop").map((a) => a.seat));
  const flopPlayers =
    h.bomb_pot > 0 ? full.seats.length : Math.max(sawFlop.size, preflopSurvivors(h));
  if (flopPlayers >= 3) tags.add("multiway");
  else if (flopPlayers === 2) tags.add("heads-up");
  const streets = new Set(h.actions.map((a) => a.street));
  tags.add(
    r.showdown
      ? "street:showdown"
      : streets.has("river")
        ? "street:river"
        : streets.has("turn")
          ? "street:turn"
          : streets.has("flop")
            ? "street:flop"
            : "street:preflop",
  );
  if (r.showdown) tags.add(net !== null && net > 0 ? "won-at-showdown" : "showdown");
  else if (net !== null && net > 0) tags.add("won-without-showdown");
  if (full.seats.some((s) => s.allIn && !s.folded) && !hero.folded) tags.add("all-in");
  if (hero.folded) tags.add("hero-folded");

  // Hero's spot and hand
  tags.add(`pos:${hero.position}`);
  const heroCards = h.players.find((p) => p.seat === h.hero)?.cards ?? null;
  const cat = heroCards ? holeCategory(heroCards) : null;
  if (cat) tags.add(`hand:${cat}`);
  for (const t of flopTexture(h.board)) tags.add(t);

  const potTotal = Object.values(r.contributed).reduce((a, b) => a + b, 0);
  const pot_bb = Math.round((potTotal / h.bb) * 10) / 10;
  if (pot_bb >= 100) tags.add("big-pot");

  return {
    hero_position: hero.position,
    hero_cards: heroCards ? heroCards.join("") : null,
    net_minor: net,
    net_bb: net === null ? null : Math.round((net / h.bb) * 100) / 100,
    pot_bb,
    auto_tags: [...tags],
    resolved: r.resolved,
  };
}

function preflopSurvivors(h: HandHistory): number {
  const t = replay(
    h,
    h.actions.findIndex((a) => a.street !== "preflop") === -1
      ? h.actions.length
      : h.actions.findIndex((a) => a.street !== "preflop"),
  );
  return t.street === "preflop" ? 0 : t.seats.filter((s) => !s.folded).length;
}

export { handClass };

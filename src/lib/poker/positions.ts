/**
 * Table positions by number of seated players. Index 0 is the button, then the blinds,
 * then early → late position, ending with the cutoff.
 */
const NAMES: Record<number, string[]> = {
  2: ["BTN", "BB"],
  3: ["BTN", "SB", "BB"],
  4: ["BTN", "SB", "BB", "CO"],
  5: ["BTN", "SB", "BB", "UTG", "CO"],
  6: ["BTN", "SB", "BB", "UTG", "HJ", "CO"],
  7: ["BTN", "SB", "BB", "UTG", "LJ", "HJ", "CO"],
  8: ["BTN", "SB", "BB", "UTG", "UTG+1", "LJ", "HJ", "CO"],
  9: ["BTN", "SB", "BB", "UTG", "UTG+1", "MP", "LJ", "HJ", "CO"],
  10: ["BTN", "SB", "BB", "UTG", "UTG+1", "UTG+2", "MP", "LJ", "HJ", "CO"],
};

export const POSITION_LABELS: Record<string, string> = {
  BTN: "Button",
  SB: "Small blind",
  BB: "Big blind",
  UTG: "Under the gun",
  "UTG+1": "UTG+1",
  "UTG+2": "UTG+2",
  MP: "Middle position",
  LJ: "Lojack",
  HJ: "Hijack",
  CO: "Cutoff",
};

export function positionNames(players: number): string[] {
  const names = NAMES[players];
  if (!names) throw new RangeError(`Unsupported table size: ${players}`);
  return names;
}

/** Seats in clockwise order starting with the button. */
export function seatsFromButton(seats: readonly number[], button: number): number[] {
  const sorted = [...seats].sort((a, b) => a - b);
  const i = sorted.indexOf(button);
  if (i < 0) throw new RangeError(`Button seat ${button} is empty`);
  return [...sorted.slice(i), ...sorted.slice(0, i)];
}

/** seat → position name (BTN, SB, BB, UTG…). */
export function seatPositions(seats: readonly number[], button: number): Map<number, string> {
  const ordered = seatsFromButton(seats, button);
  const names = positionNames(ordered.length);
  return new Map(ordered.map((s, i) => [s, names[i]!]));
}

/** The seat that must sit at `position` so that the button lands where needed. */
export function buttonForPosition(
  seats: readonly number[],
  seat: number,
  position: string,
): number {
  const sorted = [...seats].sort((a, b) => a - b);
  const names = positionNames(sorted.length);
  const offset = names.indexOf(position);
  if (offset < 0) throw new RangeError(`No ${position} at a ${sorted.length}-handed table`);
  const i = sorted.indexOf(seat);
  return sorted[(i - offset + sorted.length * 2) % sorted.length]!;
}

/** Seats that post the small and big blind (heads-up: the button posts the small blind). */
export function blindSeats(seats: readonly number[], button: number): { sb: number; bb: number } {
  const o = seatsFromButton(seats, button);
  return o.length === 2 ? { sb: o[0]!, bb: o[1]! } : { sb: o[1]!, bb: o[2]! };
}

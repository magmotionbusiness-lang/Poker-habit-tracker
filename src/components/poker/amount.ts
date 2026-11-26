import { formatMoney } from "@/lib/money";

/** Chip amounts on the table: money ("$12") or big blinds ("6bb"). */
export function chipLabel(
  minor: number,
  currency: string,
  bb: number,
  mode: "money" | "bb",
): string {
  if (mode === "bb") {
    const v = Math.round((minor / bb) * 10) / 10;
    return `${Number.isInteger(v) ? v : v.toFixed(1)}bb`;
  }
  return formatMoney({ minor, currency }, { trimZeroCents: true, compact: minor >= 10_000_000 });
}

export function signedChipLabel(
  minor: number,
  currency: string,
  bb: number,
  mode: "money" | "bb",
): string {
  const s = chipLabel(Math.abs(minor), currency, bb, mode);
  return minor > 0 ? `+${s}` : minor < 0 ? `−${s}` : s;
}

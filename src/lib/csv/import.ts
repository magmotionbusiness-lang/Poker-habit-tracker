import type { PokerSession, SessionFormat } from "@/lib/domain/types";
import { zonedToUtc } from "@/lib/dates/dates";
import { parseMoney } from "@/lib/money";

/** RFC 4180-ish CSV parser: quotes, escaped quotes, CRLF; delimiter auto-detected (, ; tab). */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const first = src.split(/\r?\n/, 1)[0] ?? "";
  const delim = [",", ";", "\t"].reduce(
    (best, d) => (first.split(d).length > first.split(best).length ? d : best),
    ",",
  );
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (q) {
      if (c === '"' && src[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === delim) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((x) => x.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim())) rows.push(row);
  return rows.map((r) => r.map((x) => x.trim()));
}

export const IMPORT_FIELDS = [
  "date",
  "start_time",
  "hours",
  "format",
  "live",
  "game",
  "stakes",
  "buy_in",
  "cash_out",
  "profit",
  "venue",
  "notes",
] as const;
export type ImportField = (typeof IMPORT_FIELDS)[number];
export type Mapping = Partial<Record<ImportField, number>>;

const GUESS: Record<ImportField, RegExp> = {
  date: /^(date|day|session date|start date|started)$/i,
  start_time: /^(start|start time|time|begin)$/i,
  hours: /(hours|duration|length|hrs)/i,
  format: /^(format|type|game type|kind)$/i,
  live: /(live|online|location type)/i,
  game: /^(game|variant|poker game)$/i,
  stakes: /(stake|blinds|limit|level)/i,
  buy_in: /(buy.?in|invest|cost|bought)/i,
  cash_out: /(cash.?out|cashed|prize|won|winnings|returned)/i,
  profit: /(profit|result|net|p\/?l|won\/lost)/i,
  venue: /(venue|casino|location|site|room|place)/i,
  notes: /(note|comment|memo)/i,
};

/** Best-guess column for each field from the header row (each column used once). */
export function guessMapping(headers: readonly string[]): Mapping {
  const used = new Set<number>();
  const m: Mapping = {};
  for (const f of IMPORT_FIELDS) {
    const i = headers.findIndex((h, idx) => !used.has(idx) && GUESS[f].test(h.trim()));
    if (i >= 0) {
      m[f] = i;
      used.add(i);
    }
  }
  return m;
}

export type DateOrder = "ymd" | "dmy" | "mdy";

/** Detect day/month order from the data (a first part > 12 means day-first). */
export function detectDateOrder(values: readonly string[]): DateOrder {
  let dmy = false;
  let mdy = false;
  for (const v of values) {
    const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/.exec(v.trim());
    if (!m) continue;
    if (+m[1]! > 12) dmy = true;
    if (+m[2]! > 12) mdy = true;
  }
  return values.some((v) => /^\d{4}-\d{1,2}-\d{1,2}/.test(v.trim()))
    ? "ymd"
    : mdy && !dmy
      ? "mdy"
      : "dmy";
}

export function parseDate(v: string, order: DateOrder): string | null {
  const s = v.trim();
  let y: number, mo: number, d: number;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  const other = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/.exec(s);
  if (iso) [y, mo, d] = [+iso[1]!, +iso[2]!, +iso[3]!];
  else if (other) {
    const [a, b, c] = [+other[1]!, +other[2]!, +other[3]!];
    y = c < 100 ? 2000 + c : c;
    [d, mo] = order === "mdy" ? [b, a] : [a, b];
  } else return null;
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** "4.5", "4,5", "4:30", "270m" → hours. */
export function parseHours(v: string): number | null {
  const s = v.trim().toLowerCase();
  if (!s) return null;
  const hm = /^(\d+):(\d{1,2})$/.exec(s);
  if (hm) return +hm[1]! + +hm[2]! / 60;
  const mins = /^(\d+)\s*m(in)?s?$/.exec(s);
  if (mins) return +mins[1]! / 60;
  const n = Number(s.replace(",", ".").replace(/h(ou)?rs?$/, ""));
  return Number.isFinite(n) && n >= 0 && n < 72 ? n : null;
}

/** "1/2", "$1/$2", "NL50" → small/big blind in minor units. */
export function parseStakes(v: string, currency: string): { sb: number; bb: number } | null {
  const s = v.replace(/[^\d/.,a-z]/gi, "");
  const blinds = /^(\d+(?:[.,]\d+)?)\/(\d+(?:[.,]\d+)?)/.exec(s);
  if (blinds)
    return {
      sb: parseMoney(blinds[1]!, currency).minor,
      bb: parseMoney(blinds[2]!, currency).minor,
    };
  const nl = /^(?:nl|plo|pl)(\d+)$/i.exec(s);
  if (nl) {
    const bb = Math.round(parseMoney(nl[1]!, currency).minor / 100);
    return { sb: Math.round(bb / 2), bb };
  }
  return null;
}

export type ImportOptions = {
  currency: string;
  bankroll_id: string;
  tz: string;
  dateOrder: DateOrder;
  defaultLive: boolean;
};
export type ImportedSession = Omit<PokerSession, "id" | "created_at" | "updated_at"> & {
  venue_name: string | null;
};
export type ImportResult = {
  sessions: ImportedSession[];
  errors: Array<{ row: number; message: string }>;
};

/** Convert mapped CSV rows (header excluded) to finished sessions. Never throws. */
export function rowsToSessions(
  rows: readonly string[][],
  m: Mapping,
  o: ImportOptions,
): ImportResult {
  const out: ImportResult = { sessions: [], errors: [] };
  const get = (r: readonly string[], f: ImportField) =>
    m[f] === undefined ? "" : (r[m[f]!] ?? "").trim();
  const money = (v: string) =>
    v ? parseMoney(v.replace(/[^\d.,\-−]/g, ""), o.currency).minor : null;
  rows.forEach((r, i) => {
    const line = i + 2; // 1-based + header
    try {
      const date = parseDate(get(r, "date"), o.dateOrder);
      if (!date) throw new Error("Missing or unreadable date");
      const timeRaw = get(r, "start_time");
      const time = /^\d{1,2}:\d{2}/.test(timeRaw) ? timeRaw.slice(0, 5).padStart(5, "0") : "19:00";
      const start = zonedToUtc(date, time, o.tz);
      const hours = parseHours(get(r, "hours")) ?? 0;
      const fmtRaw = get(r, "format").toLowerCase();
      const format: SessionFormat = /mtt|tourn/.test(fmtRaw)
        ? "mtt"
        : /sng|sit/.test(fmtRaw)
          ? "sng"
          : /spin/.test(fmtRaw)
            ? "spin"
            : "cash";
      const liveRaw = get(r, "live").toLowerCase();
      const is_live = liveRaw ? !/online|^no$|^false$|^0$/.test(liveRaw) : o.defaultLive;
      const stakes = parseStakes(get(r, "stakes"), o.currency);
      let buyIn = money(get(r, "buy_in"));
      let out_ = money(get(r, "cash_out"));
      const profit = money(get(r, "profit"));
      if (buyIn === null && out_ === null) {
        if (profit === null) throw new Error("Needs a result: buy-in + cash-out, or profit");
        buyIn = profit < 0 ? -profit : 0;
        out_ = profit > 0 ? profit : 0;
      }
      buyIn = Math.abs(buyIn ?? 0);
      out_ = Math.max(0, out_ ?? 0);
      const cash = format === "cash";
      const game = get(r, "game");
      out.sessions.push({
        bankroll_id: o.bankroll_id,
        venue_id: null,
        venue_name: get(r, "venue") || null,
        format,
        is_live,
        game: /plo|omaha/i.test(game)
          ? "PLO"
          : game && !/hold|nl|nlh/i.test(game)
            ? "other"
            : "NLHE",
        stakes_sb_minor: cash ? (stakes?.sb ?? null) : null,
        stakes_bb_minor: cash ? (stakes?.bb ?? null) : null,
        straddle_minor: null,
        buy_in_minor: buyIn,
        rebuys_minor: 0,
        cash_out_minor: cash ? out_ : 0,
        prize_minor: cash ? 0 : out_,
        bounties_minor: 0,
        fees_minor: 0,
        tips_minor: 0,
        expenses: [],
        currency: o.currency,
        fx_rate: null,
        started_at: start.toISOString(),
        ended_at: new Date(start.getTime() + Math.round(hours * 3_600_000)).toISOString(),
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
        notes: get(r, "notes") || null,
        tags: ["imported"],
        status: "finished",
      });
    } catch (e) {
      out.errors.push({ row: line, message: e instanceof Error ? e.message : String(e) });
    }
  });
  return out;
}

/** Key used to skip rows that were already imported (same start + same money). */
export const importKey = (
  s: Pick<PokerSession, "started_at" | "buy_in_minor" | "cash_out_minor" | "prize_minor">,
) => `${s.started_at}|${s.buy_in_minor}|${s.cash_out_minor}|${s.prize_minor}`;

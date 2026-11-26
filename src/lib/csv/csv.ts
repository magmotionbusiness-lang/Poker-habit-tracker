/**
 * RFC 4180 CSV writer with spreadsheet formula-injection protection (text cells
 * starting with = + - @ are prefixed with '). Numbers are written as-is.
 */
export type CsvValue = string | number | boolean | null | undefined;

export function csvCell(v: CsvValue): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "";
  if (typeof v === "boolean") return v ? "true" : "false";
  let s = v;
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(\.\d+)?$/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv<T>(
  rows: readonly T[],
  columns: ReadonlyArray<{ header: string; value: (row: T) => CsvValue }>,
): string {
  const lines = [columns.map((c) => csvCell(c.header)).join(",")];
  for (const r of rows) lines.push(columns.map((c) => csvCell(c.value(r))).join(","));
  return lines.join("\r\n") + "\r\n";
}

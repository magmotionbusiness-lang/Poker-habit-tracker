export const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "ref",
] as const;

/** Pull UTM params from a query string (values trimmed to 100 chars). Null when none. */
export function parseUtm(search: string): Record<string, string> | null {
  const q = new URLSearchParams(search);
  const out: Record<string, string> = {};
  for (const k of UTM_KEYS) {
    const v = q.get(k)?.trim();
    if (v) out[k] = v.slice(0, 100);
  }
  return Object.keys(out).length ? out : null;
}

/** First touch wins: keep stored UTM unless there is none yet. */
export function mergeUtm(
  stored: Record<string, string> | null,
  incoming: Record<string, string> | null,
): Record<string, string> | null {
  return stored ?? incoming;
}

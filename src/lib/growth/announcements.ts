export type AnnouncementType =
  "cohort_opening" | "cohort_closing" | "workshop" | "live_qa" | "new_content" | "promo";
export type Audience = "everyone" | "non_students" | "students" | "alumni" | "cohort";
export type Announcement = {
  id: string;
  type: AnnouncementType;
  title: string;
  body: string | null;
  image_url: string | null;
  starts_at: string;
  ends_at: string | null;
  cta_label: string | null;
  cta_url: string | null;
  audience: Audience;
  priority: "low" | "normal" | "high";
};

/** How far ahead an upcoming event starts showing its countdown. */
export const LEAD_TIME_MS = 30 * 86_400_000;
/** Events without an end stay up this long after they start. */
export const DEFAULT_RUN_MS = 2 * 3_600_000;

export type Phase = "upcoming" | "live";
const RANK = { high: 0, normal: 1, low: 2 } as const;

export function audienceMatches(a: Audience, status: "student" | "alumni" | null): boolean {
  if (a === "everyone") return true;
  if (a === "non_students") return status === null;
  if (a === "students") return status === "student";
  if (a === "alumni") return status === "alumni";
  return false; // cohort-specific needs cohort membership (admin phase)
}

/** Visible announcements for this user right now, most important first. */
export function activeAnnouncements(
  list: readonly Announcement[],
  now: number,
  status: "student" | "alumni" | null,
  dismissed: Readonly<Record<string, string>> = {},
): Array<Announcement & { phase: Phase }> {
  return list
    .filter((a) => audienceMatches(a.audience, status) && !dismissed[`ann:${a.id}`])
    .map((a) => {
      const start = Date.parse(a.starts_at);
      const end = a.ends_at ? Date.parse(a.ends_at) : start + DEFAULT_RUN_MS;
      const phase: Phase | null =
        now >= end ? null : now >= start ? "live" : start - now <= LEAD_TIME_MS ? "upcoming" : null;
      return phase ? { ...a, phase } : null;
    })
    .filter((a): a is Announcement & { phase: Phase } => a !== null)
    .sort(
      (a, b) =>
        RANK[a.priority] - RANK[b.priority] || Date.parse(a.starts_at) - Date.parse(b.starts_at),
    );
}

export function countdownParts(ms: number): { d: number; h: number; m: number; s: number } {
  const t = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(t / 86_400),
    h: Math.floor((t % 86_400) / 3600),
    m: Math.floor((t % 3600) / 60),
    s: t % 60,
  };
}

import type { Announcement } from "@/lib/growth/announcements";

/**
 * Announcement defaults (Nelson-editable). Real announcements come from the Supabase
 * `announcements` table (published rows, edited in the admin panel); this file is the
 * fallback. `samples` only show while demo data is loaded, so screenshots look alive
 * without inventing dates for real users. TODO(Nelson): real cohort/workshop dates.
 */
export const announcementDefaults: Announcement[] = [];

export function sampleAnnouncements(now: number): Announcement[] {
  const at = (days: number) =>
    new Date(Math.floor((now + days * 86_400_000) / 3_600_000) * 3_600_000).toISOString();
  return [
    {
      id: "sample-cohort",
      type: "cohort_opening",
      title: "Cohort doors open",
      body: "20 spots. Waitlist hears first. (Sample — dates set by Nelson.)",
      image_url: null,
      starts_at: at(3.4),
      ends_at: null,
      cta_label: "Join the waitlist",
      cta_url: "/more/up-the-stakes#waitlist",
      audience: "non_students",
      priority: "high",
    },
    {
      id: "sample-workshop",
      type: "workshop",
      title: "Free workshop: The Blueprint",
      body: "Live with Nelson. Bring a hand. (Sample.)",
      image_url: null,
      starts_at: at(9),
      ends_at: null,
      cta_label: "Save my seat",
      cta_url: "https://upthestakes.net",
      audience: "everyone",
      priority: "normal",
    },
  ];
}

export const announcementLabels = {
  cohort_opening: "Cohort opening",
  cohort_closing: "Cohort closing",
  workshop: "Free workshop",
  live_qa: "Live Q&A",
  new_content: "New content",
  promo: "Offer",
} as const;

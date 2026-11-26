import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { notifications } from "@/content/notifications";
import { addDays, localDate } from "@/lib/dates/dates";
import { defaultSettings, type UserSettings } from "@/lib/db/settings";
import type { Habit, HabitLog } from "@/lib/domain/types";
import { serverEnv } from "@/lib/env";
import { dayInput, logKey } from "@/lib/habits/habits";
import { isReminderDue, reminderBody } from "@/lib/push/reminders";
import { pushConfigured, sendPush } from "@/lib/push/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Daily habit reminders. Call every ~15 minutes from a scheduler with
 * `Authorization: Bearer $CRON_SECRET` (see README → Reminders). Each user gets at most
 * one reminder per local day, after their reminder time, outside quiet hours, and only
 * if today's habits aren't done.
 */
export async function GET(request: NextRequest) {
  const secret = serverEnv().CRON_SECRET;
  const given = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret ?? ""}`;
  if (
    !secret ||
    given.length !== expected.length ||
    !timingSafeEqual(Buffer.from(given), Buffer.from(expected))
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const admin = getSupabaseAdmin();
  if (!admin || !pushConfigured())
    return NextResponse.json({ error: "not configured" }, { status: 503 });

  const { data: subs, error } = await admin
    .from("push_subscriptions")
    .select("id, user_id, endpoint, p256dh, auth, categories")
    .contains("categories", ["reminders"]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const byUser = new Map<string, typeof subs>();
  for (const s of subs ?? []) byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s]);
  if (!byUser.size) return NextResponse.json({ checked: 0, sent: 0 });

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, timezone, settings, last_reminded_on")
    .in("id", [...byUser.keys()]);

  const now = new Date();
  let sent = 0;
  for (const p of profiles ?? []) {
    const settings: UserSettings = {
      ...defaultSettings(),
      ...(p.settings ?? {}),
      timezone: p.timezone ?? "UTC",
    };
    const { due, today } = isReminderDue(
      {
        timezone: settings.timezone,
        reminderTimes: settings.reminderTimes,
        quietStart: settings.quietStart,
        quietEnd: settings.quietEnd,
        lastRemindedOn: p.last_reminded_on,
      },
      now,
    );
    if (!due) continue;

    // What's left today, with the same habit logic the app uses.
    const around = {
      from: `${addDays(today, -1)}T00:00:00Z`,
      to: `${addDays(today, 2)}T00:00:00Z`,
    };
    const [habits, logs, sessions, study] = await Promise.all([
      admin.from("habits").select("*").eq("user_id", p.id).eq("active", true),
      admin.from("habit_logs").select("*").eq("user_id", p.id).eq("date", today),
      admin
        .from("sessions")
        .select("started_at")
        .eq("user_id", p.id)
        .gte("started_at", around.from)
        .lt("started_at", around.to),
      admin
        .from("study_sessions")
        .select("started_at, minutes")
        .eq("user_id", p.id)
        .gte("started_at", around.from)
        .lt("started_at", around.to),
    ]);
    const tz = settings.timezone;
    const studyMinutes = new Map<string, number>();
    for (const s of study.data ?? []) {
      const d = localDate(s.started_at, tz);
      studyMinutes.set(d, (studyMinutes.get(d) ?? 0) + s.minutes);
    }
    const ctx = {
      sessionDays: new Set((sessions.data ?? []).map((s) => localDate(s.started_at, tz))),
      studyMinutes,
    };
    const logMap = new Map(
      ((logs.data as HabitLog[] | null) ?? []).map((l) => [logKey(l.habit_id, l.date), l]),
    );
    const input = dayInput(
      (habits.data as Habit[] | null) ?? [],
      today,
      logMap,
      ctx,
      settings.commitment,
    );
    const left = Math.max(0, input.required - input.done);

    if (left > 0) {
      for (const sub of byUser.get(p.id) ?? []) {
        const r = await sendPush(sub, {
          title: notifications.reminder.title,
          body: reminderBody(left, notifications.reminder),
          url: "/today",
          tag: "daily-reminder",
        });
        if (r === "ok") sent++;
        if (r === "gone") await admin.from("push_subscriptions").delete().eq("id", sub.id);
      }
    }
    await admin.from("profiles").update({ last_reminded_on: today }).eq("id", p.id);
  }
  return NextResponse.json({ checked: profiles?.length ?? 0, sent });
}

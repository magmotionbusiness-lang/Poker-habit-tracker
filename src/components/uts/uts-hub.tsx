"use client";

import { GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { brand } from "@/config/brand";
import { AnnouncementCard, useAnnouncements } from "./announcements";
import { LeadForm } from "./lead-form";

/** Live parts of the hub: announcements with countdowns, then the signup forms. */
export function UtsHubLive() {
  const { list, now, settings } = useAnnouncements();
  const status = settings?.uts?.status ?? null;
  return (
    <>
      {status && (
        <Card className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-pill text-lavender">
            <GraduationCap className="size-5" aria-hidden />
          </span>
          <div>
            <p className="font-semibold">
              {status === "student" ? "Cohort student" : "Stakers Club alumni"}
            </p>
            <p className="text-sm text-ink-muted">
              Pro is unlocked. Thanks for building with {brand.coach.name}.
            </p>
          </div>
        </Card>
      )}
      {list.length > 0 && (
        <section aria-label="Announcements" className="space-y-3">
          {list.map((a) => (
            <AnnouncementCard key={a.id} a={a} now={now} />
          ))}
        </section>
      )}
      {!status && (
        <section id="waitlist" className="scroll-mt-20">
          <LeadForm list="waitlist" glow />
        </section>
      )}
      <section id="newsletter" className="scroll-mt-20">
        <LeadForm list="newsletter" />
      </section>
      <Badge className="mx-auto flex w-fit">
        {brand.coach.business}™ · {brand.coach.site.replace("https://", "")}
      </Badge>
    </>
  );
}

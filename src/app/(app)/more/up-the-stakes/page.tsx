import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Headline } from "@/components/brand/headline";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { brand } from "@/config/brand";
import { program } from "@/content/program";
import { UtsHubLive } from "@/components/uts/uts-hub";

export const metadata: Metadata = { title: brand.coach.business };

/** Up The Stakes hub: about the cohort, announcements, waitlist + newsletter (Phase 3). */
export default function UpTheStakesPage() {
  return (
    <div className="space-y-8 pt-3">
      <Link
        href="/more"
        className="-ml-2 inline-flex h-11 items-center gap-1.5 px-2 text-sm font-semibold text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> More
      </Link>
      <section>
        <Badge dot pulse className="mb-5">
          Cohort waitlist open
        </Badge>
        <Headline lead="Make your first" accent="$50k from poker." size="lg" />
        <p className="mt-4 text-ink-muted">
          {brand.coach.name} runs a live, intensive {brand.coach.cohortWeeks}-week cohort — capped
          at {brand.coach.cohortSize} spots. Not more content. A system: action, structure and
          accountability.
        </p>
      </section>

      <section aria-labelledby="phases">
        <p className="eyebrow mb-2">{program.eyebrow}</p>
        <h2 id="phases" className="mb-4 text-[28px] font-semibold">
          {program.heading}
        </h2>
        <ol className="-mx-4 flex snap-x snap-mandatory scroll-px-4 scrollbar-none gap-3 overflow-x-auto px-4 pb-2">
          {program.phases.map((p) => (
            <li key={p.title} className="w-[82%] max-w-xs shrink-0 snap-start">
              <Card className="flex h-full flex-col bg-[radial-gradient(ellipse_at_top_right,rgba(124,92,255,0.18),transparent_60%),var(--surface)]">
                <p className="eyebrow">{p.number}</p>
                <h3 className="mt-2 text-[30px] font-semibold">{p.title}</h3>
                <p className="mt-2 text-ink-soft">{p.tagline}</p>
                <ul className="mt-4 space-y-1.5 text-sm text-ink-muted">
                  {p.lessons.map((l) => (
                    <li key={l}>· {l}</li>
                  ))}
                </ul>
                <div className="mt-auto flex flex-wrap gap-1.5 pt-5">
                  {p.tools.map((t) => (
                    <Badge key={t} size="sm" className="tracking-normal normal-case">
                      {t}
                    </Badge>
                  ))}
                </div>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <UtsHubLive />
    </div>
  );
}

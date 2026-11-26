"use client";

import type { ReactNode } from "react";
import { Chips } from "@/components/forms/chips";
import { Button } from "@/components/ui/button";
import { Sheet } from "@/components/ui/sheet";
import type { GameRating, SessionFormat } from "@/lib/domain/types";
import type { LengthBucket, SessionFilter, TimeOfDay } from "@/lib/stats/stats";

export type RangeKey = "30d" | "90d" | "ytd" | "all";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((label, i) => ({
  value: i + 1,
  label,
}));

export function StatsFilterSheet({
  open,
  onOpenChange,
  filter,
  setFilter,
  range,
  setRange,
  stakesOptions,
  venueOptions,
  tagOptions,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  filter: SessionFilter;
  setFilter: (f: SessionFilter) => void;
  range: RangeKey;
  setRange: (r: RangeKey) => void;
  stakesOptions: string[];
  venueOptions: Array<{ value: string; label: string }>;
  tagOptions: string[];
}) {
  const patch = (p: Partial<SessionFilter>) => setFilter({ ...filter, ...p });
  const live = filter.live === undefined ? "any" : filter.live ? "live" : "online";
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title="Filter stats"
      description="Find what's working — and what isn't."
    >
      <div className="space-y-5">
        <Section title="Date range">
          <Chips
            ariaLabel="Date range"
            options={[
              { value: "30d", label: "30 days" },
              { value: "90d", label: "90 days" },
              { value: "ytd", label: "This year" },
              { value: "all", label: "All time" },
            ]}
            value={range}
            onChange={(v) => setRange(v as RangeKey)}
          />
        </Section>
        <Section title="Format">
          <Chips
            ariaLabel="Format"
            multiple
            size="sm"
            options={[
              { value: "cash", label: "Cash" },
              { value: "mtt", label: "MTT" },
              { value: "sng", label: "SNG" },
              { value: "spin", label: "Spin" },
            ]}
            value={filter.formats ?? []}
            onChange={(v) => patch({ formats: v as SessionFormat[] })}
          />
        </Section>
        <Section title="Live / online">
          <Chips
            ariaLabel="Live or online"
            size="sm"
            options={[
              { value: "any", label: "Both" },
              { value: "live", label: "Live" },
              { value: "online", label: "Online" },
            ]}
            value={live}
            onChange={(v) => patch({ live: v === "any" ? undefined : v === "live" })}
          />
        </Section>
        {stakesOptions.length > 1 && (
          <Section title="Stakes">
            <Chips
              ariaLabel="Stakes"
              multiple
              size="sm"
              options={stakesOptions.map((s) => ({ value: s, label: s }))}
              value={filter.stakes ?? []}
              onChange={(v) => patch({ stakes: v as string[] })}
            />
          </Section>
        )}
        {venueOptions.length > 1 && (
          <Section title="Venue / site">
            <Chips
              ariaLabel="Venue"
              multiple
              size="sm"
              options={venueOptions}
              value={filter.venueIds ?? []}
              onChange={(v) => patch({ venueIds: v as string[] })}
            />
          </Section>
        )}
        <Section title="How I played">
          <Chips
            ariaLabel="Game rating"
            multiple
            size="sm"
            options={[
              { value: "A", label: "A-game" },
              { value: "B", label: "B-game" },
              { value: "C", label: "C-game" },
            ]}
            value={filter.gameRatings ?? []}
            onChange={(v) => patch({ gameRatings: v as GameRating[] })}
          />
        </Section>
        <Section title="Day of week">
          <Chips
            ariaLabel="Day of week"
            multiple
            size="sm"
            options={WEEKDAYS}
            value={filter.weekdays ?? []}
            onChange={(v) => patch({ weekdays: v as number[] })}
          />
        </Section>
        <Section title="Time of day">
          <Chips
            ariaLabel="Time of day"
            multiple
            size="sm"
            options={[
              { value: "morning", label: "Morning" },
              { value: "afternoon", label: "Afternoon" },
              { value: "evening", label: "Evening" },
              { value: "night", label: "Night" },
            ]}
            value={filter.timesOfDay ?? []}
            onChange={(v) => patch({ timesOfDay: v as TimeOfDay[] })}
          />
        </Section>
        <Section title="Session length">
          <Chips
            ariaLabel="Session length"
            multiple
            size="sm"
            options={[
              { value: "lt2", label: "< 2h" },
              { value: "2to4", label: "2–4h" },
              { value: "4to6", label: "4–6h" },
              { value: "6plus", label: "6h+" },
            ]}
            value={filter.lengths ?? []}
            onChange={(v) => patch({ lengths: v as LengthBucket[] })}
          />
        </Section>
        {tagOptions.length > 0 && (
          <Section title="Tags">
            <Chips
              ariaLabel="Tags"
              multiple
              size="sm"
              options={tagOptions.map((t) => ({ value: t, label: t }))}
              value={filter.tags ?? []}
              onChange={(v) => patch({ tags: v as string[] })}
            />
          </Section>
        )}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            block
            onClick={() => {
              setFilter({});
              setRange("all");
            }}
          >
            Reset
          </Button>
          <Button block onClick={() => onOpenChange(false)}>
            Show results
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-ink-soft">{title}</p>
      {children}
    </div>
  );
}

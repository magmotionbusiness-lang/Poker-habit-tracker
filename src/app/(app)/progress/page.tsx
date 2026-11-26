import type { Metadata } from "next";
import { PageHeader } from "@/components/shell/page-header";
import { Card, CardHeader } from "@/components/ui/card";
import { Heatmap } from "@/components/charts/heatmap";
import { copy } from "@/content/copy";

export const metadata: Metadata = { title: "Progress" };

export default function ProgressPage() {
  // 26 weeks, nothing tracked yet.
  const empty = Array.from({ length: 26 * 7 }, () => null);
  return (
    <div className="space-y-4">
      <PageHeader eyebrow="Consistency" title="Progress" />
      <Card>
        <CardHeader eyebrow="Habit heatmap" />
        <div className="-mx-1 scrollbar-none overflow-x-auto px-1">
          <Heatmap values={empty} label="Habit consistency, last 26 weeks" />
        </div>
      </Card>
      <p className="px-1 text-sm text-ink-muted">{copy.empty.progress.body}</p>
    </div>
  );
}

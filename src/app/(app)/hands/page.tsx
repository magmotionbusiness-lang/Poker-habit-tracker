import type { Metadata } from "next";
import { Spade } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { copy } from "@/content/copy";

export const metadata: Metadata = { title: "Hands" };

export default function HandsPage() {
  return (
    <>
      <PageHeader eyebrow="Learn how to learn" title="Hands" />
      <EmptyState icon={<Spade />} title={copy.empty.hands.title} body={copy.empty.hands.body} />
    </>
  );
}

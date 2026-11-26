import type { Metadata } from "next";
import { Wallet } from "lucide-react";
import { PageHeader } from "@/components/shell/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { copy } from "@/content/copy";

export const metadata: Metadata = { title: "Bankroll" };

export default function BankrollPage() {
  return (
    <>
      <PageHeader eyebrow="Results" title="Bankroll" />
      <EmptyState
        icon={<Wallet />}
        title={copy.empty.bankroll.title}
        body={copy.empty.bankroll.body}
      />
    </>
  );
}

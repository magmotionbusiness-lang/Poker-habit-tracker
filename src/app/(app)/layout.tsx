import { AppGuard } from "@/components/shell/app-guard";
import { BottomNav } from "@/components/shell/bottom-nav";
import { ClientOnly } from "@/components/shell/client-only";
import { GlobalSheets } from "@/components/shell/global-sheets";
import { GrowthSync } from "@/components/shell/growth-sync";
import { QuickAdd } from "@/components/shell/quick-add";
import { TopFade } from "@/components/shell/top-fade";
import { Skeleton } from "@/components/ui/skeleton";

function ScreenSkeleton() {
  return (
    <div className="space-y-4 pt-5" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-44" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-56 w-full" />
    </div>
  );
}

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <AppGuard />
      <TopFade />
      <main
        id="main"
        className="px-safe pt-safe mx-auto min-h-dvh max-w-lg pb-[calc(var(--tabbar-height)+var(--safe-bottom)+96px)] md:max-w-2xl"
      >
        {/* Screens read on-device data (IndexedDB, clock, timezone): render after hydration. */}
        <ClientOnly fallback={<ScreenSkeleton />}>{children}</ClientOnly>
      </main>
      <ClientOnly>
        <QuickAdd />
        <GlobalSheets />
        <GrowthSync />
      </ClientOnly>
      <BottomNav />
    </>
  );
}

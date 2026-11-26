import { AppGuard } from "@/components/shell/app-guard";
import { BottomNav } from "@/components/shell/bottom-nav";
import { QuickAdd } from "@/components/shell/quick-add";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <AppGuard />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 z-30 h-[var(--safe-top)] bg-canvas/85 backdrop-blur-md"
      />
      <main
        id="main"
        className="px-safe pt-safe mx-auto min-h-dvh max-w-lg pb-[calc(var(--tabbar-height)+var(--safe-bottom)+96px)] md:max-w-2xl"
      >
        {children}
      </main>
      <QuickAdd />
      <BottomNav />
    </>
  );
}

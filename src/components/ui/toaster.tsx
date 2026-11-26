"use client";

import { Toaster as Sonner } from "sonner";

export { toast } from "sonner";

export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="top-center"
      offset={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
      mobileOffset={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-lg !border !border-line-accent !bg-surface-2/95 !text-ink !shadow-accent !backdrop-blur-md !font-sans",
          description: "!text-ink-muted",
          actionButton: "!bg-primary-strong !text-white !rounded-full",
        },
      }}
    />
  );
}

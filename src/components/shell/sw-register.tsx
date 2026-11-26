"use client";

import { useEffect } from "react";
import { toast } from "@/components/ui/toaster";
import { publicEnv } from "@/lib/env";

/** Registers /sw.js in production (or in dev with NEXT_PUBLIC_ENABLE_SW_IN_DEV=true). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    const enabled =
      process.env.NODE_ENV === "production" || publicEnv.NEXT_PUBLIC_ENABLE_SW_IN_DEV === "true";
    if (!enabled || !("serviceWorker" in navigator)) return;

    let reloading = false;
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => {
        reg.addEventListener("updatefound", () => {
          const next = reg.installing;
          next?.addEventListener("statechange", () => {
            if (next.state === "installed" && navigator.serviceWorker.controller) {
              toast("A new version of Stakers is ready", {
                duration: Infinity,
                action: {
                  label: "Reload",
                  onClick: () => {
                    navigator.serviceWorker.addEventListener(
                      "controllerchange",
                      onControllerChange,
                    );
                    next.postMessage({ type: "SKIP_WAITING" });
                  },
                },
              });
            }
          });
        });
      })
      .catch((err) => console.warn("[sw] registration failed", err));
  }, []);
  return null;
}

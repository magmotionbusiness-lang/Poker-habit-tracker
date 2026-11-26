"use client";

import { useEffect } from "react";
import { celebrate, type CelebrationKind } from "@/lib/store/celebrate";

/** Fires a celebration once when it mounts (e.g. inside a milestone dialog). */
export function FireOnMount({ kind }: { kind: CelebrationKind }) {
  useEffect(() => {
    const t = setTimeout(() => celebrate(kind), 120);
    return () => clearTimeout(t);
  }, [kind]);
  return null;
}

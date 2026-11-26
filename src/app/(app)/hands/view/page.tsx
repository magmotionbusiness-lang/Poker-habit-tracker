import type { Metadata } from "next";
import { Suspense } from "react";
import { HandView } from "./hand-view";

export const metadata: Metadata = { title: "Hand" };

export default function HandViewPage() {
  return (
    <Suspense>
      <HandView />
    </Suspense>
  );
}

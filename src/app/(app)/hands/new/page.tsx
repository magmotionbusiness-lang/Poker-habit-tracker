import type { Metadata } from "next";
import { Suspense } from "react";
import { HandEntry } from "./hand-entry";

export const metadata: Metadata = { title: "Log a hand" };

export default function NewHandPage() {
  return (
    <Suspense>
      <HandEntry />
    </Suspense>
  );
}

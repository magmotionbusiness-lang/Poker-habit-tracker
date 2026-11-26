import type { Metadata } from "next";
import { Suspense } from "react";
import { HandsScreen } from "./hands-screen";

export const metadata: Metadata = { title: "Hands" };

export default function HandsPage() {
  return (
    <Suspense>
      <HandsScreen />
    </Suspense>
  );
}

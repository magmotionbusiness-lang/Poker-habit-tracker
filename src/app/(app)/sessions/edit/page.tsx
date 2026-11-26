import type { Metadata } from "next";
import { Suspense } from "react";
import { SessionEditor } from "./session-editor";

export const metadata: Metadata = { title: "Session" };

export default function SessionEditPage() {
  return (
    <Suspense>
      <SessionEditor />
    </Suspense>
  );
}

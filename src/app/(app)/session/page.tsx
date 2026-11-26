import type { Metadata } from "next";
import { LiveSession } from "./live-session";

export const metadata: Metadata = { title: "Live session" };

export default function LiveSessionPage() {
  return <LiveSession />;
}

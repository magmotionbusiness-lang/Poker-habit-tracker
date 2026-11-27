import type { Metadata } from "next";
import { JourneyScreen } from "./journey-screen";

export const metadata: Metadata = { title: "Your poker journey" };

export default function JourneyPage() {
  return <JourneyScreen />;
}

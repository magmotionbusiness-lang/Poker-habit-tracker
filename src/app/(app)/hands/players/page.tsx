import type { Metadata } from "next";
import { PlayersScreen } from "./players-screen";

export const metadata: Metadata = { title: "Players" };

export default function PlayersPage() {
  return <PlayersScreen />;
}

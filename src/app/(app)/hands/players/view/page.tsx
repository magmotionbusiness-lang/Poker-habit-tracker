import type { Metadata } from "next";
import { Suspense } from "react";
import { PlayerProfile } from "./player-profile";

export const metadata: Metadata = { title: "Player" };

export default function PlayerPage() {
  return (
    <Suspense>
      <PlayerProfile />
    </Suspense>
  );
}

import type { Metadata } from "next";
import { ClientOnly } from "@/components/shell/client-only";
import { OnboardingFlow } from "./onboarding-flow";

export const metadata: Metadata = { title: "Set up" };

export default function OnboardingPage() {
  return (
    <ClientOnly fallback={<main className="hero-glow min-h-dvh" />}>
      <OnboardingFlow />
    </ClientOnly>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isProductionDeployment } from "@/lib/env";
import { DesignShowcase } from "./showcase";

export const metadata: Metadata = { title: "Design system" };

/** Visible in development and on Vercel preview deployments; 404 in production. */
export default function DesignPage() {
  if (isProductionDeployment) notFound();
  return <DesignShowcase />;
}

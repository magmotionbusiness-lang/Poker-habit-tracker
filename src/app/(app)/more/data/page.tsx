import type { Metadata } from "next";
import { DataScreen } from "./data-screen";

export const metadata: Metadata = { title: "Data & sync" };

export default function DataPage() {
  return <DataScreen />;
}

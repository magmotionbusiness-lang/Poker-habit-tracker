import type { Metadata } from "next";
import { LeakBook } from "./leak-book";

export const metadata: Metadata = { title: "Leak Book" };

export default function LeakBookPage() {
  return <LeakBook />;
}

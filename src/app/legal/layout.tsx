import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function LegalLayout({ children }: LayoutProps<"/legal">) {
  return (
    <main className="px-safe pt-safe pb-safe mx-auto max-w-2xl">
      <Link
        href="/more"
        className="mt-4 -ml-2 inline-flex h-11 items-center gap-1.5 px-2 text-sm font-semibold text-ink-soft hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden /> Back
      </Link>
      <article className="py-6 text-ink-soft [&_h1]:mb-4 [&_h1]:text-4xl [&_h1]:text-ink [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-2xl [&_h2]:text-ink [&_li]:ml-5 [&_li]:list-disc [&_p]:mb-3">
        {children}
      </article>
    </main>
  );
}

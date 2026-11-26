import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { brand } from "@/config/brand";
import { copy } from "@/content/copy";

const pages = {
  privacy: {
    title: "Privacy policy",
    body: (
      <>
        <p className="eyebrow">Template · TODO(legal): review before launch</p>
        <p>
          {brand.appName} keeps your poker data private. In guest mode everything stays on your
          device. With an account, data is stored in our database (Supabase, EU region) and
          protected so only you can read it.
        </p>
        <h2>Marketing emails</h2>
        <p>
          We only add you to {brand.coach.business} emails if you tick a separate, unticked consent
          box. We store the consent text and time. You can unsubscribe any time.
        </p>
        <h2>Your rights</h2>
        <p>
          You can export all your data or permanently delete your account and all data from
          Settings.
        </p>
      </>
    ),
  },
  terms: {
    title: "Terms",
    body: (
      <>
        <p className="eyebrow">Template · TODO(legal): review before launch</p>
        <p>
          {brand.appName} is a tracking and study tool. It involves no real-money gambling and
          offers no betting features. Nothing in the app is financial advice or a promise of profit.
        </p>
      </>
    ),
  },
  "responsible-gaming": {
    title: "Responsible gaming",
    body: (
      <>
        <p>{copy.responsibleGaming.notice}</p>
        <p>
          Poker should never put your wellbeing at risk. {brand.appName} includes session limits and
          stop-loss tools to help you play within your plan.
        </p>
        <h2>Get support</h2>
        <ul>
          <li>
            <a
              className="text-lavender underline"
              href="https://www.begambleaware.org"
              target="_blank"
              rel="noopener noreferrer"
            >
              BeGambleAware
            </a>
          </li>
          <li>
            <a
              className="text-lavender underline"
              href="https://www.gamblingtherapy.org"
              target="_blank"
              rel="noopener noreferrer"
            >
              Gambling Therapy (international)
            </a>
          </li>
          <li>
            <a
              className="text-lavender underline"
              href="https://www.ncpgambling.org"
              target="_blank"
              rel="noopener noreferrer"
            >
              National Council on Problem Gambling (US)
            </a>
          </li>
        </ul>
      </>
    ),
  },
} as const;

type Slug = keyof typeof pages;

export function generateStaticParams() {
  return Object.keys(pages).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/legal/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: pages[slug as Slug]?.title ?? "Not found" };
}

export default async function LegalPage({ params }: PageProps<"/legal/[slug]">) {
  const { slug } = await params;
  const page = pages[slug as Slug];
  if (!page) notFound();
  return (
    <>
      <h1>{page.title}</h1>
      {page.body}
    </>
  );
}

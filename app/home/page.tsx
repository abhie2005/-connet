import type { Metadata } from "next";
import { ColdEmailCrowdHero } from "@/components/ui/cold-email-crowd-hero";
import { Landing } from "@/components/ui/landing";
import { APP_NAME as name } from "@/lib/name";

export const metadata: Metadata = {
  title: `${name}: cold emails that get replies`,
  description: `${name} watches for the moment a company starts buying, proves every fact with a quote from its source, and writes the first line. Nothing is sent without your approval.`,
};

/** The landing page: the hero, then everything under it. The app itself still lives at /. */
export default function HomePage() {
  return (
    <>
      <ColdEmailCrowdHero brand={name} appHref="/" />
      <Landing brand={name} appHref="/" />
    </>
  );
}

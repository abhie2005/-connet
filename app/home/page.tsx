import type { Metadata } from "next";
import { ColdEmailCrowdHero } from "@/components/ui/cold-email-crowd-hero";
import { APP_NAME as name } from "@/lib/name";

export const metadata: Metadata = {
  title: `${name}: cold emails that get replies`,
  description: `${name} watches for the moment a company starts buying, proves every fact with a quote from its source, and writes the first line. Nothing is sent without your approval.`,
};

/** The landing page. The app itself still lives at /, untouched. */
export default function HomePage() {
  return <ColdEmailCrowdHero brand={name} appHref="/" />;
}

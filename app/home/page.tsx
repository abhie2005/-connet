import type { Metadata } from "next";
import { GlassyDashboard } from "@/components/ui/glassy-dashboard";
import { APP_NAME as name } from "@/lib/name";

export const metadata: Metadata = {
  title: `${name}: the workspace at a glance`,
  description: `What ${name} found, what it cost, and what is waiting for your approval. Every figure is read from the workspace.`,
};

/** The dashboard. The app itself still lives at /. */
export default function HomePage() {
  return <GlassyDashboard workspaceName={name} appHref="/" />;
}

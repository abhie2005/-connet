// What the page needs to know about a lead at a glance: who to write to, and how far along it is.
import { FOUNDER, type Net } from "@/lib/graph/nets";
import { bestContact } from "@/lib/score";
import type { Contact, Lead, Message, Signal, WarmPath, Workspace } from "@/lib/types";

export interface LeadView {
  lead: Lead;
  /** The person a message goes to: the one a draft was written to, else the best contact we know. */
  contact: Contact | null;
  draft: Message | null;
  sent: Message | null;
  signal: Signal | null;
}

export function viewOf(lead: Lead, ws: Workspace): LeadView {
  const mine = ws.messages.filter((m) => m.leadId === lead.id);
  const draft = mine.find((m) => m.status === "draft") || null;
  const sent = [...mine].reverse().find((m) => m.status === "sent") || null;
  const message = draft || sent;
  const contact = (message?.contactId && lead.contacts.find((c) => c.id === message.contactId)) || bestContact(lead, ws.icp);
  const signal = lead.signals.find((s) => s.summary === lead.whyNow) || lead.signals[0] || null;
  return { lead, contact, draft, sent, signal };
}

/** Leads with a reason to write now, best match first. */
export function ranked(ws: Workspace): LeadView[] {
  return ws.leads
    .filter((l) => l.status === "active")
    .sort((a, b) => b.score.total - a.score.total || b.warmPaths.length - a.warmPaths.length)
    .map((l) => viewOf(l, ws));
}

/** The one to deal with first: the best match that has not been written to yet. */
export function bestNext(ws: Workspace): LeadView | null {
  return ranked(ws).find((v) => !v.sent) || null;
}

/** The nodes a message travels along on the graph. In the product's net: the product, the
    company, the person. In your net: you, the school or employer you share if there is one,
    the person. */
export function routeTo(view: LeadView, ws: Workspace, net: Net = "product"): string[] {
  const has = new Set(ws.graph.nodes.map((n) => n.id));
  const to = view.contact?.id || view.lead.id;
  if (net === "product") return ["product", view.lead.id, view.contact?.id || ""].filter((id) => id && has.has(id));
  const warm = view.lead.warmPaths.find((w) => w.kind !== "referral" && w.contactId === view.contact?.id);
  return [FOUNDER, warm?.viaId || "", to].filter((id) => id && has.has(id));
}

export const COST_NOTE = {
  draft: (credits: number) => `Writes a first email from the checked facts. Uses ${credits} credit${credits === 1 ? "" : "s"}. Nothing is sent until you approve it.`,
  emails: (credits: number) => `Looks up the people at this company and their email addresses, and marks each one verified or guessed. Uses ${credits} credits.`,
};

/** A way in, in as few words as say it, split so each UI can mark the shared thing its own way.
    "Maya Okafor" + "studied at" + "UCLA". The app bolds the via in violet; the dashboard, which
    may not touch that stylesheet, bolds it in its own ink. The words are the same either way. */
export function wayInParts(warm: WarmPath, who?: string | null): { before: string; via: string; after: string } {
  const person = who || "Someone there";
  if (warm.kind === "referral") return { before: "", via: warm.via, after: ` can introduce you to ${person}` };
  return { before: `${person} ${warm.kind === "shared_school" ? "studied at" : "worked at"} `, via: warm.via, after: "" };
}

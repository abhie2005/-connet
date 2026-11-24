// Fit and intent, as plain arithmetic the rep can read. No model is involved in the score:
// the same lead always gets the same number, and every point has a reason next to it.
import type { Contact, ICP, IcpPersona, Lead, LeadScore, ScorePart, Signal } from "./types";

const SIGNAL_POINTS: Record<string, number> = {
  funding: 14,
  hiring: 12,
  launch: 10,
  leadership: 10,
  expansion: 10,
  tech: 8,
  other: 9,
};

export function daysSince(date: string | null, now = Date.now()): number | null {
  if (!date) return null;
  const t = Date.parse(date);
  if (Number.isNaN(t)) return null;
  return Math.round((now - t) / 86_400_000);
}

function recency(date: string | null, now: number): number {
  const d = daysSince(date, now);
  if (d == null) return 0.5;
  if (d <= 45) return 1; // also covers dates a little ahead of today (an announced change)
  if (d <= 120) return 0.7;
  return 0.4;
}

const words = (s: string) => s.toLowerCase().split(/[^a-z]+/).filter((w) => w.length > 2 && !["and", "the", "for", "head"].includes(w));

/** Does this job title look like one of the personas we want to reach? */
export function personaMatch(title: string, icp: ICP | null): boolean {
  return !!matchPersona(title, icp);
}

/** The persona in the plan that this job title matches, if any. */
export function matchPersona(title: string, icp: ICP | null): IcpPersona | null {
  if (!icp) return null;
  const t = new Set(words(title));
  return (
    icp.personas.find((p) => {
      const wanted = [...words(p.title), ...words(p.function)];
      return wanted.filter((w) => t.has(w)).length >= 1 || (/(owner|founder|ceo|chief)/i.test(title) && /(owner|founder|ceo|chief)/i.test(p.title));
    }) || null
  );
}

/** Who at this company to write to: the person with a warm path first, then a target persona, then a checked address. */
export function bestContact(lead: Lead, icp: ICP | null): Contact | null {
  if (lead.contacts.length === 0) return null;
  const warm = lead.warmPaths.find((w) => w.kind !== "referral");
  const rank = (c: Contact) => (warm && warm.contactId === c.id ? 8 : 0) + (personaMatch(c.title, icp) ? 4 : 0) + (c.emailStatus === "verified" ? 2 : c.email ? 1 : 0);
  return [...lead.contacts].sort((a, b) => rank(b) - rank(a))[0];
}

export function strongestSignal(signals: Signal[], now = Date.now()): Signal | null {
  let best: Signal | null = null;
  let bestPoints = -1;
  for (const s of signals) {
    const points = (SIGNAL_POINTS[s.kind] ?? 6) * recency(s.date, now);
    if (points > bestPoints) {
      best = s;
      bestPoints = points;
    }
  }
  return best;
}

export function scoreLead(lead: Lead, icp: ICP | null, now = Date.now()): LeadScore {
  const parts: ScorePart[] = [];

  const segments = icp ? [...icp.industries.map((i) => i.name), ...icp.expansions.filter((e) => e.status === "accepted").map((e) => e.segment)] : [];
  const inSegment = segments.some((s) => s.toLowerCase() === lead.segment.toLowerCase());
  parts.push({ label: "Segment", points: inSegment ? 20 : 8, max: 20, note: inSegment ? `In a target segment: ${lead.segment}` : "Outside the named segments" });

  parts.push({ label: "Size", points: lead.size ? 12 : 5, max: 12, note: lead.size ? lead.size : "Size not found in the sources" });

  const matched = lead.contacts.some((c) => personaMatch(c.title, icp));
  const personaPoints = matched ? 16 : lead.contacts.length ? 8 : 0;
  parts.push({ label: "Buyer found", points: personaPoints, max: 16, note: matched ? "A contact matches a target persona" : lead.contacts.length ? "A contact, but not a target persona" : "No named contact yet" });

  const proof = lead.evidence.filter((e) => e.verified).length;
  parts.push({ label: "Proof", points: Math.min(12, proof * 6), max: 12, note: `${proof} quote${proof === 1 ? "" : "s"} checked against the source` });

  let signalPoints = 0;
  for (const s of lead.signals) signalPoints += (SIGNAL_POINTS[s.kind] ?? 6) * recency(s.date, now);
  signalPoints = Math.min(24, Math.round(signalPoints));
  const top = strongestSignal(lead.signals, now);
  parts.push({ label: "Why now", points: signalPoints, max: 24, note: top ? top.summary : "No buying signal found" });

  parts.push({ label: "Competitor in use", points: lead.usesCompetitor ? 7 : 0, max: 7, note: lead.usesCompetitor ? `Uses ${lead.usesCompetitor.name}` : "None found" });

  parts.push({ label: "Warm path", points: lead.warmPaths.length ? 9 : 0, max: 9, note: lead.warmPaths.length ? lead.warmPaths[0].note : "No shared school or employer found" });

  const fit = parts.slice(0, 4).reduce((n, p) => n + p.points, 0);
  const intent = parts.slice(4).reduce((n, p) => n + p.points, 0);
  const total = Math.min(100, fit + intent);
  const tier = lead.negative ? "C" : total >= 70 ? "A" : total >= 45 ? "B" : "C";
  return { total, fit, intent, tier, parts };
}

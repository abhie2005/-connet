// What the dashboard at /home shows, derived from the workspace and nothing else.
// Every number here can be traced to something the app actually recorded: the ledger, the audit
// trail, the activity feed, the run's own counters, the leads and the messages. There is no
// sample series in this file on purpose — a surface that invents its own figures would undo the
// one claim the product makes.
import type { Lead, Workspace } from "./types";

export interface LaneItem {
  id: string;
  name: string;
  detail: string;
  meta: string;
  when: string;
}

export interface Lane {
  key: string;
  label: string;
  note: string;
  items: LaneItem[];
}

export interface DaySplit {
  label: string;
  lower: number;
  upper: number;
}

export interface Slice {
  label: string;
  value: number;
}

export interface Derived {
  started: boolean;
  productName: string;
  /** headline */
  leads: number;
  tiers: { a: number; b: number; c: number };
  /** tiles */
  waiting: number;
  sent: number;
  contacts: number;
  jobPosts: number;
  quotesVerified: number;
  quotesDropped: number;
  searches: number;
  llmCalls: number;
  graphQueries: number;
  creditsLeft: number;
  creditsSpent: number;
  creditsStart: number;
  agentActions: number;
  repActions: number;
  /** series */
  work: DaySplit[];
  spend: DaySplit[];
  signalMix: Slice[];
  segments: DaySplit[];
  lanes: Lane[];
  activity: { id: string; event: string; source: string; status: string; time: string }[];
}

const day = (iso: string) => {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  return new Date(t).toISOString().slice(0, 10);
};

const short = (iso: string) => {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const clock = (iso: string) => {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  return new Date(t).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
};

/** The last `n` days that actually carry something, oldest first. */
function buckets<T>(rows: T[], at: (row: T) => string, n = 7): { key: string; label: string; rows: T[] }[] {
  const by = new Map<string, T[]>();
  for (const row of rows) {
    const k = day(at(row));
    if (!k) continue;
    if (!by.has(k)) by.set(k, []);
    by.get(k)!.push(row);
  }
  return [...by.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-n)
    .map(([key, rows]) => ({ key, label: short(`${key}T12:00:00Z`), rows }));
}

const laneOf = (l: Lead) => (l.status === "suppressed" ? "out" : l.status === "held" ? "held" : "active");

export function derive(ws: Workspace | null, days = 7): Derived {
  const empty: Derived = {
    started: false,
    productName: "",
    leads: 0,
    tiers: { a: 0, b: 0, c: 0 },
    waiting: 0,
    sent: 0,
    contacts: 0,
    jobPosts: 0,
    quotesVerified: 0,
    quotesDropped: 0,
    searches: 0,
    llmCalls: 0,
    graphQueries: 0,
    creditsLeft: 0,
    creditsSpent: 0,
    creditsStart: 0,
    agentActions: 0,
    repActions: 0,
    work: [],
    spend: [],
    signalMix: [],
    segments: [],
    lanes: [],
    activity: [],
  };
  if (!ws || !ws.product) return empty;

  const leads = ws.leads || [];
  const messages = ws.messages || [];
  const audit = ws.audit || [];
  const ledger = ws.credits?.ledger || [];
  const stats = ws.run?.stats;

  const drafts = messages.filter((m) => m.status === "draft");
  const sent = messages.filter((m) => m.status === "sent");

  // Credits: the ledger holds the truth, and spends are negative.
  const spentTotal = ledger.filter((l) => l.credits < 0).reduce((n, l) => n + Math.abs(l.credits), 0);
  const left = ws.credits?.balance ?? 0;

  // What the agent did against what the rep did, by day. This is the split the audit trail was
  // built to answer, so it is the one honest two-series the workspace can offer.
  const work = buckets(audit, (a) => a.at, days).map((b) => ({
    label: b.label,
    lower: b.rows.filter((r) => r.actor === "agent").length,
    upper: b.rows.filter((r) => r.actor === "rep").length,
  }));

  // Credits spent on finding against credits spent on writing, by day.
  const FINDING = new Set(["discovery.run", "lead.enriched", "radar.scan", "graph.query"]);
  const spend = buckets(ledger.filter((l) => l.credits < 0), (l) => l.at, days).map((b) => ({
    label: b.label,
    lower: b.rows.filter((r) => FINDING.has(r.event)).reduce((n, r) => n + Math.abs(r.credits), 0),
    upper: b.rows.filter((r) => !FINDING.has(r.event)).reduce((n, r) => n + Math.abs(r.credits), 0),
  }));

  // Why the agent thinks each account is buying, by kind.
  const kinds = new Map<string, number>();
  for (const l of leads) for (const s of l.signals) kinds.set(s.kind, (kinds.get(s.kind) || 0) + 1);
  const signalMix = [...kinds.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);

  // Accounts per segment, split by whether they have a reason to write.
  const bySeg = new Map<string, { lower: number; upper: number }>();
  for (const l of leads) {
    const seg = l.segment || "Unsegmented";
    const row = bySeg.get(seg) || { lower: 0, upper: 0 };
    if (l.signals.length > 0) row.lower += 1;
    else row.upper += 1;
    bySeg.set(seg, row);
  }
  const segments = [...bySeg.entries()]
    .map(([label, v]) => ({ label, ...v }))
    .sort((a, b) => b.lower + b.upper - (a.lower + a.upper))
    .slice(0, 7);

  const company = (id: string) => leads.find((l) => l.id === id)?.company || "an account";
  const lane = (key: string, label: string, note: string, items: LaneItem[]): Lane => ({ key, label, note, items });

  const lanes: Lane[] = [
    lane(
      "waiting",
      "Waiting for you",
      "Drafted, reviewed, and stopped until you approve",
      drafts.map((m) => ({ id: m.id, name: m.to || company(m.leadId), detail: m.subject, meta: company(m.leadId), when: clock(m.createdAt) })),
    ),
    lane(
      "ready",
      "A reason to write",
      "Scored, with a buying signal, no draft yet",
      leads
        .filter((l) => laneOf(l) === "active" && !messages.some((m) => m.leadId === l.id))
        .map((l) => ({ id: l.id, name: l.company, detail: l.whyNow || "Scored and ready", meta: `${l.score.total}/100 · tier ${l.score.tier}`, when: l.segment })),
    ),
    lane(
      "held",
      "On hold",
      "They fit, but nothing says they are buying",
      leads
        .filter((l) => laneOf(l) === "held")
        .map((l) => ({ id: l.id, name: l.company, detail: "No buying signal found yet", meta: `${l.score.total}/100`, when: l.segment })),
    ),
    lane(
      "out",
      "Left out",
      "A bad sign, or they asked not to be contacted",
      leads
        .filter((l) => laneOf(l) === "out")
        .map((l) => ({ id: l.id, name: l.company, detail: l.negative?.signal || "Do not contact", meta: `${l.score.total}/100`, when: l.segment })),
    ),
  ];

  const activity = (ws.activity || [])
    .slice(-14)
    .reverse()
    .map((a) => ({
      id: String(a.seq),
      event: a.text,
      source: a.agent,
      status: a.kind === "error" ? "Error" : a.kind === "flag" ? "Stopped" : a.kind === "query" ? "Graph query" : a.kind === "say" ? "Said" : "Step",
      time: clock(a.at),
    }));

  return {
    started: true,
    productName: ws.product.name,
    leads: leads.length,
    tiers: {
      a: leads.filter((l) => l.score.tier === "A").length,
      b: leads.filter((l) => l.score.tier === "B").length,
      c: leads.filter((l) => l.score.tier === "C").length,
    },
    waiting: drafts.length,
    sent: sent.length,
    contacts: leads.reduce((n, l) => n + l.contacts.length, 0),
    jobPosts: leads.reduce((n, l) => n + (l.jobPosts?.length || 0), 0),
    quotesVerified: stats?.claimsVerified ?? 0,
    quotesDropped: stats?.claimsDropped ?? 0,
    searches: stats?.searches ?? 0,
    llmCalls: stats?.llmCalls ?? 0,
    graphQueries: stats?.graphQueries ?? 0,
    creditsLeft: left,
    creditsSpent: spentTotal,
    creditsStart: left + spentTotal,
    agentActions: audit.filter((a) => a.actor === "agent").length,
    repActions: audit.filter((a) => a.actor === "rep").length,
    work,
    spend,
    signalMix,
    segments,
    lanes,
    activity,
  };
}

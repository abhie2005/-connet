// Shared shapes for the whole app. Server and client both import from here.

export type NodeLabel = "Product" | "Company" | "Person" | "Competitor" | "Signal" | "School";

export type EdgeType =
  | "WORKS_AT"
  | "PREVIOUSLY_EMPLOYED_AT"
  | "STUDIED_AT"
  | "COMPETES_WITH"
  | "MATCHED_TO"
  | "CONTACTED_VIA"
  | "REPLIED_TO"
  | "ABOUT"
  | "USES";

export type Props = Record<string, string | number | boolean | null>;

export interface GNode {
  id: string;
  label: NodeLabel;
  name: string;
  props: Props;
}

export interface GEdge {
  id: string;
  type: EdgeType;
  from: string;
  to: string;
  props: Props;
}

/** A page or record something was read from. Every fact on screen points at one of these. */
export interface Source {
  id: string;
  url: string;
  title: string;
  text: string; // what was actually retrieved; quotes are checked against this
  provider: "tavily" | "gemini" | "hunter" | "sample";
  fetchedAt: string;
}

/** A quote taken from a source. `verified` means our code found the quote in the retrieved text. */
export interface Evidence {
  sourceId: string;
  quote: string;
  verified: boolean;
}

export interface IcpIndustry {
  name: string;
  naics: string | null;
  confidence: number;
  why: string;
}

export interface IcpPersona {
  title: string;
  seniority: string;
  function: string;
  caresAbout: string;
  confidence: number;
}

export interface IcpTrigger {
  event: string;
  whyItMatters: string;
  confidence: number;
}

export interface IcpExpansion {
  id: string;
  segment: string;
  reasoning: string;
  confidence: number;
  status: "suggested" | "accepted" | "dismissed";
}

export interface SearchPlanItem {
  query: string;
  purpose: "accounts" | "signals" | "competitors";
  segment: string;
}

export interface ICP {
  summary: string;
  industries: IcpIndustry[];
  companySize: { headcount: string; revenue: string; confidence: number; why: string };
  personas: IcpPersona[];
  triggers: IcpTrigger[];
  negatives: { signal: string; why: string }[];
  regions: string[];
  expansions: IcpExpansion[];
  searchPlan: SearchPlanItem[];
}

export type SignalKind = "hiring" | "funding" | "launch" | "leadership" | "tech" | "expansion" | "other";

export interface Signal {
  id: string;
  kind: SignalKind;
  summary: string;
  date: string | null; // ISO date when the source gives one
  evidence: Evidence;
}

export interface Contact {
  id: string;
  name: string;
  title: string;
  seniority: string;
  linkedin: string | null;
  email: string | null;
  emailStatus: "verified" | "unverified" | "guess" | null;
  emailConfidence: number | null;
  emailSource: string | null;
  evidence: Evidence[];
}

/** A way to reach someone that is better than a cold email. */
export interface WarmPath {
  kind: "shared_school" | "shared_employer" | "referral";
  contactId: string;
  via: string; // the school, employer or person in the middle
  viaId: string;
  hops: string[]; // node ids along the path, founder first
  note: string;
  evidence: Evidence | null;
}

export type Stage = "matched" | "contacted" | "replied" | "meeting" | "won" | "lost";
export const STAGES: Stage[] = ["matched", "contacted", "replied", "meeting", "won", "lost"];
export const STAGE_NAMES: Record<Stage, string> = {
  matched: "Matched",
  contacted: "Contacted",
  replied: "Replied",
  meeting: "Meeting booked",
  won: "Closed",
  lost: "Lost",
};

export type Actor = "agent" | "rep";

export interface ScorePart {
  label: string;
  points: number;
  max: number;
  note: string;
}

export interface LeadScore {
  total: number; // 0 to 100
  fit: number;
  intent: number;
  tier: "A" | "B" | "C";
  parts: ScorePart[];
}

export interface Lead {
  id: string; // the Company node id
  company: string;
  domain: string | null;
  industry: string;
  size: string | null;
  location: string | null;
  segment: string;
  summary: string;
  evidence: Evidence[];
  signals: Signal[];
  contacts: Contact[];
  usesCompetitor: { name: string; evidence: Evidence } | null;
  negative: { signal: string; evidence: Evidence | null } | null;
  warmPaths: WarmPath[];
  score: LeadScore;
  whyNow: string | null;
  /** held: the agent found no reason to write yet. suppressed: a negative signal or do-not-contact. */
  status: "active" | "held" | "suppressed";
  enriched: boolean;
  stage: Stage;
  stageBy: Actor;
  stageAt: string;
}

export interface Competitor {
  id: string;
  name: string;
  category: "direct" | "indirect" | "alternative";
  positioning: string;
  pricing: string | null;
  ourEdge: string;
  evidence: Evidence[];
}

/** One numbered fact handed to the writer. The reviewer checks every claim against these. */
export interface Fact {
  n: number;
  text: string;
  sourceId: string | null;
  kind: "signal" | "company" | "contact" | "warm_path" | "product" | "competitor";
}

export interface Claim {
  text: string;
  fact: number | null;
  supported: boolean;
  note: string;
}

export interface Message {
  id: string;
  leadId: string;
  contactId: string | null;
  to: string; // display name
  toEmail: string | null;
  variant: "A" | "B";
  angle: string;
  subject: string;
  body: string;
  linkedinNote: string;
  facts: Fact[];
  claims: Claim[];
  review: { verdict: "pass" | "revised" | "needs_human"; rounds: number; notes: string[] };
  security: { ok: boolean; notes: string[] };
  status: "draft" | "sent" | "rejected";
  createdAt: string;
  decidedAt: string | null;
  editedByRep: boolean;
}

export type AgentName = "planner" | "builder" | "reviewer" | "security" | "system" | "rep";

export interface Activity {
  seq: number;
  at: string;
  agent: AgentName;
  /** say: a message to another agent or the rep. step: work it did. query: a graph query. flag: something it stopped. */
  kind: "say" | "step" | "query" | "flag" | "error";
  to: AgentName | null;
  text: string;
  detail: string | null; // a Cypher query, a list of dropped claims, ...
}

export interface AuditEntry {
  id: string;
  at: string;
  actor: Actor;
  agent: AgentName | null;
  action: string;
  leadId: string | null;
  messageId: string | null;
  from: string | null;
  to: string | null;
  note: string;
}

export interface LedgerEntry {
  at: string;
  event: "discovery.run" | "lead.enriched" | "outreach.drafted" | "outreach.sent" | "graph.query" | "credits.topup";
  credits: number; // negative = spent
  ref: string;
  synced: "sent" | "failed" | "local";
}

export interface Credits {
  balance: number;
  ledger: LedgerEntry[];
  flexprice: { configured: boolean; accepted: number; failed: number; wallet: number | null; lastError: string | null };
}

export interface RunStats {
  searches: number;
  sources: number;
  claimsProposed: number;
  claimsVerified: number;
  claimsDropped: number;
  companiesDropped: number;
  graphQueries: number;
  llmCalls: number;
  /** Lookups in this run that were answered from saved copies (lib/cache.ts) instead of the network. */
  replayed: number;
}

export interface Modes {
  llm: "gemini" | "sample";
  search: "tavily" | "gemini" | "sample";
  enrich: "hunter" | "sample";
  graph: "neo4j" | "embedded";
  billing: "flexprice" | "local";
  band: boolean;
  send: "simulate";
}

export interface Product {
  name: string;
  description: string;
  url: string;
  pricing: string;
  customers: string;
}

export interface Founder {
  name: string;
  schools: string[];
  employers: string[];
}

export interface Workspace {
  rev: number;
  product: Product | null;
  founder: Founder;
  icp: ICP | null;
  sources: Record<string, Source>;
  leads: Lead[];
  competitors: Competitor[];
  messages: Message[];
  activity: Activity[];
  audit: AuditEntry[];
  credits: Credits;
  run: {
    status: "idle" | "running" | "done" | "error";
    step: string;
    startedAt: string | null;
    finishedAt: string | null;
    error: string | null;
    stats: RunStats;
  };
  graph: { nodes: GNode[]; edges: GEdge[] };
  modes: Modes;
  doNotContact: string[]; // domains
}

export const COSTS = {
  "discovery.run": 5,
  "lead.enriched": 2,
  "outreach.drafted": 1,
} as const;

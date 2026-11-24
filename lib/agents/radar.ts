// The Hiring Radar. The rest of the pipeline finds companies first and then looks for a reason
// to write. This works the other way round: it watches job postings, and every posting that
// holds up becomes a lead with its "why now" already attached.
//
// A posting is kept only when its quote is on the page it cites and that page names the company
// (lib/verify.ts), exactly like every other fact in the app. The model proposes; this decides.
import { garbledName } from "../garbled";
import { companyId, slug } from "../ids";
import { llm } from "../providers/llm";
import type { Store } from "../store";
import type { ICP, JobPost, Lead, Signal, Source } from "../types";
import { checkEvidence, mentions } from "../verify";
import { EXTRACT_SYSTEM, addTally, keep, look, newLead, numbered, tally, type StepReport, type Tally } from "./discover";
import type { JobPostOut, JobsIn, JobsOut } from "./shapes";

/** Tavily costs real quota, so a scan reads a few pages per title and no more. */
const MAX_SEARCHES = 6;
const PAGES_PER_TITLE = 4;
const MAX_SHOWN = 10;

/** A posting for a function that does not exist yet, rather than a backfill. */
const FIRST_HIRE = /\b(first|founding|build (?:out )?the team|establish|stand up)\b/i;

export function isFirstHire(title: string, quote: string): boolean {
  return FIRST_HIRE.test(title) || FIRST_HIRE.test(quote);
}

/**
 * The 3 to 6 titles the Radar watches, read off the plan: the personas who buy this, plus any
 * trigger that names a role of its own ("Hiring a technology or AI lead").
 */
export function watchTitles(icp: ICP | null): string[] {
  if (!icp) return [];
  const out: string[] = [];
  const add = (text: string) => {
    const title = text.trim().replace(/^(?:a|an|the)\s+/i, "").replace(/\s+/g, " ");
    if (title.length < 3) return;
    if (!out.some((x) => x.toLowerCase() === title.toLowerCase())) out.push(title);
  };
  for (const p of icp.personas) add(p.title);
  for (const t of icp.triggers) {
    const m = /hiring\s+(?:a|an|its|their)?\s*(?:first\s+)?([^,.:]*?(?:lead|head|director|manager|officer|engineer|analyst)[a-z]*)/i.exec(t.event);
    if (m) add(m[1]);
  }
  return out.slice(0, MAX_SEARCHES);
}

function jobsPrompt(input: JobsIn): string {
  return `${numbered(input.shown)}

The sales team sells ${input.product.name}. It is watching for these roles: ${input.titles.join("; ")}.

Each numbered page above may be a job posting. For every posting you find, return the hiring company, the exact job title, the team it sits on, who it reports to, and the date it was posted. Only use the pages above. Quote the sentence that shows the company is hiring for this role, copied character for character from the page you cite. Skip anything you cannot quote. Skip pages that are news about hiring rather than a posting.

Return JSON: {"postings":[{"company":"","title":"","team":null,"reports_to":null,"date":"YYYY-MM-DD","source":1,"quote":""}]}`;
}

export interface RadarReport extends StepReport {
  titles: string[];
  searches: number;
  postings: JobPost[];
  /** Postings already in the graph, so a second scan is quiet instead of noisy. */
  known: number;
}

/** Keep a quote only if the page it came from names the company it is pinned on. */
function aboutCompany(s: Store, ev: ReturnType<typeof checkEvidence>, name: string) {
  if (!ev) return null;
  const src = s.state.sources[ev.sourceId];
  return src && mentions(src.title + " " + src.text, name) ? ev : { ...ev, verified: false };
}

function mergePosting(s: Store, out: JobPostOut, shown: Source[], t: Tally, fallbackSegment: string): { lead: Lead; job: JobPost | null } | null {
  const name = (out.company || "").trim();
  const title = (out.title || "").trim();
  if (name.length < 2 || garbledName(name) || title.length < 3) return null;

  const ev = aboutCompany(s, checkEvidence({ source: out.source, quote: out.quote }, shown), name);
  if (!keep(t, ev, `${name}, posting: "${String(out.quote || "").slice(0, 90)}"`)) return null;

  const id = companyId(name);
  const jobId = `job:${slug(name)}:${slug(title).slice(0, 32)}`;
  let lead = s.state.leads.find((l) => l.id === id) || null;

  // Already on the board: a rescan must not add it twice.
  if (lead && (lead.jobPosts || []).some((j) => j.id === jobId)) return { lead, job: null };

  if (!lead) {
    lead = newLead(name, fallbackSegment);
    s.state.leads.push(lead);
    s.audit("agent", "Found by the Hiring Radar", { agent: "builder", leadId: lead.id, to: "matched", note: title });
  }

  const team = out.team ? String(out.team).trim() || null : null;
  const reportsTo = out.reports_to ? String(out.reports_to).trim() || null : null;
  const date = out.date && !Number.isNaN(Date.parse(String(out.date))) ? new Date(String(out.date)).toISOString().slice(0, 10) : null;
  const firstHire = isFirstHire(title, ev.quote);
  const source = s.state.sources[ev.sourceId];

  const summary = `${firstHire ? "Hiring its first" : "Hiring a"} ${title}${team ? ` on the ${team} team` : ""}`;
  const signalId = `sig:${slug(name)}:${slug(title).slice(0, 32)}`;
  if (!lead.signals.some((x) => x.id === signalId)) lead.signals.push({ id: signalId, kind: "hiring", summary, date, evidence: ev } satisfies Signal);

  const job: JobPost = { id: jobId, companyId: lead.id, title, team, reportsTo, date, url: source?.url || "", firstHire, signalId, evidence: ev };
  lead.jobPosts = [...(lead.jobPosts || []), job];

  // The graph: Company -[:POSTED]-> JobPost -[:NEEDS]-> Product, with the Signal still ABOUT the
  // company, so scoring, people, warm paths and drafts carry on unchanged.
  const g = s.graph;
  g.upsertNode("Company", lead.id, lead.company, { segment: lead.segment, isTarget: true });
  g.upsertEdge("MATCHED_TO", lead.id, "product", { segment: lead.segment });
  g.upsertNode("JobPost", jobId, title, { date, team, reportsTo, firstHire, url: job.url });
  g.upsertEdge("POSTED", lead.id, jobId, {});
  g.upsertEdge("NEEDS", jobId, "product", {});
  g.upsertNode("Signal", signalId, summary, { kind: "hiring", date });
  g.upsertEdge("ABOUT", signalId, lead.id, {});
  return { lead, job };
}

/**
 * One pass of the Radar: watch the titles the plan implies, read the postings, keep the ones
 * whose quote holds up, and turn each into a hiring signal on a lead.
 */
export async function findJobs(s: Store): Promise<RadarReport> {
  const icp = s.state.icp;
  const titles = watchTitles(icp);
  const t = tally();
  const empty: RadarReport = { ...t, leads: [], titles, searches: 0, postings: [], known: 0 };
  if (titles.length === 0) return empty;

  const segments = icp ? icp.industries.map((i) => i.name) : [];
  const fallbackSegment = segments[0] || "Job postings";
  const region = icp?.regions?.[0] || "";

  // One search per title, deduped by URL, so the quota goes on new pages and not repeats.
  const byUrl = new Map<string, Source>();
  let searches = 0;
  let searchError: string | undefined;
  for (const title of titles) {
    if (searches >= MAX_SEARCHES) break;
    searches += 1;
    const query = `"${title}" job posting ${segments[0] || ""} ${region}`.replace(/\s+/g, " ").trim();
    const found = await look(s, query, { purpose: "jobs", segment: segments[0] }, PAGES_PER_TITLE, (why) => (searchError = why));
    for (const src of found) if (!byUrl.has(src.url)) byUrl.set(src.url, src);
  }

  const shown = [...byUrl.values()].slice(0, MAX_SHOWN);
  if (shown.length === 0) return { ...empty, searches, searchError };

  const input: JobsIn = { shown, titles, product: s.state.product! };
  s.state.run.stats.llmCalls += 1;
  const out = await llm().json<JobsOut>({ task: "extract_jobs", system: EXTRACT_SYSTEM, user: jobsPrompt(input), input });

  const leads: Lead[] = [];
  const postings: JobPost[] = [];
  let known = 0;
  for (const posting of out.postings || []) {
    const merged = mergePosting(s, posting, shown, t, fallbackSegment);
    if (!merged) continue;
    if (!merged.job) {
      known += 1;
      continue;
    }
    postings.push(merged.job);
    if (!leads.includes(merged.lead)) leads.push(merged.lead);
  }
  addTally(s, t);
  s.touch();
  return { ...t, leads, titles, searches, postings, known, pages: shown.length, searchError };
}

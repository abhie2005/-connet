// Steps 2 to 4: find accounts, their buying signals, the people to talk to, and competitors.
// In every step the model only proposes. A proposal is kept when its quote is found, word for
// word, in the page it cites (lib/verify.ts); otherwise it is dropped and counted.
import { companyId, competitorId, canonicalName, personId, schoolId, slug } from "../ids";
import { llm } from "../providers/llm";
import { search, type FoundPage, type SearchHint } from "../providers/search";
import type { Store } from "../store";
import type { Competitor, Contact, Evidence, Lead, Signal, SignalKind, Source } from "../types";
import { checkEvidence, mentions } from "../verify";
import type { AccountOut, AccountsIn, AccountsOut, CompetitorsIn, CompetitorsOut, PeopleIn, PeopleOut } from "./shapes";

const EXTRACT_SYSTEM = `You extract facts from web pages for a sales team. You may only state what the pages say. Every fact needs a quote copied exactly, character for character, from the numbered page it came from: do not fix typos, do not shorten words, do not join distant sentences. If you cannot quote it, leave it out. Never use outside knowledge. You return only JSON.`;

const SIGNAL_KINDS: SignalKind[] = ["hiring", "funding", "launch", "leadership", "tech", "expansion", "other"];
const NOT_COMPANY_SITES = /(linkedin|crunchbase|wikipedia|facebook|twitter|x\.com|youtube|indeed|glassdoor|medium|substack|reddit|news|times|post|journal|techcrunch|forbes|bloomberg|prnewswire|businesswire|yahoo|google)\./i;

export function numbered(shown: Source[]): string {
  return shown.map((s, i) => `[${i + 1}] ${s.title}\nURL: ${s.url}\n${s.text}`).join("\n\n");
}

async function look(s: Store, query: string, hint: SearchHint, max = 5, failed?: (why: string) => void): Promise<Source[]> {
  s.state.run.stats.searches += 1;
  let pages: FoundPage[] = [];
  try {
    pages = await search(query, hint, max);
  } catch (e) {
    s.log("builder", "error", `Search failed for "${query}": ${(e as Error).message}`);
    failed?.((e as Error).message);
  }
  return pages.filter((p) => p.text.trim().length > 40).map((p) => s.addSource(p));
}

interface Tally {
  proposed: number;
  verified: number;
  dropped: string[];
}

const tally = (): Tally => ({ proposed: 0, verified: 0, dropped: [] });

function keep(t: Tally, ev: Evidence | null, what: string): ev is Evidence {
  t.proposed += 1;
  if (ev && ev.verified) {
    t.verified += 1;
    return true;
  }
  t.dropped.push(what);
  return false;
}

function addTally(s: Store, t: Tally) {
  const stats = s.state.run.stats;
  stats.claimsProposed += t.proposed;
  stats.claimsVerified += t.verified;
  stats.claimsDropped += t.dropped.length;
}

/** Take a website only if the pages show it; never invent one. */
function findDomain(proposed: string | null | undefined, name: string, shown: Source[], evidence: Evidence[], s: Store): string | null {
  const clean = (proposed || "").toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").trim();
  if (clean && /^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(clean) && shown.some((p) => (p.url + " " + p.text).toLowerCase().includes(clean))) return clean;
  const key = slug(canonicalName(name)).replace(/-/g, "");
  for (const ev of evidence) {
    const src = s.state.sources[ev.sourceId];
    if (!src) continue;
    try {
      const host = new URL(src.url).hostname.replace(/^www\./, "");
      const label = host.split(".").slice(0, -1).join("").replace(/-/g, "");
      if (!NOT_COMPANY_SITES.test(host) && label.length >= 4 && key.includes(label)) return host;
    } catch {
      // not a URL
    }
  }
  return null;
}

function newLead(name: string, segment: string): Lead {
  return {
    id: companyId(name),
    company: canonicalName(name),
    domain: null,
    industry: "",
    size: null,
    location: null,
    segment,
    summary: "",
    evidence: [],
    signals: [],
    contacts: [],
    usesCompetitor: null,
    negative: null,
    warmPaths: [],
    score: { total: 0, fit: 0, intent: 0, tier: "C", parts: [] },
    whyNow: null,
    status: "held",
    enriched: false,
    stage: "matched",
    stageBy: "agent",
    stageAt: new Date().toISOString(),
  };
}

const sameQuote = (a: Evidence, b: Evidence) => a.sourceId === b.sourceId && a.quote === b.quote;

function mergeAccount(s: Store, out: AccountOut, shown: Source[], segments: string[], fallbackSegment: string, t: Tally, onlyExisting: boolean): Lead | null {
  const name = (out.name || "").trim();
  if (name.length < 2) return null;
  const id = companyId(name);
  let lead = s.state.leads.find((l) => l.id === id) || null;
  if (!lead && onlyExisting) return null;

  // A quote only counts for this company if the page it is from actually names the company.
  const about = (ev: Evidence | null) => {
    if (!ev) return null;
    const src = s.state.sources[ev.sourceId];
    return src && mentions(src.title + " " + src.text, name) ? ev : { ...ev, verified: false };
  };

  const evidence: Evidence[] = [];
  for (const q of out.evidence || []) {
    const ev = about(checkEvidence(q, shown));
    if (keep(t, ev, `${name}: "${String(q?.quote || "").slice(0, 90)}"`)) evidence.push(ev);
  }
  const signals: Signal[] = [];
  for (const sig of out.signals || []) {
    const ev = about(checkEvidence(sig, shown));
    if (!keep(t, ev, `${name}, signal: "${String(sig?.quote || "").slice(0, 90)}"`)) continue;
    const kind = SIGNAL_KINDS.includes(sig.kind as SignalKind) ? (sig.kind as SignalKind) : "other";
    const date = sig.date && !Number.isNaN(Date.parse(sig.date)) ? new Date(sig.date).toISOString().slice(0, 10) : null;
    signals.push({ id: `sig:${slug(name)}:${slug(sig.summary).slice(0, 32)}`, kind, summary: String(sig.summary || "").trim(), date, evidence: ev });
  }
  let uses: Lead["usesCompetitor"] = null;
  if (out.uses_competitor?.name) {
    const ev = about(checkEvidence(out.uses_competitor, shown));
    if (keep(t, ev, `${name} uses ${out.uses_competitor.name}`)) uses = { name: out.uses_competitor.name.trim(), evidence: ev };
  }
  let negative: Lead["negative"] = null;
  if (out.negative?.signal) {
    const ev = about(checkEvidence(out.negative, shown));
    if (keep(t, ev, `${name}, bad fit: ${out.negative.signal}`)) negative = { signal: out.negative.signal.trim(), evidence: ev };
  }

  if (!lead) {
    // A new company needs at least one checked quote about it, or it does not exist for us.
    if (evidence.length + signals.length === 0 && !negative) {
      s.state.run.stats.companiesDropped += 1;
      return null;
    }
    const segment = segments.find((x) => x.toLowerCase() === String(out.segment || "").toLowerCase()) || fallbackSegment;
    lead = newLead(name, segment);
    s.state.leads.push(lead);
    s.audit("agent", "Matched to the ICP", { agent: "builder", leadId: lead.id, to: "matched", note: segment });
  }

  for (const ev of evidence) if (!lead.evidence.some((e) => sameQuote(e, ev))) lead.evidence.push(ev);
  for (const sig of signals) if (!lead.signals.some((x) => x.id === sig.id)) lead.signals.push(sig);
  if (uses && !lead.usesCompetitor) lead.usesCompetitor = uses;
  if (negative && !lead.negative) lead.negative = negative;
  lead.industry = lead.industry || String(out.industry || "").trim();
  lead.size = lead.size || (out.size ? String(out.size).trim() : null);
  lead.location = lead.location || (out.location ? String(out.location).trim() : null);
  lead.summary = lead.summary || String(out.summary || "").trim();
  lead.domain = lead.domain || findDomain(out.domain, name, shown, [...evidence, ...signals.map((x) => x.evidence)], s);

  // The graph.
  const g = s.graph;
  g.upsertNode("Company", lead.id, lead.company, { domain: lead.domain, industry: lead.industry, segment: lead.segment, isTarget: true });
  g.upsertEdge("MATCHED_TO", lead.id, "product", { segment: lead.segment });
  for (const sig of signals) {
    g.upsertNode("Signal", sig.id, sig.summary, { kind: sig.kind, date: sig.date });
    g.upsertEdge("ABOUT", sig.id, lead.id, {});
  }
  if (uses) {
    const cid = competitorId(uses.name);
    g.upsertNode("Competitor", cid, uses.name, {});
    g.upsertEdge("COMPETES_WITH", cid, "product", {});
    g.upsertEdge("USES", lead.id, cid, {});
  }
  return lead;
}

// The first round's wording is left exactly as it was, so answers saved from earlier runs still
// replay. The wider round reads more pages and is told that a list of companies is a fine source.
function accountsPrompt(input: AccountsIn, negatives: string[], wide = false): string {
  const focus = input.focus
    ? `Only report on this one organisation: ${input.focus}. Look for recent buying signals about it.`
    : wide
      ? `Report organisations that could BUY the product (not directories, not the publisher of a list, not the product's competitors). A page that lists, ranks or reports on several such organisations, or a job post by one, is a good source: report the organisations it names, each with its own quote. At most 8, the best fits first.`
      : `Report organisations that could BUY the product (not directories, not the publisher of a list, not the product's competitors). At most 6, the best fits first.`;
  return `THE PRODUCT BEING SOLD
${input.product.name}: ${input.product.description}

TARGET SEGMENTS: ${input.segments.join("; ")}
SIGNS OF A BAD FIT: ${negatives.join("; ") || "(none given)"}

PAGES
${numbered(input.shown)}

${focus}
Return JSON:
{"companies": [{
  "name": "organisation name as written on the page",
  "domain": "its website domain ONLY if a page shows it, else null",
  "industry": "what it does, a few words",
  "size": "size as the page states it (sites, staff, customers), else null",
  "location": "where it operates, else null",
  "segment": "exactly one of the target segments",
  "summary": "one sentence on why it fits, using only what the pages say",
  "evidence": [{"source": page number, "quote": "exact words from that page showing it is this kind of organisation"}],
  "signals": [{"kind": "hiring|funding|launch|leadership|tech|expansion|other", "summary": "what happened, one short sentence", "date": "YYYY-MM-DD if the page gives a date, else null", "source": page number, "quote": "exact words from that page"}],
  "uses_competitor": {"name": "a competing or substitute tool the page says they use", "source": page number, "quote": "exact words"} or null,
  "negative": {"signal": "which sign of a bad fit", "source": page number, "quote": "exact words"} or null
}]}
Every quote must be copied exactly from the page with that number. Keep quotes short: 5 to 25 words, one sentence or part of one.`;
}

export interface StepReport {
  proposed: number;
  verified: number;
  dropped: string[];
  leads: Lead[];
  /** Set by a search for accounts, so a run that finds nobody can say why. */
  pages?: number;
  named?: number;
  searchError?: string;
}

/** Run one search and pull accounts out of what it found. */
export async function findAccounts(s: Store, query: string, segment: string, focus: string | null = null, max = 5): Promise<StepReport> {
  const icp = s.state.icp!;
  let searchError: string | undefined;
  const shown = await look(s, query, focus ? { purpose: "signals", company: focus } : { purpose: "accounts", segment }, max, (why) => (searchError = why));
  const t = tally();
  const leads: Lead[] = [];
  if (shown.length === 0) return { ...t, leads, pages: 0, named: 0, searchError };
  const segments = [...icp.industries.map((i) => i.name), ...icp.expansions.filter((e) => e.status === "accepted").map((e) => e.segment)];
  const input: AccountsIn = { shown, segments, focus, product: s.state.product! };
  s.state.run.stats.llmCalls += 1;
  const out = await llm().json<AccountsOut>({ task: "extract_accounts", system: EXTRACT_SYSTEM, user: accountsPrompt(input, icp.negatives.map((n) => n.signal), max > 5), input });
  for (const company of out.companies || []) {
    if (focus && companyId(company.name || "") !== companyId(focus)) continue;
    const lead = mergeAccount(s, company, shown, segments, segment, t, !!focus);
    if (lead && !leads.includes(lead)) leads.push(lead);
  }
  addTally(s, t);
  s.touch();
  return { ...t, leads, pages: shown.length, named: (out.companies || []).length };
}

function peoplePrompt(input: PeopleIn): string {
  return `PAGES
${numbered(input.shown)}

COMPANIES WE CARE ABOUT: ${input.companies.join("; ")}
ROLES WE WANT TO REACH: ${input.titles.join("; ")}
THE FOUNDER'S OWN SCHOOLS AND EMPLOYERS: ${input.anchors.join("; ") || "(none given)"}

List people the pages say currently work at one of those companies, in or near the wanted roles (decision makers first). Return JSON:
{"people": [{
  "name": "full name",
  "title": "current job title as the page states it",
  "seniority": "owner|executive|vp|director|manager|other",
  "company": "exactly one of the companies above",
  "source": page number,
  "quote": "exact words from that page that contain the person's name and their role or company",
  "studied_at": [{"school": "school name (if it is one of the founder's schools, use the founder's spelling)", "source": page number, "quote": "exact words showing this person studied there"}],
  "previously_at": [{"company": "a former employer (if it is one of the founder's employers, use the founder's spelling)", "source": page number, "quote": "exact words showing this person worked there before"}]
}]}
Only include a school or former employer when a page states it for THIS person. Every quote must be copied exactly; keep each one short (5 to 25 words). If the pages name nobody suitable, return {"people": []}.`;
}

function mergePeople(s: Store, out: PeopleOut, shown: Source[], t: Tally): Contact[] {
  const added: Contact[] = [];
  for (const p of out.people || []) {
    const name = String(p.name || "").replace(/^(dr|mr|ms|mrs|prof)\.?\s+/i, "").trim();
    const lead = s.state.leads.find((l) => l.id === companyId(String(p.company || "")));
    if (!lead || name.split(" ").length < 2) continue;
    let ev = checkEvidence(p, shown);
    const last = name.split(" ").slice(-1)[0];
    if (ev && !mentions(ev.quote, last)) ev = { ...ev, verified: false }; // the quote must name the person
    if (ev) {
      const src = s.state.sources[ev.sourceId];
      if (!src || !mentions(src.title + " " + src.text, lead.company)) ev = { ...ev, verified: false }; // and the page, the company
    }
    if (!keep(t, ev, `${name} at ${lead.company}: "${String(p.quote || "").slice(0, 80)}"`)) continue;
    const id = personId(name, lead.company);
    let contact = lead.contacts.find((c) => c.id === id);
    const src = s.state.sources[ev.sourceId];
    const linkedin = src && /linkedin\.com\/in\//i.test(src.url) ? src.url : null;
    if (!contact) {
      contact = { id, name, title: String(p.title || "").trim(), seniority: String(p.seniority || "").trim(), linkedin, email: null, emailStatus: null, emailConfidence: null, emailSource: null, evidence: [ev] };
      lead.contacts.push(contact);
      added.push(contact);
    } else {
      if (!contact.evidence.some((e) => sameQuote(e, ev!))) contact.evidence.push(ev);
      contact.linkedin = contact.linkedin || linkedin;
    }
    const g = s.graph;
    g.upsertNode("Person", id, name, { title: contact.title, seniority: contact.seniority, linkedin: contact.linkedin });
    g.upsertEdge("WORKS_AT", id, lead.id, { title: contact.title });

    for (const school of p.studied_at || []) {
      const sev = checkEvidence(school, shown);
      const ok = sev && mentions(sev.quote, school.school) ? sev : sev ? { ...sev, verified: false } : null;
      if (!keep(t, ok, `${name} studied at ${school.school}`)) continue;
      const sid = schoolId(school.school);
      g.upsertNode("School", sid, canonicalName(school.school), {});
      g.upsertEdge("STUDIED_AT", id, sid, { quote: ok.quote, sourceId: ok.sourceId });
    }
    for (const job of p.previously_at || []) {
      const jev = checkEvidence(job, shown);
      const ok = jev && mentions(jev.quote, job.company) ? jev : jev ? { ...jev, verified: false } : null;
      if (!keep(t, ok, `${name} previously at ${job.company}`)) continue;
      const cid = companyId(job.company);
      if (!s.graph.memory.nodes.has(cid)) g.upsertNode("Company", cid, canonicalName(job.company), { isTarget: false });
      g.upsertEdge("PREVIOUSLY_EMPLOYED_AT", id, cid, { quote: ok.quote, sourceId: ok.sourceId });
    }
  }
  return added;
}

/** Find the people to talk to at one account. `anchor` makes it a warm-path search. */
export async function findPeople(s: Store, lead: Lead, anchor: string | null = null): Promise<StepReport & { contacts: Contact[] }> {
  const icp = s.state.icp!;
  const titles = icp.personas.map((p) => p.title);
  const query = anchor ? `"${lead.company}" "${anchor}" ${titles[0] || ""} linkedin` : `"${lead.company}" ${titles.slice(0, 3).join(" OR ")} leadership team`;
  const shown = await look(s, query, { purpose: anchor ? "warm" : "people", company: lead.company }, 5);
  const t = tally();
  if (shown.length === 0) return { ...t, leads: [lead], contacts: [] };
  const founder = s.state.founder;
  const input: PeopleIn = { shown, companies: [lead.company], titles, anchors: [...founder.schools, ...founder.employers] };
  s.state.run.stats.llmCalls += 1;
  const out = await llm().json<PeopleOut>({ task: "extract_people", system: EXTRACT_SYSTEM, user: peoplePrompt(input), input });
  const contacts = mergePeople(s, out, shown, t);
  addTally(s, t);
  s.touch();
  return { ...t, leads: [lead], contacts };
}

function competitorsPrompt(input: CompetitorsIn): string {
  return `OUR PRODUCT
${input.product.name}: ${input.product.description}

PAGES
${numbered(input.shown)}

List products the pages describe that a buyer might choose instead of ours. Return JSON:
{"competitors": [{
  "name": "product or company name",
  "category": "direct (same job, same buyer) | indirect (same buyer, different approach) | alternative (what they do today instead)",
  "positioning": "what it says it does, one sentence, from the page",
  "pricing": "pricing as the page states it, else null",
  "our_edge": "one sentence: how our product differs, using only our description above and what the page says about them",
  "evidence": [{"source": page number, "quote": "exact words from that page"}]
}]}
At most 5. Every quote must be copied exactly; keep each one short (5 to 25 words).`;
}

export async function findCompetitors(s: Store, query: string): Promise<StepReport & { competitors: Competitor[] }> {
  const shown = await look(s, query, { purpose: "competitors" }, 5);
  const t = tally();
  const found: Competitor[] = [];
  if (shown.length === 0) return { ...t, leads: [], competitors: found };
  const input: CompetitorsIn = { shown, product: s.state.product! };
  s.state.run.stats.llmCalls += 1;
  const out = await llm().json<CompetitorsOut>({ task: "extract_competitors", system: EXTRACT_SYSTEM, user: competitorsPrompt(input), input });
  for (const c of out.competitors || []) {
    const name = String(c.name || "").trim();
    if (!name || name.toLowerCase() === s.state.product!.name.toLowerCase()) continue;
    const evidence: Evidence[] = [];
    for (const q of c.evidence || []) {
      const ev = checkEvidence(q, shown);
      if (keep(t, ev, `${name}: "${String(q?.quote || "").slice(0, 90)}"`)) evidence.push(ev);
    }
    if (evidence.length === 0) continue;
    const id = competitorId(name);
    const category = /indirect/i.test(c.category) ? "indirect" : /alternative/i.test(c.category) ? "alternative" : "direct";
    let comp = s.state.competitors.find((x) => x.id === id);
    if (!comp) {
      comp = { id, name, category, positioning: String(c.positioning || "").trim(), pricing: c.pricing ? String(c.pricing).trim() : null, ourEdge: String(c.our_edge || "").trim(), evidence };
      s.state.competitors.push(comp);
      found.push(comp);
    }
    s.graph.upsertNode("Competitor", id, name, { category, pricing: comp.pricing });
    s.graph.upsertEdge("COMPETES_WITH", id, "product", { category });
  }
  addTally(s, t);
  s.touch();
  return { ...t, leads: [], competitors: found };
}

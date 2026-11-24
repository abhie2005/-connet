// The sample model. It answers each task from the made-up data in data.ts, in the same JSON
// shapes a real model is asked for, so every other part of the app runs exactly as it does live.
import type {
  AccountsIn, AccountsOut, CompetitorsIn, CompetitorsOut, IcpOut, PeopleIn, PeopleOut,
  ReplyIn, ReplyOut, ReviewIn, ReviewOut, WriteIn, WriteOut,
} from "../agents/shapes";
import { ACCOUNTS, COMPETITORS, PEOPLE } from "./data";

const ICP: IcpOut = {
  summary:
    "Organisations that teach children in person from printed worksheets, feel pressure to offer AI help, and are afraid of answer-copying. Glyph fits where the paper stays and the tutor's time is short.",
  industries: [
    { name: "Tutoring center chains", naics: "611691", confidence: 0.9, why: "Students already work on printed packets with one tutor for several children; a hint on demand stretches each tutor." },
    { name: "Test prep companies", naics: "611691", confidence: 0.78, why: "Practice is paper-heavy and scratch work matters; they sell results and want more practice per hour." },
    { name: "Charter school networks", naics: "611110", confidence: 0.62, why: "Central teams choose classroom tools for many campuses, and handwritten work is still the norm in K-8." },
    { name: "Worksheet publishers", naics: "511130", confidence: 0.55, why: "A partner channel: their printed packets are what Glyph reads." },
  ],
  company_size: { headcount: "50 to 2,000 staff", revenue: "$2M to $80M", confidence: 0.7, why: "Big enough to have several sites and someone who owns curriculum; small enough to decide in one term." },
  personas: [
    { title: "Head of Academics", seniority: "executive", function: "Curriculum", cares_about: "Learning outcomes and parent trust; does not want an answer machine.", confidence: 0.88 },
    { title: "Director of Curriculum", seniority: "director", function: "Curriculum", cares_about: "Materials that work with what is already printed.", confidence: 0.84 },
    { title: "Owner or CEO", seniority: "owner", function: "Leadership", cares_about: "Tutor cost per student and a reason for parents to choose them.", confidence: 0.7 },
    { title: "Director of Instructional Technology", seniority: "director", function: "Technology", cares_about: "Tools that are safe, simple to roll out, and do not need a device per child.", confidence: 0.66 },
  ],
  triggers: [
    { event: "Hiring many tutors or opening new sites", why_it_matters: "Tutor time is the bottleneck; a hint on demand lets one tutor cover more tables.", confidence: 0.86 },
    { event: "A new funding round", why_it_matters: "Money and a mandate to add AI-assisted practice.", confidence: 0.74 },
    { event: "Writing an AI policy", why_it_matters: "They are choosing which AI tools to allow; hints-only is exactly Glyph.", confidence: 0.82 },
    { event: "Hiring a technology or AI lead", why_it_matters: "A new owner for tool decisions, who will be evaluating vendors.", confidence: 0.7 },
    { event: "Launching new printed materials", why_it_matters: "A natural moment to add feedback on the page.", confidence: 0.58 },
  ],
  negatives: [
    { signal: "Fully online, no paper", why: "Glyph reads paper on a desk; there is nothing for it to see." },
    { signal: "Hiring freeze or closures", why: "No budget and no attention for a new tool this term." },
  ],
  regions: ["United States"],
  expansions: [
    { segment: "Homeschool co-ops", reasoning: "They teach in person from printed packets, parents are the buyers and are the most worried about answer-copying, and one co-op decision covers hundreds of families.", confidence: 0.64 },
    { segment: "Special education providers", reasoning: "Paper-first accommodations are common, and a hint on request suits one-to-one support; a longer sale with more compliance.", confidence: 0.41 },
  ],
  search_plan: [
    { query: "after-school tutoring center chains printed worksheets", purpose: "accounts", segment: "Tutoring center chains" },
    { query: "SAT ACT test prep companies paper practice", purpose: "accounts", segment: "Test prep companies" },
    { query: "K-8 charter school network instructional technology hiring", purpose: "accounts", segment: "Charter school networks" },
    { query: "printable worksheet publishers schools tutoring centers", purpose: "accounts", segment: "Worksheet publishers" },
    { query: "AI homework help apps for tutoring centers pricing", purpose: "competitors", segment: "" },
  ],
};

function accounts(input: AccountsIn): AccountsOut {
  const index = (url: string) => input.shown.findIndex((s) => s.url === url) + 1;
  const companies = ACCOUNTS.filter((a) => (input.focus ? a.name === input.focus : true))
    .map((a) => {
      const evidence = a.evidence.filter((e) => index(e.url) > 0).map((e) => ({ source: index(e.url), quote: e.quote }));
      const signals = a.signals.filter((s) => index(s.url) > 0).map((s) => ({ kind: s.kind, summary: s.summary, date: s.date, source: index(s.url), quote: s.quote }));
      const uses = a.usesCompetitor && index(a.usesCompetitor.url) > 0 ? { name: a.usesCompetitor.name, source: index(a.usesCompetitor.url), quote: a.usesCompetitor.quote } : null;
      const negative = a.negative && index(a.negative.url) > 0 ? { signal: a.negative.signal, source: index(a.negative.url), quote: a.negative.quote } : null;
      if (!evidence.length && !signals.length && !uses && !negative) return null;
      return { name: a.name, domain: a.domain, industry: a.industry, size: a.size, location: a.location, segment: a.segment, summary: a.summary, evidence, signals, uses_competitor: uses, negative };
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);
  return { companies };
}

function people(input: PeopleIn): PeopleOut {
  const index = (url: string) => input.shown.findIndex((s) => s.url === url) + 1;
  return {
    people: PEOPLE.filter((p) => index(p.url) > 0 && input.companies.includes(p.company)).map((p) => ({
      name: p.name,
      title: p.title,
      seniority: p.seniority,
      company: p.company,
      source: index(p.url),
      quote: p.quote,
      studied_at: (p.studiedAt || []).map((s) => ({ school: s.school, source: index(p.url), quote: s.quote })),
      previously_at: (p.previouslyAt || []).map((s) => ({ company: s.company, source: index(p.url), quote: s.quote })),
    })),
  };
}

function competitors(input: CompetitorsIn): CompetitorsOut {
  const index = (url: string) => input.shown.findIndex((s) => s.url === url) + 1;
  return {
    competitors: COMPETITORS.filter((c) => index(c.url) > 0).map((c) => ({
      name: c.name,
      category: c.category,
      positioning: c.positioning,
      pricing: c.pricing,
      our_edge: c.ourEdge,
      evidence: [{ source: index(c.url), quote: c.quote }],
    })),
  };
}

// Hand-written sample emails. Each paragraph may lean on one kind of fact; if the account has
// no such fact the paragraph is left out, so a sample email never claims what was not found.
interface Para {
  text: string;
  needs?: "signal" | "company" | "warm_path" | "competitor";
  claim?: string;
}

const HOW = "{product} is an AI tutor that works on the printed pages your students already use. A student draws a small star next to a problem and gets one hint on a screen beside them, not the answer.";

const DRAFTS: Record<string, { subject: string; warmSubject?: string; paras: Para[]; note: string }> = {
  "Brightpath Learning Centers": {
    subject: "Hints on paper for Brightpath's new tutors",
    warmSubject: "From one Bruin to another: hints on paper for Brightpath's tutors",
    paras: [
      { text: "I'm at UCLA too, which is half the reason I'm writing to you directly.", needs: "warm_path", claim: "Shares UCLA with the sender" },
      { text: "I saw Brightpath is hiring 60 math tutors and opening six centers near Phoenix.", needs: "signal", claim: "Hiring 60 math tutors and opening six centers near Phoenix" },
      { text: HOW + " One tutor can cover more tables, and nobody copies solutions." },
      { text: "You're piloting QuizNest, which hands over full solutions on a device, so the comparison might be useful.", needs: "competitor", claim: "Piloting QuizNest" },
      { text: "Could I show you {product} on one of your own packets, 15 minutes next week?" },
    ],
    note: "Hi {first}, fellow Bruin here. I'm building {product}, an AI tutor that works on printed packets and gives hints, not answers. Saw Brightpath is hiring 60 tutors. Open to a quick look?",
  },
  "Summit Prep Academy": {
    subject: "After the Series A: more paper practice per hour at Summit Prep",
    paras: [
      { text: "Congratulations on the $12M Series A.", needs: "signal", claim: "Raised a $12M Series A" },
      { text: "I read that Summit Prep plans to invest in AI-assisted practice that keeps students working on paper.", needs: "company", claim: "Plans to invest in AI-assisted practice that keeps students on paper" },
      { text: "That is what I'm building. " + HOW + " A box around their answer checks it. Scratch work stays on paper, where the test is won." },
      { text: "Would 15 minutes next week be useful? I can run it on one of your practice sets." },
    ],
    note: "Hi {first}, congratulations on the Series A. I'm building {product}, an AI tutor that works on paper practice sets and gives hints, not answers. Worth a quick look?",
  },
  "Cedar Grove Tutoring": {
    subject: "An AI tool that fits your hints-only policy",
    paras: [
      { text: "I read Cedar Grove's new policy: from January, AI tools are allowed in your centers only if they give hints instead of answers. {product} was built on that rule.", needs: "signal", claim: "New policy: AI tools only if they give hints instead of answers" },
      { text: HOW + " It holds the answer back, so there is nothing to copy, and parents can see that." },
      { text: "Could I show you on one of your own worksheets? 15 minutes, any day next week." },
    ],
    note: "Hi {first}, I read Cedar Grove's hints-only AI policy. I'm building {product}, an AI tutor for printed worksheets that gives hints, not answers. Open to a quick look?",
  },
  "Northlight Charter Network": {
    subject: "For your new instructional technology lead: AI that works with handwriting",
    paras: [
      { text: "I saw Northlight is hiring its first Director of Instructional Technology, to evaluate AI tools that support handwritten student work. I'd like to put one on the list.", needs: "signal", claim: "Hiring its first Director of Instructional Technology" },
      { text: HOW + " No device per child and no typing." },
      { text: "Would a 15-minute look be useful before the new director starts? I can show it on a Northlight worksheet." },
    ],
    note: "Hi {first}, I saw Northlight is hiring a Director of Instructional Technology. I'm building {product}, an AI tutor that works with handwritten work. Open to a quick look?",
  },
  "Paperwise Publishing": {
    subject: "AI feedback on your printed STEM packets",
    paras: [
      { text: "I read that Paperwise is exploring partners for AI feedback on printed pages, alongside the new middle-school STEM packets. That is the whole of what {product} does.", needs: "signal", claim: "Exploring partners for AI feedback on printed pages" },
      { text: "{product} reads a printed worksheet through a phone camera. A student draws a small mark next to a problem and gets one hint on a screen beside them. The page never needs to be digital." },
      { text: "Would you be open to a 15-minute call about a pilot on one packet?" },
    ],
    note: "Hi {first}, I read Paperwise is looking for AI feedback partners for printed pages. That's what {product} does. Open to a short call?",
  },
};

const GENERIC: { subject: string; paras: Para[]; note: string } = {
  subject: "Hints, not answers, on the worksheets you already print",
  paras: [
    { text: "I came across {company} while looking for teams that teach from printed materials.", needs: "company" },
    { text: HOW + " Nobody copies solutions, and your tutors can cover more tables." },
    { text: "Would a 15-minute look next week be useful? I can show it on one of your own worksheets." },
  ],
  note: "Hi {first}, I'm building {product}, an AI tutor that works on printed worksheets and gives hints, not answers. Open to a quick look?",
};

function write(input: WriteIn): WriteOut {
  const first = input.contactName ? input.contactName.split(" ")[0].replace(/^Dr\.?$/, input.contactName.split(" ").slice(-1)[0]) : "there";
  const fill = (t: string) => t.replace(/\{product\}/g, input.product.name).replace(/\{company\}/g, input.company).replace(/\{first\}/g, first);
  const draft = DRAFTS[input.company] || GENERIC;
  const fact = (kind: string) => input.facts.find((f) => f.kind === kind);
  const claims: WriteOut["claims"] = [];
  const lines: string[] = [`Hi ${first},`, ""];
  for (const para of draft.paras) {
    const f = para.needs ? fact(para.needs) : null;
    if (para.needs && !f) continue;
    lines.push(fill(para.text), "");
    if (f && para.claim) claims.push({ text: para.claim, fact: f.n });
    // The first draft for one account makes a claim nothing supports, so the review step has
    // something real to catch. The rewrite (notes present) leaves it out.
    if (input.company === "Summit Prep Academy" && para.needs === "company" && input.notes.length === 0) {
      lines.splice(lines.length - 1, 0, "I also read that your students' SAT scores rose 30% last year.");
      claims.push({ text: "Students' SAT scores rose 30% last year", fact: null });
    }
  }
  lines.push(input.sender);
  const warm = fact("warm_path");
  return {
    subject: warm && "warmSubject" in draft && draft.warmSubject ? draft.warmSubject : draft.subject,
    body: lines.join("\n"),
    linkedin_note: fill(draft.note),
    claims,
  };
}

function review(input: ReviewIn): ReviewOut {
  const known = new Set(input.facts.map((f) => f.n));
  const claims = input.claims.map((c) => {
    const supported = c.fact != null && known.has(c.fact);
    return { text: c.text, fact: c.fact, supported, note: supported ? "" : "No fact supports this. Remove it." };
  });
  const bad = claims.filter((c) => !c.supported);
  return {
    claims,
    verdict: bad.length ? "fail" : "pass",
    notes: bad.map((c) => `Unsupported: "${c.text}". It is not in the facts for this account.`),
  };
}

function reply(input: ReplyIn): ReplyOut {
  const t = input.text.toLowerCase();
  if (/unsubscribe|remove me|stop emailing|do not contact/.test(t)) return { intent: "unsubscribe", summary: "Asked not to be contacted.", next_step: "Add to do-not-contact and close." };
  if (/not interested|no thanks|not a fit|no budget/.test(t)) return { intent: "negative", summary: "Not interested right now.", next_step: "Close as lost; do not follow up." };
  if (/yes|sure|interested|love to|let's|call|demo|next week|calendar|sounds good/.test(t)) return { intent: "positive", summary: "Interested and open to a call.", next_step: "Offer two times and book the meeting." };
  return { intent: "neutral", summary: "Replied without a clear yes or no.", next_step: "Answer the question and ask for a short call." };
}

export function sampleAnswer(task: string, input: unknown): unknown {
  switch (task) {
    case "icp":
      return ICP;
    case "extract_accounts":
      return accounts(input as AccountsIn);
    case "extract_people":
      return people(input as PeopleIn);
    case "extract_competitors":
      return competitors(input as CompetitorsIn);
    case "write_outreach":
      return write(input as WriteIn);
    case "review_outreach":
      return review(input as ReviewIn);
    case "classify_reply":
      return reply(input as ReplyIn);
    default:
      throw new Error(`The sample model has no answer for task "${task}"`);
  }
}

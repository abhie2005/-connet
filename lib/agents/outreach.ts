// Step 5: write the first message, then have it checked before a person ever sees it.
// The writer may only use numbered facts that passed the quote check. A second model call
// (the reviewer) and two plain-code checks look for anything the facts do not support.
import { llm } from "../providers/llm";
import { bestContact, strongestSignal } from "../score";
import type { Store } from "../store";
import { nextId } from "../ids";
import { greet, located, says, topicOnly, without } from "../marks";
import type { Claim, Contact, Fact, Freedom, Lead, Message, Product } from "../types";
import type { ReplyIn, ReplyOut, ReviewIn, ReviewOut, WriteIn, WriteOut } from "./shapes";

// How much the writer may add that no fact backs is the rep's setting (Settings.freedom). The
// rule about invented numbers, results, customers and quotes is the same at every setting.
const LEEWAY: Record<Freedom, string> = {
  strict: `- Every sentence about the recipient, their company or the world must restate one of the numbered FACTS. If there is no fact for it, leave it out. No general remarks about their industry, no guesses about what they need. List every such statement in "claims" with the number of the fact it rests on.`,
  balanced: `- You may only state things about the recipient, their company or the world that are in the numbered FACTS. List every such statement in "claims" with the number of the fact it rests on.`,
  open: `- What you state as fact about the recipient, their company or the world must be in the numbered FACTS. List every such statement in "claims" with the number of the fact it rests on.
- You may also add at most two sentences of your own pitch: a view on the problem, or why the product could matter to a team like theirs. Word them as your view ("my guess is", "I'd expect"), never as a fact about the recipient, and list each one in "claims" with "fact": null.`,
};

const writer = (freedom: Freedom) => `You write short, plain, honest first-touch sales emails for a startup founder. Rules:
- The body is at most 110 words. Plain text. No flattery, no hype words, no exclamation marks, no emojis.
${LEEWAY[freedom]}
- Never invent numbers, results, customers or quotes. What the product does comes only from the PRODUCT fact.
- One clear, small ask at the end. Sign with the sender's name only.
You return only JSON.`;

const REVIEWER = `You are a strict reviewer protecting a founder's reputation. You are given an email and the only facts the writer was allowed to use. Find every statement in the subject and body about the recipient, their company, other companies or the world. A statement is supported only if a numbered fact says it; a number, date, name or event that is not in a fact is unsupported. Statements about the sender's own product are supported only if they agree with the PRODUCT fact. Be strict and literal. You return only JSON.`;

export function pickContact(lead: Lead, s: Store): Contact | null {
  return bestContact(lead, s.state.icp);
}

/** The numbered facts the writer may use: only things whose quote was found in its source. */
export function buildFacts(lead: Lead, contact: Contact | null, product: Product, s: Store): Fact[] {
  const facts: Fact[] = [];
  const add = (kind: Fact["kind"], text: string, sourceId: string | null) => facts.push({ n: facts.length + 1, text, sourceId, kind });
  add("product", `${product.name}: ${product.description}`, null);
  const top = strongestSignal(lead.signals);
  const signals = top ? [top, ...lead.signals.filter((x) => x !== top)] : [];
  for (const sig of signals.slice(0, 3)) add("signal", `${lead.company}: ${sig.summary}${sig.date ? ` (${sig.date})` : ""}. Source says: "${sig.evidence.quote}"`, sig.evidence.sourceId);
  for (const ev of lead.evidence.filter((e) => e.verified).slice(0, 3)) add("company", `About ${lead.company}, the source says: "${ev.quote}"`, ev.sourceId);
  if (contact) add("contact", `${contact.name} is ${contact.title} at ${lead.company}.`, contact.evidence[0]?.sourceId || null);
  const warm = lead.warmPaths.find((w) => (contact ? w.contactId === contact.id : true));
  if (warm) add("warm_path", warm.note, warm.evidence?.sourceId || null);
  if (lead.usesCompetitor) {
    const comp = s.state.competitors.find((c) => c.name.toLowerCase() === lead.usesCompetitor!.name.toLowerCase());
    add("competitor", `${lead.company} uses ${lead.usesCompetitor.name}. Source says: "${lead.usesCompetitor.evidence.quote}"${comp ? ` ${lead.usesCompetitor.name}: ${comp.positioning}` : ""}`, lead.usesCompetitor.evidence.sourceId);
  }
  return facts;
}

function writePrompt(input: WriteIn): string {
  const angle =
    input.variant === "A"
      ? "Variant A: lead with the buying signal (why you are writing now), then the product in one or two sentences."
      : "Variant B: lead with the problem this person has that the product solves, then mention the signal briefly if there is one.";
  return `FACTS
${input.facts.map((f) => `[${f.n}] (${f.kind.toUpperCase()}) ${f.text}`).join("\n")}

TO: ${input.contactName ? `${input.contactName}, ${input.contactTitle}` : "the right person"} at ${input.company}
FROM: ${input.sender}
${angle}
${input.facts.some((f) => f.kind === "warm_path") ? "There is a WARM_PATH fact: open with it, in one natural sentence." : ""}
${input.notes.length ? `THIS IS A REWRITE. A reviewer rejected the last draft for these reasons. Fix every one, and do not add anything new:\n- ${input.notes.join("\n- ")}` : ""}

Return JSON:
{"subject": "at most 9 words, specific to them", "body": "the email body, with a greeting and line breaks", "linkedin_note": "a connection note under 280 characters", "claims": [{"text": "a statement you made about them or the world", "fact": number of the fact it rests on}]}`;
}

function reviewPrompt(input: ReviewIn): string {
  return `FACTS THE WRITER WAS ALLOWED TO USE
${input.facts.map((f) => `[${f.n}] (${f.kind.toUpperCase()}) ${f.text}`).join("\n")}

THE EMAIL
Subject: ${input.subject}

${input.body}

Return JSON:
{"claims": [{"text": "the statement, quoted or closely paraphrased", "fact": number of the supporting fact or null, "supported": true or false, "note": "if unsupported, what is wrong"}], "verdict": "pass" if every statement is supported, otherwise "fail", "notes": ["one instruction per problem, telling the writer what to remove or correct"]}`;
}

/** Plain-code check: every number in the email must appear in the facts. Catches invented stats. */
export function strayNumbers(text: string, facts: Fact[]): string[] {
  const allowed = facts.map((f) => f.text).join(" ").replace(/,/g, "");
  const clean = text.replace(/,/g, "");
  const stray: string[] = [];
  for (const m of clean.matchAll(/\$?\d+(?:\.\d+)?\s?(?:%|percent|k\b|m\b|bn\b|million|billion|x\b)?/gi)) {
    const token = m[0].trim();
    const digits = token.match(/\d+(?:\.\d+)?/)![0];
    const after = clean.slice(m.index + m[0].length, m.index + m[0].length + 12);
    if (/^[\s-]*(min|minute)/i.test(after)) continue; // "15 minutes" is the ask, not a claim
    if (!new RegExp(`(^|[^\\d.])${digits.replace(".", "\\.")}([^\\d]|$)`).test(allowed) && !stray.includes(token)) stray.push(token);
  }
  return stray;
}

const OPT_OUT = "If this isn't relevant, tell me and I won't follow up.";

/** The security agent: plain rules about what may leave the building. */
export function securityCheck(body: string, product: Product, contact: Contact | null): { ok: boolean; notes: string[]; body: string } {
  const notes: string[] = [];
  let ok = true;
  let allowedHost = "";
  try {
    allowedHost = product.url ? new URL(product.url).hostname.replace(/^www\./, "") : "";
  } catch {
    allowedHost = "";
  }
  const links = body.match(/https?:\/\/[^\s)>\]]+/gi) || [];
  for (const link of links) {
    let host = "";
    try {
      host = new URL(link).hostname.replace(/^www\./, "");
    } catch {
      host = "";
    }
    if (!host || host !== allowedHost) {
      ok = false;
      notes.push(`Link to ${host || link} is not the product's own site: removed before sending.`);
      body = body.replace(link, "").replace(/[ \t]+\n/g, "\n");
    }
  }
  if (links.length && ok) notes.push("Links point only to the product's own site.");
  if (!links.length) notes.push("No links in the message.");
  const otherEmails = (body.match(/[\w.+-]+@[\w-]+\.[\w.-]+/g) || []).filter((e) => !contact?.email || e.toLowerCase() !== contact.email.toLowerCase());
  if (otherEmails.length) {
    ok = false;
    notes.push("The body contains an email address that is not the recipient's.");
  }
  if (!/won't follow up|unsubscribe|opt out|not relevant/i.test(body)) {
    const lines = body.trimEnd().split("\n");
    const signature = lines.pop() || "";
    body = [...lines, OPT_OUT, "", signature].join("\n").replace(/\n{3,}/g, "\n\n");
    notes.push("Added a one-line way to opt out.");
  }
  if (contact?.emailStatus === "guess") notes.push("The address is a guess from the company's pattern: verify it before sending.");
  if (contact && !contact.email) notes.push("No email address yet: use Find emails before sending.");
  return { ok, notes, body };
}

/** The strict setting's cut: every unbacked claim that can be found in the message is taken out
    of it, sentence and all. What cannot be found stays, still marked unbacked for the rep. */
export function takeOut(subject: string, body: string, claims: Claim[], plainSubject: string): { subject: string; body: string; claims: Claim[]; taken: string[] } {
  const cut = claims.filter((c) => !c.supported && located(subject, body, c.text));
  if (!cut.length) return { subject, body, claims, taken: [] };
  const next = without(subject, body, cut.map((c) => c.text), plainSubject);
  return { ...next, claims: claims.filter((c) => !cut.includes(c)), taken: cut.map((c) => c.text) };
}

async function review(s: Store, draft: WriteOut, facts: Fact[], company: string): Promise<{ claims: Claim[]; pass: boolean; notes: string[]; numbers: boolean }> {
  const input: ReviewIn = { subject: draft.subject, body: draft.body, claims: draft.claims || [], facts };
  s.state.run.stats.llmCalls += 1;
  const out = await llm().json<ReviewOut>({ task: "review_outreach", system: REVIEWER, user: reviewPrompt(input), input, temperature: 0 });
  const known = new Set(facts.map((f) => f.n));
  const claims: Claim[] = (out.claims || []).map((c) => {
    const fact = c.fact != null && known.has(Number(c.fact)) ? Number(c.fact) : null;
    const supported = !!c.supported && fact != null;
    return { text: String(c.text || ""), fact, supported, note: supported ? "" : String(c.note || "Not supported by a fact") };
  });
  // A subject that only names the product, what it does and who it is for is not a claim, though
  // a strict reviewer often lists it as one. Anything else said in a subject still has to be backed.
  const subject = String(draft.subject || "");
  const ownWords = facts.filter((f) => f.kind === "product" || f.kind === "contact").map((f) => f.text).join(" ") + " " + company;
  let waved = 0;
  for (let i = claims.length - 1; i >= 0; i--) {
    const c = claims[i];
    if (!c.supported && says(subject, c.text) && !located("", String(draft.body || ""), c.text) && topicOnly(subject, ownWords)) {
      claims.splice(i, 1);
      waved += 1;
    }
  }
  const notes = [...(out.notes || []).map(String)];
  const stray = strayNumbers(`${draft.subject}\n${draft.body}`, facts);
  for (const token of stray) {
    notes.push(`The number "${token}" is not in the facts. Remove it.`);
    claims.push({ text: `Uses the number ${token}`, fact: null, supported: false, note: "Number not found in any fact" });
  }
  const pass = (out.verdict === "pass" || waved > 0) && claims.every((c) => c.supported);
  if (!pass && notes.length === 0) for (const c of claims.filter((x) => !x.supported)) notes.push(`Unsupported: "${c.text}". Remove it.`);
  return { claims, pass, notes, numbers: stray.length > 0 };
}

/** Draft one message for a lead, review it, rewrite once if needed, then run the security rules. */
export async function draftMessage(s: Store, lead: Lead): Promise<Message> {
  const product = s.state.product!;
  const contact = pickContact(lead, s);
  const facts = buildFacts(lead, contact, product, s);
  const variant: "A" | "B" = s.state.messages.length % 2 === 0 ? "A" : "B";
  const hasWarm = facts.some((f) => f.kind === "warm_path");
  const freedom: Freedom = s.state.settings?.freedom || "balanced";
  const base: WriteIn = {
    product,
    sender: s.state.founder.name || "The founder",
    company: lead.company,
    contactName: contact?.name || null,
    contactTitle: contact?.title || null,
    facts,
    variant,
    angle: hasWarm ? "Warm path" : variant === "A" ? "Signal-led" : "Problem-led",
    notes: [],
    ...(freedom === "balanced" ? {} : { freedom }),
  };

  s.log("builder", "step", `Writing to ${contact ? contact.name : lead.company} from ${facts.length} checked facts (variant ${variant}${hasWarm ? ", opening with the warm path" : ""}).`);
  s.state.run.stats.llmCalls += 1;
  let draft = await llm().json<WriteOut>({ task: "write_outreach", system: writer(freedom), user: writePrompt(base), input: base, temperature: 0.5 });
  s.log("builder", "say", `Draft for ${lead.company} is ready. Please check every claim against the facts.`, { to: "reviewer" });

  let result = await review(s, draft, facts, lead.company);
  let rounds = 1;
  const history: string[] = [];
  // At the open setting the writer's own sentences are expected, so they do not send the draft
  // back. A number that is in no fact still does, at every setting.
  if (!result.pass && (freedom !== "open" || result.numbers)) {
    history.push(...result.notes);
    s.log("reviewer", "flag", `Rejected the draft for ${lead.company}: ${result.notes[0] || "a claim is not supported by the facts."}`, { to: "builder", detail: result.notes.join("\n") });
    const again: WriteIn = { ...base, notes: result.notes };
    s.state.run.stats.llmCalls += 1;
    draft = await llm().json<WriteOut>({ task: "write_outreach", system: writer(freedom), user: writePrompt(again), input: again, temperature: 0.3 });
    result = await review(s, draft, facts, lead.company);
    rounds = 2;
  }
  // At the strict setting nothing unbacked reaches the rep: what can be found in the message is
  // cut out here, by plain code, and listed for them as taken out.
  const taken: string[] = [];
  if (freedom === "strict" && !result.pass) {
    const cut = takeOut(String(draft.subject || ""), String(draft.body || ""), result.claims, `${product.name} for ${lead.company}`);
    if (cut.taken.length) {
      draft = { ...draft, subject: cut.subject, body: cut.body };
      taken.push(...cut.taken);
      result = { ...result, claims: cut.claims, pass: cut.claims.every((c) => c.supported) };
      s.log("reviewer", "flag", `Facts only: took ${taken.length} unbacked sentence${taken.length === 1 ? "" : "s"} out of the draft for ${lead.company} before the rep sees it.`, { to: "rep", detail: taken.join("\n") });
    }
  }
  const verdict = result.pass ? (rounds === 1 && !taken.length ? "pass" : "revised") : "needs_human";
  if (taken.length && result.pass) {
    s.log("reviewer", "say", `What is left of the draft for ${lead.company} is backed by a fact.`, { to: "security" });
  } else if (freedom === "open" && !result.pass && rounds === 1) {
    const own = result.claims.filter((c) => !c.supported).length;
    s.log("reviewer", "flag", `The draft for ${lead.company} has ${own} sentence${own === 1 ? "" : "s"} no fact backs, as the setting allows. Marked for the rep to keep or delete.`, { to: "rep", detail: result.notes.join("\n") });
  } else if (result.pass) {
    s.log("reviewer", "say", rounds === 1 ? `Approved the draft for ${lead.company}: ${result.claims.length} claim${result.claims.length === 1 ? "" : "s"}, all backed by a fact.` : `The rewrite for ${lead.company} passes: the unsupported claim is gone.`, { to: "security" });
  } else {
    s.log("reviewer", "flag", `The draft for ${lead.company} still has an unsupported claim after one rewrite. Sending it to the rep marked "needs a human".`, { to: "rep", detail: result.notes.join("\n") });
  }

  const sec = securityCheck(String(draft.body || ""), product, contact);
  s.log("security", sec.ok ? "say" : "flag", `${lead.company}: ${sec.notes.join(" ")}`, { to: "rep" });

  const message: Message = {
    id: nextId("m", s.state.messages),
    leadId: lead.id,
    contactId: contact?.id || null,
    to: contact ? `${contact.name}, ${contact.title}` : lead.company,
    toEmail: contact?.email || null,
    variant,
    angle: base.angle,
    subject: String(draft.subject || "").trim(),
    // The greeting is the person it goes to, or nobody: never a name borrowed from a fact.
    body: greet(sec.body.trim(), contact ? contact.name : null),
    linkedinNote: String(draft.linkedin_note || "").trim().slice(0, 300),
    facts,
    claims: result.claims,
    review: { verdict, rounds, notes: taken.length ? [...taken, ...(result.pass ? [] : result.notes)] : [...history, ...(result.pass ? [] : result.notes)] },
    security: { ok: sec.ok, notes: sec.notes },
    status: "draft",
    createdAt: new Date().toISOString(),
    decidedAt: null,
    editedByRep: false,
  };
  s.state.messages.push(message);
  s.audit("agent", "Drafted a message", { agent: "builder", leadId: lead.id, messageId: message.id, note: `Variant ${variant}, review: ${verdict}` });
  s.touch();
  return message;
}

const REPLY_SYSTEM = `You read a reply to a sales email and say what the sender wants. You return only JSON.`;

export async function classifyReply(s: Store, text: string): Promise<ReplyOut> {
  const input: ReplyIn = { text };
  s.state.run.stats.llmCalls += 1;
  const out = await llm().json<ReplyOut>({
    task: "classify_reply",
    system: REPLY_SYSTEM,
    user: `REPLY\n${text}\n\nReturn JSON: {"intent": "positive|neutral|negative|unsubscribe", "summary": "one sentence", "next_step": "what the rep should do next, one sentence"}`,
    input,
    temperature: 0,
  });
  const intent = ["positive", "neutral", "negative", "unsubscribe"].includes(out.intent) ? out.intent : "neutral";
  return { intent, summary: String(out.summary || ""), next_step: String(out.next_step || "") };
}

// Step 1: from a plain description of the product, work out who should buy it.
import { llm } from "../providers/llm";
import type { Founder, ICP, Product } from "../types";
import type { IcpIn, IcpOut } from "./shapes";

const SYSTEM = `You are a go-to-market strategist for early-stage B2B companies. From a product description you define who should buy it: concrete, commercially realistic, no filler. You return only JSON with exactly the keys you are asked for.`;

function prompt(product: Product, founder: Founder): string {
  return `PRODUCT
Name: ${product.name}
What it does: ${product.description}
Website: ${product.url || "(none)"}
Pricing: ${product.pricing || "(not given)"}
Customers so far: ${product.customers || "(none yet)"}
Founder: ${founder.name || "(not given)"}
Founder's schools: ${founder.schools.join(", ") || "(not given)"}
Founder's past employers: ${founder.employers.join(", ") || "(not given)"}

Define the ideal customer profile for selling this to organisations (B2B). Return JSON:
{
  "summary": "two sentences: who buys this and why",
  "industries": [{"name": "short segment name", "naics": "6-digit NAICS code or null", "confidence": 0.0-1.0, "why": "one sentence"}],
  "company_size": {"headcount": "range", "revenue": "range", "confidence": 0.0-1.0, "why": "one sentence"},
  "personas": [{"title": "job title", "seniority": "owner|executive|vp|director|manager", "function": "department", "cares_about": "one sentence", "confidence": 0.0-1.0}],
  "triggers": [{"event": "a public event that means they may buy now", "why_it_matters": "one sentence", "confidence": 0.0-1.0}],
  "negatives": [{"signal": "a public sign they are a bad fit or bad timing", "why": "one sentence"}],
  "regions": ["where to sell first"],
  "expansions": [{"segment": "an adjacent segment the founder may not have thought of", "reasoning": "why it could work, with the evidence you are relying on, and the main risk", "confidence": 0.0-1.0}],
  "search_plan": [{"query": "a web search that finds NAMED organisations in one segment (news, announcements, job posts)", "purpose": "accounts", "segment": "exactly one of the industry names above"}, {"query": "a web search that finds competing products and their pricing", "purpose": "competitors", "segment": ""}]
}
Rules: 3 to 5 industries, 3 to 4 personas, 4 to 6 triggers, 2 to 3 negatives, 2 to 3 expansions. search_plan: one "accounts" query per industry (specific enough to return real organisations, not definitions) and one or two "competitors" queries. Confidence is how sure you are from the description alone; be honest, most values should sit between 0.4 and 0.9. A first sale is easiest where the founder already has a way in: when it makes commercial sense, put the region around the founder's school or past employer first in "regions", and aim at least one "accounts" query at organisations in that region.`;
}

const clamp = (n: unknown) => Math.max(0, Math.min(1, Number(n) || 0));
const text = (v: unknown, fallback = "") => (typeof v === "string" ? v.trim() : fallback);

export async function inferIcp(product: Product, founder: Founder): Promise<ICP> {
  const input: IcpIn = { product, founder };
  const out = await llm().json<IcpOut>({ task: "icp", system: SYSTEM, user: prompt(product, founder), input, temperature: 0.4 });
  const industries = (out.industries || []).filter((i) => text(i.name)).map((i) => ({ name: text(i.name), naics: i.naics ? String(i.naics) : null, confidence: clamp(i.confidence), why: text(i.why) }));
  if (industries.length === 0) throw new Error("The model returned no industries for this product");
  const names = industries.map((i) => i.name);
  const plan = (out.search_plan || [])
    .filter((q) => text(q.query))
    .map((q) => ({
      query: text(q.query),
      purpose: q.purpose === "competitors" ? ("competitors" as const) : ("accounts" as const),
      segment: q.purpose === "competitors" ? "" : names.find((n) => n.toLowerCase() === text(q.segment).toLowerCase()) || names[0],
    }));
  for (const name of names) {
    if (!plan.some((q) => q.purpose === "accounts" && q.segment === name)) plan.push({ query: `${name} companies news`, purpose: "accounts", segment: name });
  }
  if (!plan.some((q) => q.purpose === "competitors")) plan.push({ query: `${product.name} alternatives competitors pricing`, purpose: "competitors", segment: "" });
  return {
    summary: text(out.summary),
    industries,
    companySize: {
      headcount: text(out.company_size?.headcount, "Not stated"),
      revenue: text(out.company_size?.revenue, "Not stated"),
      confidence: clamp(out.company_size?.confidence),
      why: text(out.company_size?.why),
    },
    personas: (out.personas || []).filter((p) => text(p.title)).map((p) => ({ title: text(p.title), seniority: text(p.seniority), function: text(p.function), caresAbout: text(p.cares_about), confidence: clamp(p.confidence) })),
    triggers: (out.triggers || []).filter((t) => text(t.event)).map((t) => ({ event: text(t.event), whyItMatters: text(t.why_it_matters), confidence: clamp(t.confidence) })),
    negatives: (out.negatives || []).filter((n) => text(n.signal)).map((n) => ({ signal: text(n.signal), why: text(n.why) })),
    regions: (out.regions || []).map((r) => text(r)).filter(Boolean),
    expansions: (out.expansions || []).filter((e) => text(e.segment)).map((e, i) => ({ id: `x${i + 1}`, segment: text(e.segment), reasoning: text(e.reasoning), confidence: clamp(e.confidence), status: "suggested" as const })),
    searchPlan: plan,
  };
}

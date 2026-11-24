// When the first searches find too few companies: a second set of searches, built by plain code
// from the ideal customer, and a plain-words account of what went wrong if there is still nobody.
import type { ICP } from "../types";

const plain = (s: string) => s.replace(/\([^)]*\)/g, " ").replace(/[^\p{L}\p{N}&,' -]+/gu, " ").replace(/\s+/g, " ").trim();

/** More searches for named organisations: job posts (an employer is named in every one) and
    news of growth, per segment, in the first region. Never one that was already tried. */
export function widerQueries(icp: ICP, tried: string[], max = 4): { query: string; segment: string }[] {
  const region = plain(icp.regions[0] || "").split(",")[0].trim();
  const role = plain(icp.personas[0]?.title || "");
  const seen = new Set(tried.map((q) => q.toLowerCase()));
  const out: { query: string; segment: string }[] = [];
  const segments = [...icp.industries].sort((a, b) => b.confidence - a.confidence);
  const add = (query: string, segment: string) => {
    const q = query.replace(/\s+/g, " ").trim();
    if (!seen.has(q.toLowerCase())) {
      seen.add(q.toLowerCase());
      out.push({ query: q, segment });
    }
  };
  for (const seg of segments) add(`${plain(seg.name)} company ${region} announces expansion OR "new facility" OR acquisition OR funding`, seg.name);
  for (const seg of segments) add(`${plain(seg.name)} ${region} hiring ${role}`, seg.name);
  return out.slice(0, max);
}

export interface Search2 {
  searches: number;
  searchErrors: string[];
  modelErrors: string[];
  pages: number;
  named: number;
  proposed: number;
  verified: number;
}

const few = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const short = (s: string) => (s.length > 160 ? `${s.slice(0, 157)}...` : s);

/** Why a run ended with no company at all, in the order the steps can fail. */
export function whyNobody(d: Search2): string {
  if (d.searches > 0 && d.searchErrors.length >= d.searches)
    return `The web search itself failed on all ${few(d.searches, "search", "searches")}, so there were no pages to read. It said: ${short(d.searchErrors[0])} Check TAVILY_API_KEY in .env.local and the key's monthly limit, then search again.`;
  if (d.pages === 0) return `${few(d.searches, "search", "searches")} came back with no pages worth reading. Say who uses the product and where (an industry and a region), then search again.`;
  if (d.modelErrors.length > 0 && d.named === 0)
    return `The search found ${few(d.pages, "page")}, but the model could not read them. It said: ${short(d.modelErrors[0])} If that is a usage limit, wait a minute and search again.`;
  if (d.named === 0) return `Read ${few(d.pages, "page")} from ${few(d.searches, "search", "searches")}, and none of them named a company that could buy this. Say more exactly who buys it (an industry, a size, a region), then search again.`;
  return `The pages named ${few(d.named, "company", "companies")}, but none of the ${few(d.proposed, "quote")} about them could be found word for word on the page it was said to come from, so none was kept. Searching again usually finds different pages.`;
}

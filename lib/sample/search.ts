// Sample search: returns the made-up pages in data.ts, chosen by what the pipeline is looking for.
import type { FoundPage, SearchHint } from "../providers/search";
import { PAGES } from "./data";

const same = (a?: string, b?: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

export function sampleSearch(query: string, hint: SearchHint): FoundPage[] {
  let pages = PAGES.filter((p) => p.purpose.includes(hint.purpose));
  if (hint.purpose === "accounts") {
    pages = pages.filter((p) => same(p.segment, hint.segment));
  } else if (hint.purpose === "signals" || hint.purpose === "people") {
    pages = pages.filter((p) => same(p.company, hint.company));
  } else if (hint.purpose === "warm") {
    pages = pages.filter((p) => same(p.company, hint.company));
  }
  return pages.map((p) => ({ url: p.url, title: p.title, text: p.text, provider: "sample" as const }));
}

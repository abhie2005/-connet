// Web search. Tavily when a key is set, sample pages otherwise. Whatever comes back becomes a
// Source, and the text kept on the Source is exactly what the model is shown, so that quotes
// can be checked against it later.
import { remember } from "../cache";
import { config, modes } from "../config";
import { readable } from "../garbled";
import { bestPassages } from "../passages";
import { sampleSearch } from "../sample/search";
import { hooks } from "./hooks";
import type { Source } from "../types";

export interface SearchHint {
  purpose: "accounts" | "signals" | "competitors" | "people" | "warm" | "jobs";
  segment?: string;
  company?: string;
}

export interface FoundPage {
  url: string;
  title: string;
  text: string;
  provider: Source["provider"];
}

// How much of each page the model is shown (and quotes are checked against).
const SHOWN_CHARS = 3200;

/** Where job postings live. A jobs search is pointed at these, with careers pages picked up too. */
const JOB_BOARDS = ["boards.greenhouse.io", "jobs.lever.co", "jobs.ashbyhq.com", "apply.workable.com", "job-boards.greenhouse.io"];

const squash = (t: string) => t.replace(/\s+/g, " ").trim().toLowerCase();

/** Page text comes as markdown. Keep the words of a link and drop its address, drop images. */
export function plainText(markdown: string): string {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\((?:[^()]|\([^)]*\))*\)/g, "$1")
    .replace(/^[#>*\-\s]+(?=\S)/gm, "")
    .replace(/[*_`]{1,3}([^*_`\n]+)[*_`]{1,3}/g, "$1");
}

/** What the model is shown for one result: the engine's excerpt, then the passages of the page that bear on the query. */
export function shownText(snippet: string, rawPage: string, about: string): string {
  // Stretches of a PDF whose font was not decoded are cut out here: see lib/garbled.ts.
  const excerpt = readable(plainText(snippet)).trim();
  const raw = readable(plainText(rawPage));
  if (!raw.trim()) return excerpt.slice(0, SHOWN_CHARS);
  // When the excerpt is simply part of the page, the page's own passages already cover it.
  const inPage = excerpt.length > 0 && squash(raw).includes(squash(excerpt).slice(0, 80));
  const room = SHOWN_CHARS - (inPage ? 0 : excerpt.length + 1);
  const body = bestPassages(raw, about, Math.max(600, room));
  return (inPage || !excerpt ? body : `${excerpt}\n${body}`).slice(0, SHOWN_CHARS);
}

async function tavily(query: string, hint: SearchHint, max: number): Promise<FoundPage[]> {
  hooks.searchCall(query, hint);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${config.tavilyKey}` },
      body: JSON.stringify({
        query,
        max_results: max,
        search_depth: "basic",
        include_answer: false,
        include_raw_content: true,
        // Postings only: the boards plus whatever careers page the query names.
        ...(hint.purpose === "jobs" ? { include_domains: JOB_BOARDS } : {}),
      }),
      signal: ctrl.signal,
      cache: "no-store",
    });
    const body = await res.text();
    if (!res.ok) throw new Error(`Tavily ${res.status}: ${body.slice(0, 200)}`);
    const data = JSON.parse(body) as { results?: { url: string; title: string; content?: string; raw_content?: string | null }[] };
    const about = [query.replace(/\bOR\b/g, " "), hint.company || "", hint.segment || ""].join(" ");
    return (data.results || [])
      .filter((r) => r && typeof r.url === "string")
      .map((r) => ({
        url: r.url,
        title: r.title || r.url,
        text: shownText(r.content || "", r.raw_content || "", about),
        provider: "tavily" as const,
      }));
  } finally {
    clearTimeout(timer);
  }
}

export async function search(query: string, hint: SearchHint, max = 5): Promise<FoundPage[]> {
  if (modes().search === "tavily") return remember("search", { query, max }, () => tavily(query, hint, max));
  await new Promise((r) => setTimeout(r, 250 + Math.random() * 300));
  return sampleSearch(query, hint).slice(0, max + 2);
}

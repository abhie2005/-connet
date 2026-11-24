// Web search. Tavily when a key is set, sample pages otherwise. Whatever comes back becomes a
// Source, and the text kept on the Source is exactly what the model is shown, so that quotes
// can be checked against it later.
import { config, modes } from "../config";
import { sampleSearch } from "../sample/search";
import type { Source } from "../types";

export interface SearchHint {
  purpose: "accounts" | "signals" | "competitors" | "people" | "warm";
  segment?: string;
  company?: string;
}

export interface FoundPage {
  url: string;
  title: string;
  text: string;
  provider: Source["provider"];
}

const SHOWN_CHARS = 2200;

async function tavily(query: string, max: number): Promise<FoundPage[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 20_000);
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${config.tavilyKey}` },
      body: JSON.stringify({ query, max_results: max, search_depth: "basic", include_answer: false, include_raw_content: true }),
      signal: ctrl.signal,
      cache: "no-store",
    });
    const body = await res.text();
    if (!res.ok) throw new Error(`Tavily ${res.status}: ${body.slice(0, 200)}`);
    const data = JSON.parse(body) as { results?: { url: string; title: string; content?: string; raw_content?: string | null }[] };
    return (data.results || []).map((r) => {
      const snippet = (r.content || "").trim();
      const raw = (r.raw_content || "").replace(/\s+/g, " ").trim();
      return {
        url: r.url,
        title: r.title || r.url,
        text: (snippet + (raw && !raw.startsWith(snippet.slice(0, 60)) ? "\n" + raw : "")).slice(0, SHOWN_CHARS),
        provider: "tavily" as const,
      };
    });
  } finally {
    clearTimeout(timer);
  }
}

export async function search(query: string, hint: SearchHint, max = 5): Promise<FoundPage[]> {
  if (modes().search === "tavily") return tavily(query, max);
  await new Promise((r) => setTimeout(r, 250 + Math.random() * 300));
  return sampleSearch(query, hint).slice(0, max + 2);
}

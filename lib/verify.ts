// The rule that keeps the agent honest: a fact is only kept when the quote it rests on
// can be found, word for word, in the text that was actually retrieved from the source.
// The model proposes; this code decides.
import type { Evidence, Source } from "./types";

/**
 * Lowercase and reduce to words and numbers in order. Punctuation, quote marks, hyphens and
 * spacing are dropped on both sides, because a model that copies a sentence faithfully still
 * swaps a curly quote, adds a full stop or writes "after school" for "after-school". The words
 * and the figures ($, % included) must still match, one after another.
 */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/&amp;/g, "&")
    .replace(/[^a-z0-9$%&]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const MIN_QUOTE_WORDS = 3;

/**
 * True when the quote appears in the source text. Models often stitch two parts of a page
 * together with "..." so each part is checked on its own, and each must be there.
 */
export function quoteInText(quote: string, text: string): boolean {
  const hay = normalize(text);
  const parts = quote
    .split(/\.{3,}|…|\[\.\.\.\]/)
    .map((p) => normalize(p))
    .filter((p) => p.length > 0);
  if (parts.length === 0) return false;
  const words = parts.join(" ").split(" ").length;
  if (words < MIN_QUOTE_WORDS) return false;
  return parts.every((p) => hay.includes(p));
}

export interface ProposedEvidence {
  source: number | string | null | undefined; // index into the numbered results the model saw
  quote: string | null | undefined;
}

/** Turn what the model proposed into Evidence, checked against the numbered sources it was shown. */
export function checkEvidence(proposed: ProposedEvidence | null | undefined, shown: Source[]): Evidence | null {
  if (!proposed || proposed.quote == null) return null;
  const quote = String(proposed.quote).trim();
  const index = Number(proposed.source);
  if (!quote || !Number.isInteger(index) || index < 1 || index > shown.length) return null;
  const source = shown[index - 1];
  return { sourceId: source.id, quote, verified: quoteInText(quote, source.title + " \n " + source.text) };
}

/** Does this text name the thing? Used so a quote about one company is not pinned on another. */
export function mentions(text: string, name: string): boolean {
  const n = normalize(name)
    .replace(/^the /, "")
    .replace(/[ .]+(inc|llc|ltd|corp|co|company)\.?$/, "")
    .trim();
  if (n.length < 3) return false;
  return normalize(text).includes(n);
}

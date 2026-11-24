// What in a draft has to go, and what was added to it, worked out from the reviewer's claims.
// Plain text functions: the page marks the message up with them, and one click deletes with them.

const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9%$]+/g, " ").split(" ").filter(Boolean);

/** Does this piece of a message make this claim? Either nearly all of the claim's words are in
    the piece, or the piece is nearly all made of the claim's words (a claim can span two
    sentences). Short pieces never match: a greeting shares words with anything. */
export function says(piece: string, claim: string): boolean {
  const c = words(claim), p = words(piece);
  if (c.length < 3 || p.length < 3) return false;
  const inPiece = new Set(p), inClaim = new Set(c);
  const claimCovered = c.filter((w) => inPiece.has(w)).length / c.length;
  const pieceCovered = p.filter((w) => inClaim.has(w)).length / p.length;
  return claimCovered >= 0.8 || (p.length >= 5 && pieceCovered >= 0.85);
}

/** A text cut into sentences and line breaks. Nothing is lost: joined, the pieces give the text back. */
export function pieces(text: string): string[] {
  const out: string[] = [];
  let start = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "\n") {
      if (i > start) out.push(text.slice(start, i));
      let j = i;
      while (text[j] === "\n") j++;
      out.push(text.slice(i, j));
      start = j;
      i = j - 1;
      continue;
    }
    if (ch !== "." && ch !== "!" && ch !== "?") continue;
    let j = i + 1;
    while (j < text.length && "\"'”’)]".includes(text[j])) j++;
    const gap = text.slice(j).match(/^[ \t]+/)?.[0] || "";
    const after = text[j + gap.length];
    // A sentence ends where its full stop is followed by the end of the line, or by a space and
    // a capital. "$12.5M" and "e.g. this" are not ends.
    if (after === undefined || after === "\n" || (gap && /[A-Z"“'(\[]/.test(after))) {
      out.push(text.slice(start, j + gap.length));
      start = j + gap.length;
      i = start - 1;
    }
  }
  if (start < text.length) out.push(text.slice(start));
  return out;
}

export interface Marked {
  text: string;
  /** del: it makes a claim nothing backs. add: an agent added it. */
  mark: "del" | "add" | null;
}

export function markUp(text: string, unbacked: string[], added: RegExp | null = null): Marked[] {
  return pieces(text).map((piece) => ({
    text: piece,
    mark: !/\S/.test(piece) ? null : unbacked.some((claim) => says(piece, claim)) ? "del" : added && added.test(piece) ? "add" : null,
  }));
}

/** The text with every piece that makes an unbacked claim taken out, and the gaps closed. */
export function strip(text: string, unbacked: string[]): string {
  return markUp(text, unbacked)
    .filter((m) => m.mark !== "del")
    .map((m) => m.text)
    .join("")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Is this claim made anywhere in the message, in words close enough to mark? */
export function located(subject: string, body: string, claim: string): boolean {
  return [...markUp(subject, [claim]), ...markUp(body, [claim])].some((m) => m.mark === "del");
}

/** A message with the sentences that make these claims taken out. A subject that was nothing
    but the claim becomes the plain one given. */
export function without(subject: string, body: string, claims: string[], plainSubject: string): { subject: string; body: string } {
  const left = strip(subject, claims);
  return { subject: left.split(/\s+/).filter(Boolean).length >= 3 ? left : plainSubject, body: strip(body, claims) };
}

const stem = (w: string) => w.replace(/(ing|ers|er|ed|es|s)$/, "");
const FILLER = new Set(["a", "an", "the", "for", "at", "to", "and", "or", "of", "on", "in", "with", "your", "you", "our", "my", "re", "about", "from", "by", "quick", "question", "idea", "intro", "introduction", "note", "hello", "hi", "team", "new", "how", "what", "why", "is", "it", "that", "this", "can", "could", "help", "helps"]);

/** A subject line that only names the product, what it does, and who it is for states nothing
    that needs a source: every word of it is the product's own words, the recipient's name, or
    filler. "Dock scheduling for Acme Logistics" is one. "Congratulations on the Series B" is not. */
export function topicOnly(subject: string, ownWords: string): boolean {
  const own = new Set(words(ownWords).map(stem));
  const said = words(subject);
  return said.length > 0 && said.every((w) => /^\d/.test(w) ? false : FILLER.has(w) || own.has(stem(w)));
}

/** The message with its greeting put right: the person it is going to by first name, or "Hi
    there," when nobody has been found. A writer with no name to use sometimes borrows one. */
export function greet(body: string, firstName: string | null): string {
  const line = firstName ? `Hi ${firstName},` : "Hi there,";
  const m = body.match(/^\s*(hi|hello|hey|dear|good (?:morning|afternoon))\b[^\n]{0,60}\n/i);
  if (!m) return body;
  return line + "\n" + body.slice(m[0].length);
}

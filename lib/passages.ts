// A web page is mostly menus, footers and cookie notices. The model is shown a few thousand
// characters per page, so those characters should be the paragraphs that bear on the question.
// This picks them by plain word overlap with the query. Every passage is kept exactly as it is
// on the page, so a quote taken from it can still be checked word for word.

const STOP = new Set(
  "the and for with that this from have has are was were will its their our your you not but can all any more about into over than then them they his her she him who what when where which how why also new one two use using used per via inc llc ltd com www http https".split(" "),
);

export function terms(text: string): string[] {
  const out = new Set<string>();
  for (const w of text.toLowerCase().split(/[^a-z0-9]+/)) if (w.length >= 3 && !STOP.has(w) && w !== "or") out.add(w);
  return [...out];
}

/** Split a page into paragraph-sized pieces, cutting very long paragraphs at sentence ends. */
function pieces(raw: string): string[] {
  const out: string[] = [];
  for (const block of raw.replace(/\r/g, "").split(/\n+/)) {
    const para = block.replace(/[ \t ]+/g, " ").trim();
    if (!para) continue;
    if (para.length <= 520) {
      out.push(para);
      continue;
    }
    let cur = "";
    for (const sentence of para.split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/)) {
      if (cur && cur.length + sentence.length + 1 > 480) {
        out.push(cur);
        cur = sentence;
      } else {
        cur = cur ? `${cur} ${sentence}` : sentence;
      }
    }
    if (cur) out.push(cur);
  }
  return out;
}

const SIGNAL_WORDS = /\b(hir(?:ing|ed|es)|rais(?:ed|es|ing)|funding|series [a-e]|launch(?:ed|es|ing)?|announc(?:ed|es|ing)|appoint(?:ed|s)|joins?|joined|opens?|opening|expand(?:s|ed|ing)?|acquir(?:ed|es)|partner(?:s|ed|ship)?|pilot|rollout|students|employees|locations|centers|campuses|schools)\b/i;

export function bestPassages(raw: string, query: string, budget: number): string {
  const all = pieces(raw);
  const whole = all.join("\n");
  if (whole.length <= budget) return whole;

  const want = terms(query);
  const scored = all.map((text, i) => {
    const low = text.toLowerCase();
    let score = 0;
    for (const t of want) if (low.includes(t)) score += 2;
    if (SIGNAL_WORDS.test(text)) score += 1;
    if (/\b(19|20)\d\d\b|\$\s?\d|\b\d+(?:,\d{3})+\b|\b\d+\s?(?:%|percent|million|billion)\b/i.test(text)) score += 0.5;
    const words = text.split(" ").length;
    if (words < 6) score *= 0.3; // a menu item or a heading
    else if (words < 12) score *= 0.7;
    if (/cookie|privacy policy|all rights reserved|subscribe to our|sign in|log in/i.test(text)) score *= 0.3;
    return { i, text, score };
  });

  // A sentence next to a strong one usually belongs with it (the number that follows the name).
  const base = scored.map((p) => p.score);
  for (const p of scored) p.score += 0.4 * Math.max(base[p.i - 1] || 0, base[p.i + 1] || 0);

  const take = new Set<number>();
  let used = 0;
  const add = (i: number) => {
    const len = all[i].length + 1;
    if (take.has(i) || used + len > budget) return false;
    take.add(i);
    used += len;
    return true;
  };
  // The first real paragraph is usually the lede: keep it, then the best of the rest.
  const lede = scored.find((p) => p.text.split(" ").length >= 12);
  if (lede) add(lede.i);
  for (const p of [...scored].sort((a, b) => b.score - a.score || a.i - b.i)) {
    if (p.score <= 0) break;
    add(p.i);
    if (used > budget - 80) break;
  }
  if (take.size === 0) return whole.slice(0, budget);
  return [...take]
    .sort((a, b) => a - b)
    .map((i) => all[i])
    .join("\n");
}

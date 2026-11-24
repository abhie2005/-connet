// Some PDFs come back from the search with their letters shifted into capitals, digits and
// symbols ("The Regan Group" as "7KH 5HJDQ *URXS"): the font was never decoded. A quote copied
// from such a page passes the word-for-word check, because the page really says that. So the
// unreadable stretches are cut out before anyone, model or person, is shown the page.

const letters = (s: string) => s.replace(/[^A-Za-z]/g, "");
const share = (s: string, of: RegExp) => (s.length ? (s.match(of) || []).length / s.length : 0);

/** Is this stretch of text unreadable? Real writing in English is well over a third vowels.
    Shifted text has few (only b, f, l and r land on one), and no small letters at all, since
    they all land on capitals. Short stretches are never judged: "DHL, XPO and NFI" is real. */
export function garbled(text: string, minLetters = 24): boolean {
  const l = letters(text);
  if (l.length < minLetters) return false;
  const vowels = share(l, /[aeiou]/gi);
  return vowels < 0.2 || (vowels < 0.3 && share(l, /[a-z]/g) < 0.05);
}

/** The text with its unreadable stretches taken out. Readable text comes back unchanged. */
export function readable(text: string): string {
  const out: string[] = [];
  for (const line of text.split("\n")) {
    const words = line.split(" ");
    if (words.length <= 30) {
      if (!garbled(line)) out.push(line);
      continue;
    }
    // A long line (a whole PDF page on one line): judge it thirty words at a time.
    const kept: string[] = [];
    for (let i = 0; i < words.length; i += 30) {
      const chunk = words.slice(i, i + 30).join(" ");
      if (!garbled(chunk)) kept.push(chunk);
    }
    if (kept.length) out.push(kept.join(" "));
  }
  return out.join("\n");
}

/** A last check on a company's name: shifted text that slipped through still gives itself away
    by a word that starts with a digit or a symbol and has almost no vowels. */
export function garbledName(name: string): boolean {
  const l = letters(name);
  if (l.length < 6 || share(l, /[aeiouy]/gi) >= 0.25) return false;
  return name.split(/\s+/).some((w) => /^\d[A-Z]{2,}$/.test(w) || /^[)(<=;:\[\]\\+*$%][A-Z]/.test(w) || /[^\x00-\x7F]/.test(w));
}

export function slug(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const ALIASES: [RegExp, string][] = [
  [/university of california,? (at )?los angeles/i, "UCLA"],
  [/university of california,? (at )?berkeley/i, "UC Berkeley"],
  [/massachusetts institute of technology/i, "MIT"],
  [/university of southern california/i, "USC"],
  [/new york university/i, "NYU"],
];

/** One spelling for a school or employer, so "UCLA" and its long name meet at the same node. */
export function canonicalName(name: string): string {
  const trimmed = name.trim().replace(/\s+/g, " ");
  for (const [pattern, short] of ALIASES) if (pattern.test(trimmed)) return short;
  return trimmed.replace(/,? (inc|llc|ltd|corp|corporation)\.?$/i, "");
}

export const companyId = (name: string) => `co:${slug(canonicalName(name))}`;
export const schoolId = (name: string) => `sch:${slug(canonicalName(name))}`;
export const personId = (name: string, company: string) => `p:${slug(name)}:${slug(canonicalName(company))}`;
export const competitorId = (name: string) => `comp:${slug(name)}`;

/** The next id in a numbered run ("m12" after "m11"), by the highest number in use and not by
    how many there are: things get removed, and a count would hand out an id that is taken. */
export function nextId(prefix: string, have: { id: string }[]): string {
  let top = 0;
  for (const x of have) {
    const n = x.id.startsWith(prefix) ? Number(x.id.slice(prefix.length)) : NaN;
    if (Number.isInteger(n) && n > top) top = n;
  }
  return `${prefix}${top + 1}`;
}

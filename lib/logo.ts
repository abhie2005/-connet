// An organization's public logo: the icon its own website publishes, fetched by the browser.
// Nothing is stored and nothing is scraped. No domain, or one that is not a real site, means no
// logo, and the page draws the plain white disc as before.
import type { GNode } from "./types";

/** "https://www.Example.org/about" to "example.org". Null for anything that is not a public site. */
export function cleanDomain(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const host = raw.trim().toLowerCase().replace(/^[a-z]+:\/\//, "").replace(/^www\./, "").split(/[/?#:]/)[0];
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(host)) return null;
  // Reserved names (sample data uses .example) never have a site behind them.
  if (/\.(example|test|invalid|local|localhost)$/.test(host)) return null;
  return host;
}

/** A school is known by name only. A one-word name ("UCLA", "Stanford") is tried as name.edu,
    which is right for most; anything longer is not guessed at. A wrong guess finds no icon. */
export function schoolDomain(name: string): string | null {
  const word = name.trim();
  if (!/^[A-Za-z]{2,12}$/.test(word)) return null;
  return `${word.toLowerCase()}.edu`;
}

/** The site whose icon stands for this node on the graph, if it has one. */
export function logoDomainOf(node: Pick<GNode, "label" | "name" | "props">): string | null {
  if (node.label === "Company") return cleanDomain(node.props.domain);
  if (node.label === "School") return schoolDomain(node.name);
  return null;
}

/** Google's public favicon service: the site's own icon, at up to 128 px. */
export const logoUrl = (domain: string) => `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;

/** What that service sends when a site has no icon is a 16 px globe. Anything this small is not a logo. */
export const MIN_LOGO_PX = 32;

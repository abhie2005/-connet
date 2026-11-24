// Contact enrichment. Hunter.io when a key is set, sample records otherwise.
// One domain search per company (Hunter's free plan allows 25 a month, so this is metered).
import { remember } from "../cache";
import { config, modes } from "../config";
import { sampleDomain } from "../sample/enrich";

export interface FoundEmail {
  email: string;
  firstName: string;
  lastName: string;
  position: string;
  seniority: string;
  confidence: number; // 0 to 100
  status: "verified" | "unverified";
  linkedin: string | null;
  sourceUrl: string | null;
}

export interface DomainResult {
  domain: string;
  organization: string | null;
  pattern: string | null; // e.g. "{first}.{last}"
  emails: FoundEmail[];
  provider: "hunter" | "sample";
}

async function hunter(domain: string): Promise<DomainResult> {
  const url = `https://api.hunter.io/v2/domain-search?domain=${encodeURIComponent(domain)}&limit=10&api_key=${encodeURIComponent(config.hunterKey)}`;
  const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(20_000) });
  const body = await res.text();
  if (!res.ok) throw new Error(`Hunter ${res.status}: ${body.slice(0, 200)}`);
  const data = (JSON.parse(body) as { data?: Record<string, unknown> }).data || {};
  const emails = (Array.isArray(data.emails) ? data.emails : []) as Record<string, unknown>[];
  return {
    domain,
    organization: (data.organization as string) || null,
    pattern: (data.pattern as string) || null,
    emails: emails
      .filter((e) => typeof e.value === "string")
      .map((e) => {
        const verification = (e.verification || {}) as { status?: string };
        const sources = (Array.isArray(e.sources) ? e.sources : []) as { uri?: string }[];
        return {
          email: String(e.value),
          firstName: String(e.first_name || ""),
          lastName: String(e.last_name || ""),
          position: String(e.position || ""),
          seniority: String(e.seniority || ""),
          confidence: Number(e.confidence || 0),
          status: verification.status === "valid" ? ("verified" as const) : ("unverified" as const),
          linkedin: e.linkedin ? String(e.linkedin) : null,
          sourceUrl: sources[0]?.uri || null,
        };
      }),
    provider: "hunter",
  };
}

export async function enrichDomain(domain: string): Promise<DomainResult> {
  // Saved answers matter most here: Hunter's free plan allows 25 domain searches a month.
  if (modes().enrich === "hunter") return remember("enrich", { domain }, () => hunter(domain));
  await new Promise((r) => setTimeout(r, 500));
  return sampleDomain(domain);
}

/** Build an address from the company's pattern. Always marked as a guess, never as verified. */
export function guessEmail(pattern: string | null, first: string, last: string, domain: string): string | null {
  if (!pattern || !first || !last) return null;
  const f = first.toLowerCase().replace(/[^a-z]/g, "");
  const l = last.toLowerCase().replace(/[^a-z]/g, "");
  if (!f || !l) return null;
  const local = pattern
    .replace("{first}", f)
    .replace("{last}", l)
    .replace("{f}", f[0])
    .replace("{l}", l[0]);
  return /[{}]/.test(local) ? null : `${local}@${domain}`;
}

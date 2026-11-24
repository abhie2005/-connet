// Sample enrichment records, shaped like Hunter's domain search.
import type { DomainResult } from "../providers/enrich";
import { EMAILS } from "./data";

export function sampleDomain(domain: string): DomainResult {
  const rec = EMAILS[domain];
  if (!rec) return { domain, organization: null, pattern: null, emails: [], provider: "sample" };
  const local = (first: string, last: string) =>
    rec.pattern
      .replace("{first}", first.toLowerCase())
      .replace("{last}", last.toLowerCase())
      .replace("{f}", first[0].toLowerCase())
      .replace("{l}", last[0].toLowerCase());
  return {
    domain,
    organization: null,
    pattern: rec.pattern,
    provider: "sample",
    emails: rec.found.map((f) => ({
      email: `${local(f.first, f.last)}@${domain}`,
      firstName: f.first,
      lastName: f.last,
      position: f.position,
      seniority: f.seniority,
      confidence: f.confidence,
      status: f.verified ? ("verified" as const) : ("unverified" as const),
      linkedin: null,
      sourceUrl: `https://sample.tact.example/${domain.split(".")[0]}/team`,
    })),
  };
}

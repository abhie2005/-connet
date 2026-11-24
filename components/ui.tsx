"use client";
// Small shared parts: the logo, icons (one stroke weight throughout), and the pieces that show
// where a fact came from.
import type { ReactNode } from "react";
import { host } from "@/lib/client";
import type { AgentName, Evidence, Message, Source, WarmPath } from "@/lib/types";

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="10" fill="#1B1640" />
      {/* a lowercase c in one pen stroke, and in its opening the node it reaches for, in the live color */}
      <path d="M25.300 12.600A9.800 9.800 0 1 0 25.300 27.400" fill="none" stroke="#FBFAFF" strokeWidth="4" strokeLinecap="round" />
      <circle cx="28.500" cy="20" r="3.100" fill="#A9B8FF" />
    </svg>
  );
}

const PATHS: Record<string, ReactNode> = {
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
  building: <><path d="M5 20V6.5A1.5 1.5 0 0 1 6.5 5h7A1.5 1.5 0 0 1 15 6.5V20" /><path d="M15 10h2.5A1.5 1.5 0 0 1 19 11.5V20M3.5 20h17M8.5 9h3M8.5 12.5h3M8.5 16h3" /></>,
  person: <><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c.6-3.6 3.4-5.5 7-5.5s6.4 1.9 7 5.5" /></>,
  zap: <path d="M13 3 5.5 13.5H11L10 21l8-11h-5.5L13 3Z" />,
  shield: <><path d="M12 3.5 5 6v5.5c0 4.3 2.9 7.4 7 9 4.1-1.6 7-4.7 7-9V6l-7-2.5Z" /><path d="m9.2 12 2 2 3.8-4" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  x: <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />,
  edit: <><path d="M4.5 19.5 5.6 15 15.8 4.8a1.8 1.8 0 0 1 2.5 0l.9.9a1.8 1.8 0 0 1 0 2.5L9 18.4l-4.5 1.1Z" /><path d="m14 6.5 3.5 3.5" /></>,
  send: <><path d="M20.5 3.5 10.5 13.5" /><path d="m20.5 3.5-6.3 17-3.7-7-7-3.7 17-6.3Z" /></>,
  out: <><path d="M13.5 5H19v5.5M19 5l-8 8" /><path d="M17 14v3.5A1.5 1.5 0 0 1 15.500 19h-9A1.5 1.5 0 0 1 5 17.500v-9A1.5 1.5 0 0 1 6.500 7H10" /></>,
  graph: <><circle cx="6" cy="7" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="12" cy="17.5" r="2.5" /><path d="m8.300 8 7.300-1.200M7.200 9.200l3.600 6.100M16.800 8.200l-3.600 7.100" /></>,
  list: <path d="M8.500 6.500H20M8.500 12H20M8.500 17.500H20M4.200 6.500h.1M4.200 12h.1M4.200 17.500h.1" />,
  columns: <><rect x="4" y="5" width="4.500" height="14" rx="1.500" /><rect x="9.750" y="5" width="4.500" height="9" rx="1.500" /><rect x="15.500" y="5" width="4.500" height="11.500" rx="1.500" /></>,
  coins: <><ellipse cx="9.500" cy="8" rx="5.500" ry="3" /><path d="M4 8v4c0 1.700 2.500 3 5.500 3M4 12v4c0 1.700 2.500 3 5.500 3 .500 0 1 0 1.500-.100" /><ellipse cx="15.500" cy="14" rx="4.500" ry="2.500" /><path d="M11 14v3.500c0 1.400 2 2.500 4.500 2.500s4.500-1.100 4.500-2.500V14" /></>,
  down: <path d="m6.500 9.500 5.500 5.500 5.500-5.500" />,
  plus: <path d="M12 5.500v13M5.500 12h13" />,
  flag: <><path d="M6 20.500V4.500" /><path d="M6 5.500c4-2 6 2 11 0v8c-5 2-7-2-11 0" /></>,
  mail: <><rect x="3.500" y="5.500" width="17" height="13" rx="2.500" /><path d="m4.500 7.500 7.500 6 7.500-6" /></>,
  brief: <><path d="M6.500 4.500h8l3.500 3.500v11.500a1 1 0 0 1-1 1h-10.500a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1Z" /><path d="M9 11h6M9 14.500h6M9 18h3.500" /></>,
  path: <><circle cx="5.500" cy="17.500" r="2.500" /><circle cx="18.500" cy="6.500" r="2.500" /><path d="M8 17.500h4a3.500 3.500 0 0 0 3.500-3.500v-1a3.500 3.500 0 0 1 3-3.400" /></>,
  pause: <path d="M9 6v12M15 6v12" />,
  reply: <><path d="M10 7 5 12l5 5" /><path d="M5 12h9a5 5 0 0 1 5 5v1.500" /></>,
  left: <path d="m14.500 6.500-5.500 5.500 5.500 5.500" />,
  right: <path d="m9.500 6.500 5.500 5.500-5.500 5.500" />,
  lock: <><rect x="5.500" y="10.500" width="13" height="9" rx="2" /><path d="M8.500 10.500V8a3.500 3.500 0 0 1 7 0v2.500" /></>,
  globe: <><circle cx="12" cy="12" r="8" /><path d="M4 12h16M12 4c2.400 2.200 3.600 4.900 3.600 8s-1.200 5.800-3.600 8c-2.400-2.200-3.600-4.900-3.600-8s1.200-5.800 3.600-8Z" /></>,
  linkedin: <><rect x="4" y="4" width="16" height="16" rx="3.500" /><path d="M8.300 11v5M8.300 8.100v.1M12 16v-5M12 13.300c0-1.300.9-2.300 2.100-2.300s1.900.9 1.900 2.300V16" /></>,
  menu: <path d="M4.500 7h15M4.500 12h15M4.500 17h15" />,
  star: <path d="m12 4.500 2.300 4.700 5.200.8-3.700 3.600.9 5.100-4.700-2.400-4.700 2.400.9-5.100-3.700-3.600 5.200-.8L12 4.500Z" />,
};

export function Icon({ name, size = 16 }: { name: keyof typeof PATHS | string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: "none" }}>
      {PATHS[name] || null}
    </svg>
  );
}

export function initials(name: string): string {
  const parts = name.replace(/[^\p{L}\p{N} ]+/gu, " ").split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** A face for someone we have no photo of: their initials. Round for a person, square for a company. */
export function Monogram({ name, size = 40, square, bright }: { name: string; size?: number; square?: boolean; bright?: boolean }) {
  return (
    <span className={`mono-face ${bright ? "is-bright" : ""}`} style={{ width: size, height: size, borderRadius: square ? Math.round(size * 0.24) : size, fontSize: Math.round(size * 0.36) }} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

/** A match score out of 100, colored by how good it is: green (70 and up), yellow, or red (under 45). */
export function Score({ total, tier, size = 17 }: { total: number; tier: "A" | "B" | "C"; size?: number }) {
  return (
    <span className={`score rate-${tier}`} style={{ fontSize: size }} title={`Match: ${total} out of 100`}>
      {total}
      <span className="score-of">/100</span>
    </span>
  );
}

export function Tier({ tier }: { tier: "A" | "B" | "C" }) {
  return (
    <span className={`tier tier-${tier}`} title={`Tier ${tier}`}>
      {tier}
    </span>
  );
}

/** How sure the agent is of something. With `word`, the number says what it is: "95% sure". */
export function Confidence({ value, word }: { value: number; word?: string }) {
  const pct = Math.round(value * 100);
  return (
    <span className="inline-flex items-center gap-2 flex-none" title={`How sure the agent is that this is right: ${pct} out of 100`}>
      <span className="bar" style={{ width: 54 }}>
        <i style={{ width: `${pct}%` }} />
      </span>
      <span className="text-[12.5px] text-faint whitespace-nowrap" style={{ minWidth: word ? 62 : 30 }}>
        {pct}%{word ? ` ${word}` : ""}
      </span>
    </span>
  );
}

/** A link to the page a fact came from. The tick means our code found the quote on that page. */
export function SourceLink({ evidence, sources }: { evidence: Evidence | null; sources: Record<string, Source> }) {
  if (!evidence) return null;
  const src = sources[evidence.sourceId];
  if (!src) return null;
  const sample = src.provider === "sample";
  return (
    <a
      className="chip chip-line hover:!text-ink"
      href={sample ? undefined : src.url}
      target="_blank"
      rel="noreferrer noopener"
      title={`${src.title}\n\n"${evidence.quote}"${sample ? "\n\nSample page: not a real site." : ""}`}
      onClick={(e) => e.stopPropagation()}
    >
      {evidence.verified && (
        <span className="text-good">
          <Icon name="check" size={13} />
        </span>
      )}
      {sample ? "sample page" : host(src.url)}
      {!sample && <Icon name="out" size={12} />}
    </a>
  );
}

export function Quote({ evidence, sources }: { evidence: Evidence; sources: Record<string, Source> }) {
  return (
    <div className="quote">
      <div>&ldquo;{evidence.quote}&rdquo;</div>
      <div className="mt-1">
        <SourceLink evidence={evidence} sources={sources} />
      </div>
    </div>
  );
}

export const AGENTS: Record<AgentName, { name: string; does: string }> = {
  planner: { name: "Planner", does: "Reads the brief, sets the plan, sums up" },
  builder: { name: "Builder", does: "Searches, builds the graph, drafts" },
  reviewer: { name: "Reviewer", does: "Checks every quote and every claim" },
  security: { name: "Security", does: "Checks what is about to be sent" },
  system: { name: "System", does: "" },
  rep: { name: "You", does: "Approve, edit or reject" },
};

/** Each agent has its own small mark, so the feed reads at a glance without a color per agent. */
export function AgentMark({ agent }: { agent: AgentName }) {
  const marks: Record<AgentName, ReactNode> = {
    planner: <circle cx="5" cy="5" r="3.300" fill="none" stroke="currentColor" strokeWidth="1.700" />,
    builder: <rect x="1.500" y="1.500" width="7" height="7" rx="1.200" fill="currentColor" />,
    reviewer: <><circle cx="5" cy="5" r="3.700" fill="none" stroke="currentColor" strokeWidth="1.400" /><circle cx="5" cy="5" r="1.500" fill="currentColor" /></>,
    security: <path d="M5 1.200 9.200 8.600H0.800Z" fill="currentColor" />,
    system: <circle cx="5" cy="5" r="1.700" fill="currentColor" />,
    rep: <circle cx="5" cy="5" r="3.900" fill="currentColor" />,
  };
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" style={{ flex: "none" }}>
      {marks[agent]}
    </svg>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="grid place-items-center text-center py-16 px-6">
      <div>
        <div className="font-semibold text-soft">{title}</div>
        {children && <div className="text-faint text-sm mt-1 max-w-sm mx-auto">{children}</div>}
      </div>
    </div>
  );
}

export function SectionTitle({ children, count, right }: { children: ReactNode; count?: number; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 mt-7 mb-2.5 first:mt-0">
      <h2 className="text-[15px] font-bold m-0">{children}</h2>
      {count != null && <span className="count">{count}</span>}
      <span className="flex-1 h-px bg-line ml-1" />
      {right}
    </div>
  );
}

/** A way in, in as few words as say it, with what is shared in bold: "Maya Okafor studied at UCLA".
    The full sentence the agent wrote is the tooltip. */
export function WayIn({ warm, who }: { warm: WarmPath; who?: string | null }) {
  const person = who || "Someone there";
  return (
    <span title={warm.note}>
      {warm.kind === "referral" ? (
        <>
          <b className="wayin">{warm.via}</b> can introduce you to {person}
        </>
      ) : (
        <>
          {person} {warm.kind === "shared_school" ? "studied at" : "worked at"} <b className="wayin">{warm.via}</b>
        </>
      )}
    </span>
  );
}

const STATUS_WORD: Record<Message["status"], string> = { sent: "Approved by you", rejected: "Rejected by you", draft: "Waiting for your approval" };

/** A message, read as it stands: who to, what it says, and what became of it. */
export function Letter({ m, when }: { m: Message; when?: string }) {
  return (
    <div className="letter">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-faint text-[13px]">To</span>
        <span className="font-bold leading-snug">{m.to.split(",")[0]}</span>
        {m.toEmail && <span className="text-soft text-[13.5px] leading-snug">{m.toEmail}</span>}
        <span className="flex-1" />
        <span className={`chip ${m.status === "sent" ? "chip-signal" : m.status === "draft" ? "chip-flag" : "chip-line"}`}>
          {STATUS_WORD[m.status]}
          {m.editedByRep && m.status !== "draft" ? ", edited" : ""}
          {when ? `, ${when}` : ""}
        </span>
      </div>
      <div className="font-bold text-[15.5px] leading-snug mt-2.5">{m.subject}</div>
      <div className="whitespace-pre-wrap text-[14.5px] leading-relaxed mt-1.5">{m.body}</div>
    </div>
  );
}

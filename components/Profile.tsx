"use client";
// The profile card: one entry per company, like a field guide. On the left, what it is and how
// well it matches (its own small graph, its types, its score bar by bar). On the right, who to
// write to, why now, the way in, the other people there and the proof. Arrow keys flip entries.
import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useRef, useState } from "react";
import { shortDate } from "@/lib/client";
import { matchPersona } from "@/lib/score";
import { COSTS, type Competitor, type Contact, type Lead, type Workspace } from "@/lib/types";
import type { Act } from "./BriefTab";
import { EmailChip } from "./LeadsTab";
import { COST_NOTE, type LeadView } from "./leads";
import { Icon, Monogram, Quote, SourceLink, Tier, initials } from "./ui";

const TIER_STROKE = { A: "#F2F2F2", B: "#9E9E9E", C: "#5C5C5C" } as const;

/** The entry's own small graph: the company, the people found there, its buying signals, and the
    shared school or employer that makes a warm way in. Drawn the way the big graph draws them. */
function Sprite({ lead, to }: { lead: Lead; to: Contact | null }) {
  const cx = 104, cy = 70;
  const people = lead.contacts.slice(0, 5);
  const signals = lead.signals.slice(0, 4);
  const fan = (n: number, i: number, mid: number, spread: number) => ((mid + (n === 1 ? 0 : (i / (n - 1) - 0.5) * spread)) * Math.PI) / 180;
  const at = (angle: number, r: number) => ({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
  const P = people.map((c, i) => ({ c, ...at(fan(people.length, i, 0, people.length > 2 ? 110 : 64), 54) }));
  const S = signals.map((s, i) => ({ s, ...at(fan(signals.length, i, 180, signals.length > 2 ? 100 : 56), 52) }));
  const warm = lead.warmPaths[0];
  const warmAt = warm ? P.find((p) => p.c.id === warm.contactId) : null;
  return (
    <svg viewBox="0 0 280 140" className="sprite" role="img" aria-label={`${lead.company}: ${people.length} people and ${signals.length} buying signals found`}>
      {S.map(({ s, x, y }) => (
        <line key={s.id} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,.2)" strokeWidth="1.1" />
      ))}
      {P.map(({ c, x, y }) => (
        <line key={c.id} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(255,255,255,.2)" strokeWidth="1.1" />
      ))}
      {warm && warmAt && (
        <>
          <path className="sprite-way" d={`M${warmAt.x} ${warmAt.y} L226 30 L256 70`} fill="none" stroke="#E3F5FF" strokeWidth="1.8" strokeDasharray="5 4" />
          <rect x="219" y="23" width="14" height="14" rx="3" fill="#0A0A0A" stroke="#B5B5B5" strokeWidth="1.5" />
          <circle cx="256" cy="70" r="6" fill="#5CC8FF" stroke="#000" strokeWidth="2" />
          <text x="226" y="15" textAnchor="middle" className="sprite-t">{warm.via.length > 16 ? warm.via.slice(0, 15) + "…" : warm.via}</text>
          <text x="256" y="90" textAnchor="middle" className="sprite-t">you</text>
        </>
      )}
      {S.map(({ s, x, y }) => (
        <path key={s.id} d={`M${x} ${y - 6.5}L${x + 6.5} ${y}L${x} ${y + 6.5}L${x - 6.5} ${y}Z`} fill="#5CC8FF" stroke="#000" strokeWidth="1.5">
          <title>{s.summary}</title>
        </path>
      ))}
      {P.map(({ c, x, y }) => (
        <g key={c.id}>
          {to?.id === c.id && <circle cx={x} cy={y} r="9.5" fill="none" stroke="#F2F2F2" strokeWidth="1.4" />}
          <circle cx={x} cy={y} r="5.5" fill={to?.id === c.id ? "#F2F2F2" : "#C4C4C4"} stroke="#000" strokeWidth="2">
            <title>{`${c.name}, ${c.title}`}</title>
          </circle>
        </g>
      ))}
      <circle cx={cx} cy={cy} r="25" fill="#0A0A0A" stroke={TIER_STROKE[lead.score.tier]} strokeWidth={lead.score.tier === "A" ? 2.8 : 2} strokeDasharray={lead.status === "suppressed" ? "3 3" : undefined} />
      <text x={cx} y={cy + 0.5} textAnchor="middle" dominantBaseline="middle" className="sprite-i">
        {initials(lead.company)}
      </text>
    </svg>
  );
}

function linkedinFor(c: Contact, company: string, sample: boolean): { href: string | null; label: string; note: string } {
  if (c.linkedin && /linkedin\.com/i.test(c.linkedin)) return { href: c.linkedin, label: "LinkedIn profile", note: "Their profile, as found in the sources" };
  if (sample) return { href: null, label: "LinkedIn", note: "Sample person: there is no real profile to open" };
  return { href: `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${c.name} ${company}`)}`, label: "Find on LinkedIn", note: "No profile address was in the sources, so this searches LinkedIn for the name and company" };
}

function Person({ c, lead, ws, main, focus, sample }: { c: Contact; lead: Lead; ws: Workspace; main?: boolean; focus?: boolean; sample: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focus) ref.current?.scrollIntoView({ block: "nearest" });
  }, [focus]);
  const persona = matchPersona(c.title, ws.icp);
  const warm = lead.warmPaths.find((w) => w.contactId === c.id);
  const li = linkedinFor(c, lead.company, sample);
  return (
    <div ref={ref} className={`person ${main ? "is-main" : ""} ${focus ? "is-focus" : ""}`}>
      <Monogram name={c.name} size={main ? 52 : 40} bright={main} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-extrabold leading-tight ${main ? "text-[18px]" : "text-[15.5px]"}`}>{c.name}</span>
          {persona && (
            <span className="chip" title={`Matches a buyer in the plan: ${persona.title}`}>
              Target buyer
            </span>
          )}
          {warm && (
            <span className="tag" title={warm.note}>
              <Icon name="path" size={13} />
              {warm.kind === "referral" ? `Intro via ${warm.via}` : warm.via}
            </span>
          )}
        </div>
        <div className="text-soft text-[14px] leading-snug">
          {c.title}
          {c.seniority && !c.title.toLowerCase().includes(c.seniority.toLowerCase()) ? <span className="text-faint">, {c.seniority} level</span> : null}
        </div>
        <div className="flex gap-1.5 flex-wrap mt-2">
          <EmailChip c={c} />
          {li.href ? (
            <a className="chip chip-link" href={li.href} target="_blank" rel="noreferrer noopener" title={li.note}>
              <Icon name="linkedin" size={14} />
              {li.label}
              <Icon name="out" size={12} />
            </a>
          ) : (
            <span className="chip chip-line" title={li.note}>
              <Icon name="linkedin" size={14} />
              {li.label}
            </span>
          )}
          <SourceLink evidence={c.evidence[0] || null} sources={ws.sources} />
        </div>
        {main && persona && (
          <div className="text-[13.5px] text-soft leading-snug mt-2.5">
            <span className="text-faint">People in this role tend to care about: </span>
            {persona.caresAbout}
          </div>
        )}
      </div>
    </div>
  );
}

function Head({ children }: { children: React.ReactNode }) {
  return <h3 className="dex-h">{children}</h3>;
}

export function Profile({
  view,
  focus,
  index,
  total,
  isBest,
  ws,
  act,
  busy,
  onClose,
  onStep,
  onShowPath,
  onDraft,
  onReview,
}: {
  view: LeadView | null;
  focus: string | null;
  index: number;
  total: number;
  isBest: boolean;
  ws: Workspace;
  act: Act;
  busy: Set<string>;
  onClose: () => void;
  onStep: (by: 1 | -1) => void;
  onShowPath: (lead: Lead) => void;
  onDraft: (lead: Lead, force?: boolean) => void;
  onReview: () => void;
}) {
  const [domain, setDomain] = useState("");
  const sample = ws.modes.llm === "sample" || ws.modes.search === "sample";
  return (
    <Dialog.Root open={!!view} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        {view && (
          <Dialog.Content
            className="dex sheet"
            aria-describedby={undefined}
            // Focus the card itself, not its first button: the arrow keys then flip entries at once.
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              (e.currentTarget as HTMLElement).focus();
            }}
            onKeyDown={(e) => {
              const typing = (e.target as HTMLElement).tagName === "INPUT";
              if (typing) return;
              if (e.key === "ArrowRight") onStep(1);
              if (e.key === "ArrowLeft") onStep(-1);
            }}
          >
            <Entry key={view.lead.id} view={view} focus={focus} index={index} total={total} isBest={isBest} ws={ws} act={act} busy={busy} sample={sample} domain={domain} setDomain={setDomain} onStep={onStep} onShowPath={onShowPath} onDraft={onDraft} onReview={onReview} />
          </Dialog.Content>
        )}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function Entry({
  view,
  focus,
  index,
  total,
  isBest,
  ws,
  act,
  busy,
  sample,
  domain,
  setDomain,
  onStep,
  onShowPath,
  onDraft,
  onReview,
}: {
  view: LeadView;
  focus: string | null;
  index: number;
  total: number;
  isBest: boolean;
  ws: Workspace;
  act: Act;
  busy: Set<string>;
  sample: boolean;
  domain: string;
  setDomain: (v: string) => void;
  onStep: (by: 1 | -1) => void;
  onShowPath: (lead: Lead) => void;
  onDraft: (lead: Lead, force?: boolean) => void;
  onReview: () => void;
}) {
  const { lead, contact, draft, sent } = view;
  const others = lead.contacts.filter((c) => c.id !== contact?.id);
  const kinds = [...new Set(lead.signals.map((s) => s.kind))];
  const running = ws.run.status === "running";
  const writing = busy.has(`d:${lead.id}`) || running;
  const finding = busy.has(`e:${lead.id}`) || running;
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <>
      <div className="dex-top">
        <button className="btn btn-plain !p-1.5" onClick={() => onStep(-1)} aria-label="Previous profile" disabled={total < 2}>
          <Icon name="left" size={18} />
        </button>
        <span className="num text-[13px] text-soft">
          {pad(index + 1)} <span className="text-faint">of {pad(total)}</span>
        </span>
        <button className="btn btn-plain !p-1.5" onClick={() => onStep(1)} aria-label="Next profile" disabled={total < 2}>
          <Icon name="right" size={18} />
        </button>
        {isBest && (
          <span className="chip chip-bright ml-1">
            <Icon name="star" size={13} />
            Best to contact first
          </span>
        )}
        {lead.status === "held" && <span className="chip chip-flag ml-1">On hold: no reason to write yet</span>}
        {lead.status === "suppressed" && <span className="chip chip-flag ml-1">Left out</span>}
        <span className="flex-1" />
        <Dialog.Close className="btn btn-plain !p-2" aria-label="Close">
          <Icon name="x" />
        </Dialog.Close>
      </div>

      <div className="dex-body">
        <aside className="dex-side scroll">
          <div className="dex-window">
            <div className="dots absolute inset-0" />
            <Sprite lead={lead} to={contact} />
          </div>
          <Dialog.Title className="text-[21px] font-extrabold leading-tight tracking-tight m-0 mt-4">{lead.company}</Dialog.Title>
          <div className="text-soft text-[14px] leading-snug mt-0.5">{[lead.industry, lead.size, lead.location].filter(Boolean).join(", ")}</div>
          <div className="flex gap-1.5 flex-wrap mt-2.5">
            <span className="chip">{lead.segment}</span>
            {kinds.map((k) => (
              <span key={k} className="chip chip-signal">
                {k}
              </span>
            ))}
            {lead.usesCompetitor && <span className="chip chip-line">Uses {lead.usesCompetitor.name}</span>}
          </div>
          {lead.domain && (
            <a className="dex-site" href={sample ? undefined : `https://${lead.domain}`} target="_blank" rel="noreferrer noopener" title={sample ? "Sample company: not a real site" : undefined}>
              <Icon name="globe" size={15} />
              {lead.domain}
              {!sample && <Icon name="out" size={12} />}
            </a>
          )}

          <div className="flex items-end gap-3 mt-5">
            <div className="text-[40px] font-extrabold leading-[0.9]">{lead.score.total}</div>
            <div className="pb-0.5">
              <div className="text-[12.5px] text-faint font-semibold leading-tight">match out of 100</div>
              <div className="flex items-center gap-1.5 text-[12.5px] text-soft leading-tight mt-1">
                <Tier tier={lead.score.tier} /> fit {lead.score.fit}, intent {lead.score.intent}
              </div>
            </div>
          </div>
          <div className="grid gap-2.5 mt-4">
            {lead.score.parts.map((p) => (
              <div key={p.label} title={p.note}>
                <div className="flex items-center gap-2 text-[13px]">
                  <span className="font-semibold w-[112px] flex-none">{p.label}</span>
                  <span className="bar flex-1">
                    <i style={{ width: `${(p.points / p.max) * 100}%` }} />
                  </span>
                  <span className="num text-[12px] text-soft w-[38px] text-right flex-none">
                    {p.points}/{p.max}
                  </span>
                </div>
                <div className="text-faint text-[12.5px] leading-snug mt-0.5 line-clamp-2">{p.note}</div>
              </div>
            ))}
          </div>
        </aside>

        <div className="dex-main scroll">
          {lead.summary && <p className="m-0 mb-5 text-[15px] leading-relaxed">{lead.summary}</p>}

          {lead.status !== "active" && (
            <div className="rounded-xl bg-flag p-3.5 mb-5 text-[14px]">
              <span className="font-bold">{lead.status === "held" ? "On hold. " : "Left out. "}</span>
              {lead.status === "held" ? "It fits, but nothing says they are buying now, so no message was written." : lead.negative?.signal}
              {lead.negative?.evidence && (
                <div className="mt-2">
                  <Quote evidence={lead.negative.evidence} sources={ws.sources} />
                </div>
              )}
            </div>
          )}

          <Head>Who to write to</Head>
          {contact ? <Person c={contact} lead={lead} ws={ws} main focus={focus === contact.id} sample={sample} /> : <div className="box p-3.5 text-soft text-[14px]">Nobody is named in the sources yet. {lead.domain ? "Find emails looks up the people who work here." : "Add the company's website below to look people up."}</div>}
          {(draft || sent) && (
            <div className={`gate ${sent ? "is-sent" : ""}`}>
              {sent ? (
                <>
                  <span className="text-good">
                    <Icon name="check" />
                  </span>
                  <span className="flex-1">You approved a message to {sent.to.split(",")[0]}. It is recorded as sent.</span>
                </>
              ) : (
                <>
                  <span className="waitdot" />
                  <span className="flex-1">A draft is written and waiting. It goes nowhere until you approve it.</span>
                  <button className="btn" onClick={onReview}>
                    Review draft
                  </button>
                </>
              )}
            </div>
          )}

          <Head>Why now</Head>
          {lead.signals.length === 0 && <div className="text-faint text-sm">No buying signal found.</div>}
          <div className="grid gap-3.5">
            {lead.signals.map((s) => (
              <div key={s.id}>
                <div className="flex items-baseline gap-2 mb-1.5 flex-wrap">
                  <span className="chip chip-signal">{s.kind}</span>
                  <span className="font-semibold leading-snug">{s.summary}</span>
                  {s.date && <span className="text-faint text-[13px] whitespace-nowrap">{shortDate(s.date)}</span>}
                </div>
                <Quote evidence={s.evidence} sources={ws.sources} />
              </div>
            ))}
          </div>

          {lead.warmPaths.length > 0 && (
            <>
              <Head>A warm way in</Head>
              {lead.warmPaths.map((w, i) => (
                <div key={i} className="waybox p-3.5 mb-2">
                  <div className="flex gap-2.5 items-start">
                    <span className="text-signal mt-0.5">
                      <Icon name="path" size={18} />
                    </span>
                    <div className="flex-1 font-semibold leading-snug">{w.note}</div>
                    <button className="btn !text-[13.5px] !py-1 !px-3" onClick={() => onShowPath(lead)}>
                      Show on graph
                    </button>
                  </div>
                  {w.evidence && <div className="text-[13.5px] mt-2 opacity-95">&ldquo;{w.evidence.quote}&rdquo;</div>}
                </div>
              ))}
            </>
          )}

          {others.length > 0 && (
            <>
              <Head>Also at {lead.company}</Head>
              <div className="grid gap-2">
                {others.map((c) => (
                  <Person key={c.id} c={c} lead={lead} ws={ws} focus={focus === c.id} sample={sample} />
                ))}
              </div>
            </>
          )}

          <Head>Proof it fits</Head>
          <div className="grid gap-3">
            {lead.evidence.map((e, i) => (
              <Quote key={i} evidence={e} sources={ws.sources} />
            ))}
            {lead.usesCompetitor && (
              <div>
                <div className="font-semibold mb-1">Uses {lead.usesCompetitor.name}</div>
                <Quote evidence={lead.usesCompetitor.evidence} sources={ws.sources} />
              </div>
            )}
          </div>

          {!lead.domain && lead.status !== "suppressed" && (
            <div className="box p-3.5 mt-5">
              <div className="font-semibold text-[14px] mb-2">No website was shown in the sources. Add it to look up the people there.</div>
              <div className="flex gap-2">
                <input className="input !py-1.5" placeholder="company.com" value={domain} onChange={(e) => setDomain(e.target.value)} aria-label="Company website" />
                <button className="btn" onClick={() => act({ type: "domain", leadId: lead.id, domain })}>
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {lead.status !== "suppressed" && (
        <div className="dex-foot">
          {sent ? (
            <span className="chip !py-1.5 !px-3">
              <span className="text-good">
                <Icon name="check" size={14} />
              </span>
              Sent after your approval
            </span>
          ) : draft ? (
            <button className="btn btn-main" onClick={onReview}>
              <span className="waitdot" />
              Review draft
            </button>
          ) : (
            <button className="btn btn-main" disabled={writing} onClick={() => onDraft(lead, true)} title={COST_NOTE.draft(COSTS["outreach.drafted"])}>
              <Icon name="edit" />
              {busy.has(`d:${lead.id}`) ? "Writing" : "Draft a message"}
            </button>
          )}
          <button className="btn btn-quiet" disabled={finding || !lead.domain} onClick={() => act({ type: "enrich", leadId: lead.id }, `e:${lead.id}`)} title={COST_NOTE.emails(COSTS["lead.enriched"])}>
            {busy.has(`e:${lead.id}`) ? "Looking" : lead.enriched ? "Look for more emails" : "Find emails"}
          </button>
          <span className="text-faint text-[12.5px] leading-tight hidden md:block">
            Draft {COSTS["outreach.drafted"]} credit, emails {COSTS["lead.enriched"]}. Nothing is sent without your approval.
          </span>
          <span className="flex-1" />
          <button className="btn btn-plain" onClick={() => act({ type: "suppress", leadId: lead.id })}>
            Do not contact
          </button>
        </div>
      )}
    </>
  );
}

/** The same kind of card for a competitor: what it is, what it costs, where we are better, and who uses it. */
export function CompetitorCard({ competitor, ws, onClose, onOpenLead }: { competitor: Competitor | null; ws: Workspace; onClose: () => void; onOpenLead: (id: string) => void }) {
  const users = competitor ? ws.leads.filter((l) => l.usesCompetitor?.name.toLowerCase() === competitor.name.toLowerCase()) : [];
  return (
    <Dialog.Root open={!!competitor} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        {competitor && (
          <Dialog.Content
            className="dex dex-small sheet"
            aria-describedby={undefined}
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              (e.currentTarget as HTMLElement).focus();
            }}
          >
            <div className="dex-top">
              <span className="chip chip-line">Competitor, {competitor.category}</span>
              <span className="flex-1" />
              <Dialog.Close className="btn btn-plain !p-2" aria-label="Close">
                <Icon name="x" />
              </Dialog.Close>
            </div>
            <div className="dex-main scroll">
              <div className="flex items-center gap-3.5">
                <Monogram name={competitor.name} size={52} square />
                <div className="min-w-0">
                  <Dialog.Title className="text-[21px] font-extrabold leading-tight tracking-tight m-0">{competitor.name}</Dialog.Title>
                  {competitor.pricing && <div className="text-soft text-[14px]">{competitor.pricing}</div>}
                </div>
              </div>
              <p className="mt-4 mb-0 text-[15px] leading-relaxed">{competitor.positioning}</p>
              <Head>Where {ws.product?.name || "we"} wins</Head>
              <div className="box p-3.5 text-[14.5px] leading-relaxed">{competitor.ourEdge}</div>
              {users.length > 0 && (
                <>
                  <Head>Leads using it</Head>
                  <div className="flex gap-1.5 flex-wrap">
                    {users.map((l) => (
                      <button key={l.id} className="btn !py-1" onClick={() => onOpenLead(l.id)}>
                        {l.company}
                        <Icon name="right" size={14} />
                      </button>
                    ))}
                  </div>
                </>
              )}
              {competitor.evidence.length > 0 && (
                <>
                  <Head>Proof</Head>
                  <div className="grid gap-3">
                    {competitor.evidence.map((e, i) => (
                      <Quote key={i} evidence={e} sources={ws.sources} />
                    ))}
                  </div>
                </>
              )}
            </div>
          </Dialog.Content>
        )}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

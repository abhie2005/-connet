"use client";
// Accounts: a dense table of who to talk to and why now, and a side sheet with the proof.
import * as Dialog from "@radix-ui/react-dialog";
import { useState } from "react";
import { shortDate } from "@/lib/client";
import { COSTS, type Contact, type Lead, type Workspace } from "@/lib/types";
import type { Act } from "./BriefTab";
import { Empty, Icon, Quote, SectionTitle, SourceLink, Tier } from "./ui";

function EmailChip({ c }: { c: Contact }) {
  if (!c.email) return <span className="chip chip-line">no address yet</span>;
  if (c.emailStatus === "verified")
    return (
      <span className="chip" title={`Verified address${c.emailConfidence ? `, ${c.emailConfidence}% confidence` : ""}`}>
        <span className="text-good">
          <Icon name="check" size={13} />
        </span>
        {c.email}
      </span>
    );
  if (c.emailStatus === "guess")
    return (
      <span className="chip chip-flag" title="Built from the company's address pattern. Not verified.">
        guess: {c.email}
      </span>
    );
  return (
    <span className="chip chip-line" title="Found, but not verified">
      {c.email}
    </span>
  );
}

function strongest(lead: Lead) {
  return lead.signals.find((s) => s.summary === lead.whyNow) || lead.signals[0] || null;
}

function Row({ lead, ws, act, busy, onOpen, pending }: { lead: Lead; ws: Workspace; act: Act; busy: Set<string>; onOpen: () => void; pending?: boolean }) {
  const signal = strongest(lead);
  const contact = lead.contacts[0];
  const warm = lead.warmPaths[0];
  const drafted = ws.messages.some((m) => m.leadId === lead.id && m.status !== "rejected");
  const off = lead.status === "suppressed";
  return (
    <tr className={`rowline cursor-pointer hover:bg-raise transition-colors ${off ? "opacity-60" : ""}`} onClick={onOpen}>
      <td className="py-2.5 pl-1 pr-2 align-top w-8">
        {!pending && <Tier tier={lead.score.tier} />}
      </td>
      <td className="py-2.5 pr-3 align-top">
        <div className="font-bold leading-snug">{lead.company}</div>
        <div className="text-faint text-[13px] leading-snug">
          {lead.segment}
          {lead.location ? `, ${lead.location}` : ""}
        </div>
      </td>
      <td className="py-2.5 pr-3 align-top w-[74px]">
        <div className={`font-bold ${pending ? "text-faint" : ""}`}>{pending ? "–" : lead.score.total}</div>
        <div className="bar mt-1" style={{ width: 54 }}>
          <i style={{ width: `${pending ? 0 : lead.score.total}%` }} />
        </div>
      </td>
      <td className="py-2.5 pr-3 align-top">
        {off ? (
          <div className="text-[14px] leading-snug">
            <span className="font-semibold">Left out: </span>
            {lead.negative?.signal || "Do not contact"} <SourceLink evidence={lead.negative?.evidence || null} sources={ws.sources} />
          </div>
        ) : signal ? (
          <div className="text-[14px] leading-snug">
            {signal.summary}{" "}
            <span className="whitespace-nowrap">
              {signal.date && <span className="text-faint text-[13px]">{shortDate(signal.date)} </span>}
              <SourceLink evidence={signal.evidence} sources={ws.sources} />
            </span>
          </div>
        ) : (
          <span className="text-faint text-[14px]">No signal found yet</span>
        )}
        {(warm || lead.usesCompetitor) && !off && (
          <div className="flex gap-1.5 flex-wrap mt-1.5">
            {warm && (
              <span className="tag" title={warm.note}>
                <Icon name="path" size={13} />
                {warm.kind === "referral" ? `Intro via ${warm.via}` : `Warm: ${warm.via}`}
              </span>
            )}
            {lead.usesCompetitor && <span className="chip chip-line">Uses {lead.usesCompetitor.name}</span>}
          </div>
        )}
      </td>
      <td className="py-2.5 align-top">
        {contact ? (
          <>
            <div className="font-semibold leading-snug">{contact.name}</div>
            <div className="text-faint text-[13px] leading-snug mb-1">{contact.title}</div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <EmailChip c={contact} />
              {lead.contacts.length > 1 && <span className="text-faint text-[13px]">and {lead.contacts.length - 1} more</span>}
            </div>
          </>
        ) : (
          <span className="text-faint text-[14px]">Nobody named yet</span>
        )}
        {!off && !pending && (
          <div className="flex gap-1.5 mt-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
            {!lead.enriched && (
              <button className="btn btn-quiet !py-1" disabled={busy.has(`e:${lead.id}`)} onClick={() => act({ type: "enrich", leadId: lead.id }, `e:${lead.id}`)} title={`Find and verify addresses. Costs ${COSTS["lead.enriched"]} credits.`}>
                {busy.has(`e:${lead.id}`) ? "Enriching" : "Enrich"}
                <span className="text-faint font-semibold">{COSTS["lead.enriched"]}</span>
              </button>
            )}
            {!drafted && (
              <button className="btn !py-1" disabled={busy.has(`d:${lead.id}`)} onClick={() => act({ type: "draft", leadId: lead.id, force: lead.status === "held" }, `d:${lead.id}`)} title={`Write a first message from the checked facts. Costs ${COSTS["outreach.drafted"]} credit.`}>
                {busy.has(`d:${lead.id}`) ? "Writing" : lead.status === "held" ? "Draft anyway" : "Draft"}
                <span className="text-faint font-semibold">{COSTS["outreach.drafted"]}</span>
              </button>
            )}
            {drafted && <span className="chip chip-line">Draft in approvals</span>}
          </div>
        )}
      </td>
    </tr>
  );
}

function Table({ leads, pending, ...rest }: { leads: Lead[]; pending?: boolean; ws: Workspace; act: Act; busy: Set<string>; onOpen: (id: string) => void }) {
  return (
    <table className="w-full border-collapse text-left" style={{ tableLayout: "fixed" }}>
      <colgroup>
        <col style={{ width: 36 }} />
        <col style={{ width: "24%" }} />
        <col style={{ width: 62 }} />
        <col />
        <col style={{ width: "31%" }} />
      </colgroup>
      <thead>
        <tr className="label">
          <th className="font-semibold pb-1.5 pl-1" />
          <th className="font-semibold pb-1.5">Account</th>
          <th className="font-semibold pb-1.5">Score</th>
          <th className="font-semibold pb-1.5">Why now</th>
          <th className="font-semibold pb-1.5">Who</th>
        </tr>
      </thead>
      <tbody>
        {leads.map((l) => (
          <Row key={l.id} lead={l} pending={pending} ws={rest.ws} act={rest.act} busy={rest.busy} onOpen={() => rest.onOpen(l.id)} />
        ))}
      </tbody>
    </table>
  );
}

export function AccountsTab({ ws, act, busy, onOpen }: { ws: Workspace; act: Act; busy: Set<string>; onOpen: (id: string) => void }) {
  const active = ws.leads.filter((l) => l.status === "active");
  const held = ws.leads.filter((l) => l.status === "held");
  const out = ws.leads.filter((l) => l.status === "suppressed");
  if (ws.leads.length === 0) return <Empty title={ws.run.status === "running" ? "Searching for accounts" : "No accounts yet"}>Accounts appear here as soon as a quote about them has been checked against its source.</Empty>;
  const stats = ws.run.stats;
  // While a run is still collecting, nothing has been scored: show what was found, and sort it
  // into "write now", "held" and "left out" only once the graph has been asked.
  const collecting = ws.run.status === "running" && ws.leads.every((l) => l.score.total === 0);
  return (
    <div>
      <div className="flex gap-2 flex-wrap mb-4">
        <span className="chip" title="Quotes the model proposed that our code found, word for word, on the cited page">
          <span className="text-good">
            <Icon name="check" size={13} />
          </span>
          {stats.claimsVerified} quotes checked against {stats.sources} sources
        </span>
        {stats.claimsDropped > 0 && (
          <span className="chip chip-flag" title="Proposed by the model, but the quote was not on the page. Dropped.">
            <Icon name="flag" size={13} />
            {stats.claimsDropped} dropped: not on the page
          </span>
        )}
        <span className="chip chip-line">{stats.graphQueries} graph queries</span>
      </div>
      {collecting && (
        <>
          <SectionTitle count={ws.leads.length}>Found so far</SectionTitle>
          <Table leads={ws.leads} pending ws={ws} act={act} busy={busy} onOpen={onOpen} />
        </>
      )}
      {!collecting && <SectionTitle count={active.length}>A reason to write now</SectionTitle>}
      {!collecting && (active.length ? <Table leads={active} ws={ws} act={act} busy={busy} onOpen={onOpen} /> : <div className="text-faint text-sm">None yet.</div>)}
      {!collecting && held.length > 0 && (
        <>
          <SectionTitle count={held.length}>Held: a fit, but no reason to write yet</SectionTitle>
          <Table leads={held} ws={ws} act={act} busy={busy} onOpen={onOpen} />
        </>
      )}
      {!collecting && out.length > 0 && (
        <>
          <SectionTitle count={out.length}>Left out</SectionTitle>
          <Table leads={out} ws={ws} act={act} busy={busy} onOpen={onOpen} />
        </>
      )}
    </div>
  );
}

export function LeadSheet({ lead, ws, act, busy, onClose, onShowPath }: { lead: Lead | null; ws: Workspace; act: Act; busy: Set<string>; onClose: () => void; onShowPath: (lead: Lead) => void }) {
  const [domain, setDomain] = useState("");
  return (
    <Dialog.Root open={!!lead} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="dialog-overlay" />
        {lead && (
          <Dialog.Content className="drawer sheet" aria-describedby={undefined}>
            <div className="flex items-start gap-3 p-6 pb-4">
              <Tier tier={lead.score.tier} />
              <div className="flex-1 min-w-0">
                <Dialog.Title className="text-[20px] font-extrabold leading-tight m-0">{lead.company}</Dialog.Title>
                <div className="text-soft text-[14px]">
                  {[lead.industry, lead.size, lead.location].filter(Boolean).join(", ")}
                </div>
              </div>
              <Dialog.Close className="btn btn-plain !p-2" aria-label="Close">
                <Icon name="x" />
              </Dialog.Close>
            </div>
            <div className="scroll flex-1 px-6 pb-6">
              {lead.summary && <p className="m-0 text-[15px]">{lead.summary}</p>}

              {lead.status !== "active" && (
                <div className="rounded-2xl bg-flag p-3.5 mt-3 text-[14px]">
                  <span className="font-bold">{lead.status === "held" ? "Held. " : "Left out. "}</span>
                  {lead.status === "held" ? "It fits, but nothing says they are buying now, so no message was written." : lead.negative?.signal}
                  {lead.negative?.evidence && (
                    <div className="mt-2">
                      <Quote evidence={lead.negative.evidence} sources={ws.sources} />
                    </div>
                  )}
                </div>
              )}

              <SectionTitle>Score {lead.score.total} of 100</SectionTitle>
              <div className="grid gap-1.5">
                {lead.score.parts.map((p) => (
                  <div key={p.label} className="grid grid-cols-[110px_64px_1fr] items-center gap-3 text-[14px]">
                    <span className="font-semibold">{p.label}</span>
                    <span className="bar">
                      <i style={{ width: `${(p.points / p.max) * 100}%` }} />
                    </span>
                    <span className="text-soft leading-snug">
                      <span className="text-ink font-semibold">
                        {p.points}/{p.max}
                      </span>{" "}
                      {p.note}
                    </span>
                  </div>
                ))}
              </div>

              {lead.warmPaths.length > 0 && (
                <>
                  <SectionTitle>A warm way in</SectionTitle>
                  {lead.warmPaths.map((w, i) => (
                    <div key={i} className="waybox p-3.5 mb-2">
                      <div className="flex gap-2.5 items-start">
                        <span className="text-signal mt-0.5"><Icon name="path" size={18} /></span>
                        <div className="flex-1 font-semibold leading-snug">{w.note}</div>
                        <button className="btn btn-main !text-[14px] !py-1 !px-3" onClick={() => onShowPath(lead)}>
                          Show on graph
                        </button>
                      </div>
                      {w.evidence && <div className="text-[13.5px] mt-2 opacity-95">&ldquo;{w.evidence.quote}&rdquo;</div>}
                    </div>
                  ))}
                </>
              )}

              <SectionTitle count={lead.signals.length}>Why now</SectionTitle>
              {lead.signals.length === 0 && <div className="text-faint text-sm">No buying signal found.</div>}
              <div className="grid gap-3">
                {lead.signals.map((s) => (
                  <div key={s.id}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="chip chip-signal">{s.kind}</span>
                      <span className="font-semibold leading-snug">{s.summary}</span>
                      {s.date && <span className="text-faint text-[13px] whitespace-nowrap">{shortDate(s.date)}</span>}
                    </div>
                    <Quote evidence={s.evidence} sources={ws.sources} />
                  </div>
                ))}
              </div>

              <SectionTitle count={lead.evidence.length}>Proof it fits</SectionTitle>
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

              <SectionTitle count={lead.contacts.length}>People</SectionTitle>
              {lead.contacts.length === 0 && <div className="text-faint text-sm">Nobody named in the sources yet.</div>}
              <div className="grid gap-3">
                {lead.contacts.map((c) => (
                  <div key={c.id}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold">{c.name}</span>
                      <span className="text-soft text-[14px]">{c.title}</span>
                    </div>
                    <div className="flex gap-1.5 flex-wrap mt-1">
                      <EmailChip c={c} />
                      {c.linkedin && (
                        <a className="chip chip-line" href={c.linkedin} target="_blank" rel="noreferrer noopener">
                          LinkedIn <Icon name="out" size={12} />
                        </a>
                      )}
                      <SourceLink evidence={c.evidence[0] || null} sources={ws.sources} />
                    </div>
                  </div>
                ))}
              </div>

              {!lead.domain && lead.status !== "suppressed" && (
                <div className="rounded-2xl bg-raise p-3.5 mt-5">
                  <div className="font-semibold text-[14px] mb-2">No website was shown in the sources. Add it to enrich contacts.</div>
                  <div className="flex gap-2">
                    <input className="input !py-1.5" placeholder="company.com" value={domain} onChange={(e) => setDomain(e.target.value)} aria-label="Company website" />
                    <button className="btn" onClick={() => act({ type: "domain", leadId: lead.id, domain })}>
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
            {lead.status !== "suppressed" && (
              <div className="flex gap-2 p-4 border-t border-line">
                <button className="btn btn-quiet" disabled={busy.has(`e:${lead.id}`) || !lead.domain} onClick={() => act({ type: "enrich", leadId: lead.id }, `e:${lead.id}`)}>
                  {busy.has(`e:${lead.id}`) ? "Enriching" : lead.enriched ? "Enrich again" : "Enrich contacts"}
                  <span className="text-faint font-semibold">{COSTS["lead.enriched"]}</span>
                </button>
                <button className="btn" disabled={busy.has(`d:${lead.id}`)} onClick={() => act({ type: "draft", leadId: lead.id, force: true }, `d:${lead.id}`)}>
                  {busy.has(`d:${lead.id}`) ? "Writing" : "Draft a message"}
                  <span className="text-faint font-semibold">{COSTS["outreach.drafted"]}</span>
                </button>
                <span className="flex-1" />
                <button className="btn btn-plain" onClick={() => act({ type: "suppress", leadId: lead.id })}>
                  Do not contact
                </button>
              </div>
            )}
          </Dialog.Content>
        )}
      </Dialog.Portal>
    </Dialog.Root>
  );
}

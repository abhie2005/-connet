"use client";
// Leads: the one to contact first, set apart at the top, then the rest in order.
// A row is a person, one line on why to write now, and one thing to do next. Everything else
// about them is in their profile card, a click away.
import { useState } from "react";
import { cleanDomain } from "@/lib/logo";
import { strongestSignal } from "@/lib/score";
import { COSTS, type Contact, type Lead, type Workspace } from "@/lib/types";
import { useLogo } from "./logos";
import type { Act } from "./BriefTab";
import { COST_NOTE, bestNext, ranked, viewOf, type LeadView } from "./leads";
import { Empty, Icon, Monogram, Score, SourceLink, WayIn } from "./ui";

export function EmailChip({ c }: { c: Contact }) {
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

interface Handlers {
  ws: Workspace;
  act: Act;
  busy: Set<string>;
  onOpen: (leadId: string) => void;
  onDraft: (lead: Lead, force?: boolean) => void;
  onReview: () => void;
}

/** The one thing to do next for this lead. */
function Next({ view, h, main, force }: { view: LeadView; h: Handlers; main?: boolean; force?: boolean }) {
  const { lead, draft, sent } = view;
  const writing = h.busy.has(`d:${lead.id}`);
  // While the agents are still working they may be about to draft this one themselves.
  const running = h.ws.run.status === "running";
  if (sent)
    return (
      <span className="chip !py-1 !px-2.5">
        <span className="text-good">
          <Icon name="check" size={13} />
        </span>
        Sent
      </span>
    );
  if (draft)
    return (
      <button className={`btn ${main ? "btn-main" : ""}`} onClick={h.onReview} title="Read the draft, then approve, edit or reject it">
        <span className="waitdot" />
        Review draft
      </button>
    );
  return (
    <button className={`btn ${main ? "btn-main" : ""}`} disabled={writing || running} onClick={() => h.onDraft(lead, force)} title={running ? "The agents are still working. This opens when they are done." : COST_NOTE.draft(COSTS["outreach.drafted"])}>
      {writing ? (
        <>
          <span className="lamp busy" />
          Writing
        </>
      ) : (
        <>
          <Icon name="edit" />
          {force ? "Draft anyway" : main ? "Draft a message" : "Draft"}
        </>
      )}
    </button>
  );
}

function Best({ view, h }: { view: LeadView; h: Handlers }) {
  const { lead, contact, signal } = view;
  const warm = lead.warmPaths[0];
  return (
    <div className="best arrive">
      <div className="flex items-start gap-4">
        <button className="facebtn" onClick={() => h.onOpen(lead.id)} aria-label={`Open the profile of ${contact?.name || lead.company}`}>
          <Monogram name={contact?.name || lead.company} size={58} square={!contact} bright />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="chip chip-bright">
              <Icon name="star" size={13} />
              Best to contact first
            </span>
          </div>
          <div className="text-[23px] font-extrabold leading-tight tracking-tight truncate">{contact?.name || lead.company}</div>
          <div className="text-soft leading-snug">
            {contact ? (
              <>
                {contact.title} at <span className="text-ink font-semibold">{lead.company}</span>
              </>
            ) : (
              "Nobody named here yet"
            )}
          </div>
        </div>
        <div className="flex-none">
          <Score total={lead.score.total} tier={lead.score.tier} size={36} />
        </div>
      </div>

      <div className="grid gap-2 mt-4">
        <div className="reason">
          <span className="reason-k">
            <Icon name="zap" size={15} />
            Why now
          </span>
          <span className="reason-v">
            {signal ? (
              <>
                {signal.summary} <SourceLink evidence={signal.evidence} sources={h.ws.sources} />
              </>
            ) : (
              <span className="text-faint">No reason to write found yet</span>
            )}
          </span>
        </div>
        {warm && (
          <div className="reason">
            <span className="reason-k text-signal">
              <Icon name="path" size={15} />
              Way in
            </span>
            <span className="reason-v">
              <WayIn warm={warm} who={lead.contacts.find((c) => c.id === warm.contactId)?.name} />
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mt-5 flex-wrap">
        <Next view={view} h={h} main />
        <button className="btn btn-plain" onClick={() => h.onOpen(lead.id)}>
          View profile
          <Icon name="right" size={15} />
        </button>
      </div>
    </div>
  );
}

function Row({ view, rank, h, force, quiet }: { view: LeadView; rank?: number; h: Handlers; force?: boolean; quiet?: boolean }) {
  const { lead, contact, signal } = view;
  const warm = lead.warmPaths[0];
  const off = lead.status === "suppressed";
  return (
    <div className={`leadrow ${off ? "opacity-60" : ""}`} onClick={() => h.onOpen(lead.id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && h.onOpen(lead.id)}>
      <span className="rank">{rank ?? ""}</span>
      <Monogram name={contact?.name || lead.company} size={40} square={!contact} />
      <div className="min-w-0">
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="font-bold leading-snug truncate flex-none max-w-[55%]">{contact?.name || lead.company}</span>
          <span className="text-faint text-[13.5px] leading-snug truncate">{contact ? `${contact.title}, ${lead.company}` : lead.segment}</span>
        </div>
        <div className="text-[14px] leading-snug mt-0.5 text-soft line-clamp-2">
          {off ? `Left out: ${lead.negative?.signal || "do not contact"}` : signal ? signal.summary : <span className="text-faint">No reason to write found yet</span>}
        </div>
        {warm && !off && !quiet && (
          <div className="mt-1.5">
            <span className="tag" title={warm.note}>
              <Icon name="path" size={13} />
              {warm.kind === "referral" ? `Intro via ${warm.via}` : `Way in: ${warm.via}`}
            </span>
          </div>
        )}
      </div>
      <div className="text-right flex-none w-[62px] pt-1">{!quiet && <Score total={lead.score.total} tier={lead.score.tier} size={19} />}</div>
      <div className="flex justify-end flex-none" onClick={(e) => e.stopPropagation()}>
        {!off && !quiet && <Next view={view} h={h} force={force} />}
      </div>
    </div>
  );
}

// The order a search works in, and which of the server's steps belongs to each.
const STEPS: { label: string; when: RegExp }[] = [
  { label: "Companies", when: /product|accounts|wider/i },
  { label: "Reasons to write", when: /signals/i },
  { label: "People", when: /people/i },
  { label: "A way in", when: /warm|competitors|graph/i },
  { label: "Drafts", when: /draft/i },
];

/** Where the search has got to: done, doing, still to come. */
function Steps({ step }: { step: string }) {
  const at = Math.max(0, STEPS.findIndex((s) => s.when.test(step)));
  return (
    <ol className="steps" aria-label="Progress of the search">
      {STEPS.map((s, i) => (
        <li key={s.label} className={i < at ? "is-done" : i === at ? "is-now" : ""} aria-current={i === at ? "step" : undefined}>
          <span className="steps-dot">{i < at ? <Icon name="check" size={12} /> : i + 1}</span>
          {s.label}
        </li>
      ))}
    </ol>
  );
}

/** A company's face: its own logo when its website publishes one, else its initials. */
function CompanyFace({ lead, size }: { lead: Lead; size: number }) {
  const logo = useLogo(cleanDomain(lead.domain));
  if (!logo) return <Monogram name={lead.company} size={size} square />;
  return (
    <span className="logo-face" style={{ width: size, height: size, borderRadius: Math.round(size * 0.24) }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logo} alt="" />
    </span>
  );
}

const strongest = (l: Lead) => (strongestSignal(l.signals) || l.signals[0])?.summary || "";

function Fold({ title, count, note, children }: { title: string; count: number; note: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3">
      <button className="fold" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span style={{ transform: open ? "rotate(90deg)" : "none", transition: "transform .2s" }}>
          <Icon name="right" size={15} />
        </span>
        <span className="font-bold text-ink">{title}</span>
        <span className="count">{count}</span>
        <span className="text-faint text-[13.5px] truncate">{note}</span>
      </button>
      {open && <div className="arrive">{children}</div>}
    </div>
  );
}

export function LeadsTab(h: Handlers) {
  const { ws } = h;
  if (ws.leads.length === 0) return <Empty title={ws.run.status === "running" ? "Looking for people to write to" : "No leads yet"}>A company shows up here as soon as a quote about it has been checked against its source.</Empty>;

  const stats = ws.run.stats;
  // While a run is still collecting, nothing has been scored: show what was found so far, and
  // rank it only once the graph has been asked.
  const collecting = ws.run.status === "running" && ws.leads.every((l) => l.score.total === 0);
  if (collecting) {
    // Companies with something to write about first, each on its own line. The rest are only
    // names so far, so they are shown as names, not as a row each saying "nothing yet".
    const withReason = ws.leads.filter((l) => l.signals.length > 0 && l.status !== "suppressed");
    const bare = ws.leads.filter((l) => !withReason.includes(l));
    return (
      <div>
        <Steps step={ws.run.step} />
        {withReason.length > 0 && (
          <>
            <h2 className="listhead !mt-5">
              With a reason to write <span className="count">{withReason.length}</span>
            </h2>
            {withReason.map((l) => (
              <div key={l.id} className="foundrow" onClick={() => h.onOpen(l.id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && h.onOpen(l.id)}>
                <CompanyFace lead={l} size={38} />
                <div className="min-w-0">
                  <div className="font-bold leading-snug truncate">{l.company}</div>
                  <div className="text-[14px] leading-snug text-soft line-clamp-2">{strongest(l)}</div>
                </div>
              </div>
            ))}
          </>
        )}
        {bare.length > 0 && (
          <>
            <h2 className="listhead !mt-5">
              {withReason.length ? "Found, no reason to write yet" : "Found so far"} <span className="count">{bare.length}</span>
            </h2>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {bare.map((l) => (
                <button key={l.id} className="namechip" onClick={() => h.onOpen(l.id)}>
                  <CompanyFace lead={l} size={22} />
                  <span className="truncate">{l.company}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    );
  }

  const list = ranked(ws);
  const best = bestNext(ws);
  const rest = list.filter((v) => v.lead.id !== best?.lead.id && !v.sent);
  const done = list.filter((v) => v.sent);
  const held = ws.leads.filter((l) => l.status === "held").map((l) => viewOf(l, ws));
  const out = ws.leads.filter((l) => l.status === "suppressed").map((l) => viewOf(l, ws));

  return (
    <div>
      {best ? <Best view={best} h={h} /> : list.length > 0 ? <div className="box p-4 text-soft">Everyone with a reason to write now has been written to. Replies are logged under Pipeline.</div> : <div className="box p-4 text-soft">Nobody has a reason to write right now. The companies on hold below fit, but nothing says they are buying.</div>}

      {rest.length > 0 && (
        <>
          <h2 className="listhead">
            Then, in this order <span className="count">{rest.length}</span>
          </h2>
          {rest.map((v) => (
            <Row key={v.lead.id} view={v} rank={list.indexOf(v) + 1} h={h} />
          ))}
        </>
      )}

      {done.length > 0 && (
        <Fold title="Written to" count={done.length} note="Approved by you and recorded as sent.">
          {done.map((v) => (
            <Row key={v.lead.id} view={v} rank={list.indexOf(v) + 1} h={h} />
          ))}
        </Fold>
      )}
      {held.length > 0 && (
        <Fold title="On hold" count={held.length} note="They fit, but nothing says they are buying now, so no message was written.">
          {held.map((v) => (
            <Row key={v.lead.id} view={v} h={h} force />
          ))}
        </Fold>
      )}
      {out.length > 0 && (
        <Fold title="Left out" count={out.length} note="A bad sign, or they asked not to be contacted.">
          {out.map((v) => (
            <Row key={v.lead.id} view={v} h={h} />
          ))}
        </Fold>
      )}

      <div className="proofline">
        <span className="text-good">
          <Icon name="check" size={14} />
        </span>
        <span>
          Every fact here was found word for word on the page it came from: {stats.claimsVerified} quotes on {stats.sources} pages.
          {stats.claimsDropped > 0 && <span className="text-warn"> {stats.claimsDropped} that could not be found {stats.claimsDropped === 1 ? "was" : "were"} dropped.</span>}
        </span>
      </div>
    </div>
  );
}

"use client";
/* Who to write to, under the graph: the best one first, then the rest in order.

   This is the app's own ranking — components/leads.ts decides it, so the order here and the order
   at / cannot disagree. Nothing on this page acts: every button is a way into the app, which is
   where a draft is read, approved or rejected. A dashboard that could send mail would be a second
   place to get that wrong. */
import { useEffect, useRef, type CSSProperties } from "react";
import { ArrowRight, Sparkles, Zap } from "lucide-react";
import { initials } from "@/components/ui";
import { ranked, wayInParts, type LeadView } from "@/components/leads";
import type { Workspace } from "@/lib/types";

/* The score carries its own colour: red at the bottom of the scale through to green at the top.
   It is the one place on this grey page where hue says something, so it is worth the exception. */
function Score({ total, tier }: { total: number; tier: string }) {
  return (
    <span className="gd-score" data-tier={tier} style={{ "--gd-score-h": Math.round((Math.max(0, Math.min(100, total)) / 100) * 132) } as CSSProperties} title={`Scored ${total} out of 100 — tier ${tier}`}>
      <strong>{total}</strong>
      <small>/100</small>
    </span>
  );
}

function WayIn({ view }: { view: LeadView }) {
  const warm = view.lead.warmPaths[0];
  if (!warm) return null;
  const { before, via, after } = wayInParts(warm, view.lead.contacts.find((c) => c.id === warm.contactId)?.name);
  return (
    <p className="gd-reason">
      <span className="gd-reason-k"><Sparkles aria-hidden="true" />Way in</span>
      <span title={warm.note}>{before}<b>{via}</b>{after}</span>
    </p>
  );
}

/** What the app would do next for this lead, said as a link rather than a button. */
function Next({ view, appHref }: { view: LeadView; appHref: string }) {
  const label = view.draft ? "Review the draft" : view.sent ? "See what was sent" : "Write a draft";
  return (
    <a className="gd-primary" href={appHref}>
      {label} <ArrowRight aria-hidden="true" />
    </a>
  );
}

function Who({ view }: { view: LeadView }) {
  const { lead, contact } = view;
  return (
    <>
      <span className="gd-face" aria-hidden="true">{initials(contact?.name || lead.company)}</span>
      <span className="gd-who">
        <strong>{contact?.name || lead.company}</strong>
        <small>{contact ? `${contact.title} at ${lead.company}` : lead.segment}</small>
      </span>
    </>
  );
}

export function DashboardLeads({ ws, appHref, picked }: { ws: Workspace; appHref: string; picked: string | null }) {
  const order = ranked(ws);
  const best = order.find((v) => !v.sent) || order[0] || null;
  const rest = order.filter((v) => v !== best);
  const seat = useRef<HTMLDivElement>(null);

  /* Clicking a company on the graph brings its row into view down here. */
  useEffect(() => {
    if (!picked || !seat.current) return;
    seat.current.querySelector(`[data-lead="${CSS.escape(picked)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [picked]);

  if (!best) return null;

  return (
    <div className="gd-leads" ref={seat}>
      <section className={`gd-panel gd-pick ${picked === best.lead.id ? "is-picked" : ""}`} data-lead={best.lead.id}>
        <header className="gd-pick-head">
          <span className="gd-flag">Best to contact first</span>
          <Score total={best.lead.score.total} tier={best.lead.score.tier} />
        </header>
        <div className="gd-pick-who"><Who view={best} /></div>
        <p className="gd-reason">
          <span className="gd-reason-k"><Zap aria-hidden="true" />Why now</span>
          <span>{best.signal?.summary || best.lead.whyNow || "No reason to write found yet"}</span>
        </p>
        <WayIn view={best} />
        <div className="gd-pick-actions">
          <Next view={best} appHref={appHref} />
          <a className="gd-secondary" href={appHref}>View profile</a>
        </div>
      </section>

      {rest.length > 0 && (
        <section className="gd-panel gd-rest">
          <header className="gd-panel-head">
            <h2>Then, in this order</h2>
            <span className="gd-unit">{rest.length}</span>
          </header>
          <ol className="gd-rest-list">
            {rest.map((view, i) => (
              <li key={view.lead.id} data-lead={view.lead.id} className={picked === view.lead.id ? "is-picked" : ""}>
                <span className="gd-rank">{i + 2}</span>
                <Who view={view} />
                <span className="gd-rest-why">{view.signal?.summary || view.lead.whyNow || "No reason to write found yet"}</span>
                <Score total={view.lead.score.total} tier={view.lead.score.tier} />
                <a className="gd-secondary gd-rest-do" href={appHref}>{view.draft ? "Review" : view.sent ? "Sent" : "Draft"}</a>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}

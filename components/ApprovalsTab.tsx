"use client";
// The approval gate. Nothing goes out unless a person approves it here.
// Each draft shows what it claims, which checked fact backs each claim, and what the reviewer
// and the security agent did to it before it got this far.
import { useState } from "react";
import { ago } from "@/lib/client";
import type { Evidence, Message, Workspace } from "@/lib/types";
import type { Act } from "./BriefTab";
import { Empty, Icon, SectionTitle, SourceLink, Tier } from "./ui";

function Draft({ m, ws, act, busy }: { m: Message; ws: Workspace; act: Act; busy: Set<string> }) {
  const lead = ws.leads.find((l) => l.id === m.leadId);
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(m.subject);
  const [body, setBody] = useState(m.body);
  const [showNote, setShowNote] = useState(false);
  const working = busy.has(`m:${m.id}`);
  const evidenceFor = (fact: number | null): Evidence | null => {
    const f = m.facts.find((x) => x.n === fact);
    if (!f || !f.sourceId) return null;
    const quote = f.text.match(/"([^"]+)"/)?.[1] || f.text;
    return { sourceId: f.sourceId, quote, verified: true };
  };
  const save = async () => {
    if (await act({ type: "message", messageId: m.id, action: "edit", subject, body }, `m:${m.id}`)) setEditing(false);
  };
  return (
    <div className="rounded-2xl border border-line p-5 arrive">
      <div className="flex items-start gap-3">
        {lead && <Tier tier={lead.score.tier} />}
        <div className="flex-1 min-w-0">
          <div className="font-bold leading-snug">{m.to}</div>
          <div className="text-soft text-[14px] leading-snug">
            {lead?.company}
            {m.toEmail ? `, ${m.toEmail}` : ", no address yet"}
          </div>
        </div>
        <div className="flex gap-1.5 flex-wrap justify-end">
          <span className="chip chip-line">
            Variant {m.variant}, {m.angle.toLowerCase()}
          </span>
          {m.review.verdict === "pass" && (
            <span className="chip" title="A second model call checked every claim against the facts">
              <span className="text-good">
                <Icon name="check" size={13} />
              </span>
              Reviewer passed it
            </span>
          )}
          {m.review.verdict === "revised" && (
            <span className="tag" title={m.review.notes.join("\n")}>
              <Icon name="flag" size={13} />
              Reviewer stopped a claim
            </span>
          )}
          {m.review.verdict === "needs_human" && (
            <span className="chip chip-flag" title={m.review.notes.join("\n")}>
              <Icon name="flag" size={13} />
              Needs you: a claim is not backed
            </span>
          )}
        </div>
      </div>

      {editing ? (
        <div className="grid gap-2 mt-4">
          <input className="input font-bold" value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Subject" />
          <textarea className="input" rows={11} value={body} onChange={(e) => setBody(e.target.value)} aria-label="Message body" />
        </div>
      ) : (
        <div className="mt-4 grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-6">
          <div>
            <div className="font-bold text-[16px] leading-snug mb-2">{m.subject}</div>
            <div className="whitespace-pre-wrap text-[14.5px] leading-relaxed">{m.body}</div>
            {m.editedByRep && <div className="text-faint text-[13px] mt-2">Edited by you.</div>}
          </div>
          <div className="text-[13.5px]">
            <div className="label mb-1.5">What it claims, and the proof</div>
            <ul className="list-none m-0 p-0 grid gap-2">
              {m.claims.map((c, i) => (
                <li key={i} className="flex gap-2">
                  <span className={c.supported ? "text-good mt-0.5" : "text-bad mt-0.5"}>
                    <Icon name={c.supported ? "check" : "x"} size={14} />
                  </span>
                  <div className="min-w-0">
                    <div className="leading-snug">{c.text}</div>
                    {c.supported ? <SourceLink evidence={evidenceFor(c.fact)} sources={ws.sources} /> : <div className="text-bad leading-snug">{c.note}</div>}
                  </div>
                </li>
              ))}
              {m.claims.length === 0 && <li className="text-faint">It makes no claims about them.</li>}
            </ul>
            {m.review.notes.length > 0 && (
              <div className="rounded-xl bg-flag p-2.5 mt-3">
                <div className="font-bold mb-0.5">{m.review.verdict === "revised" ? "Stopped before you saw it" : "Still unresolved"}</div>
                {m.review.notes.map((n, i) => (
                  <div key={i} className="leading-snug">
                    {n}
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2 mt-3 text-soft">
              <span className={m.security.ok ? "text-good mt-0.5" : "text-bad mt-0.5"}>
                <Icon name="shield" size={14} />
              </span>
              <div className="leading-snug">{m.security.notes.join(" ")}</div>
            </div>
          </div>
        </div>
      )}

      {showNote && !editing && (
        <div className="rounded-xl bg-raise p-3 mt-4 text-[14px]">
          <div className="label mb-1">LinkedIn connection note</div>
          {m.linkedinNote}
        </div>
      )}

      <div className="flex items-center gap-2 mt-5">
        {editing ? (
          <>
            <button className="btn" onClick={save} disabled={working}>
              Save changes
            </button>
            <button className="btn btn-plain" onClick={() => setEditing(false)}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button className="btn btn-main !py-2" disabled={working} onClick={() => act({ type: "message", messageId: m.id, action: "approve" }, `m:${m.id}`)}>
              <Icon name="check" />
              Approve and send
            </button>
            <button className="btn btn-quiet" onClick={() => setEditing(true)}>
              <Icon name="edit" />
              Edit
            </button>
            <button className="btn btn-plain" disabled={working} onClick={() => act({ type: "message", messageId: m.id, action: "reject" }, `m:${m.id}`)}>
              Reject
            </button>
            <span className="flex-1" />
            {m.linkedinNote && (
              <button className="btn btn-plain" onClick={() => setShowNote(!showNote)}>
                {showNote ? "Hide" : "Show"} LinkedIn note
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function ApprovalsTab({ ws, act, busy }: { ws: Workspace; act: Act; busy: Set<string> }) {
  const drafts = ws.messages.filter((m) => m.status === "draft");
  const done = ws.messages.filter((m) => m.status !== "draft").sort((a, b) => (b.decidedAt || "").localeCompare(a.decidedAt || ""));
  if (ws.messages.length === 0) return <Empty title="Nothing to approve yet">Drafts land here after the reviewer and the security agent have been through them. Nothing is sent without your approval.</Empty>;
  return (
    <div>
      <div className="box flex items-start gap-3 p-3.5 mb-5">
        <span className="text-soft mt-0.5">
          <Icon name="lock" size={18} />
        </span>
        <div className="text-[14px] leading-snug">
          <span className="font-bold">You approve every message. </span>
          <span className="text-soft">The agents write and check a draft, and it stops here until you click approve. In this build sending is switched off, so an approved message is recorded as sent and nothing leaves this machine.</span>
        </div>
      </div>
      <SectionTitle count={drafts.length}>Waiting for you</SectionTitle>
      {drafts.length === 0 && <div className="text-faint text-sm">All caught up.</div>}
      <div className="grid gap-4">
        {drafts.map((m) => (
          <Draft key={m.id} m={m} ws={ws} act={act} busy={busy} />
        ))}
      </div>
      {done.length > 0 && (
        <>
          <SectionTitle count={done.length}>Decided</SectionTitle>
          {done.map((m, i) => (
            <div key={m.id} className={`flex items-center gap-3 py-2.5 ${i ? "rowline" : ""}`}>
              <span className={m.status === "sent" ? "text-good" : "text-faint"}>
                <Icon name={m.status === "sent" ? "send" : "x"} />
              </span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold leading-snug truncate">{m.subject}</div>
                <div className="text-faint text-[13px]">To {m.to}</div>
              </div>
              <span className="chip chip-line">
                {m.status === "sent" ? "Approved by you" : "Rejected by you"}
                {m.editedByRep ? ", edited" : ""}
              </span>
              <span className="text-faint text-[13px] w-20 text-right">{ago(m.decidedAt)}</span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

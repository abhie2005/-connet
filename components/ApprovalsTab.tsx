"use client";
// The approval gate. Nothing goes out unless a person approves it here.
// Each draft shows what it claims, which checked fact backs each claim, and what the reviewer
// and the security agent did to it before it got this far.
import { useState } from "react";
import { ago } from "@/lib/client";
import type { Evidence, Message, Workspace } from "@/lib/types";
import type { Act } from "./BriefTab";
import { Empty, Icon, SectionTitle, SourceLink } from "./ui";

function Draft({ m, ws, act, busy }: { m: Message; ws: Workspace; act: Act; busy: Set<string> }) {
  const lead = ws.leads.find((l) => l.id === m.leadId);
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(m.subject);
  const [body, setBody] = useState(m.body);
  // The proof is one click away. It is open from the start only when something needs the rep.
  const [proof, setProof] = useState(m.review.verdict === "needs_human");
  const working = busy.has(`m:${m.id}`);
  const backed = m.claims.filter((c) => c.supported).length;
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
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-faint text-[13.5px]">To</span>
        <span className="font-bold leading-snug">{m.to.split(",")[0]}</span>
        <span className="text-soft text-[14px] leading-snug">
          {lead?.company}
          {m.toEmail ? `, ${m.toEmail}` : ", no address yet"}
        </span>
      </div>

      {editing ? (
        <div className="grid gap-2 mt-4">
          <input className="input font-bold" value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Subject" />
          <textarea className="input" rows={11} value={body} onChange={(e) => setBody(e.target.value)} aria-label="Message body" />
        </div>
      ) : (
        <div className="mt-3.5 max-w-[640px]">
          <div className="font-bold text-[16px] leading-snug mb-2">{m.subject}</div>
          <div className="whitespace-pre-wrap text-[14.5px] leading-relaxed">{m.body}</div>
          {m.editedByRep && <div className="text-faint text-[13px] mt-2">Edited by you.</div>}
        </div>
      )}

      {!editing && (
        <div className={`checked ${m.review.verdict === "pass" ? "" : "is-flag"}`}>
          <span className={m.review.verdict === "pass" ? "text-good" : "text-warn"}>
            <Icon name={m.review.verdict === "pass" ? "check" : "flag"} size={16} />
          </span>
          <div className="flex-1 min-w-0 leading-snug">
            {m.review.verdict === "pass" && (
              <>
                A second agent checked it: {backed} {backed === 1 ? "claim" : "claims"}, each backed by a source.
              </>
            )}
            {m.review.verdict === "revised" && (
              <>
                <span className="font-bold">A second agent stopped a claim before you saw it. </span>
                {m.review.notes.join(" ")}
              </>
            )}
            {m.review.verdict === "needs_human" && (
              <>
                <span className="font-bold">Needs you: a claim is not backed. </span>
                {m.review.notes.join(" ")}
              </>
            )}
          </div>
          <button className="btn btn-plain !py-1 !text-[13px]" onClick={() => setProof(!proof)} aria-expanded={proof}>
            {proof ? "Hide proof" : "Show proof"}
          </button>
        </div>
      )}

      {proof && !editing && (
        <div className="text-[13.5px] mt-3 arrive">
          <ul className="list-none m-0 p-0 grid gap-2">
            {m.claims.map((c, i) => (
              <li key={i} className="flex gap-2">
                <span className={c.supported ? "text-good mt-0.5" : "text-bad mt-0.5"}>
                  <Icon name={c.supported ? "check" : "x"} size={14} />
                </span>
                <div className="min-w-0 flex items-baseline gap-2 flex-wrap">
                  <span className="leading-snug">{c.text}</span>
                  {c.supported ? <SourceLink evidence={evidenceFor(c.fact)} sources={ws.sources} /> : <span className="text-bad leading-snug">{c.note}</span>}
                </div>
              </li>
            ))}
            {m.claims.length === 0 && <li className="text-faint">It makes no claims about them.</li>}
            <li className="flex gap-2 text-soft">
              <span className={m.security.ok ? "text-good mt-0.5" : "text-bad mt-0.5"}>
                <Icon name="shield" size={14} />
              </span>
              <span className="leading-snug">{m.security.notes.join(" ")}</span>
            </li>
          </ul>
          {m.linkedinNote && (
            <div className="box p-3 mt-3">
              <div className="label mb-1">A shorter note for LinkedIn</div>
              {m.linkedinNote}
            </div>
          )}
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

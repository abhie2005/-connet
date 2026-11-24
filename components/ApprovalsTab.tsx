"use client";
// The approval gate. Nothing goes out unless a person approves it here.
// Each draft shows what it claims, which checked fact backs each claim, and what the reviewer
// and the security agent did to it before it got this far.
import { useState } from "react";
import { ago } from "@/lib/client";
import { markUp, says, strip, type Marked } from "@/lib/marks";
import type { Evidence, Message, Workspace } from "@/lib/types";
import type { Act } from "./BriefTab";
import { Empty, Icon, SectionTitle, SourceLink } from "./ui";

/** A message with what must go struck out in red and what an agent added in green. */
function Marks({ of }: { of: Marked[] }) {
  return (
    <>
      {of.map((x, i) =>
        x.mark ? (
          <span key={i} className={x.mark === "del" ? "mark-del" : "mark-add"}>
            {x.text}
          </span>
        ) : (
          x.text
        ),
      )}
    </>
  );
}

// The line the security check adds when a message has no way to opt out.
const OPT_OUT = /won['’]?t follow up/i;

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

  // What the reviewer could not back, found again in the message as it stands now.
  const unbacked = m.claims.filter((c) => !c.supported);
  const backed = m.claims.filter((c) => c.supported);
  const wrong = unbacked.map((c) => c.text);
  const inSubject = markUp(m.subject, wrong);
  const inBody = markUp(m.body, wrong, m.security.notes.some((n) => /opt out/i.test(n)) ? OPT_OUT : null);
  const marked = [...inSubject, ...inBody].filter((x) => x.mark === "del");
  const found = (text: string) => marked.some((x) => says(x.text, text));
  const present = unbacked.filter((c) => found(c.text));
  const gone = unbacked.filter((c) => !found(c.text) && m.editedByRep);
  const loose = unbacked.filter((c) => !found(c.text) && !m.editedByRep);
  const added = inBody.some((x) => x.mark === "add");
  const earlier = m.review.verdict === "revised" ? m.review.notes : [];
  const warnings = m.security.notes.filter((n) => /guess|No email address|removed|not the recipient/i.test(n));
  const todo = present.length + loose.length;

  const save = async () => {
    if (await act({ type: "message", messageId: m.id, action: "edit", subject, body }, `m:${m.id}`)) setEditing(false);
  };
  /** Take out every sentence marked in red. A subject that was nothing but the claim becomes a plain one. */
  const remove = async () => {
    const left = strip(m.subject, wrong);
    const nextSubject = left.split(/\s+/).length >= 3 ? left : `${ws.product?.name || "A note"} for ${lead?.company || m.to.split(",")[0]}`;
    const nextBody = strip(m.body, wrong);
    setSubject(nextSubject);
    setBody(nextBody);
    await act({ type: "message", messageId: m.id, action: "edit", subject: nextSubject, body: nextBody }, `m:${m.id}`);
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
        <div className="mt-4 grid grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] gap-7">
          <div>
            <div className="font-bold text-[16px] leading-snug mb-2">
              <Marks of={inSubject} />
            </div>
            <div className="whitespace-pre-wrap text-[14.5px] leading-relaxed">
              <Marks of={inBody} />
            </div>
            {m.editedByRep && <div className="text-faint text-[13px] mt-2">Edited by you.</div>}
          </div>

          <div className="text-[13.5px]">
            <div className="flex items-center gap-2 mb-3">
              <span className={todo ? "text-bad" : "text-good"}>
                <Icon name={todo ? "x" : "check"} size={16} />
              </span>
              <span className="font-bold text-[14.5px] leading-snug flex-1">
                {todo ? `${todo} ${todo === 1 ? "claim" : "claims"} not backed` : gone.length ? "Nothing unbacked is left" : "Every claim is backed"}
              </span>
              {present.length > 0 && (
                <button className="btn !py-1 !px-3 !text-[13px]" disabled={working} onClick={remove} title="Takes the sentences marked in red out of the message. You can still edit it afterwards.">
                  Delete {present.length === 1 ? "it" : "them"}
                </button>
              )}
            </div>

            {todo > 0 && (
              <div className="mb-3.5">
                <span className="mark-del mark-key">Delete</span>
                <ul className="list-none m-0 mt-1.5 p-0 grid gap-1.5">
                  {[...present, ...loose].map((c, i) => (
                    <li key={i} className="leading-snug line-clamp-2" title={c.note}>
                      {c.text}
                    </li>
                  ))}
                </ul>
                {loose.length > 0 && present.length === 0 && <div className="text-faint mt-1.5 leading-snug">Not found word for word, so nothing is marked. Use Edit to take {loose.length === 1 ? "it" : "them"} out.</div>}
              </div>
            )}

            {gone.length > 0 && (
              <div className="mb-3.5">
                <span className="mark-key text-faint">Deleted by you</span>
                <ul className="list-none m-0 mt-1.5 p-0 grid gap-1.5 text-faint">
                  {gone.map((c, i) => (
                    <li key={i} className="leading-snug line-clamp-1 line-through">
                      {c.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {added && (
              <div className="mb-3.5">
                <span className="mark-add mark-key">Added</span>
                <div className="mt-1.5 leading-snug">A way to opt out, by the security check</div>
              </div>
            )}

            {backed.length > 0 && (
              <div className="mb-3.5">
                <span className="mark-key text-soft">Backed by a source</span>
                <ul className="list-none m-0 mt-1.5 p-0 grid gap-2">
                  {backed.map((c, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-good mt-0.5">
                        <Icon name="check" size={14} />
                      </span>
                      <div className="min-w-0">
                        <div className="leading-snug line-clamp-2">{c.text}</div>
                        <SourceLink evidence={evidenceFor(c.fact)} sources={ws.sources} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {earlier.length > 0 && (
              <div className="mb-3.5">
                <span className="mark-key text-soft">Taken out before you saw it</span>
                <ul className="list-none m-0 mt-1.5 p-0 grid gap-1.5 text-faint">
                  {earlier.map((n, i) => (
                    <li key={i} className="leading-snug line-clamp-2" title={n}>
                      {n.replace(/\s*Remove it\.?$/i, "")}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {warnings.map((n, i) => (
              <div key={i} className="flex gap-2 text-warn leading-snug mb-1.5">
                <span className="mt-0.5">
                  <Icon name="flag" size={14} />
                </span>
                {n}
              </div>
            ))}
          </div>
        </div>
      )}

      {showNote && !editing && (
        <div className="box p-3 mt-4 text-[14px]">
          <div className="label mb-1">A shorter note for LinkedIn</div>
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
            <button
              className="btn btn-quiet"
              onClick={() => {
                setSubject(m.subject);
                setBody(m.body);
                setEditing(true);
              }}
            >
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

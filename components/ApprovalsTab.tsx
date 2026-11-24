"use client";
// The approval gate. Nothing goes out unless a person approves it here.
// Each draft shows what it claims, which checked fact backs each claim, and what the reviewer
// and the security agent did to it before it got this far.
import { useState } from "react";
import { ago } from "@/lib/client";
import { markUp, says, type Marked } from "@/lib/marks";
import { COSTS, type Evidence, type Message, type Workspace } from "@/lib/types";
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
  const [address, setAddress] = useState("");
  const working = busy.has(`m:${m.id}`);
  const evidenceFor = (fact: number | null): Evidence | null => {
    const f = m.facts.find((x) => x.n === fact);
    if (!f || !f.sourceId) return null;
    const quote = f.text.match(/"([^"]+)"/)?.[1] || f.text;
    return { sourceId: f.sourceId, quote, verified: true };
  };

  // What the reviewer could not back, found again in the message as it stands now.
  // A claim the rep chose to keep is no longer marked; it is listed as kept, never as backed.
  const all = m.claims.map((c, index) => ({ ...c, index }));
  const unbacked = all.filter((c) => !c.supported && !c.kept && !c.removed);
  const removed = all.filter((c) => !c.supported && c.removed);
  const kept = all.filter((c) => !c.supported && c.kept && !c.removed);
  const backed = all.filter((c) => c.supported);
  const wrong = unbacked.map((c) => c.text);
  const inSubject = markUp(m.subject, wrong);
  const inBody = markUp(m.body, wrong, m.security.notes.some((n) => /opt out/i.test(n)) ? OPT_OUT : null);
  const marked = [...inSubject, ...inBody].filter((x) => x.mark === "del");
  const found = (text: string) => marked.some((x) => says(x.text, text));
  const present = unbacked.filter((c) => found(c.text));
  // Deleted with the button, or taken out by hand in Edit.
  const gone = [...removed, ...unbacked.filter((c) => !found(c.text) && m.editedByRep)];
  const loose = unbacked.filter((c) => !found(c.text) && !m.editedByRep);
  const added = inBody.some((x) => x.mark === "add");
  const earlier = m.review.verdict === "revised" ? m.review.notes : [];
  const warnings = m.security.notes.filter((n) => /guess|No email address|removed|not the recipient/i.test(n));
  const todo = present.length + loose.length;

  const save = async () => {
    if (await act({ type: "message", messageId: m.id, action: "edit", subject, body }, `m:${m.id}`)) setEditing(false);
  };
  /** Take out every sentence still marked in red. A subject that was nothing but the claim becomes a plain one. */
  const removeAll = () => act({ type: "claim", messageId: m.id, index: "all", action: "delete" }, `m:${m.id}`);
  // A claim that is the subject line itself: deleting it cannot leave the message without a subject.
  const isSubject = (text: string) => inSubject.some((x) => x.mark === "del" && says(x.text, text)) && !inBody.some((x) => x.mark === "del" && says(x.text, text));
  const plain = `${ws.product?.name || "A note"} for ${lead?.company || m.to.split(",")[0]}`;
  /** One claim at a time: delete its sentence, keep it as it is, or take a keep back. */
  const claim = (index: number, action: "delete" | "keep" | "unkeep") => act({ type: "claim", messageId: m.id, index, action }, `m:${m.id}`);

  return (
    <div className="rounded-2xl border border-line p-5 arrive min-w-0">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="text-faint text-[13.5px]">To</span>
        <span className="font-bold leading-snug">{m.to.split(",")[0]}</span>
        <span className="text-soft text-[14px] leading-snug">
          {m.contactId ? lead?.company : "nobody found there yet"}
          {m.toEmail ? `, ${m.toEmail}` : ""}
        </span>
        {!m.toEmail && <span className="chip chip-flag">no address yet</span>}
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
                {todo ? `${todo} ${todo === 1 ? "claim" : "claims"} not backed` : gone.length || kept.length ? "Nothing is left to decide" : "Every claim is backed"}
              </span>
              {present.length > 1 && (
                <button className="btn !py-1 !px-3 !text-[13px]" disabled={working} onClick={removeAll} title="Takes every sentence marked in red out of the message. You can still edit it afterwards.">
                  Delete all
                </button>
              )}
            </div>

            {todo > 0 && (
              <div className="mb-3.5">
                <span className="mark-del mark-key">Not backed</span>
                <ul className="list-none m-0 mt-2 p-0 grid gap-2">
                  {[...present, ...loose].map((c) => (
                    <li key={c.index} className="claim">
                      <div className="leading-snug line-clamp-3" title={c.note}>
                        {c.text}
                      </div>
                      <div className="claim-acts">
                        <button className="claim-btn" disabled={working} onClick={() => claim(c.index, "keep")} title="Leave this sentence in the message. It will be listed as kept by you, not as backed.">
                          Keep
                        </button>
                        {!present.includes(c) && (
                          <button className="claim-btn" disabled={working} onClick={() => claim(c.index, "delete")} title="This is not in the message as it stands, so there is nothing to take out. Clear it from the list.">
                            Dismiss
                          </button>
                        )}
                        {present.includes(c) && (
                          <button className="claim-btn is-del" disabled={working} onClick={() => claim(c.index, "delete")} title={isSubject(c.text) ? `This is the subject line. Deleting it puts a plain subject in its place: "${plain}".` : "Take this sentence out of the message."}>
                            {isSubject(c.text) ? "Use a plain subject" : "Delete"}
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
                {loose.length > 0 && <div className="text-faint mt-1.5 leading-snug">{loose.length === 1 ? "One of these is" : `${loose.length} of these are`} not in the message word for word, so nothing is marked for {loose.length === 1 ? "it" : "them"}. Check with Edit, then keep or dismiss.</div>}
              </div>
            )}

            {gone.length > 0 && (
              <div className="mb-3.5">
                <span className="mark-key text-faint">Removed by you</span>
                <ul className="list-none m-0 mt-1.5 p-0 grid gap-1.5 text-faint">
                  {gone.map((c, i) => (
                    <li key={i} className="leading-snug line-clamp-1 line-through">
                      {c.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {kept.length > 0 && (
              <div className="mb-3.5">
                <span className="mark-key text-soft">Kept by you</span>
                <ul className="list-none m-0 mt-2 p-0 grid gap-2">
                  {kept.map((c) => (
                    <li key={c.index} className="claim">
                      <div className="leading-snug line-clamp-2">{c.text}</div>
                      <div className="claim-acts">
                        <button className="claim-btn" disabled={working} onClick={() => claim(c.index, "unkeep")}>
                          Undo
                        </button>
                      </div>
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

      {!m.toEmail && !editing && lead && (
        // No address, so nothing can be sent: look one up, or type one in.
        <div className="needaddr">
          <div className="font-bold text-[14.5px] leading-snug">It cannot be sent yet: there is no address.</div>
          <div className="text-soft text-[13.5px] leading-snug">{lead.enriched ? `The lookup found none${lead.domain ? ` at ${lead.domain}` : ""}. Type one in.` : lead.domain ? "Look one up, or type one in." : "No website is known for this company, so type one in."}</div>
          <div className="flex items-center gap-2 flex-wrap mt-2.5">
            {lead.domain && !lead.enriched && (
              <button className="btn btn-main !py-1.5" disabled={working || busy.has(`e:${lead.id}`)} title={`Looks up the people and addresses at ${lead.domain}. Costs ${COSTS["lead.enriched"]} credits.`} onClick={() => act({ type: "enrich", leadId: lead.id }, `e:${lead.id}`)}>
                <Icon name="search" size={15} />
                {busy.has(`e:${lead.id}`) ? "Looking" : "Find their address"}
              </button>
            )}
            <input className="input needaddr-in" type="email" placeholder="name@company.com" value={address} onChange={(e) => setAddress(e.target.value)} aria-label="Their email address" onKeyDown={(e) => e.key === "Enter" && address.trim() && act({ type: "address", messageId: m.id, email: address }, `m:${m.id}`)} />
            <button className="btn !py-1.5" disabled={working || !address.trim()} onClick={() => act({ type: "address", messageId: m.id, email: address }, `m:${m.id}`)}>
              Use this address
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mt-5 flex-wrap">
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
            <button className="btn btn-main !py-2" disabled={working || !m.toEmail} title={m.toEmail ? "Records your approval. This build does not send real email: nothing leaves this computer." : "There is no address to send this to yet."} onClick={() => act({ type: "message", messageId: m.id, action: "approve" }, `m:${m.id}`)}>
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
      <div className="grid gap-4 grid-cols-[minmax(0,1fr)]">
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

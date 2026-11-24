"use client";
// The calendar: meetings the agent proposed when a reply agreed to talk, and the ones you booked.
// Two weeks at a glance, then each meeting with the one thing to do about it.
import { useState } from "react";
import { fromStamp, googleLink, icsFor, stamp } from "@/lib/meetings";
import type { Meeting, Workspace } from "@/lib/types";
import type { Act } from "./BriefTab";
import { Icon, SectionTitle } from "./ui";

const time = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

function Entry({ m, ws, act, busy }: { m: Meeting; ws: Workspace; act: Act; busy: boolean }) {
  const lead = ws.leads.find((l) => l.id === m.leadId);
  const who = lead?.contacts.find((c) => c.id === m.contactId);
  const [start, setStart] = useState(m.start);
  const at = fromStamp(m.start);
  const booked = m.status === "booked";
  const changed = start !== m.start;
  const save = () => act({ type: "meeting", meetingId: m.id, action: "book", start }, `mt:${m.id}`);
  const download = () => {
    const url = URL.createObjectURL(new Blob([icsFor(m)], { type: "text/calendar" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(lead?.company || "meeting").replace(/[^\w]+/g, "-").toLowerCase()}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className={`meet ${booked ? "" : "is-proposed"}`}>
      <div className="meet-date" aria-hidden="true">
        <span>{at.toLocaleDateString("en-US", { month: "short" })}</span>
        <b>{at.getDate()}</b>
        <span>{at.toLocaleDateString("en-US", { weekday: "short" })}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-bold leading-snug truncate">
          {who ? who.name : lead?.company}
          {who && <span className="text-soft font-semibold">, {lead?.company}</span>}
        </div>
        <div className="text-[13.5px] leading-snug text-soft">
          {time(at)}, {m.minutes} min
          {!booked && <span className="text-warn font-semibold">{m.exact ? ". The time they named. Waiting for you." : ". They named no exact time: this is a suggestion."}</span>}
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-2.5">
          <input type="datetime-local" className="input meet-when" value={start} onChange={(e) => setStart(e.target.value)} aria-label="Day and time" />
          {!booked ? (
            <button className="btn btn-main !py-1.5" disabled={busy || !start} onClick={save}>
              <Icon name="check" size={15} />
              Book it
            </button>
          ) : (
            changed && (
              <button className="btn !py-1.5" disabled={busy || !start} onClick={save}>
                Move it
              </button>
            )
          )}
          {booked && !changed && (
            <>
              <a className="btn !py-1.5" href={googleLink(m)} target="_blank" rel="noreferrer" title="Opens Google Calendar with this meeting filled in. Add them as a guest there to send the invitation.">
                <Icon name="out" size={15} />
                Add to Google Calendar
              </a>
              <button className="btn btn-quiet !py-1.5" onClick={download} title="A calendar file for Apple Calendar, Outlook and others">
                Calendar file
              </button>
            </>
          )}
          <span className="flex-1" />
          <button className="btn btn-plain !py-1.5" disabled={busy} onClick={() => act({ type: "meeting", meetingId: m.id, action: "cancel" }, `mt:${m.id}`)}>
            {booked ? "Cancel meeting" : "Dismiss"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Calendar({ ws, act, busy }: { ws: Workspace; act: Act; busy: Set<string> }) {
  const meetings = (ws.meetings || []).filter((m) => m.status !== "cancelled").sort((a, b) => a.start.localeCompare(b.start));
  if (meetings.length === 0) return null;
  // Two weeks, from this week's Monday, moved on if the first meeting is later than that.
  const today = new Date();
  const first = fromStamp(meetings[0].start);
  const from = first.getTime() > today.getTime() + 13 * 86_400_000 ? first : today;
  const monday = new Date(from.getFullYear(), from.getMonth(), from.getDate() - ((from.getDay() + 6) % 7));
  const days = Array.from({ length: 14 }, (_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
  const waiting = meetings.filter((m) => m.status === "proposed").length;
  return (
    <div className="mb-7">
      <SectionTitle count={meetings.length}>Calendar</SectionTitle>
      <div className="cal" role="img" aria-label={`${meetings.length} ${meetings.length === 1 ? "meeting" : "meetings"} in the next two weeks`}>
        {days.map((d) => {
          const here = meetings.filter((m) => sameDay(fromStamp(m.start), d));
          return (
            <div key={stamp(d)} className={`cal-day ${sameDay(d, today) ? "is-today" : ""} ${d.getDay() === 0 || d.getDay() === 6 ? "is-off" : ""}`}>
              <div className="cal-n">
                <span>{d.toLocaleDateString("en-US", { weekday: "short" })}</span>
                <b>{d.getDate()}</b>
              </div>
              {here.map((m) => (
                <div key={m.id} className={`cal-pill ${m.status === "booked" ? "" : "is-proposed"}`} title={m.title}>
                  {time(fromStamp(m.start)).replace(":00", "")} {ws.leads.find((l) => l.id === m.leadId)?.company}
                </div>
              ))}
            </div>
          );
        })}
      </div>
      <div className="grid gap-2.5 mt-3">
        {meetings.map((m) => (
          <Entry key={`${m.id}:${m.start}:${m.status}`} m={m} ws={ws} act={act} busy={busy.has(`mt:${m.id}`)} />
        ))}
      </div>
      <div className="text-faint text-[13px] mt-2">{waiting > 0 ? "The agent proposes a meeting when a reply agrees to talk. It is only booked when you book it." : "Booked by you. Nothing is sent to them from here: invite them from your own calendar."}</div>
    </div>
  );
}

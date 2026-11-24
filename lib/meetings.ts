// Meetings: when a reply agrees to talk, the agent puts a meeting on the calendar as a proposal
// and the rep confirms it. Times are wall-clock times on the rep's own machine, written
// "YYYY-MM-DDTHH:MM" with no time zone, which is what a calendar file and Google's "add event"
// link both read as local time.
import type { Meeting } from "./types";

const pad = (n: number) => String(n).padStart(2, "0");
export const stamp = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const fromStamp = (s: string) => {
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) : new Date(NaN);
};

const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

/** Does the reply ask for, or agree to, a conversation? */
export function wantsMeeting(text: string): boolean {
  return /\b(call|meet|meeting|demo|chat|talk|zoom|calendar|walk(?: me| us)? through|show (?:me|us)|time (?:to|this|next)|slot|availability|available)\b/i.test(text);
}

/** The day and time a reply names, read by plain rules. `exact` only when it names both; else a
    sensible suggestion (the day it names at 10:00, or the next working day) for the rep to change. */
export function whenFrom(text: string, now: Date): { start: string; exact: boolean } {
  const t = text.toLowerCase();
  let day: Date | null = null;
  const at = (offset: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);

  const named = t.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b/);
  const slashed = t.match(/\b(\d{1,2})\/(\d{1,2})\b/);
  const weekday = t.match(/\b(sun|mon|tue|wed|thu|fri|sat)(?:day|sday|nesday|rsday|urday)?s?\b/);
  if (named || slashed) {
    const month = named ? MONTHS.indexOf(named[1]) : Number(slashed![1]) - 1;
    const date = Number(named ? named[2] : slashed![2]);
    if (month >= 0 && month < 12 && date >= 1 && date <= 31) {
      day = new Date(now.getFullYear(), month, date);
      if (day.getTime() < at(0).getTime()) day = new Date(now.getFullYear() + 1, month, date);
    }
  }
  if (!day && /\btomorrow\b/.test(t)) day = at(1);
  if (!day && /\btoday\b/.test(t)) day = at(0);
  if (!day && weekday) {
    const want = DAYS.indexOf(weekday[1]);
    const ahead = (want - now.getDay() + 7) % 7 || 7; // the next one, never today
    day = at(ahead);
  }
  const dayNamed = !!day;
  if (!day) {
    // "Next week" with no day is its Monday. Otherwise the next working day.
    if (/\bnext week\b/.test(t)) day = at(((1 - now.getDay() + 7) % 7) || 7);
    else {
      day = at(1);
      while (day.getDay() === 0 || day.getDay() === 6) day = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
    }
  }

  let hour = 10, minute = 0, timeNamed = false;
  const ampm = t.match(/\b(\d{1,2})(?::([0-5]\d))?\s*(a\.?m\.?|p\.?m\.?)(?![a-z])/);
  const clock = t.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (ampm) {
    hour = (Number(ampm[1]) % 12) + (ampm[3].startsWith("p") ? 12 : 0);
    minute = Number(ampm[2] || 0);
    timeNamed = true;
  } else if (clock) {
    hour = Number(clock[1]);
    minute = Number(clock[2]);
    timeNamed = true;
  } else if (/\bnoon\b/.test(t)) {
    hour = 12;
    timeNamed = true;
  }
  day.setHours(hour, minute, 0, 0);
  return { start: stamp(day), exact: dayNamed && timeNamed };
}

const compact = (s: string) => s.replace(/[-:]/g, "") + "00"; // 2026-11-25T14:00 to 20261125T140000
const endOf = (m: Pick<Meeting, "start" | "minutes">) => stamp(new Date(fromStamp(m.start).getTime() + m.minutes * 60_000));

/** Google Calendar's own "add an event" page, filled in. The rep still has to press Save there. */
export function googleLink(m: Pick<Meeting, "title" | "start" | "minutes" | "note">): string {
  const q = new URLSearchParams({ action: "TEMPLATE", text: m.title, dates: `${compact(m.start)}/${compact(endOf(m))}`, details: m.note });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");

/** The same meeting as a calendar file, for Apple Calendar, Outlook and the rest. */
export function icsFor(m: Pick<Meeting, "id" | "title" | "start" | "minutes" | "note" | "createdAt">): string {
  const made = new Date(m.createdAt).toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Connet//EN", "BEGIN:VEVENT", `UID:${m.id}@connet`, `DTSTAMP:${made}`, `DTSTART:${compact(m.start)}`, `DTEND:${compact(endOf(m))}`, `SUMMARY:${esc(m.title)}`, `DESCRIPTION:${esc(m.note)}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
}

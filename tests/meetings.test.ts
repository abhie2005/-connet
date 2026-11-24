// Reading a day and a time out of a reply, and writing the meeting out for a calendar.
import assert from "node:assert/strict";
import { test } from "node:test";
import { googleLink, icsFor, wantsMeeting, whenFrom } from "../lib/meetings";

const tue = new Date(2026, 10, 24, 4, 0); // Tuesday, Nov 24, 2026

test("a reply that names a day and a time gives exactly that", () => {
  assert.deepEqual(whenFrom("Could you do a call on Tuesday at 2pm?", tue), { start: "2026-12-01T14:00", exact: true }, "the next Tuesday, never today");
  assert.deepEqual(whenFrom("Thursday 10:30 works for me", tue), { start: "2026-11-26T10:30", exact: true });
  assert.deepEqual(whenFrom("Let's talk tomorrow at 9 a.m.", tue), { start: "2026-11-25T09:00", exact: true });
  assert.deepEqual(whenFrom("How about Dec 3 at noon?", tue), { start: "2026-12-03T12:00", exact: true });
  assert.deepEqual(whenFrom("Free on 1/12 at 3:15 pm", tue), { start: "2027-01-12T15:15", exact: true }, "a date already past is next year's");
});

test("a reply with no exact time gives a suggestion, and says so", () => {
  assert.deepEqual(whenFrom("Could you do a call next week?", tue), { start: "2026-11-30T10:00", exact: false }, "next week is its Monday");
  assert.deepEqual(whenFrom("Friday would be good", tue), { start: "2026-11-27T10:00", exact: false });
  assert.deepEqual(whenFrom("Sure, I'd love to see it.", tue), { start: "2026-11-25T10:00", exact: false });
  assert.deepEqual(whenFrom("Happy to chat. We are open 24/7.", new Date(2026, 10, 27, 9, 0)), { start: "2026-11-30T10:00", exact: false }, "the next working day skips the weekend, and 24/7 is not a date");
});

test("words that only look like a day or a date are not read as one", () => {
  const plain = { start: "2026-11-25T10:00", exact: false };
  assert.deepEqual(whenFrom("Thus we sat in the sun and thought about it. Happy to talk.", tue), plain);
  assert.deepEqual(whenFrom("About 9/10 of our docks are booked by phone. Let's talk.", tue), plain);
  assert.deepEqual(whenFrom("It took a month. We may talk.", tue), plain);
  assert.deepEqual(whenFrom("Thurs at 4pm or Weds works", tue), { start: "2026-11-26T16:00", exact: true }, "the first day named");
  assert.deepEqual(whenFrom("Saturdays are out, but Sunday at 11am is fine", tue).exact, true);
  assert.deepEqual(whenFrom("Can you do it on 12/3 at 9am?", tue), { start: "2026-12-03T09:00", exact: true });
});

test("only a reply about talking asks for a meeting", () => {
  assert.equal(wantsMeeting("Can we do a call next week?"), true);
  assert.equal(wantsMeeting("Send me a demo when you can"), true);
  assert.equal(wantsMeeting("Interesting. What does it cost?"), false);
});

test("the meeting goes out as a Google link and a calendar file, in local time", () => {
  const m = { id: "mt1", title: "Glyph intro: Maya Okafor, Brightpath", start: "2026-12-01T14:00", minutes: 30, note: "With Maya; her reply: \"Tuesday at 2pm\"", createdAt: "2026-11-24T12:00:00.000Z" };
  const link = new URL(googleLink(m));
  assert.equal(link.hostname, "calendar.google.com");
  assert.equal(link.searchParams.get("dates"), "20261201T140000/20261201T143000");
  assert.equal(link.searchParams.get("text"), m.title);
  assert.equal(link.searchParams.get("add"), null, "nobody is invited for you");
  const ics = icsFor(m);
  assert.match(ics, /DTSTART:20261201T140000\r\nDTEND:20261201T143000/);
  assert.match(ics, /SUMMARY:Glyph intro: Maya Okafor\\, Brightpath/);
  assert.ok(!/ATTENDEE/.test(ics));
});

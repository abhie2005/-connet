// Marking a draft: which sentences make a claim nothing backs, and deleting exactly those.
import assert from "node:assert/strict";
import { test } from "node:test";
import { markUp, pieces, says, strip } from "../lib/marks";

const body = `Hi Patricia,

I saw Windward School is looking for a director of the Windward Institute. Students often type on screens or lack real-time support while working through worksheets.

Glyph is an AI tutor that works on paper. It raised $12.5M this year, e.g. for new marks.

Could we briefly discuss how this works next week?

If this isn't relevant, tell me and I won't follow up.

Yoon Woo`;

test("cutting a message into pieces loses nothing and does not split inside a figure", () => {
  const cut = pieces(body);
  assert.equal(cut.join(""), body);
  assert.ok(cut.some((p) => p.startsWith("It raised $12.5M this year, e.g. for new marks.")));
});

test("only the sentence that makes the unbacked claim is marked", () => {
  const claim = "Students often type on screens or lack real-time support while working through worksheets.";
  const marked = markUp(body, [claim], /won['’]?t follow up/i);
  assert.deepEqual(marked.filter((m) => m.mark === "del").map((m) => m.text.trim()), [claim]);
  assert.deepEqual(marked.filter((m) => m.mark === "add").map((m) => m.text.trim()), ["If this isn't relevant, tell me and I won't follow up."]);
});

test("a claim that shares a few words with a sentence does not mark it", () => {
  assert.equal(says("Glyph is an AI tutor that works on paper.", "AI tutoring for Windward School students"), false);
  assert.equal(says("Hi Patricia,", "Patricia Kong is Head of School"), false);
  assert.equal(says("AI tutoring for Windward School students, on paper", "AI tutoring for Windward School students"), true);
});

test("deleting takes the marked sentence out and closes the gap", () => {
  const claim = "Students often type on screens or lack real-time support while working through worksheets.";
  const out = strip(body, [claim]);
  assert.equal(out.includes("type on screens"), false);
  assert.ok(out.includes("I saw Windward School is looking for a director of the Windward Institute."));
  assert.equal(/\n{3,}/.test(out), false);
  assert.equal(strip(body, []), body);
});

test("a paragraph that was nothing but the claim leaves no hole", () => {
  const text = "Hello there, Maya.\n\nSchools using it saw scores rise 30% in a term.\n\nCould we talk next week?";
  assert.equal(strip(text, ["Schools using it saw scores rise 30% in a term"]), "Hello there, Maya.\n\nCould we talk next week?");
});

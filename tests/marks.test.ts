// Marking a draft: which sentences make a claim nothing backs, and deleting exactly those.
import assert from "node:assert/strict";
import { test } from "node:test";
import { greet, located, markUp, pieces, says, strip, topicOnly, without } from "../lib/marks";

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

test("one claim can be taken out and the others left in", () => {
  const typing = "Students often type on screens or lack real-time support while working through worksheets";
  const raised = "It raised $12.5M this year";
  assert.equal(located("A note", body, typing), true);
  assert.equal(located("A note", body, "Windward won a national award for its library"), false);
  const cut = without("Students often type on screens or lack real-time support", body, [typing], "Glyph for Windward");
  assert.equal(cut.subject, "Glyph for Windward", "a subject that was only the claim becomes the plain one");
  assert.ok(!cut.body.includes("type on screens"));
  assert.ok(cut.body.includes("$12.5M"), "the claim that was not named stays");
  assert.ok(without("A note for Windward School", body, [raised], "x").subject === "A note for Windward School");
});

test("a subject that only names the product and who it is for is not a claim", () => {
  const own = "Dockline: Dockline is scheduling software for warehouse loading docks. Carriers book a dock appointment online. Nissin International Transport U.S.A.";
  assert.equal(topicOnly("Dock scheduling for Nissin International Transport U.S.A.", own), true);
  assert.equal(topicOnly("Dockline for Nissin International Transport U.S.A.", own), true);
  assert.equal(topicOnly("Congratulations on the new Detroit branch", own), false);
  assert.equal(topicOnly("Cut detention fees by 40%", own), false, "a figure always needs a source");
});

test("the plain subject that replaces a deleted one reads like the claim it replaced", () => {
  // Which is why a deleted claim is remembered as deleted (Claim.removed) and not looked for again.
  const claim = "Dock scheduling for Nissin International Transport U.S.A.";
  const next = without(claim, "Hi Shinichiro,\n\nYoon Woo", [claim], "Dockline for Nissin International Transport U.S.A.");
  assert.equal(next.subject, "Dockline for Nissin International Transport U.S.A.");
  assert.equal(located(next.subject, next.body, claim), true);
});

test("the greeting is the person it goes to, or nobody", () => {
  assert.equal(greet("Hi Mike,\n\nManaging trucks by phone is slow.", null), "Hi there,\n\nManaging trucks by phone is slow.");
  assert.equal(greet("Hello Mike Smith,\n\nBody", "Shinichiro"), "Hi Shinichiro,\n\nBody");
  assert.equal(greet("Managing trucks by phone is slow.\n\nYoon", null), "Managing trucks by phone is slow.\n\nYoon", "a message with no greeting is left alone");
});

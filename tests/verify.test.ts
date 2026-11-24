import assert from "node:assert/strict";
import { test } from "node:test";
import { checkEvidence, mentions, quoteInText } from "../lib/verify";
import { strayNumbers } from "../lib/agents/outreach";
import type { Source } from "../lib/types";

const page: Source = {
  id: "s1",
  url: "https://example.com/a",
  title: "Brightpath Learning Centers | About",
  text: "Brightpath Learning Centers runs 42 after-school tutoring centers across California and Arizona. It raised $12 million in 2026.",
  provider: "sample",
  fetchedAt: "",
};

test("a quote that is on the page is verified, whatever the case, quotes or spacing", () => {
  assert.equal(quoteInText("runs 42 after-school   tutoring centers", page.text), true);
  assert.equal(quoteInText("RUNS 42 After‐School tutoring centers", page.text), true);
});

test("a quote that is not on the page is not verified", () => {
  assert.equal(quoteInText("runs 420 after-school tutoring centers", page.text), false);
  assert.equal(quoteInText("is rolling out AI tutoring to 30 schools", page.text), false);
});

test("a quote joined with an ellipsis needs every part to be on the page", () => {
  assert.equal(quoteInText("runs 42 after-school tutoring centers ... raised $12 million in 2026", page.text), true);
  assert.equal(quoteInText("runs 42 after-school tutoring centers ... raised $50 million", page.text), false);
});

test("one or two words are too little to count as proof", () => {
  assert.equal(quoteInText("tutoring centers", page.text), false);
});

test("evidence must point at a page the model was shown", () => {
  assert.equal(checkEvidence({ source: 2, quote: "runs 42 after-school tutoring centers" }, [page]), null);
  assert.equal(checkEvidence({ source: 1, quote: "runs 42 after-school tutoring centers" }, [page])?.verified, true);
  assert.equal(checkEvidence({ source: 1, quote: "something it never said at all" }, [page])?.verified, false);
});

test("a page has to name the company for a quote to count for it", () => {
  assert.equal(mentions(page.text, "Brightpath Learning Centers"), true);
  assert.equal(mentions(page.text, "Brightpath Learning Centers, Inc."), true);
  assert.equal(mentions(page.text, "Olive Tree Homeschool Co-op"), false);
  assert.equal(mentions("Olive Tree Homeschool Co-op supports 400 families", "Olive Tree Homeschool Co-op"), true);
});

test("a number in an email that is in no fact is caught; the meeting length is not", () => {
  const facts = [{ n: 1, text: "Brightpath: hiring 60 math tutors (2026-11-12)", sourceId: "s1", kind: "signal" as const }];
  assert.deepEqual(strayNumbers("I saw you are hiring 60 tutors. Do you have 15 minutes?", facts), []);
  assert.deepEqual(strayNumbers("Your scores rose 30% last year, and you hired 60 tutors.", facts), ["30%"]);
});

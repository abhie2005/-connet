// Whose logo may stand on the graph: only a real public site's, and never a guess that could be someone else.
import assert from "node:assert/strict";
import { test } from "node:test";
import { cleanDomain, logoDomainOf, logoUrl, schoolDomain } from "../lib/logo";

test("a domain is cleaned, and names that are not public sites give none", () => {
  assert.equal(cleanDomain("https://www.Windward.org/about?x=1"), "windward.org");
  assert.equal(cleanDomain("summitprep.com"), "summitprep.com");
  assert.equal(cleanDomain("brightpath.example"), null, "sample data has no site behind it");
  assert.equal(cleanDomain("localhost:3000"), null);
  assert.equal(cleanDomain("not a domain"), null);
  assert.equal(cleanDomain(null), null);
});

test("a school is only guessed at when its name is one word", () => {
  assert.equal(schoolDomain("UCLA"), "ucla.edu");
  assert.equal(schoolDomain("Stanford"), "stanford.edu");
  assert.equal(schoolDomain("University of Michigan"), null);
  assert.equal(schoolDomain("St. Mary's"), null);
});

test("companies and schools can carry a logo; people, signals and the product do not", () => {
  assert.equal(logoDomainOf({ label: "Company", name: "Windward School", props: { domain: "windward.org" } }), "windward.org");
  assert.equal(logoDomainOf({ label: "Company", name: "Lumen Education", props: { isTarget: false } }), null);
  assert.equal(logoDomainOf({ label: "School", name: "UCLA", props: {} }), "ucla.edu");
  assert.equal(logoDomainOf({ label: "Person", name: "Maya Okafor", props: { domain: "x.com" } }), null);
  assert.ok(logoUrl("windward.org").includes("domain=windward.org"));
});

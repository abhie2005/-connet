// A search that finds too few companies: what it tries next, and what it says if there is still nobody.
import assert from "node:assert/strict";
import { test } from "node:test";
import { whyNobody, widerQueries, type Search2 } from "../lib/agents/widen";
import type { ICP } from "../lib/types";

const icp = {
  industries: [
    { name: "General Warehousing and Storage", naics: "493190", confidence: 0.85, why: "" },
    { name: "Third-Party Logistics (3PL) Warehousing", naics: "493110", confidence: 0.9, why: "" },
  ],
  personas: [{ title: "Director of Operations", seniority: "director", function: "Operations", caresAbout: "", confidence: 0.8 }],
  regions: ["Southern California (Los Angeles/Inland Empire)", "Chicago Metropolitan Area"],
} as unknown as ICP;

test("the wider searches are built from the segments, the first region and the first role", () => {
  const q = widerQueries(icp, []);
  assert.equal(q.length, 4);
  assert.equal(q[0].segment, "Third-Party Logistics (3PL) Warehousing", "the surest segment first");
  assert.match(q[0].query, /^Third-Party Logistics Warehousing company Southern California announces expansion/);
  assert.ok(q.some((x) => x.query === "General Warehousing and Storage Southern California hiring Director of Operations"));
  assert.ok(q.every((x) => !/[()]/.test(x.query)));
  assert.equal(widerQueries(icp, [q[0].query.toUpperCase()]).some((x) => x.query === q[0].query), false, "never one already tried");
});

test("a run with nobody says which step failed", () => {
  const base: Search2 = { searches: 3, searchErrors: [], modelErrors: [], pages: 0, named: 0, proposed: 0, verified: 0 };
  assert.match(whyNobody({ ...base, searchErrors: ["Tavily 432: limit", "x", "y"] }), /web search itself failed on all 3 searches.*Tavily 432.*TAVILY_API_KEY/);
  assert.match(whyNobody(base), /3 searches came back with no pages/);
  assert.match(whyNobody({ ...base, pages: 12, modelErrors: ["Gemini: 429 quota"] }), /found 12 pages, but the model could not read them.*429/);
  assert.match(whyNobody({ ...base, searches: 7, pages: 31 }), /Read 31 pages from 7 searches, and none of them named a company/);
  assert.match(whyNobody({ ...base, pages: 15, named: 4, proposed: 9 }), /named 4 companies, but none of the 9 quotes/);
  assert.match(whyNobody({ ...base, searches: 1, pages: 1, named: 1, proposed: 1 }), /named 1 company, but none of the 1 quote about/);
});

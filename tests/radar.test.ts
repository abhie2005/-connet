// The Hiring Radar, on sample data and with no network: what a posting must prove before it is
// kept, what it is worth, and what a scan costs.
import assert from "node:assert/strict";
import { test } from "node:test";

process.env.TACT_SAMPLE = "1";
process.env.TACT_DATA_DIR = ".data-test-radar";

/** A lead with nothing on it but the postings a test wants to weigh. */
function leadWith(id: string, posts: { title: string; team?: string | null; date: string; firstHire: boolean }[]) {
  return {
    id,
    company: id,
    domain: null,
    industry: "",
    size: null,
    location: null,
    segment: "Tutoring center chains",
    summary: "",
    evidence: [],
    signals: posts.map((p, i) => ({
      id: `sig:${id}:${i}`,
      kind: "hiring" as const,
      summary: p.title,
      date: p.date,
      evidence: { sourceId: "s1", quote: "q", verified: true },
    })),
    jobPosts: posts.map((p, i) => ({
      id: `job:${id}:${i}`,
      companyId: id,
      title: p.title,
      team: p.team ?? null,
      reportsTo: null,
      date: p.date,
      url: "https://sample.tact.example/x",
      firstHire: p.firstHire,
      signalId: `sig:${id}:${i}`,
      evidence: { sourceId: "s1", quote: "q", verified: true },
    })),
    contacts: [],
    usesCompetitor: null,
    negative: null,
    warmPaths: [],
    score: { total: 0, fit: 0, intent: 0, tier: "C" as const, parts: [] },
    whyNow: null,
    status: "active" as const,
    enriched: false,
    stage: "matched" as const,
    stageBy: "agent" as const,
    stageAt: "2026-11-24T00:00:00.000Z",
  };
}

const NOW = Date.parse("2026-11-24T12:00:00.000Z");

test("the Radar reads the plan for the roles to watch", async () => {
  const { watchTitles, isFirstHire } = await import("../lib/agents/radar");
  const icp = {
    personas: [{ title: "Head of Academics", seniority: "", function: "", caresAbout: "", confidence: 1 }],
    triggers: [
      { event: "Hiring a technology or AI lead", whyItMatters: "", confidence: 1 },
      { event: "Hiring many tutors or opening new sites", whyItMatters: "", confidence: 1 },
    ],
  };
  // A persona is a role to watch. So is a trigger that names a role; a trigger that names no
  // role ("opening new sites") is not a job title and is left out.
  const titles = watchTitles(icp as never);
  assert.deepEqual(titles, ["Head of Academics", "technology or AI lead"]);
  assert.ok(watchTitles(null).length === 0);

  assert.equal(isFirstHire("Head of Revenue Operations", "is hiring its first Head of Revenue Operations"), true);
  assert.equal(isFirstHire("Founding Data Engineer", "we are hiring"), true);
  assert.equal(isFirstHire("Revenue Operations Analyst", "is hiring a Revenue Operations Analyst"), false);
});

test("a first hire is worth more than a backfill, and a team being built out more still", async () => {
  const { radarBonus, scoreLead } = await import("../lib/score");

  const first = leadWith("first", [{ title: "Head of Revenue Operations", team: "Revenue Operations", date: "2026-11-23", firstHire: true }]);
  const plain = leadWith("plain", [{ title: "Revenue Operations Analyst", team: "Revenue Operations", date: "2026-11-23", firstHire: false }]);
  assert.equal(radarBonus(plain, NOW).points, 0);
  assert.equal(radarBonus(first, NOW).points, 6);
  assert.match(radarBonus(first, NOW).notes.join(" "), /not a backfill/);
  // The same company either way: the only difference is the kind of posting.
  assert.ok(scoreLead(first, null, NOW).total > scoreLead(plain, null, NOW).total, "a first hire must outrank an ordinary one");

  // Three roles on one team inside 30 days: they are building that function out.
  const team = leadWith("team", [
    { title: "Head of Revenue Operations", team: "Revenue Operations", date: "2026-11-23", firstHire: true },
    { title: "Revenue Operations Analyst", team: "Revenue Operations", date: "2026-11-21", firstHire: false },
    { title: "Sales Engineer", team: "Revenue Operations", date: "2026-11-19", firstHire: false },
  ]);
  const bonus = radarBonus(team, NOW);
  assert.equal(bonus.points, 11, "6 for the first hire and 5 for the team");
  assert.match(bonus.notes.join(" "), /building a team: 3 roles on the Revenue Operations team/);

  // Two is not a team being built out, and a posting from last year is not news.
  assert.equal(radarBonus(leadWith("two", [
    { title: "A", team: "Revenue Operations", date: "2026-11-23", firstHire: false },
    { title: "B", team: "Revenue Operations", date: "2026-11-21", firstHire: false },
  ]), NOW).points, 0);
  assert.equal(radarBonus(leadWith("old", [{ title: "Head of RevOps", team: "RevOps", date: "2025-01-01", firstHire: true }]), NOW).points, 0);

  // Why now never goes past its cap, however many postings there are.
  const many = leadWith("many", Array.from({ length: 8 }, (_, i) => ({ title: `Role ${i}`, team: "Revenue Operations", date: "2026-11-20", firstHire: true })));
  const whyNow = scoreLead(many, null, NOW).parts.find((p) => p.label === "Why now")!;
  assert.equal(whyNow.points, 24);
  assert.equal(whyNow.max, 24);
});

test("a posting whose quote is not on its page is dropped, and a rescan adds nothing", async (t) => {
  const { inferIcp } = await import("../lib/agents/icp");
  const { findJobs } = await import("../lib/agents/radar");
  const { GLYPH_FOUNDER, GLYPH_PRODUCT } = await import("../lib/sample/data");
  const { store } = await import("../lib/store");

  const s = store();
  s.reset();
  s.state.product = GLYPH_PRODUCT;
  s.state.founder = GLYPH_FOUNDER;
  s.state.icp = await inferIcp(GLYPH_PRODUCT, GLYPH_FOUNDER);

  const first = await findJobs(s);

  await t.test("the postings that hold up are kept", () => {
    assert.ok(first.postings.length >= 4, `kept ${first.postings.length}`);
    for (const j of first.postings) assert.equal(j.evidence.verified, true);
  });

  await t.test("the one quote that is not on its page is dropped, with the company", () => {
    // Cedarline's posting claims a first Data Engineer; its page does not say that.
    assert.equal(first.postings.some((j) => j.companyId.includes("cedarline")), false);
    assert.equal(s.state.leads.some((l) => l.company === "Cedarline Academies"), false);
    assert.equal(first.dropped.length, 1, first.dropped.join(" | "));
    assert.match(first.dropped[0], /Cedarline/);
  });

  await t.test("a posting becomes a hiring signal, so the rest of the pipeline is unchanged", () => {
    const meridian = s.state.leads.find((l) => l.company === "Meridian Tutoring Group")!;
    assert.ok(meridian, "the Radar found a company nothing else had");
    assert.equal(meridian.signals.every((sig) => sig.kind === "hiring"), true);
    assert.ok(meridian.signals.some((sig) => /first Head of Revenue Operations/.test(sig.summary)));
    // The posting names who the role reports to, and that is who to write to.
    assert.equal(meridian.jobPosts!.some((j) => j.reportsTo === "VP Sales"), true);
  });

  await t.test("the graph holds Company -[:POSTED]-> JobPost -[:NEEDS]-> Product", () => {
    const g = s.graph.memory;
    const posts = [...g.nodes.values()].filter((n) => n.label === "JobPost");
    assert.ok(posts.length >= 4);
    for (const j of posts) {
      assert.ok([...g.edges.values()].some((e) => e.type === "POSTED" && e.to === j.id), `nothing posted ${j.id}`);
      assert.ok([...g.edges.values()].some((e) => e.type === "NEEDS" && e.from === j.id && e.to === "product"), `${j.id} needs nothing`);
    }
  });

  await t.test("the buying-cycles query returns the newest posting first", async () => {
    const res = await s.graph.query("jobSignals");
    assert.ok(res.rows.length >= 3, `got ${res.rows.length} rows`);
    const dates = res.rows.map((r) => r.date);
    assert.deepEqual([...dates].sort().reverse(), dates, "newest first");
    assert.ok(res.rows.some((r) => r.firstHire === true));
  });

  await t.test("a second scan adds no duplicates", async () => {
    const postsBefore = [...s.graph.memory.nodes.values()].filter((n) => n.label === "JobPost").length;
    const leadsBefore = s.state.leads.length;
    const signalsBefore = s.state.leads.reduce((n, l) => n + l.signals.length, 0);

    const again = await findJobs(s);

    assert.equal(again.postings.length, 0, "a rescan must add no postings");
    assert.ok(again.known >= 4, `it should recognise what it already has, saw ${again.known}`);
    assert.equal(s.state.leads.length, leadsBefore);
    assert.equal(s.state.leads.reduce((n, l) => n + l.signals.length, 0), signalsBefore);
    assert.equal([...s.graph.memory.nodes.values()].filter((n) => n.label === "JobPost").length, postsBefore);
  });
});

test("a scan with no credits left is blocked before it searches", async () => {
  const { inferIcp } = await import("../lib/agents/icp");
  const { scanJobs } = await import("../lib/pipeline");
  const { GLYPH_FOUNDER, GLYPH_PRODUCT } = await import("../lib/sample/data");
  const { store } = await import("../lib/store");
  const { COSTS } = await import("../lib/types");

  const s = store();
  s.reset();
  s.state.product = GLYPH_PRODUCT;
  s.state.founder = GLYPH_FOUNDER;
  s.state.icp = await inferIcp(GLYPH_PRODUCT, GLYPH_FOUNDER);
  s.state.credits.balance = COSTS["radar.scan"] - 1;

  const searches = s.state.run.stats.searches;
  await assert.rejects(scanJobs, /Out of credits/);
  assert.equal(s.state.run.stats.searches, searches, "it must not spend a search it cannot pay for");
  assert.equal(s.state.leads.length, 0);

  // With the credits, the same scan runs and is charged once.
  s.state.credits.balance = 50;
  const result = await scanJobs();
  assert.ok(result.postings >= 4, `kept ${result.postings}`);
  assert.equal(s.state.credits.balance <= 50 - COSTS["radar.scan"], true);
  assert.equal(s.state.credits.ledger.filter((l) => l.event === "radar.scan").length, 1);
});

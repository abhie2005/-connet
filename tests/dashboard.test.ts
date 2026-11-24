// The dashboard reads the workspace and nothing else. These checks pin that down: what it says
// when there is no run yet, and that every figure it shows traces back to something recorded.
import assert from "node:assert/strict";
import { test } from "node:test";
import { derive } from "../lib/dashboard";
import type { Workspace } from "../lib/types";

const ev = { sourceId: "s1", quote: "q", verified: true };

function lead(id: string, over: Record<string, unknown> = {}) {
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
    signals: [],
    jobPosts: [],
    contacts: [],
    usesCompetitor: null,
    negative: null,
    warmPaths: [],
    score: { total: 50, fit: 25, intent: 25, tier: "B" as const, parts: [] },
    whyNow: null,
    status: "active" as const,
    enriched: false,
    stage: "matched" as const,
    stageBy: "agent" as const,
    stageAt: "2026-11-24T10:00:00.000Z",
    ...over,
  };
}

function workspace(over: Record<string, unknown> = {}): Workspace {
  return {
    rev: 1,
    product: { name: "Glyph", description: "", url: null, pricing: null, customers: null },
    founder: { name: "Yoon Woo", schools: [], employers: [] },
    icp: null,
    sources: {},
    leads: [],
    competitors: [],
    messages: [],
    activity: [],
    audit: [],
    credits: { balance: 10, ledger: [], flexprice: { configured: false, accepted: 0, failed: 0, wallet: null, lastError: null } },
    run: { status: "done", step: "", startedAt: null, finishedAt: null, error: null, stats: { searches: 3, sources: 9, claimsProposed: 12, claimsVerified: 10, claimsDropped: 2, companiesDropped: 1, graphQueries: 4, llmCalls: 5, replayed: 0 } },
    graph: { nodes: [], edges: [] },
    modes: { llm: "sample", search: "sample", graph: "embedded", enrich: "sample", billing: "local" },
    doNotContact: [],
    settings: { freedom: "strict" },
    meetings: [],
    ...over,
  } as unknown as Workspace;
}

test("with no product there is nothing to show, and it says so rather than showing zeros", () => {
  assert.equal(derive(null).started, false);
  assert.equal(derive(workspace({ product: null })).started, false);
});

test("the headline figures are the workspace's own", () => {
  const d = derive(
    workspace({
      leads: [
        lead("a", { score: { total: 80, fit: 40, intent: 40, tier: "A", parts: [] }, contacts: [{ id: "c1" }] }),
        lead("b", { score: { total: 50, fit: 25, intent: 25, tier: "B", parts: [] } }),
        lead("c", { score: { total: 20, fit: 10, intent: 10, tier: "C", parts: [] }, status: "suppressed", negative: { signal: "Hiring freeze", evidence: ev } }),
      ],
    }),
  );
  assert.equal(d.leads, 3);
  assert.deepEqual(d.tiers, { a: 1, b: 1, c: 1 });
  assert.equal(d.contacts, 1);
  // straight off run.stats, not recomputed
  assert.equal(d.quotesVerified, 10);
  assert.equal(d.quotesDropped, 2);
  assert.equal(d.searches, 3);
});

test("credits come from the ledger, and spends are counted as spends", () => {
  const d = derive(
    workspace({
      credits: {
        balance: 7,
        ledger: [
          { at: "2026-11-24T10:00:00.000Z", event: "discovery.run", credits: -5, ref: "Glyph", synced: "local" },
          { at: "2026-11-24T11:00:00.000Z", event: "outreach.drafted", credits: -1, ref: "x", synced: "local" },
          { at: "2026-11-24T11:30:00.000Z", event: "radar.scan", credits: -3, ref: "y", synced: "local" },
          { at: "2026-11-24T12:00:00.000Z", event: "credits.topup", credits: 20, ref: "top up", synced: "local" },
        ],
        flexprice: { configured: false, accepted: 0, failed: 0, wallet: null, lastError: null },
      },
    }),
  );
  assert.equal(d.creditsSpent, 9, "the top-up is not a spend");
  assert.equal(d.creditsLeft, 7);
  assert.equal(d.creditsStart, 16);
  // finding against writing, on the one day they happened
  assert.equal(d.spend.length, 1);
  assert.equal(d.spend[0].lower, 8, "discovery and the radar scan are finding");
  assert.equal(d.spend[0].upper, 1, "the draft is writing");
});

test("a lead lands in the lane that explains what is holding it", () => {
  const d = derive(
    workspace({
      leads: [
        lead("drafted"),
        lead("ready", { signals: [{ id: "s", kind: "hiring", summary: "Hiring", date: "2026-11-23", evidence: ev }] }),
        lead("held", { status: "held" }),
        lead("out", { status: "suppressed", negative: { signal: "Hiring freeze", evidence: ev } }),
      ],
      messages: [{ id: "m1", leadId: "drafted", to: "Maya", subject: "Hello", status: "draft", createdAt: "2026-11-24T12:00:00.000Z" }],
    }),
  );
  const lane = (k: string) => d.lanes.find((l) => l.key === k)!;
  assert.equal(d.waiting, 1);
  assert.deepEqual(lane("waiting").items.map((i) => i.name), ["Maya"]);
  assert.deepEqual(lane("ready").items.map((i) => i.name), ["ready"]);
  assert.deepEqual(lane("held").items.map((i) => i.name), ["held"]);
  assert.deepEqual(lane("out").items.map((i) => i.name), ["out"]);
  assert.match(lane("out").items[0].detail, /Hiring freeze/);
});

test("why now counts the signals that are actually on the leads", () => {
  const d = derive(
    workspace({
      leads: [
        lead("a", { signals: [{ id: "1", kind: "hiring", summary: "", date: null, evidence: ev }, { id: "2", kind: "hiring", summary: "", date: null, evidence: ev }] }),
        lead("b", { signals: [{ id: "3", kind: "funding", summary: "", date: null, evidence: ev }] }),
      ],
      run: { status: "done", step: "", startedAt: null, finishedAt: null, error: null, stats: { searches: 0, sources: 0, claimsProposed: 0, claimsVerified: 0, claimsDropped: 0, companiesDropped: 0, graphQueries: 0, llmCalls: 0, replayed: 0 } },
    }),
  );
  assert.deepEqual(d.signalMix, [{ label: "hiring", value: 2 }, { label: "funding", value: 1 }]);
});

test("postings found by the Radar are counted", () => {
  const post = { id: "j", companyId: "a", title: "Head of RevOps", team: null, reportsTo: null, date: "2026-11-23", url: "u", firstHire: true, signalId: "s", evidence: ev };
  const d = derive(workspace({ leads: [lead("a", { jobPosts: [post, { ...post, id: "j2" }] }), lead("b")] }));
  assert.equal(d.jobPosts, 2);
});

test("the agent's moves and yours are split by day", () => {
  const entry = (at: string, actor: "agent" | "rep") => ({ id: at + actor, at, actor, agent: null, action: "x", leadId: null, messageId: null, from: null, to: null, note: "" });
  const d = derive(
    workspace({
      audit: [
        entry("2026-11-23T10:00:00.000Z", "agent"),
        entry("2026-11-24T10:00:00.000Z", "agent"),
        entry("2026-11-24T11:00:00.000Z", "rep"),
      ],
    }),
  );
  assert.equal(d.agentActions, 2);
  assert.equal(d.repActions, 1);
  assert.equal(d.work.length, 2);
  assert.deepEqual(d.work.at(-1), { label: d.work.at(-1)!.label, lower: 1, upper: 1 });
  // the window keeps only the most recent days
  assert.equal(derive(workspace({ audit: [entry("2026-11-23T10:00:00.000Z", "agent"), entry("2026-11-24T10:00:00.000Z", "agent")] }), 1).work.length, 1);
});

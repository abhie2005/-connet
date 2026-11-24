// The whole run on sample data: what must be kept, what must be dropped, what must be stopped.
import assert from "node:assert/strict";
import { test } from "node:test";

process.env.TACT_SAMPLE = "1";
process.env.TACT_DATA_DIR = ".data-test";

test("a full run on sample data", async (t) => {
  const { GLYPH_FOUNDER, GLYPH_PRODUCT } = await import("../lib/sample/data");
  const p = await import("../lib/pipeline");
  const { store } = await import("../lib/store");
  const s = store();
  s.reset();
  await p.runPipeline(GLYPH_PRODUCT, GLYPH_FOUNDER);
  const lead = (name: string) => s.state.leads.find((l) => l.company === name);

  await t.test("it finishes and finds the accounts", () => {
    assert.equal(s.state.run.status, "done", s.state.run.error || "");
    assert.ok(lead("Brightpath Learning Centers"));
    assert.ok(lead("Summit Prep Academy"));
  });

  await t.test("a company whose only quote is not on the page is dropped", () => {
    assert.equal(lead("Atlas STEM Labs"), undefined);
    assert.equal(s.state.run.stats.claimsDropped, 1);
    assert.equal(s.state.run.stats.companiesDropped, 1);
  });

  await t.test("every fact that is kept has a verified quote", () => {
    for (const l of s.state.leads) {
      for (const e of l.evidence) assert.equal(e.verified, true);
      for (const sig of l.signals) assert.equal(sig.evidence.verified, true);
      for (const c of l.contacts) for (const e of c.evidence) assert.equal(e.verified, true);
    }
  });

  await t.test("bad fits are left out and get no draft", () => {
    for (const name of ["Tutorly Online", "Ridgeline Test Prep"]) {
      const l = lead(name)!;
      assert.equal(l.status, "suppressed");
      assert.equal(s.state.messages.some((m) => m.leadId === l.id), false);
    }
  });

  await t.test("the graph finds the warm path through the shared school", () => {
    const l = lead("Brightpath Learning Centers")!;
    assert.equal(l.warmPaths[0]?.kind, "shared_school");
    assert.equal(l.warmPaths[0]?.via, "UCLA");
    assert.equal(l.score.tier, "A");
  });

  await t.test("the reviewer stops the invented statistic and the rewrite is clean", () => {
    const m = s.state.messages.find((x) => x.leadId === lead("Summit Prep Academy")!.id)!;
    assert.equal(m.review.verdict, "revised");
    assert.equal(m.review.rounds, 2);
    assert.equal(/30%/.test(m.body), false);
    assert.ok(m.claims.every((c) => c.supported));
  });

  await t.test("every draft carries a way to opt out and nothing is sent without approval", () => {
    for (const m of s.state.messages) {
      assert.match(m.body, /won't follow up/);
      assert.equal(m.status, "draft");
    }
    assert.equal(s.state.leads.every((l) => l.stage === "matched"), true);
  });

  await t.test("the agent drafts for the best few only, and the rest wait to be asked", async () => {
    const { config } = await import("../lib/config");
    const active = s.state.leads.filter((l) => l.status === "active");
    assert.ok(active.length > config.maxDrafts, "the sample has more leads than the agent drafts for");
    assert.deepEqual(s.state.messages.map((m) => m.leadId), active.slice(0, config.maxDrafts).map((l) => l.id));
  });

  await t.test("a message goes to the person with the warm path, and the page picks the same person", async () => {
    const { bestContact } = await import("../lib/score");
    const l = lead("Brightpath Learning Centers")!;
    const m = s.state.messages.find((x) => x.leadId === l.id)!;
    assert.equal(m.contactId, l.warmPaths[0].contactId);
    for (const x of s.state.messages) assert.equal(x.contactId, bestContact(s.state.leads.find((y) => y.id === x.leadId)!, s.state.icp)?.id ?? null);
  });

  await t.test("approving moves the lead, by the rep, and is recorded", () => {
    const m = s.state.messages[0];
    p.decideMessage(m.id, "approve");
    const l = s.state.leads.find((x) => x.id === m.leadId)!;
    assert.equal(l.stage, "contacted");
    assert.equal(l.stageBy, "rep");
    assert.ok(s.state.audit.some((a) => a.actor === "rep" && a.messageId === m.id));
  });

  await t.test("a reply moves the lead, by the agent, and opens referral paths", async () => {
    const m = s.state.messages[0];
    await p.logReply(m.leadId, "Sure, I'd love to see it. Can we do a call next week?");
    const l = s.state.leads.find((x) => x.id === m.leadId)!;
    assert.equal(l.stage, "replied");
    assert.equal(l.stageBy, "agent");
    const referrals = s.state.leads.flatMap((x) => x.warmPaths.filter((w) => w.kind === "referral").map(() => x.company));
    assert.deepEqual(referrals.sort(), ["Northlight Charter Network", "Paperwise Publishing"]);
  });

  await t.test("an unsubscribe reply closes the lead and blocks the domain", async () => {
    const m = s.state.messages[1];
    p.decideMessage(m.id, "approve");
    await p.logReply(m.leadId, "Please remove me from your list.");
    const l = s.state.leads.find((x) => x.id === m.leadId)!;
    assert.equal(l.stage, "lost");
    assert.equal(l.status, "suppressed");
    assert.ok(s.state.doNotContact.includes(l.domain!));
    await assert.rejects(() => p.draftLead(l.id, "rep", true), /left out/);
  });

  await t.test("accepting a suggested segment searches it", async () => {
    await p.decideExpansion(s.state.icp!.expansions[0].id, "accept");
    assert.ok(lead("Olive Tree Homeschool Co-op"));
  });

  await t.test("paid steps stop when the credits run out", async () => {
    s.state.credits.balance = 1;
    const l = lead("Northlight Charter Network")!;
    await assert.rejects(() => p.enrichLead(l.id), /Out of credits/);
    await p.topUp(20);
    await p.enrichLead(l.id);
    assert.equal(l.enriched, true);
    assert.equal(s.state.credits.balance, 19);
  });

  await new Promise((r) => setTimeout(r, 800));
});

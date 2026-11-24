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

  await t.test("a reply that agrees to talk puts a meeting on the calendar, and only the rep books it", () => {
    const m = s.state.messages[0];
    const l = s.state.leads.find((x) => x.id === m.leadId)!;
    assert.equal(s.state.meetings.length, 1);
    const meeting = s.state.meetings[0];
    assert.equal(meeting.leadId, l.id);
    assert.equal(meeting.status, "proposed");
    assert.equal(meeting.exact, false, "the reply said next week, no time");
    assert.equal(l.stage, "replied", "a proposal does not move the lead");
    p.decideMeeting(meeting.id, "book", "2026-12-01T14:00");
    assert.equal(meeting.status, "booked");
    assert.equal(meeting.start, "2026-12-01T14:00");
    assert.equal(l.stage, "meeting");
    assert.equal(l.stageBy, "rep");
    assert.ok(s.state.audit.some((a) => a.action === "Booked a meeting" && a.actor === "rep"));
    assert.throws(() => p.decideMeeting(meeting.id, "book", "next tuesday"), /Pick a day/);
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

  await t.test("one unbacked claim at a time: the rep keeps one and deletes another", async () => {
    const l = s.state.leads.find((x) => x.status === "active")!;
    const m = await p.draftLead(l.id, "rep", true);
    const keep = "Most tutoring centers already print every worksheet they use.";
    const drop = "Parents in your area have asked for this by name.";
    m.body = m.body.replace("\n\n", `\n\n${keep} ${drop}\n\n`);
    m.claims.push({ text: keep, fact: null, supported: false, note: "" }, { text: drop, fact: null, supported: false, note: "" });
    const at = m.claims.length - 2;
    p.decideClaim(m.id, at, "keep");
    assert.equal(m.claims[at].kept, true);
    assert.equal(m.claims[at].supported, false, "kept is not the same as backed");
    p.decideClaim(m.id, at + 1, "delete");
    assert.ok(m.body.includes(keep));
    assert.ok(!m.body.includes(drop));
    assert.equal(m.editedByRep, true);
    assert.equal(m.claims[at + 1].removed, true, "a deleted claim is remembered as deleted");
    p.decideClaim(m.id, at, "unkeep");
    assert.equal(m.claims[at].kept, false);

    // The case from Nov 24: the unbacked claim is the subject line. Deleting it puts a plain
    // subject in its place, and that must be the end of it, however alike the two read.
    const subject = `Dock scheduling for ${l.company}`;
    m.subject = subject;
    m.claims.push({ text: subject, fact: null, supported: false, note: "" });
    p.decideClaim(m.id, m.claims.length - 1, "delete");
    assert.equal(m.subject, `${s.state.product!.name} for ${l.company}`);
    assert.equal(m.claims[m.claims.length - 1].removed, true);
    // And every claim still marked, in one go.
    p.decideClaim(m.id, "all", "delete");
    assert.ok(!m.body.includes(keep));
    assert.equal(m.claims[at].removed, true);
    assert.throws(() => p.decideClaim(m.id, "all", "delete"), /Nothing is marked/);
    // A claim that is not in the message can only be dismissed, and dismissing it changes nothing.
    m.claims.push({ text: "Their warehouses doubled in size after the merger", fact: null, supported: false, note: "" });
    const was = { subject: m.subject, body: m.body };
    p.decideClaim(m.id, m.claims.length - 1, "delete");
    assert.deepEqual({ subject: m.subject, body: m.body }, was);
    assert.equal(m.claims[m.claims.length - 1].removed, true);
    assert.throws(() => p.decideClaim(m.id, 0, "delete"), /No such claim/, "a backed claim is not the rep's to delete this way");
    assert.equal(s.state.audit.filter((a) => /unbacked sentence|nothing backs/.test(a.action)).length, 4);
    assert.equal(s.state.audit.filter((a) => /Dismissed a claim/.test(a.action)).length, 1);
  });

  await t.test("the setting: at 'more' the writer adds a sentence of its own and it reaches the rep marked", async () => {
    assert.equal(s.state.settings.freedom, "balanced");
    p.setFreedom("open");
    const l = s.state.leads.find((x) => x.status === "active")!;
    const m = await p.draftLead(l.id, "rep", true);
    const own = m.claims.filter((c) => !c.supported);
    assert.equal(own.length, 1);
    assert.ok(m.body.includes(own[0].text));
    assert.equal(m.review.rounds, 1, "its own pitch does not send the draft back");
    assert.equal(m.review.verdict, "needs_human");
    assert.equal(m.status, "draft");
  });

  await t.test("the setting: at 'nothing' what no fact backs is cut before the rep sees it", async () => {
    const { takeOut } = await import("../lib/agents/outreach");
    const body = "Hi Maya,\n\nI saw Brightpath is opening six centers. Students often lack real-time support while working through worksheets.\n\nCould I show you?\n\nYoon Woo";
    const claims = [
      { text: "Brightpath is opening six centers", fact: 2, supported: true, note: "" },
      { text: "Students often lack real-time support while working through worksheets", fact: null, supported: false, note: "" },
      { text: "Uses the number 40%", fact: null, supported: false, note: "" },
    ];
    const cut = takeOut("Paper tutoring for Brightpath", body, claims, "Glyph for Brightpath");
    assert.ok(!cut.body.includes("real-time support"));
    assert.ok(cut.body.includes("opening six centers"));
    assert.equal(cut.taken.length, 1);
    assert.equal(cut.claims.filter((c) => !c.supported).length, 1, "what cannot be found in the text stays marked for the rep");

    p.setFreedom("strict");
    const l = s.state.leads.find((x) => x.status === "active")!;
    const m = await p.draftLead(l.id, "rep", true);
    assert.equal(m.claims.filter((c) => !c.supported).length, 0);
    assert.ok(!/My guess is/.test(m.body));
    s.reset();
    assert.equal(s.state.settings.freedom, "strict", "the setting outlives a new search");
    p.setFreedom("balanced");
  });

  await new Promise((r) => setTimeout(r, 800));
});

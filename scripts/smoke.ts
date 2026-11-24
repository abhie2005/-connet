// Runs the whole pipeline on sample data in the terminal and prints what happened.
//   npx tsx scripts/smoke.ts
process.env.TACT_SAMPLE = "1";
process.env.TACT_DATA_DIR = ".data-smoke";

async function main() {
  const { GLYPH_FOUNDER, GLYPH_PRODUCT } = await import("../lib/sample/data");
  const { runPipeline, decideMessage, logReply, decideExpansion, enrichLead } = await import("../lib/pipeline");
  const { store } = await import("../lib/store");
  const s = store();
  s.reset();
  await runPipeline(GLYPH_PRODUCT, GLYPH_FOUNDER);
  for (const a of s.state.activity) console.log(`${String(a.seq).padStart(3)} ${a.agent.padEnd(8)} ${a.kind.padEnd(5)} ${a.to ? "@" + a.to + " " : ""}${a.text}${a.detail ? "\n      | " + a.detail.split("\n").join("\n      | ") : ""}`);
  console.log("\nRUN", s.state.run.status, s.state.run.error || "", JSON.stringify(s.state.run.stats));
  for (const l of s.state.leads) console.log(`${l.score.tier} ${String(l.score.total).padStart(3)} ${l.status.padEnd(10)} ${l.company.padEnd(30)} sig=${l.signals.length} ppl=${l.contacts.map((c) => c.name + (c.email ? " <" + c.email + ":" + c.emailStatus + ">" : "")).join(", ")} warm=${l.warmPaths.map((w) => w.note).join(" | ")}`);
  console.log("\nCOMPETITORS", s.state.competitors.map((c) => c.name).join(", "));
  for (const m of s.state.messages) console.log(`\n--- ${m.id} to ${m.to} [${m.variant}] review=${m.review.verdict} rounds=${m.review.rounds} security=${m.security.ok}\nSubject: ${m.subject}\n${m.body}\n(claims: ${m.claims.map((c) => (c.supported ? "ok" : "NO") + ":" + c.text).join("; ")})`);
  console.log("\nCREDITS", s.state.credits.balance, "graph", s.graph.memory.nodes.size, "nodes", s.graph.memory.edges.size, "edges");

  const first = s.state.messages[0];
  decideMessage(first.id, "approve");
  const r = await logReply(first.leadId, "Sure, I'd love to see it. Does next week work for a call?");
  console.log("\nREPLY", r, s.state.leads.find((l) => l.id === first.leadId)?.stage);
  for (const l of s.state.leads) for (const w of l.warmPaths.filter((x) => x.kind === "referral")) console.log("REFERRAL", l.company, "->", w.note);
  const x = s.state.icp!.expansions[0];
  await decideExpansion(x.id, "accept");
  console.log("AFTER EXPANSION", s.state.leads.map((l) => l.company).join(", "));
  try {
    for (const l of s.state.leads) if (l.domain && !l.enriched) await enrichLead(l.id);
  } catch (e) {
    console.log("GATE:", (e as Error).message);
  }
  console.log("CREDITS", s.state.credits.balance, "audit", s.state.audit.length);
  await new Promise((r) => setTimeout(r, 900));
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

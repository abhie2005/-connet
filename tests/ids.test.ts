// Ids are never handed out twice, whatever has been removed in between.
import assert from "node:assert/strict";
import { test } from "node:test";
import { nextId } from "../lib/ids";

test("the next id follows the highest in use, not the count", () => {
  assert.equal(nextId("m", []), "m1");
  assert.equal(nextId("m", [{ id: "m1" }, { id: "m2" }]), "m3");
  // m2 was removed: counting would hand out m3 again.
  assert.equal(nextId("m", [{ id: "m1" }, { id: "m3" }]), "m4");
  assert.equal(nextId("mt", [{ id: "m9" }, { id: "mt2" }]), "mt3", "another run's ids do not count");
});

test("a saved workspace with two messages under one id is put right when it is loaded", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  process.env.TACT_SAMPLE = "1";
  process.env.TACT_DATA_DIR = ".data-test-ids";
  const dir = path.join(process.cwd(), ".data-test-ids");
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const message = (id: string, status: string) => ({ id, leadId: "c:a", contactId: null, to: "A", toEmail: null, variant: "A", angle: "", subject: "s", body: "b", linkedinNote: "", facts: [], claims: [], review: { verdict: "pass", rounds: 1, notes: [] }, security: { ok: true, notes: [] }, status, createdAt: "2026-11-24T00:00:00.000Z", decidedAt: null, editedByRep: false });
  // What a removed message left behind on Nov 24: a sent "m3", and a new draft handed "m3" again.
  fs.writeFileSync(path.join(dir, "workspace.json"), JSON.stringify({ rev: 5, messages: [message("m1", "sent"), message("m3", "sent"), message("m3", "draft")], leads: [], graph: { nodes: [], edges: [] } }));
  const { store } = await import("../lib/store");
  const ids = store().state.messages.map((m) => m.id);
  assert.deepEqual(ids, ["m1", "m3", "m4"]);
  assert.equal(store().state.messages[2].status, "draft", "the later one is the one renamed");
  await new Promise((r) => setTimeout(r, 800));
  fs.rmSync(dir, { recursive: true, force: true });
});

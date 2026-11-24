// The two setup commands, run against stand-ins that answer as the Flexprice and Band API
// references describe. Keys are written to a throwaway env file and never printed.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const ENV = ".env.test-setup";
process.env.TACT_ENV_FILE = ENV;
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const quiet = async <T>(run: () => Promise<T>): Promise<{ result: T; out: string }> => {
  const log = console.log;
  let out = "";
  console.log = (...a: unknown[]) => void (out += a.join(" ") + "\n");
  try {
    return { result: await run(), out };
  } finally {
    console.log = log;
  }
};

test("Flexprice setup: finds the region, then creates the customer, the features and the wallet once", async () => {
  fs.writeFileSync(ENV, "FLEXPRICE_API_KEY=fp-secret\n");
  process.env.FLEXPRICE_API_KEY = "fp-secret";
  delete process.env.FLEXPRICE_API_HOST;
  const made = { customers: 0, features: [] as Record<string, unknown>[], wallets: [] as Record<string, unknown>[], events: 0 };
  let customer: Record<string, unknown> | null = null;
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
    assert.equal(new Headers(init?.headers).get("x-api-key"), "fp-secret");
    if (url.hostname === "us.api.flexprice.io") return json(401, { error: { message: "invalid api key" } }); // this account lives in the other region
    assert.equal(url.hostname, "api.cloud.flexprice.io");
    const path = url.pathname.replace("/v1", "");
    if (path === "/customers/external/tact-demo") return customer ? json(200, customer) : json(404, { error: { message: "customer not found" } });
    if (path === "/customers" && init?.method === "POST") {
      made.customers += 1;
      assert.equal(body.external_id, "tact-demo");
      customer = { id: "cust_1", external_id: "tact-demo" };
      return json(201, customer);
    }
    if (path === "/features") {
      if (made.features.some((f) => f.lookup_key === body.lookup_key)) return json(409, { error: { message: "feature with this lookup key already exists" } });
      made.features.push(body);
      return json(201, { id: `feat_${made.features.length}` });
    }
    if (path === "/customers/wallets") return json(200, made.wallets);
    if (path === "/wallets") {
      made.wallets.push({ id: "wallet_1", wallet_status: "active", credit_balance: body.initial_credits_to_load, ...body });
      return json(200, made.wallets[0]);
    }
    if (path === "/events") {
      made.events += 1;
      return json(202, { message: "Event accepted for processing" });
    }
    throw new Error(`no stand-in for ${url.href}`);
  }) as typeof fetch;

  const { setupFlexprice } = await import("../scripts/setup-flexprice");
  const first = await quiet(setupFlexprice);
  assert.equal(first.result, true, first.out);
  assert.equal(/FAIL/.test(first.out), false, first.out);
  assert.equal(first.out.includes("fp-secret"), false);
  assert.match(fs.readFileSync(ENV, "utf8"), /FLEXPRICE_API_HOST=https:\/\/api\.cloud\.flexprice\.io\/v1/);
  assert.equal(made.customers, 1);
  assert.deepEqual(made.features.map((f) => (f.meter as { event_name: string }).event_name), ["discovery.run", "lead.enriched", "outreach.drafted", "radar.scan", "outreach.sent", "graph.query"]);
  assert.deepEqual((made.features[0].meter as { aggregation: unknown }).aggregation, { type: "SUM", field: "credits" });
  assert.equal(made.wallets.length, 1);
  assert.equal(made.wallets[0].customer_id, "cust_1");

  const second = await quiet(setupFlexprice); // running it again must not make anything twice
  assert.equal(second.result, true, second.out);
  assert.equal(made.customers, 1);
  assert.equal(made.features.length, 6);
  assert.equal(made.wallets.length, 1);
  fs.rmSync(ENV, { force: true });
});

test("Band setup: registers four agents, makes the room, adds the others and the owner, and saves the keys", async () => {
  fs.writeFileSync(ENV, "BAND_USER_API_KEY=user-secret\n# BAND_CHAT_ID=\n");
  process.env.BAND_USER_API_KEY = "user-secret";
  for (const k of ["BAND_CHAT_ID", "BAND_API_KEY_PLANNER", "BAND_API_KEY_BUILDER", "BAND_API_KEY_REVIEWER", "BAND_API_KEY_SECURITY"]) delete process.env[k];
  const agents: { id: string; name: string; key: string }[] = [];
  const room = { id: "", members: new Set<string>(), events: [] as Record<string, unknown>[] };
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    assert.equal(url.origin, "https://app.band.ai");
    const key = new Headers(init?.headers).get("x-api-key");
    const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, Record<string, string>>) : {};
    const path = url.pathname.replace("/api/v1", "");
    if (path === "/me/agents/register") {
      assert.equal(key, "user-secret");
      const a = { id: `agent-${agents.length + 1}`, name: body.agent.name, key: `thnv_${agents.length + 1}` };
      assert.ok(body.agent.description.length > 10);
      agents.push(a);
      return json(201, { data: { agent: { id: a.id, name: a.name }, credentials: { api_key: a.key } } });
    }
    const me = agents.find((a) => a.key === key);
    if (!me) return json(401, { error: "unauthorized" });
    if (path === "/agent/me") return json(200, { data: { id: me.id, name: me.name } });
    if (path === "/agent/chats" && init?.method === "POST") {
      room.id = "room-9";
      room.members.add(me.id);
      return json(201, { data: { id: room.id, inserted_at: "", updated_at: "" } });
    }
    if (path === `/agent/chats/${room.id}/participants` && init?.method === "POST") {
      room.members.add(body.participant.participant_id);
      return json(201, { data: { id: body.participant.participant_id, role: "member", status: "active", type: "Agent" } });
    }
    if (path === `/agent/chats/${room.id}/participants`) return json(200, { data: [...room.members].map((id) => ({ id, role: "member", status: "active", type: "Agent" })) });
    if (path === "/agent/peers") {
      return json(200, { data: [...agents.filter((a) => a.id !== me.id).map((a) => ({ id: a.id, name: a.name, type: "Agent" })), { id: "user-1", name: "Yoon Woo", type: "User" }, { id: "g-1", name: "Some Global Agent", type: "Agent" }] });
    }
    if (path === `/agent/chats/${room.id}/events`) {
      room.events.push(body.event);
      return json(201, { data: { id: "e1" } });
    }
    throw new Error(`no stand-in for ${init?.method || "GET"} ${url.href}`);
  }) as typeof fetch;

  const { setupBand } = await import("../scripts/setup-band");
  const { result, out } = await quiet(setupBand);
  assert.equal(result, true, out);
  assert.equal(/FAIL/.test(out), false, out);
  assert.equal(/thnv_|user-secret/.test(out), false, "a key was printed");
  assert.deepEqual(agents.map((a) => a.name), ["Tact Planner", "Tact Builder", "Tact Reviewer", "Tact Security"]);
  assert.deepEqual([...room.members].sort(), ["agent-1", "agent-2", "agent-3", "agent-4", "user-1"]);
  assert.deepEqual(room.events[0], { content: room.events[0].content, message_type: "thought" });
  const env = fs.readFileSync(ENV, "utf8");
  assert.match(env, /^BAND_CHAT_ID=room-9$/m);
  assert.equal(/^# BAND_CHAT_ID/m.test(env), false);
  for (const [r, k] of [["PLANNER", "thnv_1"], ["BUILDER", "thnv_2"], ["REVIEWER", "thnv_3"], ["SECURITY", "thnv_4"]]) assert.match(env, new RegExp(`^BAND_API_KEY_${r}=${k}$`, "m"));
  fs.rmSync(ENV, { force: true });
});

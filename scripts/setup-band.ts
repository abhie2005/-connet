// One-time Band setup: four agents (Planner, Builder, Reviewer, Security) in one room with you.
//
// Two ways in, tried in this order:
//   A. BAND_USER_API_KEY is set (Band: Settings, API Keys). The script registers the four agents,
//      creates the room, adds everyone, and writes the room id and the agents' keys to .env.local.
//      Band's human API is not on every plan; if it is refused, use B.
//   B. You created four external agents in Band by hand and put their keys in .env.local as
//      BAND_API_KEY_PLANNER / _BUILDER / _REVIEWER / _SECURITY. The script makes the room and
//      adds the other three agents and you.
// It never prints a key.   npm run setup:band
import { loadEnvConfig } from "@next/env";
import { setEnv } from "./envfile";

loadEnvConfig(process.cwd());

const say = (mark: string, text: string) => console.log(`  ${mark.padEnd(5)} ${text}`);
const ROLES = ["planner", "builder", "reviewer", "security"] as const;
type Role = (typeof ROLES)[number];
const DOES: Record<Role, string> = {
  planner: "Reads the product brief, defines who should buy it, sets the search plan and sums up.",
  builder: "Searches the web, builds the knowledge graph, enriches contacts and drafts outreach.",
  reviewer: "Checks every quote against its source and every claim in a draft against the facts.",
  security: "Checks what is about to be sent: links, stray addresses, a way to opt out.",
};
const title = (r: Role) => `Tact ${r[0].toUpperCase()}${r.slice(1)}`;

type Json = Record<string, unknown>;

export async function setupBand(): Promise<boolean> {
  const host = (process.env.BAND_API_HOST || "https://app.band.ai/api/v1").replace(/\/+$/, "");
  const userKey = (process.env.BAND_USER_API_KEY || "").trim();
  const call = async (key: string, method: string, path: string, body?: unknown) => {
    const res = await fetch(`${host}${path}`, {
      method,
      headers: { "content-type": "application/json", "x-api-key": key },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
    const text = await res.text();
    let data: Json | null = null;
    try {
      data = text ? (JSON.parse(text) as Json) : null;
    } catch {
      // not JSON
    }
    return { ok: res.ok, status: res.status, text: text.slice(0, 220), data };
  };
  const keyOf = (r: Role) => (process.env[`BAND_API_KEY_${r.toUpperCase()}`] || "").trim();
  const agentIds: Partial<Record<Role, string>> = {};

  // A. Register the agents with the user key.
  if (ROLES.some((r) => !keyOf(r))) {
    if (!userKey) {
      say("FAIL", "Nothing to work with yet. Either add BAND_USER_API_KEY=... to .env.local (Band: Settings, API Keys), or create four external agents in Band and add their keys as BAND_API_KEY_PLANNER, _BUILDER, _REVIEWER and _SECURITY.");
      return false;
    }
    for (const r of ROLES) {
      if (keyOf(r)) continue;
      const made = await call(userKey, "POST", "/me/agents/register", { agent: { name: title(r), description: DOES[r] } });
      const agent = made.data?.data as { agent?: { id?: string }; credentials?: { api_key?: string } } | undefined;
      if (!made.ok || !agent?.credentials?.api_key) {
        say("FAIL", `Could not register ${title(r)}: ${made.status} ${made.text}`);
        if (made.status === 401 || made.status === 403) {
          console.log(`
        Your Band plan may not allow this by API. Do it by hand instead (about three minutes):
          1. In Band, open Agents and create four External (remote) agents named
             Tact Planner, Tact Builder, Tact Reviewer, Tact Security.
          2. On each agent's page click Generate API Key and paste the key into .env.local as
             BAND_API_KEY_PLANNER=   BAND_API_KEY_BUILDER=   BAND_API_KEY_REVIEWER=   BAND_API_KEY_SECURITY=
          3. Run  npm run setup:band  again. It will make the room and add everyone.`);
        }
        return false;
      }
      setEnv(`BAND_API_KEY_${r.toUpperCase()}`, agent.credentials.api_key);
      if (agent.agent?.id) agentIds[r] = agent.agent.id;
      say("OK", `Registered ${title(r)}. Its key is saved in .env.local.`);
    }
  } else say("OK", "Four agent keys found in .env.local.");

  // Every agent key must work.
  for (const r of ROLES) {
    const me = await call(keyOf(r), "GET", "/agent/me");
    if (!me.ok) {
      say("FAIL", `The key for ${r} was refused: ${me.status} ${me.text}`);
      return false;
    }
    const id = ((me.data?.data as Json | undefined)?.id ?? (me.data as Json | null)?.id) as string | undefined;
    if (id) agentIds[r] = id;
  }
  say("OK", "All four agents can sign in.");

  // The room. The planner creates it, then adds its sibling agents and its owner (you).
  let chatId = (process.env.BAND_CHAT_ID || "").trim();
  if (chatId) say("OK", "BAND_CHAT_ID is already set: using that room.");
  else {
    const made = await call(keyOf("planner"), "POST", "/agent/chats", { chat: { title: "Tact: GTM agents" } });
    chatId = String((made.data?.data as Json | undefined)?.id || "");
    if (!made.ok || !chatId) {
      say("FAIL", `Could not create the room: ${made.status} ${made.text}. Create a chat in Band, add the four agents, and put its id (the last part of its address) in .env.local as BAND_CHAT_ID.`);
      return false;
    }
    setEnv("BAND_CHAT_ID", chatId);
    say("OK", "Room created. Its id is saved in .env.local.");
  }

  const here = await call(keyOf("planner"), "GET", `/agent/chats/${chatId}/participants`);
  const inRoom = new Set(((here.data?.data as Json[] | undefined) || []).map((p) => String(p.id)));
  const peers = await call(keyOf("planner"), "GET", `/agent/peers?not_in_chat=${chatId}`);
  const peerList = ((peers.data?.data as Json[] | undefined) || []) as { id?: string; name?: string; type?: string }[];
  const wanted = new Map<string, string>();
  for (const r of ROLES) if (r !== "planner" && agentIds[r]) wanted.set(agentIds[r]!, title(r));
  for (const p of peerList) {
    const name = String(p.name || "").toLowerCase();
    if (!p.id) continue;
    if (/user|human/i.test(String(p.type || ""))) wanted.set(p.id, `${p.name || "you"} (you)`);
    else if (ROLES.some((r) => r !== "planner" && name.includes(r) && name.includes("tact"))) wanted.set(p.id, String(p.name));
  }
  let added = 0;
  for (const [id, name] of wanted) {
    if (inRoom.has(id)) continue;
    const r = await call(keyOf("planner"), "POST", `/agent/chats/${chatId}/participants`, { participant: { participant_id: id, role: "member" } });
    if (r.ok) {
      added += 1;
      say("OK", `Added ${name} to the room.`);
    } else say("FAIL", `Could not add ${name}: ${r.status} ${r.text}`);
  }
  if (added === 0 && wanted.size === 0) say("--", "Found nobody to add. Open the room in Band and add the agents and yourself from there.");

  const hello = await call(keyOf("planner"), "POST", `/agent/chats/${chatId}/events`, { event: { content: "Tact is connected. Hand-offs between the four agents will appear here during a run.", message_type: "thought" } });
  if (hello.ok) say("OK", "Posted a first line in the room. Open Band and you should see it.");
  else say("FAIL", `Could not post in the room: ${hello.status} ${hello.text}`);
  return hello.ok;
}

if (process.argv[1] && /setup-band/.test(process.argv[1])) {
  console.log("\nTact: setting up Band\n");
  setupBand()
    .then((ok) => console.log(ok ? "\nDone. Restart the app (Ctrl+C, then npm run dev). Hand-offs will be mirrored into the room.\n" : "\nNot finished: see above.\n"))
    .catch((e) => console.log(`\n  FAIL  ${(e as Error).message}\n`));
}

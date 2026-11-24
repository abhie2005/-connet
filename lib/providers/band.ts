// Optional: mirror the agents' conversation into a Band room, so the same hand-offs can be
// followed (and answered) in Band Desktop. Each agent posts with its own Band API key.
// Off unless BAND_CHAT_ID and at least one BAND_API_KEY are set.
import { config, modes } from "../config";
import type { AgentName } from "../types";

type BandAgent = "planner" | "builder" | "reviewer" | "security";
let participants: { id: string; name: string; type: string }[] | null = null;
export let bandError: string | null = null;

async function loadParticipants(key: string) {
  const res = await fetch(`${config.bandHost}/agent/chats/${config.bandChatId}/participants`, {
    headers: { "x-api-key": key },
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Band participants ${res.status}`);
  const data = await res.json();
  const list = (data?.data || data?.participants || data || []) as Record<string, unknown>[];
  participants = (Array.isArray(list) ? list : []).map((p) => ({ id: String(p.id), name: String(p.name || p.display_name || ""), type: String(p.type || p.participant_type || "").toLowerCase() }));
}

/** Post one line into the Band room. Never throws: the app must not depend on it. */
export async function bandPost(agent: AgentName, text: string, to: AgentName | null, thought: boolean): Promise<void> {
  if (!modes().band) return;
  const key = config.bandKeys[agent as BandAgent];
  if (!key) return;
  try {
    if (!participants) await loadParticipants(key);
    const base = `${config.bandHost}/agent/chats/${config.bandChatId}`;
    // A message needs someone to mention. Without one, it is posted as an event (a thought).
    const target = !to
      ? null
      : to === "rep"
        ? participants!.find((p) => /user|human/.test(p.type)) || null
        : participants!.find((p) => p.name.toLowerCase().includes(to)) || null;
    const asMessage = !thought && target && target.name;
    const res = await fetch(asMessage ? `${base}/messages` : `${base}/events`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key },
      body: JSON.stringify(
        asMessage
          ? { message: { content: `@${target!.name} ${text}`, mentions: [{ id: target!.id, name: target!.name }] } }
          : { event: { content: text, message_type: "thought" } },
      ),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Band ${res.status}: ${(await res.text()).slice(0, 160)}`);
    bandError = null;
  } catch (e) {
    bandError = e instanceof Error ? e.message : String(e);
  }
}

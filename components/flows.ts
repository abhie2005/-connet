"use client";
// Messages in motion on the graph. A draft being written sends dots from the product to the
// person for as long as the writing takes; an approval sends one quick run along the same path.
// Both pages draw the same graph, so both have to animate it the same way — keeping this here
// means a draft looks like a draft whichever page it was asked for from.
import { useCallback, useEffect, useRef, useState } from "react";
import type { Flow } from "./GraphView";
import { routeTo, viewOf } from "./leads";
import type { Net } from "@/lib/graph/nets";
import type { Lead, Workspace } from "@/lib/types";

export interface Flows {
  /** What the graph should have in motion right now. */
  flows: Flow[];
  /** Run dots along a lead's path until the returned stop is called with an end time. */
  begin: (lead: Lead, tone: Flow["tone"]) => ((end: number) => void) | null;
  /** Note that the rep asked for this draft, so the watcher does not announce it twice. */
  asked: (leadId: string) => void;
}

export function useFlows(ws: Workspace | null, net: Net): Flows {
  const [flows, setFlows] = useState<Flow[]>([]);
  const id = useRef(0);
  /** Leads whose draft the rep asked for: their dots are already running. */
  const mine = useRef(new Set<string>());
  /** Message id to status as of the last look, to notice a new draft or an approval. */
  const known = useRef<Map<string, string> | null>(null);

  const flow = useCallback((path: string[], tone: Flow["tone"], lasts: number | null) => {
    const n = ++id.current;
    const start = performance.now();
    const clear = (end: number) => setTimeout(() => setFlows((f) => f.filter((x) => x.id !== n)), Math.max(0, end - performance.now()) + 3500);
    setFlows((f) => [...f, { id: n, path, tone, start, end: lasts == null ? null : start + lasts }]);
    if (lasts != null) clear(start + lasts);
    return (end: number) => {
      setFlows((f) => f.map((x) => (x.id === n ? { ...x, end } : x)));
      clear(end);
    };
  }, []);

  const begin = useCallback(
    (lead: Lead, tone: Flow["tone"]) => {
      if (!ws) return null;
      const path = routeTo(viewOf(lead, ws), ws, net);
      return path.length > 1 ? flow(path, tone, null) : null;
    },
    [ws, net, flow],
  );

  const asked = useCallback((leadId: string) => {
    mine.current.add(leadId);
    setTimeout(() => mine.current.delete(leadId), 5000);
  }, []);

  // A draft the agent wrote on its own, or a message just approved, also shows on the graph.
  useEffect(() => {
    if (!ws) return;
    const before = known.current;
    known.current = new Map(ws.messages.map((m) => [m.id, m.status]));
    if (!before) return; // the first look: nothing is new
    for (const m of ws.messages) {
      const was = before.get(m.id);
      const fresh = !was && m.status === "draft" && !mine.current.has(m.leadId);
      const approved = was === "draft" && m.status === "sent";
      if (!fresh && !approved) continue;
      const lead = ws.leads.find((l) => l.id === m.leadId);
      const path = lead ? routeTo(viewOf(lead, ws), ws, net) : [];
      if (path.length > 1) flow(path, approved ? "send" : "draft", approved ? 650 : 1200);
    }
  }, [ws, flow, net]);

  return { flows, begin, asked };
}

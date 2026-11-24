"use client";
// The workspace: the live graph on the left, the work on the right, and one line at the top of
// the work that says what to do next.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { APP_NAME, post, useWorkspace } from "@/lib/client";
import { reach as reachOf, ringOf, type Net, type Reach } from "@/lib/graph/nets";
import { COSTS, type Lead, type Workspace } from "@/lib/types";
import { ApprovalsTab } from "./ApprovalsTab";
import { BriefTab, type Act } from "./BriefTab";
import { Feed } from "./Feed";
import { GraphView, type Flow, type Highlight } from "./GraphView";
import { Intake } from "./Intake";
import { LeadsTab } from "./LeadsTab";
import { PipelineTab } from "./PipelineTab";
import { CompetitorCard, Profile } from "./Profile";
import { bestNext, ranked, routeTo, viewOf } from "./leads";
import { Icon, Logo } from "./ui";

// The four tabs follow the order of the work: who to aim at, who was found, what to approve,
// what happened next.
type Tab = "target" | "leads" | "approve" | "pipeline";

function Tabs({ tab, onChange, counts }: { tab: Tab; onChange: (t: Tab) => void; counts: Record<Tab, number | null> }) {
  const items: { key: Tab; label: string; icon: string }[] = [
    { key: "target", label: "Target", icon: "brief" },
    { key: "leads", label: "Leads", icon: "person" },
    { key: "approve", label: "Approve", icon: "mail" },
    { key: "pipeline", label: "Pipeline", icon: "columns" },
  ];
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [thumb, setThumb] = useState({ x: 0, w: 0, ready: false });
  const measure = useCallback(() => {
    const el = refs.current[tab];
    if (el) setThumb({ x: el.offsetLeft, w: el.offsetWidth, ready: true });
  }, [tab]);
  useLayoutEffect(measure, [measure, counts.leads, counts.approve]);
  useEffect(() => {
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);
  return (
    <div className="tabs frost" role="tablist">
      <span className="thumb" style={{ transform: `translateX(${thumb.x}px)`, width: thumb.w, opacity: thumb.ready ? 1 : 0 }} />
      {items.map((it) => (
        <button
          key={it.key}
          ref={(el) => {
            refs.current[it.key] = el;
          }}
          role="tab"
          aria-selected={tab === it.key}
          onClick={() => onChange(it.key)}
        >
          <Icon name={it.icon} />
          {it.label}
          {counts[it.key] ? <span className="count">{counts[it.key]}</span> : null}
        </button>
      ))}
    </div>
  );
}

function Popover({ open, onClose, children, width = 320 }: { open: boolean; onClose: () => void; children: React.ReactNode; width?: number }) {
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div className="sheet absolute right-0 top-[calc(100%+10px)] z-40 p-4 arrive" style={{ width }}>
        {children}
      </div>
    </>
  );
}

const EVENT_NAMES: Record<string, string> = {
  "discovery.run": "Search",
  "lead.enriched": "Emails found",
  "outreach.drafted": "Message drafted",
  "outreach.sent": "Message sent",
  "graph.query": "Graph query",
  "credits.topup": "Top-up",
};

function CreditsPanel({ ws, act, busy }: { ws: Workspace; act: Act; busy: Set<string> }) {
  const c = ws.credits;
  const shown = c.balance;
  const usage = new Map<string, number>();
  for (const e of c.ledger) if (e.event !== "credits.topup") usage.set(e.event, (usage.get(e.event) || 0) + 1);
  return (
    <div>
      <div className="flex items-end gap-2">
        <div className="text-[30px] font-extrabold leading-none">{shown}</div>
        <div className="text-soft pb-0.5">credits left</div>
      </div>
      <div className="text-faint text-[13px] mt-1">
        A search costs {COSTS["discovery.run"]}, finding emails at a company {COSTS["lead.enriched"]}, a draft {COSTS["outreach.drafted"]}. Paid steps stop when this reaches zero.
      </div>
      <div className="mt-3 grid gap-1 text-[14px]">
        {[...usage.entries()].map(([event, n]) => (
          <div key={event} className="flex justify-between">
            <span>{EVENT_NAMES[event] || event}</span>
            <span className="font-semibold">{n} metered</span>
          </div>
        ))}
        {usage.size === 0 && <div className="text-faint">Nothing metered yet.</div>}
      </div>
      <div className="rounded-xl bg-raise p-2.5 mt-3 text-[13px] leading-snug">
        {c.flexprice.configured ? (
          <>
            <span className="font-bold">Flexprice: </span>
            {c.flexprice.accepted} usage events accepted{c.flexprice.failed ? `, ${c.flexprice.failed} failed` : ""}.{" "}
            {c.flexprice.wallet == null
              ? "No wallet found for this customer, so the gate uses this app's own count."
              : c.flexprice.wallet > c.balance
                ? `The Flexprice wallet reads ${c.flexprice.wallet}: it is not being drawn down by these events yet, so the gate uses this app's own count.`
                : "The balance above follows the Flexprice wallet."}
            {c.flexprice.lastError && <div className="text-bad mt-1">{c.flexprice.lastError}</div>}
          </>
        ) : (
          <>
            <span className="font-bold">Local ledger. </span>Add FLEXPRICE_API_KEY to meter usage in Flexprice.
          </>
        )}
      </div>
      <button className="btn w-full mt-3" disabled={busy.has("topup")} onClick={() => act({ type: "topup", credits: 20 }, "topup")}>
        <Icon name="plus" />
        Top up 20 credits
      </button>
    </div>
  );
}

function Connections({ ws }: { ws: Workspace }) {
  const m = ws.modes;
  const rows: [string, string, boolean][] = [
    ["Model", m.llm === "gemini" ? "Gemini" : "Sample answers", m.llm !== "sample"],
    ["Web search", m.search === "tavily" ? "Tavily" : "Sample pages", m.search !== "sample"],
    ["Contact data", m.enrich === "hunter" ? "Hunter.io" : "Sample records", m.enrich !== "sample"],
    ["Knowledge graph", m.graph === "neo4j" ? "Neo4j" : "Embedded graph", m.graph === "neo4j"],
    ["Usage billing", m.billing === "flexprice" ? "Flexprice" : "Local ledger", m.billing === "flexprice"],
    ["Agent room", m.band ? "Mirrored to Band" : "In this app only", m.band],
    ["Sending", "Simulated: nothing leaves this machine", false],
  ];
  return (
    <div className="grid gap-2 text-[14px]">
      {rows.map(([name, value, live]) => (
        <div key={name} className="flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full flex-none" style={{ background: live ? "#5FD08A" : "#4A4A4A" }} />
          <span className="font-semibold w-[118px] flex-none">{name}</span>
          <span className="text-soft">{value}</span>
        </div>
      ))}
      {(ws.run.stats.replayed || 0) > 0 && (
        <div className="box p-2.5 text-[13px] leading-snug mt-1">
          <span className="font-bold">Replay. </span>
          {ws.run.stats.replayed} of this run&rsquo;s lookups were answered from copies saved on this machine earlier, so they cost nothing and needed no network. Run <span className="mono">npm run fresh</span> to fetch everything again.
        </div>
      )}
      <div className="text-faint text-[13px] mt-1">Keys live in .env.local. A missing key switches that one part to sample data.</div>
    </div>
  );
}
/** The switch between the two nets. The thumb takes the color of whoever the net is about:
    white for the product, the live blue for you. Both halves are the same width, so nothing
    resizes when it moves. */
function NetSwitch({ net, onChange, product, canYou, within, bare }: { net: Net; onChange: (n: Net) => void; product: string; canYou: boolean; within: number; bare: boolean }) {
  return (
    <div className="flex items-center gap-3 flex-none min-w-0">
      <div className="netswitch frost" data-net={net} role="group" aria-label="Which net to show">
        <span className="thumb" />
        <button aria-pressed={net === "product"} onClick={() => onChange("product")} title={`Who ${product} is connected to`}>
          <svg width="11" height="11" viewBox="0 0 11 11" aria-hidden="true" style={{ flex: "none" }}>
            <circle cx="5.500" cy="5.500" r="5" fill="currentColor" />
          </svg>
          <span className="truncate">{product}&rsquo;s net</span>
        </button>
        <button aria-pressed={net === "you"} disabled={!canYou} onClick={() => onChange("you")} title={canYou ? "Who you are connected to" : "Add your name and schools under New search to see your own net"}>
          <Icon name="person" size={15} />
          Your net
          {within > 0 && (
            <span className="count" title={`${within} ${within === 1 ? "person" : "people"} within reach of you`}>
              {within}
            </span>
          )}
        </button>
      </div>
      <div className="text-[13px] text-faint leading-tight min-w-0 truncate">{net === "you" ? (bare ? "No schools or employers given yet. Add yours under New search." : "Who you can reach. Closer in is a closer tie.") : `Who ${product} is connected to.`}</div>
    </div>
  );
}

/** What is drawn on the graph, in the shapes it is drawn in, with how many of each there are. */
function Legend({ ws, net, reach, waiting }: { ws: Workspace; net: Net; reach: Map<string, Reach>; waiting: number }) {
  const count = (label: string) => ws.graph.nodes.filter((n) => n.label === label && !n.props.isFounder && n.props.isTarget !== false).length;
  type Item = { key: string; label: string; n?: number; mark: React.ReactNode };
  const wait: Item[] = waiting ? [{ key: "waiting", label: "Draft waiting for you", n: waiting, mark: <circle cx="9" cy="9" r="6" fill="none" stroke="#F2B45A" strokeWidth="1.800" strokeDasharray="3 2.600" /> }] : [];
  let items: Item[];
  if (net === "you") {
    const people = ws.graph.nodes.filter((n) => n.label === "Person" && !n.props.isFounder);
    const on = (ring: 0 | 1 | 2) => people.filter((n) => ringOf(reach.get(n.id)) === ring).length;
    const yours = ws.graph.nodes.filter((n) => n.label !== "Person" && reach.get(n.id)?.dist === 1).length;
    const written = ws.graph.edges.some((e) => e.type === "CONTACTED_VIA");
    items = [
      { key: "you", label: "You", mark: <circle cx="9" cy="9" r="6.500" fill="#5CC8FF" /> },
      ...(yours ? [{ key: "hub", label: "Your school or past employer", n: yours, mark: <rect x="3.500" y="3.500" width="11" height="11" rx="2.500" fill="#0A0A0A" stroke="#E3F5FF" strokeWidth="1.600" /> }] : []),
      { key: "r1", label: "Shares it with you", n: on(1), mark: <circle cx="9" cy="9" r="4.800" fill="#F2F2F2" /> },
      { key: "r2", label: "One introduction away", n: on(2), mark: <circle cx="9" cy="9" r="4.200" fill="#C4C4C4" /> },
      { key: "r0", label: "No way in yet", n: on(0), mark: <circle cx="9" cy="9" r="4.200" fill="#5E5E5E" /> },
      { key: "company", label: "Where they work", n: ws.graph.nodes.filter((n) => n.label === "Company" && n.props.isTarget !== false && reach.has(n.id)).length, mark: <circle cx="9" cy="9" r="6" fill="#0A0A0A" stroke="#F2F2F2" strokeWidth="2.200" /> },
      ...(written ? [{ key: "sent", label: "Written to", mark: <path d="M1.500 9h15" stroke="#5CC8FF" strokeWidth="2" strokeDasharray="4 3.500" /> }] : []),
      ...wait,
    ];
  } else {
    items = [
      { key: "product", label: ws.product?.name || "Your product", mark: <circle cx="9" cy="9" r="6.500" fill="#F2F2F2" /> },
      { key: "company", label: "Company", n: count("Company"), mark: <circle cx="9" cy="9" r="6" fill="#0A0A0A" stroke="#F2F2F2" strokeWidth="2.200" /> },
      ...(count("Person") ? [{ key: "person", label: "Person", n: count("Person"), mark: <circle cx="9" cy="9" r="4.200" fill="#C4C4C4" /> }] : []),
      ...(count("Signal") ? [{ key: "signal", label: "Reason to write now", n: count("Signal"), mark: <path d="M9 2.500 15.500 9 9 15.500 2.500 9Z" fill="#5CC8FF" /> }] : []),
      ...(count("Competitor") ? [{ key: "competitor", label: "Competitor", n: count("Competitor"), mark: <circle cx="9" cy="9" r="5.800" fill="#2B2B2B" stroke="#8A8A8A" strokeWidth="1.600" /> }] : []),
      ...wait,
    ];
  }
  return (
    <div className="legend frost" aria-label="What the shapes on the graph mean">
      {items.map((it) => (
        <span key={it.key} className="legend-item">
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            {it.mark}
          </svg>
          {it.label}
          {it.n != null && <span className="legend-n">{it.n}</span>}
        </span>
      ))}
    </div>
  );
}

/** One line that says what to do next, with the button that does it. */
function Guide({ ws, tab, go, onNew, graphOpen, toggleGraph }: { ws: Workspace; tab: Tab; go: (t: Tab) => void; onNew: () => void; graphOpen: boolean; toggleGraph: () => void }) {
  const drafts = ws.messages.filter((m) => m.status === "draft").length;
  const sent = ws.messages.filter((m) => m.status === "sent").length;
  const next = bestNext(ws);
  let lamp: "busy" | "wait" | "calm" = "calm";
  let text: React.ReactNode;
  let button: React.ReactNode = null;
  if (ws.run.status === "running") {
    lamp = "busy";
    text = (
      <>
        <span className="font-bold">Working. </span>
        <span className="text-soft">{ws.run.step}</span>
      </>
    );
  } else if (ws.run.status === "error") {
    lamp = "wait";
    text = <span className="text-warn">{ws.run.error}</span>;
  } else if (drafts > 0) {
    lamp = "wait";
    text =
      tab === "approve" ? (
        <>
          <span className="font-bold">Your turn. </span>
          <span className="text-soft">Read each message, then approve it, edit it or reject it.</span>
        </>
      ) : (
        <>
          <span className="font-bold">
            {drafts} {drafts === 1 ? "message is" : "messages are"} waiting for your approval.{" "}
          </span>
          <span className="text-soft">Nothing is sent until you approve it.</span>
        </>
      );
    if (tab !== "approve")
      button = (
        <button className="btn" onClick={() => go("approve")}>
          Review {drafts === 1 ? "it" : "them"}
          <Icon name="right" size={15} />
        </button>
      );
  } else if (next) {
    text = (
      <>
        <span className="font-bold">Next: </span>
        <span className="text-soft">
          write to {next.contact?.name || next.lead.company}
          {next.contact ? ` at ${next.lead.company}` : ""}.
        </span>
      </>
    );
    if (tab !== "leads")
      button = (
        <button className="btn" onClick={() => go("leads")}>
          See leads
          <Icon name="right" size={15} />
        </button>
      );
  } else if (sent > 0) {
    text = (
      <>
        <span className="font-bold">All caught up. </span>
        <span className="text-soft">When someone replies, log it under Pipeline.</span>
      </>
    );
    if (tab !== "pipeline")
      button = (
        <button className="btn" onClick={() => go("pipeline")}>
          Open pipeline
          <Icon name="right" size={15} />
        </button>
      );
  } else {
    text = <span className="text-soft">Nobody to write to yet. Describe the product a little differently and search again.</span>;
    button = (
      <button className="btn" onClick={onNew}>
        New search
      </button>
    );
  }
  return (
    <div className="guide">
      <span className={lamp === "busy" ? "lamp busy" : lamp === "wait" ? "waitdot" : "lamp"} />
      <div className="flex-1 min-w-0 text-[15px] leading-snug">{text}</div>
      {button}
      {!graphOpen && (
        <button className="btn btn-plain" onClick={toggleGraph}>
          <Icon name="graph" />
          Show graph
        </button>
      )}
    </div>
  );
}

export function App() {
  const { ws, refresh } = useWorkspace();
  const [tab, setTab] = useState<Tab>("target");
  const [card, setCard] = useState<{ lead: string; focus: string | null } | null>(null);
  const [rival, setRival] = useState<string | null>(null);
  const [pathFor, setPathFor] = useState<string | null>(null);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [intake, setIntake] = useState(false);
  const [pop, setPop] = useState<"credits" | "connections" | null>(null);
  const [graphOpen, setGraphOpen] = useState(true);
  const [flows, setFlows] = useState<Flow[]>([]);
  // Two nets over one graph: who the product is connected to, and who you are.
  const [net, setNet] = useState<Net>("product");
  const picked = useRef(false);
  const hadLeads = useRef(false);
  const flowId = useRef(0);
  /** Leads whose draft the rep asked for and is still on its way: their dots are already running. */
  const asked = useRef(new Set<string>());
  /** Message id to status as of the last look, to notice a new draft or an approval. */
  const known = useRef<Map<string, string> | null>(null);

  const act: Act = useCallback(
    async (body, key) => {
      if (key) setBusy((b) => new Set(b).add(key));
      const res = await post("/api/action", body);
      if (key)
        setBusy((b) => {
          const next = new Set(b);
          next.delete(key);
          return next;
        });
      await refresh();
      if (res.error) {
        setToast(res.error);
        return false;
      }
      return true;
    },
    [refresh],
  );

  /** Dots along `path`. With `lasts`, they stop leaving after that long; without, when `stop` is called. */
  const flow = useCallback((path: string[], tone: Flow["tone"], lasts: number | null) => {
    const id = ++flowId.current;
    const start = performance.now();
    const clear = (end: number) => setTimeout(() => setFlows((f) => f.filter((x) => x.id !== id)), Math.max(0, end - performance.now()) + 3500);
    setFlows((f) => [...f, { id, path, tone, start, end: lasts == null ? null : start + lasts }]);
    if (lasts != null) clear(start + lasts);
    return (end: number) => {
      setFlows((f) => f.map((x) => (x.id === id ? { ...x, end } : x)));
      clear(end);
    };
  }, []);

  /** Ask for a draft. The dots run from the product to the person for as long as the writing takes. */
  const draft = useCallback(
    async (lead: Lead, force?: boolean) => {
      if (!ws) return;
      const path = routeTo(viewOf(lead, ws), ws, net);
      const began = performance.now();
      asked.current.add(lead.id);
      const stop = path.length > 1 ? flow(path, "draft", null) : null;
      const ok = await act({ type: "draft", leadId: lead.id, force: force || lead.status === "held" }, `d:${lead.id}`);
      // Even an instant answer gets a moment of dots, so the click is seen to do something.
      stop?.(ok ? Math.max(performance.now(), began + 1600) : performance.now());
      setTimeout(() => asked.current.delete(lead.id), 5000);
    },
    [ws, act, flow, net],
  );

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  // Follow the run: once the first leads exist, show them (unless the user chose a tab).
  // A new search counts as a change even when it finds as many leads as the last one did.
  const leadCount = ws?.leads.length || 0;
  const runKey = ws?.run.startedAt || "";
  useEffect(() => {
    if (leadCount > 0 && !hadLeads.current && !picked.current) setTab("leads");
    hadLeads.current = leadCount > 0;
  }, [leadCount, runKey]);

  // A draft the agent wrote on its own, or a message the rep just approved, also shows on the graph.
  useEffect(() => {
    if (!ws) return;
    const before = known.current;
    known.current = new Map(ws.messages.map((m) => [m.id, m.status]));
    if (!before) return; // the first look: nothing is new
    for (const m of ws.messages) {
      const was = before.get(m.id);
      const fresh = !was && m.status === "draft" && !asked.current.has(m.leadId);
      const approved = was === "draft" && m.status === "sent";
      if (!fresh && !approved) continue;
      const lead = ws.leads.find((l) => l.id === m.leadId);
      const path = lead ? routeTo(viewOf(lead, ws), ws, net) : [];
      if (path.length > 1) flow(path, approved ? "send" : "draft", approved ? 650 : 1200);
    }
  }, [ws, flow, net]);

  const go = (t: Tab) => {
    picked.current = true;
    setTab(t);
    setGraphOpen(t !== "pipeline");
  };

  const pathLead = ws?.leads.find((l) => l.id === pathFor) || null;
  const highlight: Highlight | null = useMemo(() => {
    if (!pathLead) return null;
    const nodes = new Set<string>(["product", pathLead.id]);
    const edges = new Set<string>([`${pathLead.id}|product`]);
    for (const w of pathLead.warmPaths) {
      w.hops.forEach((h) => nodes.add(h));
      for (let i = 0; i < w.hops.length - 1; i++) edges.add(`${w.hops[i]}|${w.hops[i + 1]}`);
    }
    return { nodes, edges };
  }, [pathLead]);

  const reach = useMemo(() => reachOf(ws?.graph || { nodes: [], edges: [] }), [ws]);

  const waiting = useMemo(() => {
    const on = new Set((ws?.graph.nodes || []).map((n) => n.id));
    return new Set((ws?.messages || []).filter((m) => m.status === "draft").map((m) => (m.contactId && on.has(m.contactId) ? m.contactId : m.leadId)));
  }, [ws]);

  if (!ws) return <div className="field" />;

  if (!ws.product || intake) {
    return (
      <div className="field">
        <Intake
          initial={ws.product}
          founder={ws.founder}
          sample={ws.modes.llm === "sample"}
          onStarted={() => {
            picked.current = false;
            hadLeads.current = false;
            known.current = new Map();
            asked.current.clear();
            setFlows([]);
            setNet("product");
            setIntake(false);
            setTab("target");
            setCard(null);
            setRival(null);
            setPathFor(null);
            refresh();
          }}
        />
      </div>
    );
  }

  const running = ws.run.status === "running";
  const drafts = ws.messages.filter((m) => m.status === "draft").length;
  const sample = ws.modes.llm === "sample" || ws.modes.search === "sample";
  const st = ws.run.stats;
  // Live answers saved earlier on this machine and read back: real data, but not fetched just now.
  const replayed = !sample && (st.replayed || 0) > 0 && (st.replayed || 0) >= (st.llmCalls + st.searches) / 2;
  const credits = ws.credits.balance;
  const best = running ? null : bestNext(ws);
  const canYou = ws.graph.nodes.some((n) => n.props.isFounder);
  const turn = (to: Net) => {
    setNet(to);
    // The lit way in runs through you and the school you share, which only your net shows.
    if (to === "product") setPathFor(null);
  };

  // Profiles flip through every lead, in the order the list shows them.
  const order = [...ranked(ws).map((v) => v.lead), ...ws.leads.filter((l) => l.status === "held"), ...ws.leads.filter((l) => l.status === "suppressed")];
  const cardLead = card ? order.find((l) => l.id === card.lead) || null : null;
  const cardIndex = cardLead ? order.indexOf(cardLead) : 0;
  const open = (leadId: string, focus: string | null = null) => {
    setRival(null);
    setCard({ lead: leadId, focus });
  };

  /** A click on the graph opens the profile of whatever was clicked. */
  const pick = (id: string) => {
    const lead = ws.leads.find((l) => l.id === id);
    if (lead) {
      open(lead.id);
      if (lead.warmPaths.length && net === "you") setPathFor(lead.id);
      return;
    }
    const of = ws.leads.find((l) => l.contacts.some((c) => c.id === id)) || ws.leads.find((l) => l.signals.some((s) => s.id === id));
    if (of) return open(of.id, of.contacts.some((c) => c.id === id) ? id : null);
    if (ws.competitors.some((c) => c.id === id)) setRival(id);
  };

  return (
    <div className="field h-screen flex flex-col overflow-hidden" data-net={net}>
      <header className="flex items-center gap-4 px-6 pt-5 pb-3 flex-none">
        <div className="flex items-center gap-2.5">
          <Logo size={38} />
          <div className="text-[24px] font-extrabold tracking-tight leading-none">{APP_NAME}</div>
        </div>
        <Tabs tab={tab} onChange={go} counts={{ target: null, leads: ws.leads.filter((l) => l.status === "active").length, approve: drafts, pipeline: null }} />
        <span className="flex-1" />
        <div className="relative">
          <button className="frost chip !py-1.5 !px-3 !text-[13.5px] border-0" onClick={() => setPop(pop === "connections" ? null : "connections")}>
            <span className="w-2 h-2 rounded-full" style={{ background: sample ? "#858585" : "#5FD08A" }} />
            {sample ? "Sample data" : replayed ? "Live data, replayed" : "Live data"}
          </button>
          <Popover open={pop === "connections"} onClose={() => setPop(null)} width={340}>
            <Connections ws={ws} />
          </Popover>
        </div>
        <div className="relative">
          <button className="frost chip !py-1.5 !px-3 !text-[13.5px] border-0" onClick={() => setPop(pop === "credits" ? null : "credits")}>
            <Icon name="coins" size={15} />
            <span className="num">{credits}</span> credits
          </button>
          <Popover open={pop === "credits"} onClose={() => setPop(null)}>
            <CreditsPanel ws={ws} act={act} busy={busy} />
          </Popover>
        </div>
        <div className="text-[13.5px] text-faint leading-tight text-right max-w-[180px] truncate">
          Selling <span className="text-ink font-bold">{ws.product.name}</span>
        </div>
        <button className="btn" disabled={running} onClick={() => setIntake(true)} title="Describe a product and search again">
          New search
        </button>
      </header>

      <main className="flex-1 min-h-0 flex gap-4 px-6 pb-6">
        {/* Kept mounted when hidden, so the layout of the graph is not thrown away. */}
        <section className={`relative flex-col gap-3 min-w-0 ${graphOpen ? "flex" : "hidden"}`} style={{ flex: "0 0 41%" }}>
          <NetSwitch net={net} onChange={turn} product={ws.product.name} canYou={canYou} bare={ws.founder.schools.length + ws.founder.employers.length === 0} within={ws.graph.nodes.filter((n) => n.label === "Person" && !n.props.isFounder && ringOf(reach.get(n.id)) !== 0).length} />
          <Legend ws={ws} net={net} reach={reach} waiting={waiting.size} />
          <div className="relative flex-1 min-h-0">
            <div className="dots absolute inset-0 pointer-events-none" />
            {/* The graph stops short of the bottom line, which is kept for the readout. */}
            <div className="absolute inset-x-0 top-0 bottom-6">
              <GraphView nodes={ws.graph.nodes} edges={ws.graph.edges} leads={ws.leads} net={net} reach={reach} highlight={highlight} flows={flows} waiting={waiting} best={best?.lead.id || null} onPick={pick} />
            </div>
            {pathLead && (
              <div className="absolute left-0 top-0 tag !py-1.5 arrive">
                <Icon name="path" size={14} />
                The way in to {pathLead.company}
                <button className="border-0 bg-transparent p-0 ml-1 grid place-items-center" onClick={() => setPathFor(null)} aria-label="Stop highlighting">
                  <Icon name="x" size={14} />
                </button>
              </div>
            )}
            {ws.graph.nodes.length > 0 && (
              <div className="absolute inset-x-0 bottom-0 num text-[11.5px] text-faint flex gap-4 items-center whitespace-nowrap overflow-hidden">
                <span>{ws.graph.nodes.length} nodes</span>
                <span>{ws.graph.edges.length} edges</span>
                <span>{ws.modes.graph === "neo4j" ? "neo4j" : "embedded graph"}</span>
                <span className="flex-1" />
                <span className="hidden min-[1400px]:inline">click a node for its profile</span>
                <button className="border-0 bg-transparent p-0 text-soft hover:text-ink underline underline-offset-2" onClick={() => setGraphOpen(false)}>
                  hide graph
                </button>
              </div>
            )}
          </div>
          <div className="flex-none flex flex-col min-h-0" style={{ maxHeight: "44%" }}>
            <Feed activity={ws.activity} running={running} visible={graphOpen} />
          </div>
        </section>

        <section className="sheet flex-1 min-w-0 flex flex-col overflow-hidden">
          <Guide ws={ws} tab={tab} go={go} onNew={() => setIntake(true)} graphOpen={graphOpen} toggleGraph={() => setGraphOpen(!graphOpen)} />
          <div className="scroll flex-1 min-h-0 px-7 py-6">
            {tab === "target" && <BriefTab ws={ws} act={act} busy={busy} />}
            {tab === "leads" && <LeadsTab ws={ws} act={act} busy={busy} onOpen={open} onDraft={draft} onReview={() => go("approve")} />}
            {tab === "approve" && <ApprovalsTab ws={ws} act={act} busy={busy} />}
            {tab === "pipeline" && <PipelineTab ws={ws} act={act} busy={busy} />}
          </div>
        </section>
      </main>

      <Profile
        view={cardLead ? viewOf(cardLead, ws) : null}
        focus={card?.focus || null}
        index={cardIndex}
        total={order.length}
        isBest={!!cardLead && best?.lead.id === cardLead.id}
        ws={ws}
        act={act}
        busy={busy}
        onClose={() => setCard(null)}
        onStep={(by) => {
          if (order.length < 2) return;
          const to = order[(cardIndex + by + order.length) % order.length];
          setCard({ lead: to.id, focus: null });
        }}
        onShowPath={(lead) => {
          // The way in runs from you, through what you share, to the person: your net shows it.
          if (canYou) setNet("you");
          setPathFor(lead.id);
          setGraphOpen(true);
          setCard(null);
        }}
        onDraft={(lead, force) => {
          // Step aside so the dots can be seen running to this person on the graph.
          setCard(null);
          setGraphOpen(true);
          draft(lead, force);
        }}
        onReview={() => {
          setCard(null);
          go("approve");
        }}
      />
      <CompetitorCard competitor={ws.competitors.find((c) => c.id === rival) || null} ws={ws} onClose={() => setRival(null)} onOpenLead={(id) => open(id)} />

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] sheet px-5 py-3 flex items-center gap-3 arrive" role="alert" style={{ maxWidth: 560 }}>
          <span className="text-warn">
            <Icon name="flag" />
          </span>
          <span className="font-semibold text-[14.5px] leading-snug">{toast}</span>
          {/credits/i.test(toast) && (
            <button
              className="btn"
              onClick={() => {
                setToast(null);
                act({ type: "topup", credits: 20 }, "topup");
              }}
            >
              Top up 20
            </button>
          )}
          <button className="btn btn-plain !p-1.5" onClick={() => setToast(null)} aria-label="Dismiss">
            <Icon name="x" />
          </button>
        </div>
      )}
    </div>
  );
}

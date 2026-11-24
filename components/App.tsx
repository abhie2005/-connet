"use client";
// The workspace: the live graph and the agents on the left, the work on the right.
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { APP_NAME, post, useWorkspace } from "@/lib/client";
import { COSTS, type Lead, type Workspace } from "@/lib/types";
import { AccountsTab, LeadSheet } from "./AccountsTab";
import { ApprovalsTab } from "./ApprovalsTab";
import { BriefTab, type Act } from "./BriefTab";
import { Feed } from "./Feed";
import { GraphView, type Highlight } from "./GraphView";
import { Intake } from "./Intake";
import { PipelineTab } from "./PipelineTab";
import { Icon, Logo } from "./ui";

type Tab = "brief" | "accounts" | "approvals" | "pipeline";

function Tabs({ tab, onChange, counts }: { tab: Tab; onChange: (t: Tab) => void; counts: Record<Tab, number | null> }) {
  const items: { key: Tab; label: string; icon: string }[] = [
    { key: "brief", label: "Brief", icon: "brief" },
    { key: "accounts", label: "Accounts", icon: "building" },
    { key: "approvals", label: "Approvals", icon: "mail" },
    { key: "pipeline", label: "Pipeline", icon: "columns" },
  ];
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [thumb, setThumb] = useState({ x: 0, w: 0, ready: false });
  const measure = useCallback(() => {
    const el = refs.current[tab];
    if (el) setThumb({ x: el.offsetLeft, w: el.offsetWidth, ready: true });
  }, [tab]);
  useLayoutEffect(measure, [measure, counts.accounts, counts.approvals]);
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
  "discovery.run": "Discovery run",
  "lead.enriched": "Lead enriched",
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
        A run costs {COSTS["discovery.run"]}, enriching a lead {COSTS["lead.enriched"]}, a draft {COSTS["outreach.drafted"]}. Paid steps stop when this reaches zero.
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

export function App() {
  const { ws, refresh } = useWorkspace();
  const [tab, setTab] = useState<Tab>("brief");
  const [selected, setSelected] = useState<string | null>(null);
  const [pathFor, setPathFor] = useState<string | null>(null);
  const [busy, setBusy] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);
  const [intake, setIntake] = useState(false);
  const [pop, setPop] = useState<"credits" | "connections" | null>(null);
  const [graphOpen, setGraphOpen] = useState(true);
  const picked = useRef(false);
  const hadLeads = useRef(false);

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

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  // Follow the run: once the first accounts exist, show them (unless the user chose a tab).
  const leadCount = ws?.leads.length || 0;
  useEffect(() => {
    if (leadCount > 0 && !hadLeads.current && !picked.current) setTab("accounts");
    hadLeads.current = leadCount > 0;
  }, [leadCount]);

  const choose = (t: Tab) => {
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
            setIntake(false);
            setTab("brief");
            setSelected(null);
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
  const pick = (id: string) => {
    const lead: Lead | undefined = ws.leads.find((l) => l.id === id) || ws.leads.find((l) => l.contacts.some((c) => c.id === id));
    if (!lead) return;
    setSelected(lead.id);
    if (lead.warmPaths.length) setPathFor(lead.id);
  };
  const credits = ws.credits.balance;

  return (
    <div className="field h-screen flex flex-col overflow-hidden">
      <header className="flex items-center gap-4 px-6 pt-5 pb-3 flex-none">
        <div className="flex items-center gap-2.5">
          <Logo size={38} />
          <div className="text-[24px] font-extrabold tracking-tight leading-none">{APP_NAME}</div>
        </div>
        <Tabs tab={tab} onChange={choose} counts={{ brief: null, accounts: ws.leads.filter((l) => l.status === "active").length, approvals: drafts, pipeline: null }} />
        <span className="flex-1" />
        {running ? (
          <span className="tag !py-1.5 !px-3.5 !text-[13.5px]">
            <span className="lamp busy" />
            {ws.run.step}
          </span>
        ) : ws.run.status === "error" ? (
          <span className="chip chip-flag !py-1.5 !px-3 max-w-[340px] truncate" title={ws.run.error || ""}>
            <Icon name="flag" size={14} />
            <span className="truncate">{ws.run.error}</span>
          </span>
        ) : null}
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
        <button className="btn" disabled={running} onClick={() => setIntake(true)} title="Describe a product and run again">
          New brief
        </button>
      </header>

      <main className="flex-1 min-h-0 flex gap-4 px-6 pb-6">
        {/* Kept mounted when hidden, so the layout of the graph is not thrown away. */}
        {(
          <section className={`relative flex-col gap-3 min-w-0 ${graphOpen ? "flex" : "hidden"}`} style={{ flex: "0 0 41%" }}>
            <div className="relative flex-1 min-h-0">
              <div className="dots absolute inset-0 pointer-events-none" />
              {/* The graph stops short of the bottom line, which is kept for the readout. */}
              <div className="absolute inset-x-0 top-0 bottom-6">
                <GraphView nodes={ws.graph.nodes} edges={ws.graph.edges} leads={ws.leads} highlight={highlight} onPick={pick} />
              </div>
              <div className={`absolute left-0 top-0 gap-1.5 flex-wrap pointer-events-none ${pathLead ? "hidden" : "flex"}`}>
                <span className="frost chip">
                  <i className="w-2.5 h-2.5 rounded-full inline-block" style={{ boxShadow: "inset 0 0 0 2px #F2F2F2" }} />
                  Account
                </span>
                <span className="frost chip">
                  <i className="w-2 h-2 rounded-full inline-block" style={{ background: "#C4C4C4" }} />
                  Person
                </span>
                <span className="frost chip">
                  <i className="w-2 h-2 bg-signal inline-block rotate-45" />
                  Buying signal
                </span>
                <span className="frost chip">
                  <i className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: "#2B2B2B", boxShadow: "inset 0 0 0 1.5px #7A7A7A" }} />
                  Competitor
                </span>
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
                <div className="absolute left-0 bottom-0 num text-[11.5px] text-faint pointer-events-none flex gap-4">
                  <span>{ws.graph.nodes.length} nodes</span>
                  <span>{ws.graph.edges.length} edges</span>
                  <span>{ws.modes.graph === "neo4j" ? "neo4j" : "embedded graph"}</span>
                </div>
              )}
            </div>
            <div className="flex-none flex flex-col min-h-0" style={{ maxHeight: "40%" }}>
              <Feed activity={ws.activity} running={running} visible={graphOpen} />
            </div>
          </section>
        )}

        <section className="sheet flex-1 min-w-0 flex flex-col overflow-hidden">
          <div className="flex items-center gap-3 px-7 pt-5 pb-3 flex-none">
            <div className="min-w-0 flex-1">
              <div className="label">Selling</div>
              <div className="font-extrabold text-[19px] leading-tight truncate">{ws.product.name}</div>
            </div>
            <button className="btn btn-plain" onClick={() => setGraphOpen(!graphOpen)}>
              <Icon name="graph" />
              {graphOpen ? "Hide graph" : "Show graph"}
            </button>
          </div>
          <div className="scroll flex-1 min-h-0 px-7 pb-7">
            {tab === "brief" && <BriefTab ws={ws} act={act} busy={busy} />}
            {tab === "accounts" && <AccountsTab ws={ws} act={act} busy={busy} onOpen={setSelected} />}
            {tab === "approvals" && <ApprovalsTab ws={ws} act={act} busy={busy} />}
            {tab === "pipeline" && <PipelineTab ws={ws} act={act} busy={busy} />}
          </div>
        </section>
      </main>

      <LeadSheet
        lead={ws.leads.find((l) => l.id === selected) || null}
        ws={ws}
        act={act}
        busy={busy}
        onClose={() => setSelected(null)}
        onShowPath={(lead) => {
          setPathFor(lead.id);
          setGraphOpen(true);
          setSelected(null);
        }}
      />

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

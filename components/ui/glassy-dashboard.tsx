"use client";

/* The workspace dashboard at /home. Ported from a 21st.dev glass dashboard and changed in the
   ways this repo needs: the palette is black, white and grey rather than sepia, the backdrop is
   served from /public so it still draws with no network, and — the part that matters — every
   figure on it comes from lib/dashboard.ts, which reads the real workspace. The component it
   started from shipped invented revenue, orders, visitors and refunds; a surface that makes up
   its own numbers would undo the one claim this product makes, so those panels are gone rather
   than filled with something plausible. */
import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { ArrowDownToLine, ArrowRight, ArrowUpRight, BarChart3, Bell, Coins, BriefcaseBusiness, ChevronRight, Clock3, Filter, LayoutDashboard, ListChecks, Moon, Search, ShieldCheck, Sun, TrendingUp, TriangleAlert, Users, X, Zap } from "lucide-react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { useActions, useWorkspace } from "@/lib/client";
import { Connections, CreditsPanel, dataLabel } from "@/components/panels";
import { Intake } from "@/components/Intake";
import { BriefTab } from "@/components/BriefTab";
import { ApprovalsTab } from "@/components/ApprovalsTab";
import { PipelineTab } from "@/components/PipelineTab";
import { Profile } from "@/components/Profile";
import { bestNext, ranked, viewOf } from "@/components/leads";
import { useFlows } from "@/components/flows";
import type { Net } from "@/lib/graph/nets";
import type { Lead } from "@/lib/types";
import { derive, type Derived, type LaneItem } from "@/lib/dashboard";
import { DashboardGraph } from "./dashboard-graph";
import { DashboardLeads } from "./dashboard-leads";
import { dashboardStyles } from "./glassy-dashboard.css";

gsap.registerPlugin(useGSAP);

const periods = ["7 days", "30 days", "90 days"] as const;
type Period = (typeof periods)[number];
const windowOf: Record<Period, number> = { "7 days": 7, "30 days": 30, "90 days": 90 };

const number = new Intl.NumberFormat("en-US");
type CountFormat = "number" | "percent";
const formatCount: Record<CountFormat, (value: number) => string> = {
  number: (v) => number.format(Math.round(v)),
  percent: (v) => `${v.toFixed(1)}%`,
};

type ChartTone = "coral" | "ink" | "teal" | "ochre";

function Counter({ value, format = "number" }: { value: number; format?: CountFormat }) {
  const text = formatCount[format](value);
  return (
    <>
      <span data-gd-count={value} data-format={format} aria-hidden="true">
        {text}
      </span>
      <span className="gd-sr">{text}</span>
    </>
  );
}

function Legend({ entries }: { entries: { label: string; tone: ChartTone }[] }) {
  return (
    <div className="gd-legend">
      {entries.map(({ label, tone }) => (
        <span key={label}>
          <i data-tone={tone} aria-hidden="true" />
          {label}
        </span>
      ))}
    </div>
  );
}

type Stack = { label: string; lower: number; upper: number };

function StackChart({ items, labels, tones, title }: { items: Stack[]; labels: [string, string]; tones: [ChartTone, ChartTone]; title: string }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(1, ...items.map((i) => i.lower + i.upper)) * 1.11;
  const selected = active === null ? undefined : items[active];
  if (items.length === 0) return <p className="gd-empty">Nothing recorded in this window yet.</p>;
  return (
    <figure className="gd-stack" aria-label={title}>
      <div className="gd-stack-meta">
        <Legend entries={labels.map((label, i) => ({ label, tone: tones[i] }))} />
        {selected && (
          <span className="gd-chart-readout">
            {selected.label} · {number.format(selected.lower + selected.upper)}
          </span>
        )}
      </div>
      <div className="gd-stack-plot" style={{ "--gd-series-count": items.length } as CSSProperties} onMouseLeave={() => setActive(null)}>
        {items.map((item, index) => (
          <button
            type="button"
            className="gd-stack-column"
            key={item.label + index}
            aria-label={`${item.label}: ${item.lower} ${labels[0]}, ${item.upper} ${labels[1]}`}
            aria-pressed={active === index}
            onFocus={() => setActive(index)}
            onBlur={() => setActive(null)}
            onMouseEnter={() => setActive(index)}
            onClick={() => setActive(index)}
          >
            <span className="gd-stack-track" aria-hidden="true">
              <span className="gd-stack-bar" style={{ height: `${((item.lower + item.upper) / max) * 100}%` }}>
                <i data-tone={tones[1]} style={{ flexGrow: item.upper }} />
                <i data-tone={tones[0]} style={{ flexGrow: item.lower }} />
              </span>
            </span>
            <span className="gd-stack-label" aria-hidden="true">{item.label}</span>
          </button>
        ))}
      </div>
    </figure>
  );
}

type Point = [number, number];
const curve = (points: Point[]) =>
  points.reduce((path, [x, y], i) => {
    if (i === 0) return `M ${x} ${y}`;
    const [px, py] = points[i - 1];
    const mid = (x + px) / 2;
    return `${path} C ${mid} ${py}, ${mid} ${y}, ${x} ${y}`;
  }, "");

function SpendChart({ items }: { items: Stack[] }) {
  const fillId = `gd-fill-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [active, setActive] = useState<number | null>(null);
  const h = 204;
  const w = 600;
  if (items.length < 2) return <p className="gd-empty">Two days of spend are needed to draw a line. Run a search first.</p>;
  const finding = items.map((i) => i.lower);
  const writing = items.map((i) => i.upper);
  const max = Math.max(1, ...finding, ...writing) * 1.2;
  const pts = (vals: number[]): Point[] => vals.map((v, i) => [(i * w) / Math.max(1, vals.length - 1), h - (v / max) * h]);
  const a = pts(finding);
  const b = pts(writing);
  const line = curve(a);
  const ticks = [max, max * 0.75, max * 0.5, max * 0.25, 0];
  const pa = active === null ? undefined : a[active];
  const pb = active === null ? undefined : b[active];
  return (
    <figure className="gd-revenue-chart" aria-label="Credits spent by day">
      <div className="gd-revenue-main">
        <div className="gd-chart-y" aria-hidden="true">
          {ticks.map((v) => (
            <span key={v}>{Math.round(v)}</span>
          ))}
        </div>
        <div className="gd-line-plot" onMouseLeave={() => setActive(null)}>
          <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id={fillId} x1="0" x2="0" y1="0" y2="1" gradientUnits="objectBoundingBox">
                <stop offset="0" stopColor="var(--gd-coral)" stopOpacity=".28" />
                <stop offset="1" stopColor="var(--gd-coral)" stopOpacity=".02" />
              </linearGradient>
            </defs>
            {ticks.map((t, i) => (
              <line className="gd-grid-line" key={t} x1="0" x2={w} y1={(h * i) / 4} y2={(h * i) / 4} />
            ))}
            <g className="gd-line-reveal">
              <path d={`${line} L ${w} ${h} H 0 Z`} fill={`url(#${fillId})`} />
              <path className="gd-chart-path" data-tone="coral" d={line} />
              <path className="gd-chart-path" data-tone="ink" d={curve(b)} />
            </g>
            {pa && pb && (
              <g>
                <line className="gd-line-cursor" x1={pa[0]} x2={pa[0]} y1="0" y2={h} />
                <circle cx={pa[0]} cy={pa[1]} r="4" fill="var(--gd-coral)" />
                <circle cx={pb[0]} cy={pb[1]} r="4" fill="var(--gd-graph-ink)" />
              </g>
            )}
          </svg>
          <div className="gd-chart-zones">
            {items.map((item, i) => (
              <button
                type="button"
                key={item.label + i}
                aria-label={`${item.label}: ${item.lower} credits finding, ${item.upper} credits writing`}
                aria-pressed={active === i}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
                onMouseEnter={() => setActive(i)}
                onClick={() => setActive(i)}
              />
            ))}
          </div>
          {active !== null && (
            <div className="gd-line-tooltip" style={{ "--gd-tooltip-x": `${(active / (items.length - 1)) * 100}%` } as CSSProperties}>
              <strong>{items[active].label}</strong>
              <span>
                Finding <b>{items[active].lower}</b>
              </span>
              <span>
                Writing <b>{items[active].upper}</b>
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="gd-chart-axis" aria-hidden="true">
        {items.map((i, n) => (
          <span key={i.label + n}>{i.label}</span>
        ))}
      </div>
    </figure>
  );
}

const sliceTones: ChartTone[] = ["coral", "ink", "teal", "ochre"];

function MixChart({ slices, total, caption }: { slices: { label: string; value: number }[]; total: number; caption: string }) {
  const maskId = `gd-ring-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [active, setActive] = useState<number | null>(null);
  const sum = slices.reduce((n, s) => n + s.value, 0);
  if (sum === 0) return <p className="gd-empty">No buying signals found yet.</p>;
  const top = slices.slice(0, 4);
  const pct = top.map((s) => (s.value / sum) * 100);
  return (
    <div className="gd-device" aria-label={caption}>
      <div className="gd-device-ring">
        <svg viewBox="0 0 124 124" aria-hidden="true">
          <defs>
            <mask id={maskId}>
              <circle className="gd-donut-draw" cx="62" cy="62" r="47" fill="none" stroke="white" strokeWidth="15" pathLength="100" strokeDasharray="100 0" transform="rotate(-90 62 62)" />
            </mask>
          </defs>
          <circle cx="62" cy="62" r="47" fill="none" stroke="var(--gd-track)" strokeWidth="14" />
          <g mask={`url(#${maskId})`} transform="rotate(-90 62 62)">
            {pct.map((ratio, i) => (
              <circle
                key={top[i].label}
                cx="62"
                cy="62"
                r="47"
                pathLength="100"
                fill="none"
                strokeWidth="14"
                data-tone={sliceTones[i]}
                className="gd-device-segment"
                data-muted={active !== null && i !== active}
                strokeDasharray={`${Math.max(0, ratio - 1.1)} 100`}
                strokeDashoffset={-pct.slice(0, i).reduce((n, v) => n + v, 0)}
              />
            ))}
          </g>
        </svg>
        <div className="gd-device-total">
          <strong>{active === null ? <Counter value={total} /> : number.format(top[active].value)}</strong>
          <span>{active === null ? caption : top[active].label}</span>
        </div>
      </div>
      <div className="gd-device-list">
        {top.map((s, i) => (
          <button type="button" key={s.label} aria-pressed={active === i} aria-label={`${s.label}, ${s.value}`} onClick={() => setActive(active === i ? null : i)}>
            <span>
              <i data-tone={sliceTones[i]} aria-hidden="true" />
              {s.label}
            </span>
            <span className="gd-mix-track" aria-hidden="true">
              <i className="gd-fill" data-tone={sliceTones[i]} style={{ width: `${pct[i]}%` }} />
            </span>
            <strong>{s.value}</strong>
          </button>
        ))}
      </div>
    </div>
  );
}

function Panel({ title, subtitle, action, className = "", children }: { title: string; subtitle?: string; action?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={`gd-panel ${className}`} data-gd-enter>
      <header className="gd-panel-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function Metric({ title, icon, value, format, detail, tone }: { title: string; icon: ReactNode; value: number; format?: CountFormat; detail?: string; tone?: "teal" | "coral" }) {
  return (
    <article className="gd-metric" data-tone={tone} data-gd-enter>
      <div className="gd-metric-head">
        <span>{title}</span>
        <span className="gd-metric-icon" aria-hidden="true">{icon}</span>
      </div>
      <strong className="gd-metric-value">
        <Counter value={value} format={format} />
      </strong>
      <div className="gd-metric-caption">
        <span>{detail ?? ""}</span>
      </div>
    </article>
  );
}

function ActivityPanel({ d }: { d: Derived }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Everything");
  const kinds = ["Everything", ...new Set(d.activity.map((a) => a.status))];
  const show = d.activity.filter(
    (a) => [a.event, a.source, a.status].join(" ").toLowerCase().includes(query.trim().toLowerCase()) && (status === "Everything" || a.status === status),
  );
  return (
    <Panel
      title="What the agents did"
      className="gd-activity"
      action={
        <div className="gd-table-tools">
          <label className="gd-search">
            <Search aria-hidden="true" />
            <input type="search" placeholder="Search the feed" aria-label="Search the feed" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <label className="gd-filter">
            <Filter aria-hidden="true" />
            <select aria-label="Filter the feed" value={status} onChange={(e) => setStatus(e.target.value)}>
              {kinds.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>
          </label>
        </div>
      }
    >
      <div className="gd-table-scroll">
        <table>
          <thead>
            <tr>
              <th scope="col">What happened</th>
              <th scope="col">Agent</th>
              <th scope="col">Kind</th>
              <th scope="col">Time</th>
            </tr>
          </thead>
          <tbody>
            {show.map((a) => (
              <tr key={a.id}>
                <td className="gd-cell-wide">{a.event}</td>
                <td>{a.source}</td>
                <td>
                  <span className="gd-status" data-state={a.status === "Error" || a.status === "Stopped" ? "coral" : a.status === "Said" ? "teal" : "ink"}>
                    <i aria-hidden="true" />
                    {a.status}
                  </span>
                </td>
                <td>{a.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {show.length === 0 && <p className="gd-empty" role="status">Nothing matches.</p>}
    </Panel>
  );
}

/* The page carries the app's four sections, under the app's own names and in the app's order:
   who to aim at, who was found, what to approve, what happened next. A dashboard whose nav said
   something different from the product it reports on would be a second vocabulary to learn. */
type View = "target" | "leads" | "approve" | "pipeline";

function CommandView({ d, open }: { d: Derived; open: (v: View) => void }) {
  return (
    <div className="gd-command-grid">
      <Panel title="Accounts scored" className="gd-balance" action={<span className="gd-unit">{d.productName}</span>}>
        <div className="gd-balance-number">
          <Counter value={d.leads} />
        </div>
        <div className="gd-balance-change">
          <span>{d.waiting} waiting for your approval · nothing is sent until you approve it</span>
        </div>
        <div className="gd-balance-actions">
          <button type="button" className="gd-primary" onClick={() => open("leads")}>
            The leads <ArrowUpRight aria-hidden="true" />
          </button>
          <button type="button" className="gd-secondary" onClick={() => open("leads")}>
            Why now <ArrowRight aria-hidden="true" />
          </button>
        </div>
        <div className="gd-streams" aria-label="Accounts by tier">
          <div><span>Tier A</span><strong>{d.tiers.a}</strong></div>
          <div><span>Tier B</span><strong>{d.tiers.b}</strong></div>
          <div><span>Tier C</span><strong>{d.tiers.c}</strong></div>
        </div>
      </Panel>
      <div className="gd-summary">
        <Metric title="Waiting for you" icon={<ListChecks />} value={d.waiting} tone="teal" detail="drafts to approve" />
        <Metric title="People found" icon={<Users />} value={d.contacts} detail="named, with a source" />
        <Metric title="Quotes checked" icon={<ShieldCheck />} value={d.quotesVerified} detail="found on the page" />
        <Metric title="Quotes dropped" icon={<TriangleAlert />} value={d.quotesDropped} tone="coral" detail="could not be found" />
      </div>
      <Panel title="Who did the work" subtitle="Recorded moves, the agent against you" className="gd-command-chart">
        <StackChart items={d.work} labels={["Agent", "You"]} tones={["ink", "teal"]} title="Recorded moves by day" />
      </Panel>
      <div className="gd-command-side">
        <Panel title="Credits" className="gd-capacity">
          <div className="gd-capacity-track" role="meter" aria-label="Credits used" aria-valuenow={d.creditsSpent} aria-valuemin={0} aria-valuemax={Math.max(1, d.creditsStart)}>
            <span className="gd-fill" style={{ width: `${Math.min(100, (d.creditsSpent / Math.max(1, d.creditsStart)) * 100)}%` }} />
          </div>
          <div className="gd-capacity-label">
            <span><strong>{d.creditsSpent}</strong> spent</span>
            <span>{d.creditsLeft} left</span>
          </div>
        </Panel>
        <Panel title="Approvals" subtitle="Nothing is sent without you" className="gd-approvals">
          <div className="gd-approval-content">
            <span className="gd-list-icon"><ShieldCheck aria-hidden="true" /></span>
            <div>
              <strong>{d.waiting} to review</strong>
              <small>{d.sent} approved and recorded as sent</small>
            </div>
            <button type="button" className="gd-icon-button" aria-label="Open the drafts waiting" onClick={() => open("approve")}>
              <ArrowUpRight aria-hidden="true" />
            </button>
          </div>
        </Panel>
      </div>
      <ActivityPanel d={d} />
    </div>
  );
}

function SpendView({ d, download }: { d: Derived; download: () => void }) {
  return (
    <div className="gd-analytics">
      <div className="gd-metric-grid">
        <Metric title="Credits spent" icon={<Zap />} value={d.creditsSpent} tone="teal" detail={`${d.creditsLeft} left`} />
        <Metric title="Searches" icon={<Search />} value={d.searches} detail="pages fetched this run" />
        <Metric title="Model calls" icon={<BarChart3 />} value={d.llmCalls} detail="proposals to check" />
        <Metric title="Graph questions" icon={<TrendingUp />} value={d.graphQueries} detail="multi-hop queries run" />
      </div>
      <div className="gd-analytics-grid">
        <Panel title="Credits by day" subtitle="What was spent finding accounts, against what was spent writing" action={<Legend entries={[{ label: "Finding", tone: "coral" }, { label: "Writing", tone: "ink" }]} />}>
          <SpendChart items={d.spend} />
        </Panel>
        <Panel title="Why now" className="gd-device-panel">
          <MixChart slices={d.signalMix} total={d.signalMix.reduce((n, s) => n + s.value, 0)} caption="Signals" />
        </Panel>
      </div>
      <Panel title="Export" className="gd-statement">
        <div className="gd-approval-content">
          <span className="gd-list-icon"><Clock3 aria-hidden="true" /></span>
          <div>
            <strong>The credit ledger</strong>
            <small>Every metered action, as it was recorded</small>
          </div>
          <button type="button" className="gd-icon-button" aria-label="Download the ledger as CSV" onClick={download}>
            <ArrowDownToLine aria-hidden="true" />
          </button>
        </div>
      </Panel>
    </div>
  );
}

function SignalsView({ d }: { d: Derived }) {
  return (
    <div className="gd-analytics">
      <div className="gd-metric-grid">
        <Metric title="Accounts" icon={<BriefcaseBusiness />} value={d.leads} detail="each with a checked quote" />
        <Metric title="Job postings" icon={<ListChecks />} value={d.jobPosts} tone="teal" detail="found by the Hiring Radar" />
        <Metric title="People" icon={<Users />} value={d.contacts} detail="named at those accounts" />
        <Metric title="Quotes dropped" icon={<TriangleAlert />} value={d.quotesDropped} tone="coral" detail="not on the cited page" />
      </div>
      <div className="gd-analytics-grid">
        <Panel title="Accounts by segment" subtitle="Split by whether anything says they are buying">
          <StackChart items={d.segments} labels={["With a reason", "No reason yet"]} tones={["ink", "coral"]} title="Accounts per segment" />
        </Panel>
        <Panel title="Why now" className="gd-device-panel">
          <MixChart slices={d.signalMix} total={d.signalMix.reduce((n, s) => n + s.value, 0)} caption="Signals" />
        </Panel>
      </div>
      <ActivityPanel d={d} />
    </div>
  );
}

function BoardView({ d, inspect }: { d: Derived; inspect: (item: LaneItem, lane: string) => void }) {
  const [filter, setFilter] = useState("All lanes");
  const lanes = filter === "All lanes" ? d.lanes : d.lanes.filter((l) => l.label === filter);
  const toneOf: Record<string, ChartTone> = { waiting: "coral", ready: "teal", held: "ochre", out: "ink" };
  const iconOf: Record<string, ReactNode> = { waiting: <ListChecks />, ready: <Zap />, held: <Clock3 />, out: <TriangleAlert /> };
  return (
    <div className="gd-analytics">
      <div className="gd-metric-grid">
        <Metric title="Waiting for you" icon={<ListChecks />} value={d.waiting} tone="teal" detail="drafted and stopped" />
        <Metric title="A reason to write" icon={<Zap />} value={d.lanes.find((l) => l.key === "ready")?.items.length ?? 0} detail="scored, no draft yet" />
        <Metric title="On hold" icon={<Clock3 />} value={d.lanes.find((l) => l.key === "held")?.items.length ?? 0} detail="fit, but no signal" />
        <Metric title="Left out" icon={<TriangleAlert />} value={d.lanes.find((l) => l.key === "out")?.items.length ?? 0} tone="coral" detail="a bad sign" />
      </div>
      <Panel
        title="The board"
        subtitle="Every account the agents found, and what is holding each one."
        className="gd-board"
        action={
          <label className="gd-filter">
            <Filter aria-hidden="true" />
            <select aria-label="Filter lanes" value={filter} onChange={(e) => setFilter(e.target.value)}>
              {["All lanes", ...d.lanes.map((l) => l.label)].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </label>
        }
      >
        <div className="gd-lanes" data-filtered={filter !== "All lanes"}>
          {lanes.map((lane) => (
            <section className="gd-lane" key={lane.key} aria-label={lane.label}>
              <header>
                <i data-tone={toneOf[lane.key]} aria-hidden="true">{iconOf[lane.key]}</i>
                <h3>{lane.label}</h3>
                <span>{lane.items.length}</span>
              </header>
              {lane.items.map((item) => (
                <button className="gd-work-item" type="button" onClick={() => inspect(item, lane.label)} key={item.id}>
                  <span className="gd-work-titlerow"><strong>{item.name}</strong></span>
                  <span className="gd-work-detail">{item.detail}</span>
                  <span className="gd-work-meta">
                    <span>{item.meta}</span>
                    <span>{item.when}</span>
                  </span>
                </button>
              ))}
              {lane.items.length === 0 && <p className="gd-empty">Nothing here.</p>}
            </section>
          ))}
        </div>
      </Panel>
    </div>
  );
}

const views = [
  { id: "target", label: "Target", short: "Target", icon: LayoutDashboard, description: "Who should buy it, what the run cost, and what it found.", prompt: "Who should buy this?" },
  { id: "leads", label: "Leads", short: "Leads", icon: BriefcaseBusiness, description: "Who was found, best first, and how they all connect.", prompt: "Who should I write to first?" },
  { id: "approve", label: "Approve", short: "Approve", icon: ListChecks, description: "Drafts waiting for you. Nothing is sent until you approve it.", prompt: "What needs my approval?" },
  { id: "pipeline", label: "Pipeline", short: "Pipeline", icon: TrendingUp, description: "What happened after sending.", prompt: "What happened after sending?" },
] as const;

const routeOrder: View[] = views.map((v) => v.id);
const routeFromHash = (): View => {
  if (typeof location === "undefined") return "target";
  const id = location.hash.slice(1);
  return routeOrder.find((v) => v === id) ?? "target";
};

function saveCsv(filename: string, rows: (string | number)[][]) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

function Dock({ active, side = false, select }: { active: View; side?: boolean; select: (v: View) => void }) {
  const nav = useRef<HTMLElement>(null);
  const marker = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const container = nav.current;
    const indicator = marker.current;
    if (!container || !indicator) return;
    const adjust = () => {
      const current = container.querySelector<HTMLElement>('[aria-current="page"]');
      if (!current) return;
      indicator.style.width = `${current.offsetWidth}px`;
      indicator.style.height = `${current.offsetHeight}px`;
      indicator.style.transform = `translate(${current.offsetLeft}px, ${current.offsetTop}px)`;
      indicator.dataset.ready = "true";
    };
    const observer = new ResizeObserver(adjust);
    observer.observe(container);
    container.querySelectorAll("a").forEach((l) => observer.observe(l));
    adjust();
    return () => observer.disconnect();
  }, [active]);
  const onSelect = (event: MouseEvent<HTMLAnchorElement>, id: View) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    select(id);
  };
  return (
    <nav ref={nav} className={side ? "gd-dock gd-dock-side" : "gd-dock gd-dock-bottom"} aria-label={side ? "Workspace shortcuts" : "Workspace views"}>
      <span ref={marker} className="gd-dock-indicator" aria-hidden="true" />
      {views.map(({ id, label, short, icon: Icon }) => (
        <a href={`#${id}`} key={id} aria-label={label} aria-current={active === id ? "page" : undefined} onClick={(e) => onSelect(e, id)}>
          <Icon aria-hidden="true" />
          <span className="gd-dock-text" aria-hidden="true">{label}</span>
          <span className="gd-dock-short" aria-hidden="true">{short}</span>
          {side && <span className="gd-dock-tip" aria-hidden="true">{label}</span>}
        </a>
      ))}
    </nav>
  );
}

/** What a header chip opens. The panels inside are the app's own, so the wallet and the list of
    connections read the same on both pages; this only places them. */
function Pop({ open, onClose, width = 340, children }: { open: boolean; onClose: () => void; width?: number; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <>
      <div className="gd-pop-catch" onClick={onClose} />
      <div className="gd-pop" style={{ width }}>{children}</div>
    </>
  );
}

function Dialog({ title, children, close }: { title: string; children: ReactNode; close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const label = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    dialog?.querySelector("input")?.focus();
  }, []);
  return (
    <dialog className="gd-dialog" ref={ref} aria-labelledby={label} onClose={close} onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.close(); }}>
      <section className="gd-dialog-inner">
        <header>
          <h2 id={label}>{title}</h2>
          <button type="button" className="gd-icon-button" aria-label="Close" onClick={() => ref.current?.close()}>
            <X aria-hidden="true" />
          </button>
        </header>
        {children}
      </section>
    </dialog>
  );
}

function QuickActions({ select, close }: { select: (v: View) => void; close: () => void }) {
  const [query, setQuery] = useState("");
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const results = views.filter((v) => terms.every((t) => `${v.label} ${v.description} ${v.prompt}`.toLowerCase().includes(t)));
  return (
    <Dialog title="Find a view" close={close}>
      <label className="gd-search gd-command-input">
        <Search aria-hidden="true" />
        <input type="search" aria-label="Find a view" placeholder="Find a view" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>
      <div className="gd-quick-list">
        {results.map(({ label, id, description, icon: Icon }) => (
          <button key={id} type="button" onClick={() => { close(); select(id); }}>
            <Icon aria-hidden="true" />
            <div>
              <strong>{label}</strong>
              <small>{description}</small>
            </div>
            <ChevronRight aria-hidden="true" />
          </button>
        ))}
        {results.length === 0 && <p className="gd-empty" role="status">No matching view.</p>}
      </div>
    </Dialog>
  );
}

type Modal = "search" | "notices" | { item: LaneItem; lane: string } | null;

export interface GlassyDashboardProps {
  backgroundImage?: string;
  backgroundCredit?: { label: string; href: string };
  workspaceName?: string;
  panelFrost?: number;
  initialTheme?: "light" | "dark";
  appHref?: string;
}

export function GlassyDashboard({
  backgroundImage = "/bg/studio.jpg",
  backgroundCredit = { label: "Photo by GoodLifeConstruction", href: "https://unsplash.com/photos/e0oJLc5FYsg" },
  workspaceName = "Connet",
  panelFrost = 12,
  initialTheme = "light",
  appHref = "/",
}: GlassyDashboardProps = {}) {
  const { ws, offline: failed, refresh } = useWorkspace();
  const { act, busy, toast } = useActions(refresh);
  const [intake, setIntake] = useState(false);
  const [pop, setPop] = useState<"credits" | "stack" | null>(null);
  const [view, setView] = useState<View>("target");
  const [active, setActive] = useState<View>("target");
  const [period, setPeriod] = useState<Period>("7 days");
  const [theme, setTheme] = useState(initialTheme);
  const [modal, setModal] = useState<Modal>(null);
  const [readNotices, setReadNotices] = useState(false);
  /** The lead last clicked on the graph, named again in the list under it. */
  const [picked, setPicked] = useState<string | null>(null);
  /** The profile card the app opens on a lead, opened from here the same way. */
  const [card, setCard] = useState<{ lead: string; focus: string | null } | null>(null);
  /** Two nets over one graph, as in the app. The flows are routed along whichever is showing. */
  const [net, setNet] = useState<Net>("product");
  const { flows, begin, asked } = useFlows(ws, net);
  const root = useRef<HTMLDivElement>(null);
  const scrollArea = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const pending = useRef<View>(view);
  const exit = useRef<gsap.core.Tween | null>(null);
  const [reduced, setReduced] = useState(false);
  useGSAP({ scope: root });

  /* The app's components are re-skinned in this page's greys while it is mounted. It goes on
     <body> because Profile portals its dialog out of the page; see the gd-skin block. */
  useEffect(() => {
    document.body.classList.add("gd-skin");
    return () => document.body.classList.remove("gd-skin");
  }, []);

  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    update();
    return () => media.removeEventListener("change", update);
  }, []);

  const d = useMemo(() => derive(ws, windowOf[period]), [ws, period]);
  const open = useCallback((leadId: string, focus: string | null = null) => setCard({ lead: leadId, focus }), []);
  const drafting = useCallback(
    async (lead: Lead, force?: boolean) => {
      asked(lead.id);
      const began = performance.now();
      const stop = begin(lead, "draft");
      const ok = await act({ type: "draft", leadId: lead.id, force: force || lead.status === "held" }, `d:${lead.id}`);
      // Even an instant answer gets a moment of dots, so the click is seen to do something.
      stop?.(ok ? Math.max(performance.now(), began + 1600) : performance.now());
    },
    [act, begin, asked],
  );
  const source = ws ? dataLabel(ws) : null;
  const running = ws?.run.status === "running";

  const changeView = useCallback((next: View) => {
    if (pending.current === next) return;
    pending.current = next;
    setActive(next);
    exit.current?.kill();
    if (reduced || !content.current) { setView(next); return; }
    exit.current = gsap.to(content.current, { opacity: 0, filter: "blur(8px)", duration: 0.14, ease: "power1.in", onComplete: () => setView(next) });
  }, [reduced]);

  useEffect(() => () => {
    exit.current?.kill();
  }, []);

  const selectView = useCallback((next: View) => {
    if (location.hash !== `#${next}`) history.pushState(null, "", `#${next}`);
    changeView(next);
  }, [changeView]);

  useEffect(() => {
    const restore = () => changeView(routeFromHash());
    // Once, on mount: a link straight to #approve should land on it.
    restore();
    addEventListener("popstate", restore);
    addEventListener("hashchange", restore);
    return () => { removeEventListener("popstate", restore); removeEventListener("hashchange", restore); };
  }, [changeView]);

  useEffect(() => { scrollArea.current?.scrollTo({ top: 0 }); }, [view]);

  useGSAP(() => {
    const layer = content.current;
    if (!layer) return;
    const counts = layer.querySelectorAll<HTMLElement>("[data-gd-count]");
    gsap.set(layer, { clearProps: "opacity,filter" });
    if (reduced) {
      counts.forEach((el) => { el.textContent = formatCount[el.dataset.format as CountFormat](Number(el.dataset.gdCount)); });
      return;
    }
    const animate = gsap.timeline({ defaults: { ease: "power3.out" } });
    animate.fromTo(layer, { opacity: 0.55, filter: "blur(5px)" }, { opacity: 1, filter: "blur(0px)", clearProps: "opacity,filter", duration: 0.32 }, 0);
    animate.from("[data-gd-enter]", { y: 18, opacity: 0, stagger: 0.045, duration: 0.5, clearProps: "transform,opacity" }, 0.035);
    const bars = layer.querySelectorAll(".gd-stack-bar");
    const line = layer.querySelector(".gd-line-reveal");
    const ring = layer.querySelector(".gd-donut-draw");
    const meters = layer.querySelectorAll(".gd-fill");
    if (bars.length) animate.from(bars, { scaleY: 0, stagger: 0.034, duration: 0.46, clearProps: "transform" }, 0.17);
    if (line) animate.fromTo(line, { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 0.74, clearProps: "clipPath" }, 0.14);
    if (ring) animate.fromTo(ring, { attr: { "stroke-dasharray": "0 100" } }, { attr: { "stroke-dasharray": "100 0" }, duration: 0.76 }, 0.16);
    if (meters.length) animate.from(meters, { scaleX: 0, duration: 0.58, stagger: 0.045, clearProps: "transform" }, 0.18);
    counts.forEach((el, index) => {
      const value = Number(el.dataset.gdCount);
      const format = formatCount[el.dataset.format as CountFormat];
      const counter = { value: 0 };
      animate.to(counter, { value, duration: 0.75, onUpdate: () => { el.textContent = format(counter.value); } }, 0.09 + index * 0.02);
    });
  }, { scope: content, dependencies: [view, period, reduced, d.leads, d.waiting], revertOnUpdate: true });

  const current = views.find((v) => v.id === view)!;
  const close = () => setModal(null);
  const downloadLedger = () => {
    const rows: (string | number)[][] = [["When", "Event", "Credits", "What it was for", "Sent to Flexprice"]];
    for (const l of ws?.credits?.ledger || []) rows.push([l.at, l.event, l.credits, l.ref, l.synced]);
    saveCsv("connet-ledger.csv", rows);
  };

  return (
    <div className="gd-app" data-theme={theme} ref={root} style={{ "--gd-panel-frost": `${Math.max(0, Math.min(36, panelFrost))}px` } as CSSProperties}>
      <style>{dashboardStyles}</style>
      {/* eslint-disable-next-line @next/next/no-img-element -- a fixed, decorative backdrop; next/image would manage its layout, and this one must stay position:fixed */}
      <img className="gd-background" src={backgroundImage} alt="" aria-hidden="true" fetchPriority="high" />
      <div className="gd-surround">
        <header className="gd-top">
          <a className="gd-brand" href={appHref}>
            <span className="gd-logo" aria-hidden="true">
              <svg viewBox="0 0 40 40" fill="none">
                <path d="M25.3 12.6A9.8 9.8 0 1 0 25.3 27.4" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                <circle cx="28.5" cy="20" r="3.1" fill="currentColor" fillOpacity="0.72" />
              </svg>
            </span>
            <div>
              <strong>{workspaceName}</strong>
              <small>{d.started ? d.productName : "No workspace yet"}</small>
            </div>
          </a>
          <button type="button" className="gd-ask" aria-label="Find a view" onClick={() => setModal("search")}>
            <span className="gd-orb" aria-hidden="true" />
            <span className="gd-prompt" key={view}>{current.prompt}</span>
            <Search aria-hidden="true" className="gd-ask-search" />
          </button>
          <div className="gd-top-actions">
            {ws && (
              <div className="gd-chip-seat">
                <button type="button" className="gd-chip" aria-expanded={pop === "stack"} onClick={() => setPop(pop === "stack" ? null : "stack")}>
                  <span className="gd-live" data-live={source?.live ? "yes" : "no"} aria-hidden="true" />
                  {source?.label}
                </button>
                <Pop open={pop === "stack"} onClose={() => setPop(null)} width={392}><Connections ws={ws} /></Pop>
              </div>
            )}
            {ws && (
              <div className="gd-chip-seat">
                <button type="button" className="gd-chip" aria-expanded={pop === "credits"} onClick={() => setPop(pop === "credits" ? null : "credits")}>
                  <Coins aria-hidden="true" />
                  {ws.credits.balance} credits
                </button>
                <Pop open={pop === "credits"} onClose={() => setPop(null)} width={320}><CreditsPanel ws={ws} act={act} busy={busy} /></Pop>
              </div>
            )}
            <button type="button" className="gd-primary gd-new" disabled={running} onClick={() => setIntake(true)} title="Describe a product and search again">
              New search
            </button>
            <button type="button" className="gd-icon-button" aria-label={theme === "light" ? "Dark theme" : "Light theme"} onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
              {theme === "light" ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
            </button>
            <button type="button" className="gd-icon-button gd-notices" aria-label="Waiting for approval" onClick={() => { setReadNotices(true); setModal("notices"); }}>
              <Bell aria-hidden="true" />
              {!readNotices && d.waiting > 0 && <i aria-hidden="true" />}
            </button>
          </div>
        </header>

        <div className="gd-stage-wrap">
          <Dock active={active} side select={selectView} />
          <main className="gd-stage">
            <div className="gd-stage-scroll" ref={scrollArea}>
              <header className="gd-view-head">
                <div>
                  <h1>{current.label}</h1>
                  <p>{current.description}</p>
                </div>
                <div className="gd-view-actions">
                  {view === "target" && (
                    <div className="gd-period" role="group" aria-label="How far back">
                      {periods.map((p) => (
                        <button type="button" key={p} aria-pressed={p === period} onClick={() => setPeriod(p)}>{p}</button>
                      ))}
                    </div>
                  )}
                  {view === "target" && (
                    <button type="button" className="gd-primary gd-export" onClick={downloadLedger}>
                      <ArrowDownToLine aria-hidden="true" />Export ledger
                    </button>
                  )}
                </div>
              </header>
              {!d.started ? (
                <div className="gd-blank" role="status">
                  <h2>{failed ? "The workspace could not be read." : "Nothing to show yet."}</h2>
                  <p>{failed ? "Nothing answered at /api/state. The server has to be running for this page to read anything." : "Describe a product and run a search. Every figure here comes from that run — this page has no numbers of its own."}</p>
                  {!failed && (
                    <button type="button" className="gd-primary" onClick={() => setIntake(true)}>
                      New search <ArrowRight aria-hidden="true" />
                    </button>
                  )}
                </div>
              ) : /* The graph is pinned beside the work on every section, as it is in the app: it
                      is the picture the product is about, and scrolling the work should not lose it.
                      It sits outside the keyed content on purpose — keyed, it would be torn down and
                      rebuilt on every view change, restarting the layout and throwing away wherever
                      the reader had dragged it to. Only the work is re-keyed and re-animated. */
              ws ? (
                  <div className="gd-split">
                    <div className="gd-split-net">
                      <DashboardGraph ws={ws} theme={theme} picked={picked} onPick={setPicked} net={net} onNet={setNet} flows={flows} />
                    </div>
                    <div className="gd-content gd-split-work" ref={content} key={view} data-view={view}>
                        {view === "target" && (
                          <>
                            <CommandView d={d} open={selectView} />
                            <div className="gd-app-tab"><BriefTab ws={ws} act={act} busy={busy} /></div>
                            <SpendView d={d} download={downloadLedger} />
                            <SignalsView d={d} />
                          </>
                        )}
                        {view === "leads" && (
                          <>
                            <DashboardLeads ws={ws} picked={picked} onOpen={open} />
                            <BoardView d={d} inspect={(item, lane) => setModal({ item, lane })} />
                          </>
                        )}
                        {view === "approve" && <div className="gd-app-tab"><ApprovalsTab ws={ws} act={act} busy={busy} /></div>}
                        {view === "pipeline" && <div className="gd-app-tab"><PipelineTab ws={ws} act={act} busy={busy} onOpen={(id) => open(id)} /></div>}
                    </div>
                  </div>
              ) : null}
            </div>
          </main>
          <Dock active={active} select={selectView} />
        </div>
        {ws && (() => {
          const order = [...ranked(ws).map((v) => v.lead), ...ws.leads.filter((l) => l.status === "held"), ...ws.leads.filter((l) => l.status === "suppressed")];
          const lead = card ? order.find((l) => l.id === card.lead) || null : null;
          const at = lead ? order.indexOf(lead) : 0;
          return (
            <Profile
              view={lead ? viewOf(lead, ws) : null}
              focus={card?.focus || null}
              index={at}
              total={order.length}
              isBest={!!lead && bestNext(ws)?.lead.id === lead.id}
              ws={ws}
              act={act}
              busy={busy}
              onClose={() => setCard(null)}
              onStep={(by) => {
                if (order.length < 2) return;
                setCard({ lead: order[(at + by + order.length) % order.length].id, focus: null });
              }}
              onShowPath={() => setCard(null)}
              onDraft={drafting}
              onReview={() => {
                setCard(null);
                selectView("approve");
              }}
            />
          );
        })()}
        {/* Out to <body>, the way Profile's dialog goes: this page's rules are all scoped under
            .gd-app and would flatten the opening screen's own spacing. Out there it keeps its own
            layout and still picks up the grey tokens, which ride on <body>. */}
        {intake && ws && createPortal(
          <div className="gd-intake field">
            <Intake
              initial={ws.product}
              founder={ws.founder}
              sample={ws.modes.llm === "sample"}
              onBack={ws.product ? () => setIntake(false) : undefined}
              onStarted={() => {
                setIntake(false);
                void refresh();
              }}
            />
          </div>,
          document.body,
        )}
        {toast && <p className="gd-toast" role="status">{toast}</p>}
        <footer className="gd-footer">
          <span>Every figure on this page is read from the workspace.</span>
          {backgroundCredit && (
            <a href={backgroundCredit.href} target="_blank" rel="noreferrer">
              {backgroundCredit.label}
              <ArrowUpRight aria-hidden="true" />
            </a>
          )}
        </footer>
      </div>

      {modal === "search" && <QuickActions select={selectView} close={close} />}
      {modal === "notices" && (
        <Dialog title="Waiting for your approval" close={close}>
          <div className="gd-quick-list">
            {(d.lanes.find((l) => l.key === "waiting")?.items || []).map((item) => (
              <button type="button" key={item.id} onClick={() => { close(); selectView("approve"); }}>
                <Bell aria-hidden="true" />
                <div>
                  <strong>{item.name}</strong>
                  <small>{item.detail}</small>
                </div>
                <ArrowRight aria-hidden="true" />
              </button>
            ))}
            {d.waiting === 0 && <p className="gd-empty">Nothing is waiting.</p>}
          </div>
        </Dialog>
      )}
      {typeof modal === "object" && modal !== null && (
        <Dialog key={modal.item.id} title={modal.item.name} close={close}>
          <span className="gd-status"><i aria-hidden="true" />{modal.lane}</span>
          <p className="gd-work-dialog-description">{modal.item.detail}</p>
          <dl className="gd-work-facts">
            <div><dt>Account</dt><dd>{modal.item.meta}</dd></div>
            <div><dt>When</dt><dd>{modal.item.when || "—"}</dd></div>
            <div><dt>Reference</dt><dd>{modal.item.id}</dd></div>
          </dl>
          {(() => {
            // A lane item is a lead on three of the lanes and a message on the fourth, so the
            // account is read back from whichever it turns out to be.
            const lead = ws?.leads.find((l) => l.id === modal.item.id)?.id || ws?.messages.find((m) => m.id === modal.item.id)?.leadId || null;
            if (!lead) return null;
            return (
              <button type="button" className="gd-primary" onClick={() => { close(); open(lead); }}>
                Open this account <ArrowRight aria-hidden="true" />
              </button>
            );
          })()}
        </Dialog>
      )}
    </div>
  );
}

export default GlassyDashboard;

"use client";
// The knowledge graph, drawn live. Nodes appear as the agents find them, so a run can be
// watched. Drawn on a canvas with d3-force; the view fits itself to the graph.
import { forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY, type Simulation, type SimulationLinkDatum, type SimulationNodeDatum } from "d3-force";
import { useEffect, useRef, useState } from "react";
import type { GEdge, GNode, Lead } from "@/lib/types";

interface N extends SimulationNodeDatum {
  id: string;
  node: GNode;
  r: number;
  born: number;
}

interface L extends SimulationLinkDatum<N> {
  id: string;
  edge: GEdge;
}

export interface Highlight {
  nodes: Set<string>;
  edges: Set<string>; // "a|b" with the two node ids in either order
}

const DIST: Record<string, number> = {
  MATCHED_TO: 165,
  WORKS_AT: 58,
  ABOUT: 46,
  STUDIED_AT: 105,
  PREVIOUSLY_EMPLOYED_AT: 105,
  COMPETES_WITH: 130,
  USES: 120,
  CONTACTED_VIA: 200,
  REPLIED_TO: 200,
};

const WEAK = new Set(["CONTACTED_VIA", "REPLIED_TO", "USES"]);

const KIND: Record<string, string> = {
  Product: "The product",
  Company: "Account",
  Person: "Person",
  Signal: "Buying signal",
  Competitor: "Competitor",
  School: "School",
};

function radius(node: GNode, lead: Lead | undefined): number {
  switch (node.label) {
    case "Product":
      return 27;
    case "Company":
      return lead ? 12 + lead.score.total / 11 : 9;
    case "Person":
      return node.props.isFounder ? 9 : 6.5;
    case "Signal":
      return 6;
    case "Competitor":
      return 10;
    default:
      return 10;
  }
}

export function GraphView({
  nodes,
  edges,
  leads,
  highlight,
  onPick,
}: {
  nodes: GNode[];
  edges: GEdge[];
  leads: Lead[];
  highlight: Highlight | null;
  onPick: (nodeId: string) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const sim = useRef<Simulation<N, L> | null>(null);
  const data = useRef<{ nodes: N[]; links: L[]; byId: Map<string, N> }>({ nodes: [], links: [], byId: new Map() });
  const view = useRef({ k: 1, x: 0, y: 0, w: 0, h: 0 });
  const live = useRef({ highlight, leads: new Map<string, Lead>(), hover: null as string | null });
  const [tip, setTip] = useState<{ x: number; y: number; title: string; sub: string } | null>(null);

  // The page gets a fresh copy of the graph on every poll. Only a real change (a new node or
  // edge, a new score) should wake the layout, or the picture would never settle.
  const latest = useRef({ nodes, edges });
  const shape = nodes.map((n) => n.id).join(",") + "#" + edges.map((e) => e.id).join(",") + "#" + leads.map((l) => `${l.id}:${l.score.total}`).join(",");

  // What the drawing loop reads. Refreshed after every render, before the effects below run.
  useEffect(() => {
    live.current.highlight = highlight;
    live.current.leads = new Map(leads.map((l) => [l.id, l]));
    latest.current = { nodes, edges };
  });

  // Keep the simulation's nodes and links in step with the graph, without losing positions.
  useEffect(() => {
    const { nodes, edges } = latest.current;
    const d = data.current;
    const leadById = live.current.leads;
    const seen = new Set<string>();
    const neighbour = new Map<string, string>();
    for (const e of edges) {
      neighbour.set(e.from, e.to);
      neighbour.set(e.to, e.from);
    }
    for (const node of nodes) {
      seen.add(node.id);
      const old = d.byId.get(node.id);
      const r = radius(node, leadById.get(node.id));
      if (old) {
        old.node = node;
        old.r = r;
        continue;
      }
      const near = d.byId.get(neighbour.get(node.id) || "");
      const n: N = {
        id: node.id,
        node,
        r,
        born: performance.now(),
        x: (near?.x ?? 0) + (Math.random() - 0.5) * 60,
        y: (near?.y ?? 0) + (Math.random() - 0.5) * 60,
      };
      if (node.label === "Product") {
        n.fx = 0;
        n.fy = 0;
      }
      d.byId.set(node.id, n);
    }
    for (const id of [...d.byId.keys()]) if (!seen.has(id)) d.byId.delete(id);
    d.nodes = [...d.byId.values()];
    d.links = edges
      .filter((e) => d.byId.has(e.from) && d.byId.has(e.to))
      .map((e) => ({ id: e.id, edge: e, source: d.byId.get(e.from)!, target: d.byId.get(e.to)! }));

    if (!sim.current) {
      sim.current = forceSimulation<N, L>()
        .force("charge", forceManyBody<N>().strength((n) => (n.node.label === "Company" ? -420 : n.node.label === "Product" ? -700 : -150)))
        .force("x", forceX<N>(0).strength(0.035))
        .force("y", forceY<N>(0).strength(0.05))
        .force("collide", forceCollide<N>().radius((n) => n.r + (n.node.label === "Company" || n.node.label === "Competitor" ? 26 : 9)))
        .alphaDecay(0.028)
        .velocityDecay(0.36);
    }
    sim.current.nodes(d.nodes);
    sim.current.force(
      "link",
      forceLink<N, L>(d.links)
        .id((n) => n.id)
        .distance((l) => DIST[l.edge.type] ?? 90)
        .strength((l) => (WEAK.has(l.edge.type) ? 0.03 : l.edge.type === "MATCHED_TO" ? 0.25 : 0.7)),
    );
    sim.current.alpha(0.75).restart();
  }, [shape]);

  // The drawing loop.
  useEffect(() => {
    const el = canvas.current!;
    const ctx = el.getContext("2d")!;
    const font = getComputedStyle(document.body).fontFamily;
    let raf = 0;
    let dash = 0;

    const size = () => {
      const box = wrap.current!.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      el.width = Math.round(box.width * dpr);
      el.height = Math.round(box.height * dpr);
      el.style.width = `${box.width}px`;
      el.style.height = `${box.height}px`;
      view.current.w = box.width;
      view.current.h = box.height;
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(wrap.current!);

    const draw = () => {
      const d = data.current;
      const v = view.current;
      const dpr = el.width / Math.max(1, v.w);
      const hl = live.current.highlight;
      const hover = live.current.hover;
      dash = (dash + 0.6) % 1000;

      // Fit the view to the graph, easing towards the target so it never jumps.
      let x0 = -120, x1 = 120, y0 = -90, y1 = 90;
      for (const n of d.nodes) {
        if (n.x == null || n.y == null) continue;
        x0 = Math.min(x0, n.x - n.r - 60);
        x1 = Math.max(x1, n.x + n.r + 60);
        y0 = Math.min(y0, n.y - n.r - 22);
        y1 = Math.max(y1, n.y + n.r + 34);
      }
      const k = Math.min(1.5, Math.min(v.w / (x1 - x0), v.h / (y1 - y0)));
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      v.k += (k - v.k) * 0.08;
      v.x += (cx - v.x) * 0.08;
      v.y += (cy - v.y) * 0.08;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, v.w, v.h);
      ctx.translate(v.w / 2, v.h / 2);
      ctx.scale(v.k, v.k);
      ctx.translate(-v.x, -v.y);

      const isLit = (a: string, b: string) => !!hl && (hl.edges.has(`${a}|${b}`) || hl.edges.has(`${b}|${a}`));
      const dim = (id: string) => !!hl && !hl.nodes.has(id);

      // Edges.
      for (const l of d.links) {
        const a = l.source as N, b = l.target as N;
        if (a.x == null || b.x == null) continue;
        const lit = isLit(a.id, b.id);
        const type = l.edge.type;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y!);
        ctx.lineTo(b.x, b.y!);
        ctx.setLineDash([]);
        if (lit) {
          // The way in: a soft halo under the line, then a bright dashed line that runs along it.
          ctx.globalAlpha = 1;
          ctx.strokeStyle = "rgba(92,200,255,.2)";
          ctx.lineWidth = 9 / Math.sqrt(v.k);
          ctx.stroke();
          ctx.strokeStyle = "#E3F5FF";
          ctx.lineWidth = 2.6 / Math.sqrt(v.k);
          ctx.setLineDash([9, 7]);
          ctx.lineDashOffset = -dash;
          ctx.shadowColor = "rgba(92,200,255,.95)";
          ctx.shadowBlur = 14;
        } else if (type === "REPLIED_TO") {
          ctx.strokeStyle = "rgba(92,200,255,.95)";
          ctx.lineWidth = 2.2;
        } else if (type === "CONTACTED_VIA") {
          ctx.strokeStyle = "rgba(92,200,255,.6)";
          ctx.lineWidth = 1.4;
          ctx.setLineDash([4, 5]);
        } else if (type === "STUDIED_AT" || type === "PREVIOUSLY_EMPLOYED_AT") {
          ctx.strokeStyle = "rgba(255,255,255,.36)";
          ctx.lineWidth = 1.2;
          ctx.setLineDash([2, 5]);
        } else if (type === "USES" || type === "COMPETES_WITH") {
          ctx.strokeStyle = "rgba(255,255,255,.2)";
          ctx.lineWidth = 1.2;
        } else {
          ctx.strokeStyle = type === "MATCHED_TO" ? "rgba(255,255,255,.28)" : "rgba(255,255,255,.2)";
          ctx.lineWidth = type === "MATCHED_TO" ? 1.4 : 1.1;
        }
        ctx.globalAlpha = hl && !lit ? 0.3 : 1;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      ctx.setLineDash([]);

      // Nodes.
      const labels: { n: N; text: string; bold: boolean }[] = [];
      for (const n of d.nodes) {
        if (n.x == null || n.y == null) continue;
        const age = Math.max(0, Math.min(1, (performance.now() - n.born) / 420));
        const pop = age < 1 ? 1 - Math.pow(1 - age, 3) : 1;
        const r = Math.max(0.01, n.r * pop);
        const lead = live.current.leads.get(n.id);
        const off = lead?.status === "suppressed";
        ctx.globalAlpha = (dim(n.id) ? 0.3 : 1) * (off ? 0.55 : 1) * Math.min(1, age * 2);
        const { label } = n.node;
        ctx.beginPath();
        if (label === "Signal") {
          ctx.moveTo(n.x, n.y - r * 1.25);
          ctx.lineTo(n.x + r * 1.25, n.y);
          ctx.lineTo(n.x, n.y + r * 1.25);
          ctx.lineTo(n.x - r * 1.25, n.y);
          ctx.closePath();
          ctx.fillStyle = "#5CC8FF";
          ctx.fill();
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = "#000";
          ctx.stroke();
        } else if (label === "School") {
          const s = r * 0.9;
          ctx.roundRect(n.x - s, n.y - s, s * 2, s * 2, 4);
          ctx.fillStyle = "#0A0A0A";
          ctx.fill();
          ctx.lineWidth = 1.6;
          ctx.strokeStyle = "#B5B5B5";
          ctx.stroke();
        } else {
          ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
          if (label === "Product") {
            // The product is the one bright thing: a white disc with light around it.
            const halo = ctx.createRadialGradient(n.x, n.y, r * 0.7, n.x, n.y, r * 2.6);
            halo.addColorStop(0, "rgba(255,255,255,.3)");
            halo.addColorStop(1, "rgba(255,255,255,0)");
            ctx.beginPath();
            ctx.arc(n.x, n.y, r * 2.6, 0, Math.PI * 2);
            ctx.fillStyle = halo;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
            ctx.fillStyle = "#F2F2F2";
            ctx.fill();
          } else if (label === "Company") {
            // An account is a ring. The brighter the ring, the better the tier.
            const tier = lead?.score.tier;
            ctx.fillStyle = "#0A0A0A";
            ctx.fill();
            ctx.lineWidth = !lead ? 1.4 : tier === "A" ? 2.6 : tier === "B" ? 2 : 1.6;
            ctx.strokeStyle = !lead ? "#4A4A4A" : tier === "A" ? "#F2F2F2" : tier === "B" ? "#9E9E9E" : "#5C5C5C";
            if (off) ctx.setLineDash([3, 3]);
            ctx.stroke();
            ctx.setLineDash([]);
          } else if (label === "Competitor") {
            ctx.fillStyle = "#2B2B2B";
            ctx.fill();
            ctx.lineWidth = 1.6;
            ctx.strokeStyle = "#7A7A7A";
            ctx.stroke();
          } else {
            const founder = !!n.node.props.isFounder;
            if (founder) {
              ctx.shadowColor = "rgba(92,200,255,.9)";
              ctx.shadowBlur = 12;
            }
            ctx.fillStyle = founder ? "#5CC8FF" : "#C4C4C4";
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.lineWidth = 2;
            ctx.strokeStyle = "#000";
            ctx.stroke();
          }
        }
        if (hover === n.id) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 5, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255,255,255,.9)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        const named = label !== "Signal" && (label !== "Person" || n.node.props.isFounder || (hl && hl.nodes.has(n.id)) || hover === n.id);
        if (named && age > 0.5) labels.push({ n, text: label === "Company" && lead && lead.score.total ? n.node.name : n.node.name, bold: label === "Product" || !!lead });
      }

      // Labels, on a dark pill so the lines behind do not run through the letters.
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const { n, text, bold } of labels) {
        const px = Math.max(10.5, Math.min(13, 12 / Math.sqrt(v.k)));
        ctx.font = `${bold ? 700 : 550} ${px}px ${font}`;
        const short = text.length > 26 ? text.slice(0, 25) + "…" : text;
        const w = ctx.measureText(short).width + 12;
        // People are labelled above their dot, everything else below, so the two do not collide.
        const above = n.node.label === "Person" && !n.node.props.isFounder;
        const y = above ? n.y! - n.r - px * 0.95 - 2 : n.y! + n.r + px * 0.95 + 2;
        ctx.globalAlpha = dim(n.id) ? 0.3 : 1;
        ctx.fillStyle = "rgba(0,0,0,.74)";
        ctx.beginPath();
        ctx.roundRect(n.x! - w / 2, y - px * 0.78, w, px * 1.56, px * 0.78);
        ctx.fill();
        ctx.fillStyle = bold ? "#F2F2F2" : "#B8B8B8";
        ctx.fillText(short, n.x!, y + 0.5);
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  useEffect(() => () => void sim.current?.stop(), []);

  const at = (e: React.MouseEvent): N | null => {
    const box = canvas.current!.getBoundingClientRect();
    const v = view.current;
    const gx = (e.clientX - box.left - v.w / 2) / v.k + v.x;
    const gy = (e.clientY - box.top - v.h / 2) / v.k + v.y;
    let best: N | null = null;
    let bestD = Infinity;
    for (const n of data.current.nodes) {
      if (n.x == null || n.y == null) continue;
      const dist = Math.hypot(n.x - gx, n.y - gy) - n.r;
      if (dist < 9 / v.k && dist < bestD) {
        best = n;
        bestD = dist;
      }
    }
    return best;
  };

  const move = (e: React.MouseEvent) => {
    const n = at(e);
    live.current.hover = n?.id || null;
    canvas.current!.style.cursor = n && (n.node.label === "Company" || n.node.label === "Person") ? "pointer" : "default";
    if (!n) return setTip(null);
    const box = wrap.current!.getBoundingClientRect();
    const lead = live.current.leads.get(n.id);
    const p = n.node.props;
    const sub =
      n.node.label === "Company"
        ? lead
          ? `Tier ${lead.score.tier}, score ${lead.score.total}${lead.whyNow ? `. ${lead.whyNow}` : ""}`
          : "A past employer, not a target"
        : n.node.label === "Person"
          ? p.isFounder
            ? "The founder"
            : String(p.title || "")
          : n.node.label === "Signal"
            ? `${String(p.kind || "signal")}${p.date ? `, ${p.date}` : ""}`
            : n.node.label === "Competitor"
              ? String(p.category || "competitor")
              : "";
    setTip({ x: Math.min(e.clientX - box.left + 14, box.width - 250), y: e.clientY - box.top + 14, title: n.node.label === "Signal" ? n.node.name : `${n.node.name}`, sub: `${KIND[n.node.label]}${sub ? ": " + sub : ""}` });
  };

  return (
    <div ref={wrap} className="absolute inset-0">
      <canvas
        ref={canvas}
        onMouseMove={move}
        onMouseLeave={() => {
          live.current.hover = null;
          setTip(null);
        }}
        onClick={(e) => {
          const n = at(e);
          if (n) onPick(n.id);
        }}
        aria-label="Knowledge graph of accounts, people, signals and competitors"
        role="img"
      />
      {tip && (
        <div className="frost absolute pointer-events-none rounded-xl px-3 py-2 text-sm shadow-lg" style={{ left: tip.x, top: tip.y, maxWidth: 240, zIndex: 5 }}>
          <div className="font-bold leading-snug">{tip.title}</div>
          <div className="text-soft text-[13px] leading-snug">{tip.sub}</div>
        </div>
      )}
    </div>
  );
}

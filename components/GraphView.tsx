"use client";
// The knowledge graph, drawn live. Nodes appear as the agents find them, so a run can be
// watched. Drawn on a canvas with d3-force; the view fits itself to the graph.
//
// It is one graph shown as two nets (lib/graph/nets.ts). The product's net hangs everything
// off the product. Your net puts the founder in the middle and sets people on rings by how
// close they are: sharing a school or employer, one introduction away, or no way in yet.
// Switching keeps the nodes both nets share where they are and lets them drift to their new places.
import { forceCollide, forceLink, forceManyBody, forceRadial, forceSimulation, forceX, forceY, type Simulation, type SimulationLinkDatum, type SimulationNodeDatum } from "d3-force";
import { useEffect, useRef, useState } from "react";
import { FOUNDER, howYouKnow, netOf, ringOf, type Net, type Reach } from "@/lib/graph/nets";
import type { GEdge, GNode, Lead } from "@/lib/types";

interface N extends SimulationNodeDatum {
  id: string;
  node: GNode;
  r: number;
  born: number;
  /** Your net: how far from the founder this node is held. */
  orbit: number;
  /** Your net: 1 or 2 for the two inner rings, 0 for everything further out. */
  ring: 0 | 1 | 2;
  /** Where it is drawn: a little behind where the layout has put it (see GLIDE). */
  px?: number;
  py?: number;
  /** Where the layout has put it, kept aside while a frame is drawn. */
  sx?: number;
  sy?: number;
}

interface L extends SimulationLinkDatum<N> {
  id: string;
  edge: GEdge;
}

export interface Highlight {
  nodes: Set<string>;
  edges: Set<string>; // "a|b" with the two node ids in either order
}

/** A message on its way: small dots run along `path` (node ids, the sender first) from `start`
    until `end`. "draft" is a message being written; "send" is one the rep has just approved. */
export interface Flow {
  id: number;
  path: string[];
  start: number; // performance.now()
  end: number | null; // null while the work is still going
  tone: "draft" | "send";
}

// Each frame a node is drawn this much of the way from where it was drawn to where the layout
// has put it. The layout answers a change of net at once; this turns the jump into a glide.
const GLIDE = 0.085;

const DOT_SPEED = 185; // graph units a second
const DOT_GAP = 115; // milliseconds between dots

// Your net: how far from the founder each ring lies, and what standing on it means.
// The outside ring holds only small unnamed dots, so it sits close and the two that matter get the room.
const RINGS: { at: number; ring: 0 | 1 | 2; means: string }[] = [
  { at: 125, ring: 1, means: "same school or employer" },
  { at: 218, ring: 2, means: "one introduction away" },
  { at: 288, ring: 0, means: "no way in yet" },
];
const ringAt = (k: number) => (k <= 0 ? 0 : RINGS[Math.min(k, 3) - 1].at);

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
  Company: "Company",
  Person: "Person",
  Signal: "Reason to write now",
  Competitor: "Competitor",
  School: "School",
};

function radius(node: GNode, lead: Lead | undefined, net: Net, ring: 0 | 1 | 2): number {
  switch (node.label) {
    case "Product":
      return 27;
    case "Company":
      return lead ? 12 + lead.score.total / 11 : 9;
    case "Person":
      if (node.props.isFounder) return net === "you" ? 21 : 9;
      return net === "you" && ring === 1 ? 7.5 : 6.5;
    case "Signal":
      return 6;
    case "Competitor":
      return 10;
    default:
      return 10;
  }
}

/** Your net: where a node is held. People stand on a ring; the school or company between two
    people sits between their rings. */
function orbitOf(node: GNode, r: Reach | undefined): number {
  if (node.props.isFounder) return 0;
  if (node.label === "Person") return ringAt(ringOf(r) || 3);
  if (!r) return ringAt(3); // with its people, on the outside ring
  return (ringAt(r.degree) + ringAt(r.degree + 1)) / 2;
}

export function GraphView({
  nodes,
  edges,
  leads,
  net,
  reach,
  highlight,
  flows,
  waiting,
  best,
  onPick,
}: {
  nodes: GNode[];
  edges: GEdge[];
  leads: Lead[];
  /** Which of the two nets to show. */
  net: Net;
  /** How far everything is from the founder (lib/graph/nets.ts). */
  reach: Map<string, Reach>;
  highlight: Highlight | null;
  /** Messages in motion right now. */
  flows: Flow[];
  /** People (or companies, when nobody is named) with a draft waiting for the rep's approval. */
  waiting: Set<string>;
  /** The lead to contact first. */
  best: string | null;
  onPick: (nodeId: string) => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const sim = useRef<Simulation<N, L> | null>(null);
  const data = useRef<{ nodes: N[]; links: L[]; byId: Map<string, N> }>({ nodes: [], links: [], byId: new Map() });
  const view = useRef({ k: 1, x: 0, y: 0, w: 0, h: 0 });
  const live = useRef({ highlight, leads: new Map<string, Lead>(), hover: null as string | null, flows, waiting, best, net, reach, turned: 0, shownNet: net });
  const [tip, setTip] = useState<{ x: number; y: number; title: string; sub: string } | null>(null);

  // The page gets a fresh copy of the graph on every poll. Only a real change (a new node or
  // edge, a new score, the other net) should wake the layout, or the picture would never settle.
  const latest = useRef({ nodes, edges });
  const shape = net + "#" + nodes.map((n) => n.id).join(",") + "#" + edges.map((e) => e.id).join(",") + "#" + leads.map((l) => `${l.id}:${l.score.total}`).join(",");

  // What the drawing loop reads. Refreshed after every render, before the effects below run.
  useEffect(() => {
    live.current.highlight = highlight;
    live.current.flows = flows;
    live.current.waiting = waiting;
    live.current.best = best;
    live.current.net = net;
    live.current.reach = reach;
    live.current.leads = new Map(leads.map((l) => [l.id, l]));
    latest.current = { nodes, edges };
  });

  // Keep the simulation's nodes and links in step with the net on show, without losing positions.
  useEffect(() => {
    const net = live.current.net;
    const reach = live.current.reach;
    const { nodes, edges } = netOf(latest.current, net);
    const d = data.current;
    const leadById = live.current.leads;
    const seen = new Set<string>();
    const neighbour = new Map<string, string>();
    for (const e of edges) {
      neighbour.set(e.from, e.to);
      neighbour.set(e.to, e.from);
    }
    const centre = net === "you" ? FOUNDER : "product";
    for (const node of nodes) {
      seen.add(node.id);
      const old = d.byId.get(node.id);
      const ring = ringOf(reach.get(node.id));
      const r = radius(node, leadById.get(node.id), net, ring);
      const orbit = orbitOf(node, reach.get(node.id));
      if (old) {
        old.node = node;
        old.r = r;
        old.ring = ring;
        old.orbit = orbit;
        continue;
      }
      const near = d.byId.get(neighbour.get(node.id) || "");
      const n: N = {
        id: node.id,
        node,
        r,
        ring,
        orbit,
        born: performance.now(),
        x: (near?.x ?? 0) + (Math.random() - 0.5) * 60,
        y: (near?.y ?? 0) + (Math.random() - 0.5) * 60,
      };
      d.byId.set(node.id, n);
    }
    for (const id of [...d.byId.keys()]) if (!seen.has(id)) d.byId.delete(id);
    // Whoever the net is about is held in the middle.
    for (const n of d.byId.values()) {
      if (n.id === centre) {
        n.fx = 0;
        n.fy = 0;
      } else {
        n.fx = null;
        n.fy = null;
      }
    }
    d.nodes = [...d.byId.values()];
    d.links = edges
      .filter((e) => d.byId.has(e.from) && d.byId.has(e.to))
      .map((e) => ({ id: e.id, edge: e, source: d.byId.get(e.from)!, target: d.byId.get(e.to)! }));

    if (!sim.current) sim.current = forceSimulation<N, L>().alphaDecay(0.028).velocityDecay(0.36);
    const s = sim.current;
    s.nodes(d.nodes);
    // In your net the people within reach carry their names, so they are given the room for one.
    s.force("collide", forceCollide<N>().radius((n) => n.r + (n.node.label === "Company" || n.node.label === "Competitor" ? (net === "you" ? 34 : 26) : n.node.label === "School" ? 20 : net === "you" && n.ring !== 0 ? 30 : 9)));
    if (net === "you") {
      // Rings do the placing; the ties only keep people on the same side as the places they share.
      s.force("charge", forceManyBody<N>().strength((n) => (n.id === FOUNDER ? -420 : n.node.label === "Person" ? (n.ring === 0 ? -60 : -300) : -380)));
      s.force("x", null);
      s.force("y", null);
      s.force("radial", forceRadial<N>((n) => n.orbit, 0, 0).strength((n) => (n.id === FOUNDER ? 0 : 0.62)));
      s.force(
        "link",
        forceLink<N, L>(d.links)
          .id((n) => n.id)
          .distance((l) => (l.edge.type === "WORKS_AT" ? 62 : 80))
          .strength((l) => (l.edge.type === "WORKS_AT" ? 0.18 : WEAK.has(l.edge.type) ? 0.01 : 0.05)),
      );
    } else {
      s.force("charge", forceManyBody<N>().strength((n) => (n.node.label === "Company" ? -420 : n.node.label === "Product" ? -700 : -150)));
      s.force("x", forceX<N>(0).strength(0.035));
      s.force("y", forceY<N>(0).strength(0.05));
      s.force("radial", null);
      s.force(
        "link",
        forceLink<N, L>(d.links)
          .id((n) => n.id)
          .distance((l) => DIST[l.edge.type] ?? 90)
          .strength((l) => (WEAK.has(l.edge.type) ? 0.03 : l.edge.type === "MATCHED_TO" ? 0.25 : 0.7)),
      );
    }
    const turned = live.current.shownNet !== net;
    if (turned) {
      live.current.shownNet = net;
      live.current.turned = performance.now();
    }
    s.alpha(turned ? 1 : 0.75).restart();
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

    const pill = (text: string, x: number, y: number, px: number, weight: number, ink: string, back: string) => {
      ctx.font = `${weight} ${px}px ${font}`;
      const w = ctx.measureText(text).width + 12;
      ctx.fillStyle = back;
      ctx.beginPath();
      ctx.roundRect(x - w / 2, y - px * 0.78, w, px * 1.56, px * 0.78);
      ctx.fill();
      ctx.fillStyle = ink;
      ctx.fillText(text, x, y + 0.5);
    };

    const draw = () => {
      const d = data.current;
      const v = view.current;
      const dpr = el.width / Math.max(1, v.w);
      const hl = live.current.highlight;
      const hover = live.current.hover;
      const you = live.current.shownNet === "you";
      const reach = live.current.reach;
      dash = (dash + 0.6) % 1000;

      // Everything below draws from where a node is shown, not where the layout holds it.
      for (const n of d.nodes) {
        if (n.x == null || n.y == null) continue;
        if (n.px == null || n.py == null) {
          n.px = n.x;
          n.py = n.y;
        } else {
          n.px += (n.x - n.px) * GLIDE;
          n.py += (n.y - n.py) * GLIDE;
        }
        n.sx = n.x;
        n.sy = n.y;
        n.x = n.px;
        n.y = n.py;
      }

      // Fit the view to the graph, easing towards the target so it never jumps.
      let x0 = -120, x1 = 120, y0 = -90, y1 = 90;
      let rim = 0;
      for (const n of d.nodes) {
        if (n.x == null || n.y == null) continue;
        x0 = Math.min(x0, n.x - n.r - 60);
        x1 = Math.max(x1, n.x + n.r + 60);
        y0 = Math.min(y0, n.y - n.r - 22);
        y1 = Math.max(y1, n.y + n.r + 34);
      }
      if (you) {
        // The rings are the picture: you stay in the middle of the frame, with the outermost
        // ring in use just inside it.
        for (const n of d.nodes) if (n.x != null && n.y != null) rim = Math.max(rim, Math.hypot(n.x, n.y) + n.r);
        const span = Math.max(150, rim) + 22;
        x0 = y0 = -span;
        x1 = y1 = span;
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
      const now = performance.now();
      const moving = new Set<string>();
      for (const f of live.current.flows) for (const id of f.path) moving.add(id);
      /** Your net: is this edge one step of the way from the founder to a first-ring person? */
      const direct = (a: N, b: N) => {
        if (!you) return false;
        const ra = reach.get(a.id), rb = reach.get(b.id);
        if (!ra || !rb) return false;
        const child = ra.prev === b.id ? { n: a, r: ra } : rb.prev === a.id ? { n: b, r: rb } : null;
        return !!child && (child.n.node.label === "Person" ? child.r.degree === 1 : child.r.degree === 0);
      };
      /** Your net: is this node out past the second ring, with no short way to it? */
      const far = (n: N) => you && !n.node.props.isFounder && (n.node.label === "Person" ? n.ring === 0 : !reach.has(n.id) || reach.get(n.id)!.degree >= 3);

      // Your net: the rings people stand on.
      const ringsInUse = new Set<number>();
      if (you) {
        for (const n of d.nodes) if (n.node.label === "Person" && !n.node.props.isFounder) ringsInUse.add(n.orbit);
        ctx.lineWidth = 1 / Math.sqrt(v.k);
        ctx.setLineDash([2, 7]);
        for (const ring of RINGS) {
          if (!ringsInUse.has(ring.at)) continue;
          ctx.beginPath();
          ctx.arc(0, 0, ring.at, 0, Math.PI * 2);
          ctx.strokeStyle = ring.ring === 1 ? "rgba(244,169,140,.34)" : ring.ring === 2 ? "rgba(255,255,255,.2)" : "rgba(255,255,255,.11)";
          ctx.stroke();
        }
        ctx.setLineDash([]);
      }

      // The moment the net is switched: one ring opens out from whoever it is now about.
      const since = now - live.current.turned;
      if (live.current.turned && since < 900) {
        const t = since / 900;
        const ease = 1 - Math.pow(1 - t, 3);
        ctx.beginPath();
        ctx.arc(0, 0, 24 + ease * 330, 0, Math.PI * 2);
        ctx.strokeStyle = you ? `rgba(244,169,140,${0.5 * (1 - t)})` : `rgba(255,255,255,${0.42 * (1 - t)})`;
        ctx.lineWidth = 1.6 / Math.sqrt(v.k);
        ctx.stroke();
      }

      // Edges.
      for (const l of d.links) {
        const a = l.source as N, b = l.target as N;
        if (a.x == null || b.x == null) continue;
        const lit = isLit(a.id, b.id);
        const type = l.edge.type;
        // Your net: a tie on the way from the founder to someone who shares a school or employer.
        const yours = type !== "CONTACTED_VIA" && type !== "REPLIED_TO" && direct(a, b);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y!);
        ctx.lineTo(b.x, b.y!);
        ctx.setLineDash([]);
        if (lit) {
          // The way in: a soft halo under the line, then a bright dashed line that runs along it.
          ctx.globalAlpha = 1;
          ctx.strokeStyle = "rgba(244,169,140,.2)";
          ctx.lineWidth = 9 / Math.sqrt(v.k);
          ctx.stroke();
          ctx.strokeStyle = "#FFEADF";
          ctx.lineWidth = 2.6 / Math.sqrt(v.k);
          ctx.setLineDash([9, 7]);
          ctx.lineDashOffset = -dash;
          ctx.shadowColor = "rgba(244,169,140,.95)";
          ctx.shadowBlur = 14;
        } else if (yours) {
          ctx.strokeStyle = "rgba(255,226,213,.86)";
          ctx.lineWidth = 1.7 / Math.sqrt(v.k);
          ctx.setLineDash([6, 5]);
          ctx.lineDashOffset = 0;
          ctx.shadowColor = "rgba(244,169,140,.7)";
          ctx.shadowBlur = 7;
        } else if (type === "REPLIED_TO") {
          ctx.strokeStyle = "rgba(244,169,140,.95)";
          ctx.lineWidth = 2.2;
        } else if (type === "CONTACTED_VIA") {
          ctx.strokeStyle = "rgba(244,169,140,.6)";
          ctx.lineWidth = 1.4;
          ctx.setLineDash([4, 5]);
          ctx.lineDashOffset = 0;
        } else if (type === "STUDIED_AT" || type === "PREVIOUSLY_EMPLOYED_AT") {
          ctx.strokeStyle = "rgba(255,255,255,.36)";
          ctx.lineWidth = 1.2;
          ctx.setLineDash([2, 5]);
          ctx.lineDashOffset = 0;
        } else if (type === "USES" || type === "COMPETES_WITH") {
          ctx.strokeStyle = "rgba(255,255,255,.2)";
          ctx.lineWidth = 1.2;
        } else {
          ctx.strokeStyle = type === "MATCHED_TO" ? "rgba(255,255,255,.28)" : "rgba(255,255,255,.2)";
          ctx.lineWidth = type === "MATCHED_TO" ? 1.4 : 1.1;
        }
        ctx.globalAlpha = hl && !lit ? 0.3 : far(a) || far(b) ? 0.5 : 1;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;

      // Nodes.
      const labels: { n: N; text: string; bold: boolean }[] = [];
      for (const n of d.nodes) {
        if (n.x == null || n.y == null) continue;
        const age = Math.max(0, Math.min(1, (performance.now() - n.born) / 420));
        const pop = age < 1 ? 1 - Math.pow(1 - age, 3) : 1;
        const r = Math.max(0.01, n.r * pop);
        const lead = live.current.leads.get(n.id);
        const off = lead?.status === "suppressed";
        const out = far(n);
        ctx.globalAlpha = (dim(n.id) ? 0.3 : 1) * (off ? 0.55 : 1) * (out ? 0.55 : 1) * Math.min(1, age * 2);
        const { label } = n.node;
        const founder = !!n.node.props.isFounder;
        ctx.beginPath();
        if (label === "Signal") {
          ctx.moveTo(n.x, n.y - r * 1.25);
          ctx.lineTo(n.x + r * 1.25, n.y);
          ctx.lineTo(n.x, n.y + r * 1.25);
          ctx.lineTo(n.x - r * 1.25, n.y);
          ctx.closePath();
          ctx.fillStyle = "#F4A98C";
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
          ctx.strokeStyle = you && reach.get(n.id)?.dist === 1 ? "#FFEADF" : "#B5B5B5";
          ctx.stroke();
        } else {
          ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
          if (label === "Product" || (founder && you)) {
            // Whoever the net is about is the one bright thing: a disc with light around it.
            // The product's is white. The founder's is the live peach.
            const halo = ctx.createRadialGradient(n.x, n.y, r * 0.7, n.x, n.y, r * 2.6);
            halo.addColorStop(0, founder ? "rgba(244,169,140,.34)" : "rgba(255,255,255,.3)");
            halo.addColorStop(1, founder ? "rgba(244,169,140,0)" : "rgba(255,255,255,0)");
            ctx.beginPath();
            ctx.arc(n.x, n.y, r * 2.6, 0, Math.PI * 2);
            ctx.fillStyle = halo;
            ctx.fill();
            ctx.beginPath();
            ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
            ctx.fillStyle = founder ? "#F4A98C" : "#F2F2F2";
            ctx.fill();
          } else if (label === "Company") {
            // A company is a ring. The brighter the ring, the better the match.
            const tier = lead?.score.tier;
            ctx.fillStyle = "#0A0A0A";
            ctx.fill();
            ctx.lineWidth = !lead ? 1.4 : tier === "A" ? 2.6 : tier === "B" ? 2 : 1.6;
            ctx.strokeStyle = !lead ? (you && reach.get(n.id)?.dist === 1 ? "#FFEADF" : "#6A6A6A") : tier === "A" ? "#F2F2F2" : tier === "B" ? "#9E9E9E" : "#5C5C5C";
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
            if (founder) {
              ctx.shadowColor = "rgba(244,169,140,.9)";
              ctx.shadowBlur = 12;
            }
            // Your net: the nearer the ring, the brighter the person.
            ctx.fillStyle = founder ? "#F4A98C" : you && n.ring === 1 ? "#F2F2F2" : you && n.ring === 0 ? "#8A8A8A" : "#C4C4C4";
            ctx.fill();
            ctx.shadowBlur = 0;
            ctx.lineWidth = 2;
            ctx.strokeStyle = "#000";
            ctx.stroke();
          }
        }
        if (live.current.waiting.has(n.id)) {
          // A draft is waiting for the rep: a slow yellow ring, the color of "needs you".
          ctx.globalAlpha = dim(n.id) ? 0.3 : 1;
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 5.5, 0, Math.PI * 2);
          ctx.setLineDash([3.5, 3.5]);
          ctx.lineDashOffset = -dash * 0.22;
          ctx.strokeStyle = "#F0CB52";
          ctx.lineWidth = 1.7;
          ctx.stroke();
          ctx.setLineDash([]);
          ctx.lineDashOffset = 0;
        }
        if (hover === n.id) {
          ctx.globalAlpha = 1;
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 5, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(255,255,255,.9)";
          ctx.lineWidth = 2;
          ctx.stroke();
        }
        // In your net the people within reach are the point, so they are named.
        const named = label !== "Signal" && (label !== "Person" || founder || (hl && hl.nodes.has(n.id)) || hover === n.id || moving.has(n.id) || (you && n.ring !== 0));
        if (named && age > 0.5) labels.push({ n, text: founder && you ? "You" : n.node.name, bold: label === "Product" || !!lead || (founder && you) || (you && n.ring === 1) });
      }

      // Labels, on a dark pill so the lines behind do not run through the letters.
      const job = new Map<string, N>();
      if (you) for (const l of d.links) if (l.edge.type === "WORKS_AT") job.set((l.source as N).id, l.target as N);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const { n, text, bold } of labels) {
        const px = Math.max(10.5, Math.min(17, 11.5 / v.k));
        const short = text.length > 26 ? text.slice(0, 25) + "…" : text;
        // People are labelled above their dot, everything else below, so the two do not collide.
        // In your net a person's name goes on the side away from their company, whose own name
        // hangs below it.
        const firm = you ? job.get(n.id) : undefined;
        const above = n.node.label === "Person" && !n.node.props.isFounder && !(firm && firm.y != null && firm.y < n.y!);
        const y = above ? n.y! - n.r - px * 0.95 - 2 : n.y! + n.r + px * 0.95 + 2;
        ctx.globalAlpha = dim(n.id) ? 0.3 : far(n) ? 0.7 : 1;
        pill(short, n.x!, y, px, bold ? 700 : 550, bold ? "#F2F2F2" : "#B8B8B8", "rgba(0,0,0,.74)");
      }
      ctx.globalAlpha = 1;

      // Your net: what each ring means, written on the ring where nothing stands in the way.
      if (you) {
        const px = Math.max(10, Math.min(16, 10.5 / v.k));
        const written: { x: number; y: number }[] = [];
        for (const ring of RINGS) {
          if (!ringsInUse.has(ring.at)) continue;
          let at = -Math.PI / 2;
          let room = -1;
          for (const turn of [0, 0.5, -0.5, 1, -1, 1.5, -1.5, 2.2, -2.2, Math.PI]) {
            const a = -Math.PI / 2 + turn;
            const x = Math.cos(a) * ring.at, y = Math.sin(a) * ring.at;
            let clear = Infinity;
            for (const n of d.nodes) if (n.x != null && n.y != null) clear = Math.min(clear, Math.hypot((n.x - x) / 2.2, n.y - y) - n.r);
            // Keep clear of what the other rings have already had written on them, too.
            for (const w of written) clear = Math.min(clear, Math.hypot((w.x - x) / 5, w.y - y) - 12);
            if (clear > room) {
              room = clear;
              at = a;
            }
            if (clear > 46) break;
          }
          written.push({ x: Math.cos(at) * ring.at, y: Math.sin(at) * ring.at });
          ctx.globalAlpha = hl ? 0.4 : 1;
          pill(ring.means, Math.cos(at) * ring.at, Math.sin(at) * ring.at, px, 600, ring.ring === 1 ? "#FFD5C2" : ring.ring === 2 ? "#B8B8B8" : "#8A8A8A", "rgba(0,0,0,.86)");
        }
        ctx.globalAlpha = 1;
      }

      // The lead to contact first wears a small white flag, so it can be found without reading.
      const top = live.current.best ? d.byId.get(live.current.best) : null;
      if (top && top.x != null && top.y != null && performance.now() - top.born > 420) {
        const px = Math.max(9.5, Math.min(15, 10.5 / v.k));
        ctx.font = `800 ${px}px ${font}`;
        const text = "Best first";
        const w = ctx.measureText(text).width + 14;
        const y = top.y - top.r - px * 1.25;
        ctx.globalAlpha = dim(top.id) ? 0.3 : 1;
        ctx.fillStyle = "#F2F2F2";
        ctx.beginPath();
        ctx.roundRect(top.x - w / 2, y - px * 0.82, w, px * 1.64, 5);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(top.x - 4, y + px * 0.8);
        ctx.lineTo(top.x + 4, y + px * 0.8);
        ctx.lineTo(top.x, y + px * 0.8 + 4.5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#000";
        ctx.fillText(text, top.x, y + 0.5);
        ctx.globalAlpha = 1;
      }

      // Messages in motion: dots that leave the sender one after another and run to the person.
      for (const f of live.current.flows) {
        const pts: N[] = [];
        for (const id of f.path) {
          const n = d.byId.get(id);
          if (n && n.x != null && n.y != null) pts.push(n);
        }
        if (pts.length < 2) continue;
        const legs: number[] = [];
        let total = 0;
        for (let i = 0; i < pts.length - 1; i++) {
          const len = Math.hypot(pts[i + 1].x! - pts[i].x!, pts[i + 1].y! - pts[i].y!);
          legs.push(len);
          total += len;
        }
        if (total < 1) continue;
        const send = f.tone === "send";
        const core = send ? "#FFFFFF" : "#FFE2D5";
        const glow = send ? "rgba(255,255,255,.9)" : "rgba(244,169,140,.95)";
        const travel = (total / DOT_SPEED) * 1000;
        const until = Math.min(now, f.end ?? now);
        const last = Math.floor((until - f.start) / DOT_GAP);
        const first = Math.max(0, Math.ceil((now - travel - f.start) / DOT_GAP));
        const busy = last >= first;

        if (busy) {
          // The road they take, lit faintly underneath.
          ctx.beginPath();
          ctx.moveTo(pts[0].x!, pts[0].y!);
          for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x!, pts[i].y!);
          ctx.strokeStyle = send ? "rgba(255,255,255,.16)" : "rgba(244,169,140,.16)";
          ctx.lineWidth = 7 / Math.sqrt(v.k);
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.stroke();
          ctx.lineCap = "butt";
          ctx.lineJoin = "miter";
        }

        const size = (send ? 3.4 : 2.9) / Math.sqrt(v.k);
        ctx.shadowColor = glow;
        ctx.fillStyle = core;
        for (let i = first; i <= last; i++) {
          const gone = ((now - (f.start + i * DOT_GAP)) / 1000) * DOT_SPEED;
          if (gone < 0 || gone > total) continue;
          let along = gone;
          // Each dot keeps a little to one side of the line, its own side, so they read as a stream.
          const side = Math.sin(i * 12.9898) * 3.2;
          let leg = 0;
          while (leg < legs.length - 1 && along > legs[leg]) {
            along -= legs[leg];
            leg += 1;
          }
          const a = pts[leg], b = pts[leg + 1];
          const t = legs[leg] ? along / legs[leg] : 0;
          const ux = (b.x! - a.x!) / (legs[leg] || 1), uy = (b.y! - a.y!) / (legs[leg] || 1);
          const done = gone / total;
          // Fade in as it leaves the sender's disc, and out as it lands.
          ctx.globalAlpha = Math.min(1, done * 9, (1 - done) * 12 + 0.25);
          ctx.shadowBlur = 9;
          ctx.beginPath();
          ctx.arc(a.x! + (b.x! - a.x!) * t - uy * side, a.y! + (b.y! - a.y!) * t + ux * side, size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;

        // Where they land: a ring that opens out from the person, once for each beat.
        const target = pts[pts.length - 1];
        const landed = now - f.start - travel;
        const stillLanding = f.end == null || now < f.end + travel + 700;
        if (landed > 0 && stillLanding) {
          const beat = (landed % 900) / 900;
          ctx.beginPath();
          ctx.arc(target.x!, target.y!, target.r + 4 + beat * 15, 0, Math.PI * 2);
          ctx.strokeStyle = send ? `rgba(255,255,255,${0.75 * (1 - beat)})` : `rgba(244,169,140,${0.8 * (1 - beat)})`;
          ctx.lineWidth = 1.8;
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      // Hand the layout its own positions back.
      for (const n of d.nodes) {
        if (n.sx == null || n.sy == null) continue;
        n.x = n.sx;
        n.y = n.sy;
        n.sx = n.sy = undefined;
      }
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
      const x = n.px ?? n.x, y = n.py ?? n.y;
      if (x == null || y == null) continue;
      const dist = Math.hypot(x - gx, y - gy) - n.r;
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
    const opens = n && n.node.label !== "Product" && n.node.label !== "School" && !n.node.props.isFounder && !(n.node.label === "Company" && !live.current.leads.has(n.id));
    canvas.current!.style.cursor = opens ? "pointer" : "default";
    if (!n) return setTip(null);
    const box = wrap.current!.getBoundingClientRect();
    const lead = live.current.leads.get(n.id);
    const p = n.node.props;
    const you = live.current.shownNet === "you";
    const reach = live.current.reach;
    const tie = you ? howYouKnow(n.id, latest.current, reach) : "";
    const job = you && n.node.label === "Person" ? latest.current.edges.find((e) => e.type === "WORKS_AT" && e.from === n.id) : null;
    const works = job ? latest.current.nodes.find((x) => x.id === job.to)?.name : "";
    const sub =
      n.node.label === "Company"
        ? lead
          ? `Tier ${lead.score.tier}, score ${lead.score.total}${lead.whyNow ? `. ${lead.whyNow}` : ""}`
          : you && reach.get(n.id)?.dist === 1
            ? "Where you used to work"
            : "A past employer, not a target"
        : n.node.label === "Person"
          ? p.isFounder
            ? you
              ? "This net is about you"
              : "The founder"
            : `${String(p.title || "")}${you ? `${works ? ` at ${works}` : ""}${p.title || works ? ". " : ""}${tie}` : ""}`
          : n.node.label === "Signal"
            ? `${String(p.kind || "signal")}${p.date ? `, ${p.date}` : ""}`
            : n.node.label === "Competitor"
              ? String(p.category || "competitor")
              : n.node.label === "School" && you
                ? reach.get(n.id)?.dist === 1
                  ? "Where you studied"
                  : "Where someone here studied"
                : "";
    setTip({ x: Math.min(e.clientX - box.left + 14, box.width - 250), y: e.clientY - box.top + 14, title: p.isFounder && you ? "You" : n.node.name, sub: `${KIND[n.node.label]}${sub ? ": " + sub : ""}` });
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
        aria-label={net === "you" ? "Your net: the people found, placed by how close they are to you" : "The product's net: companies, people, reasons to write and competitors"}
        role="img"
      />
      {tip && (
        <div className="frost absolute pointer-events-none rounded-xl px-3 py-2 text-sm shadow-lg" style={{ left: tip.x, top: tip.y, maxWidth: 260, zIndex: 5 }}>
          <div className="font-bold leading-snug">{tip.title}</div>
          <div className="text-soft text-[13px] leading-snug">{tip.sub}</div>
        </div>
      )}
    </div>
  );
}

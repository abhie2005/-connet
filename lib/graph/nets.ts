// One graph, two ways to look at it.
//   The product's net: the product in the middle, the companies matched to it, their people,
//   their buying signals and the competitors.
//   Your net: the founder in the middle, the schools and employers they came through, and
//   everyone found, placed by how close they are to the founder, with the companies of those
//   within reach.
// No model and no server here: plain functions over the nodes and edges the page already has.
import type { GEdge, GNode } from "../types";

export type Net = "product" | "you";

export const FOUNDER = "founder";

const PRODUCT_EDGES = new Set(["MATCHED_TO", "ABOUT", "USES", "COMPETES_WITH", "WORKS_AT", "CONTACTED_VIA", "REPLIED_TO"]);
const TIES = new Set(["STUDIED_AT", "PREVIOUSLY_EMPLOYED_AT", "WORKS_AT"]);

interface Graph {
  nodes: GNode[];
  edges: GEdge[];
}

/** Everyone and every place people came through, with the ties between them. A message the
    rep approved is a tie from the founder to that person (it is stored as a tie from the product). */
function tiesOf(graph: Graph): Graph {
  if (!graph.nodes.some((n) => n.id === FOUNDER)) return { nodes: [], edges: [] };
  const nodes = graph.nodes.filter((n) => n.label === "Person" || n.label === "School" || n.label === "Company");
  const keep = new Set(nodes.map((n) => n.id));
  const edges: GEdge[] = [];
  for (const e of graph.edges) {
    if (TIES.has(e.type) && keep.has(e.from) && keep.has(e.to)) edges.push(e);
    else if (e.type === "CONTACTED_VIA" && e.from === "product" && keep.has(e.to)) edges.push({ ...e, from: FOUNDER });
    else if (e.type === "REPLIED_TO" && e.to === "product" && keep.has(e.from)) edges.push({ ...e, to: FOUNDER });
  }
  return { nodes, edges };
}

/** The nodes and edges one net shows. Your net is about people: it keeps everyone found, and
    only the schools and companies that lie on a way from the founder to someone. A company
    where nobody is within reach is left out (its people stand on the outside ring). */
export function netOf(graph: Graph, net: Net): Graph {
  if (net === "product") {
    const nodes = graph.nodes.filter((n) => n.label === "Product" || n.label === "Signal" || n.label === "Competitor" || (n.label === "Company" && n.props.isTarget !== false) || (n.label === "Person" && !n.props.isFounder));
    const keep = new Set(nodes.map((n) => n.id));
    return { nodes, edges: graph.edges.filter((e) => PRODUCT_EDGES.has(e.type) && keep.has(e.from) && keep.has(e.to)) };
  }
  const all = tiesOf(graph);
  const map = reach(graph);
  const nodes = all.nodes.filter((n) => n.label === "Person" || map.has(n.id));
  const keep = new Set(nodes.map((n) => n.id));
  return { nodes, edges: all.edges.filter((e) => keep.has(e.from) && keep.has(e.to)) };
}

export interface Reach {
  /** Edges between the founder and this node. */
  dist: number;
  /** For a person: 1 shares a school or employer with the founder (or has been written to),
      2 is linked to someone who does, and so on. For anything else: the same count for the
      nearest person on the far side of it. */
  degree: number;
  /** The node before this one on the shortest way from the founder. */
  prev: string | null;
}

/** How far everything is from the founder, over shared schools, employers and messages sent. */
export function reach(graph: Graph): Map<string, Reach> {
  const you = tiesOf(graph);
  const out = new Map<string, Reach>();
  if (you.nodes.length === 0) return out;
  const label = new Map(you.nodes.map((n) => [n.id, n.label]));
  const next = new Map<string, string[]>();
  const link = (a: string, b: string) => {
    if (!next.has(a)) next.set(a, []);
    next.get(a)!.push(b);
  };
  for (const e of you.edges) {
    link(e.from, e.to);
    link(e.to, e.from);
  }
  out.set(FOUNDER, { dist: 0, degree: 0, prev: null });
  const queue = [FOUNDER];
  while (queue.length) {
    const at = queue.shift()!;
    const here = out.get(at)!;
    for (const to of next.get(at) || []) {
      if (out.has(to)) continue;
      // A step on to a person is one more degree. A step on to a school or company is not.
      const degree = label.get(to) === "Person" ? here.degree + 1 : here.degree;
      out.set(to, { dist: here.dist + 1, degree, prev: at });
      queue.push(to);
    }
  }
  return out;
}

/** The ring a person stands on in your net: 1, 2, or 0 for "no short way in". */
export function ringOf(r: Reach | undefined): 0 | 1 | 2 {
  return r && r.degree === 1 ? 1 : r && r.degree === 2 ? 2 : 0;
}

/** In plain words, how the founder is tied to this person. */
export function howYouKnow(id: string, graph: Graph, map: Map<string, Reach>): string {
  const r = map.get(id);
  const name = new Map(graph.nodes.map((n) => [n.id, n.name]));
  const label = new Map(graph.nodes.map((n) => [n.id, n.label]));
  if (!r || ringOf(r) === 0) return "No way in yet";
  const way: string[] = [];
  for (let at: string | null = id; at; at = map.get(at)?.prev ?? null) way.unshift(at);
  // way: founder, (a school or company), person, (a school or company), person
  const first = way.find((x, i) => i > 0 && label.get(x) === "Person")!;
  const hub = way[1] !== first ? name.get(way[1]) : null;
  const firstTie = hub ? `shares ${hub} with you` : "has had a message from you";
  if (first === id) return hub ? `Shares ${hub} with you` : "You have written to them";
  const between = way[way.indexOf(first) + 1];
  return `One introduction away: ${name.get(first)} ${firstTie}, and both are tied to ${name.get(between) || "the same place"}`;
}

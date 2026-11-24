// The embedded knowledge graph. It always holds everything (it is what the page draws and what
// is saved to disk). When Neo4j is configured, every write is mirrored there and the reasoning
// queries run there instead; this copy is the fallback if the database cannot be reached.
import type { EdgeType, GEdge, GNode, NodeLabel, Props } from "../types";

export interface PathRow {
  personId: string;
  companyId: string;
  hubId: string;
  hubName: string;
  hubLabel: NodeLabel;
  founderEdge: EdgeType;
  personEdge: EdgeType;
}

export interface ReferralRow {
  fromPersonId: string; // someone who already replied
  toPersonId: string; // someone at a target account we have not reached
  companyId: string;
  hubId: string;
  hubName: string;
}

export interface DisplacementRow {
  companyId: string;
  competitorId: string;
  competitorName: string;
}

export interface SignalRow {
  companyId: string;
  signalId: string;
  kind: string;
}

export interface JobSignalRow {
  companyId: string;
  jobId: string;
  title: string;
  date: string | null;
  team: string | null;
  firstHire: boolean;
}

const SHARED: EdgeType[] = ["STUDIED_AT", "WORKS_AT", "PREVIOUSLY_EMPLOYED_AT"];

export class MemoryGraph {
  nodes = new Map<string, GNode>();
  edges = new Map<string, GEdge>();

  upsertNode(label: NodeLabel, id: string, name: string, props: Props = {}): GNode {
    const old = this.nodes.get(id);
    const node: GNode = { id, label, name: name || old?.name || id, props: { ...(old?.props || {}), ...props } };
    this.nodes.set(id, node);
    return node;
  }

  upsertEdge(type: EdgeType, from: string, to: string, props: Props = {}): GEdge {
    const id = `${from}|${type}|${to}`;
    const old = this.edges.get(id);
    const edge: GEdge = { id, type, from, to, props: { ...(old?.props || {}), ...props } };
    this.edges.set(id, edge);
    return edge;
  }

  removeNode(id: string) {
    this.nodes.delete(id);
    for (const [key, e] of this.edges) if (e.from === id || e.to === id) this.edges.delete(key);
  }

  clear() {
    this.nodes.clear();
    this.edges.clear();
  }

  snapshot(): { nodes: GNode[]; edges: GEdge[] } {
    return { nodes: [...this.nodes.values()], edges: [...this.edges.values()] };
  }

  load(data: { nodes: GNode[]; edges: GEdge[] }) {
    this.clear();
    for (const n of data.nodes) this.nodes.set(n.id, n);
    for (const e of data.edges) this.edges.set(e.id, e);
  }

  private out(from: string, types: EdgeType[]): GEdge[] {
    return [...this.edges.values()].filter((e) => e.from === from && types.includes(e.type));
  }

  private into(to: string, types: EdgeType[]): GEdge[] {
    return [...this.edges.values()].filter((e) => e.to === to && types.includes(e.type));
  }

  private isTarget(companyId: string): boolean {
    return this.out(companyId, ["MATCHED_TO"]).length > 0;
  }

  /** (founder)-[school or employer]->(hub)<-[school or employer]-(person)-[:WORKS_AT]->(target company) */
  warmPaths(): PathRow[] {
    const rows: PathRow[] = [];
    const founders = [...this.nodes.values()].filter((n) => n.label === "Person" && n.props.isFounder === true);
    for (const f of founders) {
      for (const fe of this.out(f.id, SHARED)) {
        const hub = this.nodes.get(fe.to);
        if (!hub) continue;
        for (const pe of this.into(hub.id, SHARED)) {
          if (pe.from === f.id) continue;
          const person = this.nodes.get(pe.from);
          if (!person || person.label !== "Person") continue;
          for (const we of this.out(person.id, ["WORKS_AT"])) {
            if (we.to === hub.id || !this.isTarget(we.to)) continue;
            rows.push({
              personId: person.id,
              companyId: we.to,
              hubId: hub.id,
              hubName: hub.name,
              hubLabel: hub.label,
              founderEdge: fe.type,
              personEdge: pe.type,
            });
          }
        }
      }
    }
    return rows;
  }

  /** Someone who replied, and a former colleague of theirs who now works at another target account. */
  referralPaths(): ReferralRow[] {
    const rows: ReferralRow[] = [];
    const replied = [...this.edges.values()].filter((e) => e.type === "REPLIED_TO").map((e) => e.from);
    for (const p1 of new Set(replied)) {
      for (const e1 of this.out(p1, ["WORKS_AT", "PREVIOUSLY_EMPLOYED_AT"])) {
        const hub = this.nodes.get(e1.to);
        if (!hub) continue;
        for (const e2 of this.into(hub.id, ["PREVIOUSLY_EMPLOYED_AT"])) {
          const p2 = e2.from;
          if (p2 === p1) continue;
          if (this.into(p2, ["CONTACTED_VIA"]).length > 0) continue;
          for (const we of this.out(p2, ["WORKS_AT"])) {
            if (we.to === hub.id || !this.isTarget(we.to)) continue;
            rows.push({ fromPersonId: p1, toPersonId: p2, companyId: we.to, hubId: hub.id, hubName: hub.name });
          }
        }
      }
    }
    return rows;
  }

  /** Target accounts that use something we compete with. */
  displacement(): DisplacementRow[] {
    const rows: DisplacementRow[] = [];
    for (const e of this.edges.values()) {
      if (e.type !== "USES" || !this.isTarget(e.from)) continue;
      const comp = this.nodes.get(e.to);
      if (!comp || this.out(comp.id, ["COMPETES_WITH"]).length === 0) continue;
      rows.push({ companyId: e.from, competitorId: comp.id, competitorName: comp.name });
    }
    return rows;
  }

  /**
   * The brief's "job postings linked to buying cycles": target accounts that put up a posting
   * for a role our product serves in the last 30 days, newest first.
   */
  jobSignals(now = Date.now()): JobSignalRow[] {
    const cutoff = now - 30 * 86_400_000;
    const rows: JobSignalRow[] = [];
    for (const e of this.edges.values()) {
      if (e.type !== "POSTED" || !this.isTarget(e.from)) continue;
      const job = this.nodes.get(e.to);
      if (!job || job.label !== "JobPost") continue;
      if (this.out(job.id, ["NEEDS"]).length === 0) continue;
      const date = job.props.date == null ? null : String(job.props.date);
      if (!date || Number.isNaN(Date.parse(date)) || Date.parse(date) < cutoff) continue;
      rows.push({
        companyId: e.from,
        jobId: job.id,
        title: job.name,
        date,
        team: job.props.team == null ? null : String(job.props.team),
        firstHire: job.props.firstHire === true,
      });
    }
    return rows.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }

  /** Signals attached to target accounts. */
  signals(): SignalRow[] {
    const rows: SignalRow[] = [];
    for (const e of this.edges.values()) {
      if (e.type !== "ABOUT" || !this.isTarget(e.to)) continue;
      const s = this.nodes.get(e.from);
      if (s) rows.push({ companyId: e.to, signalId: s.id, kind: String(s.props.kind || "other") });
    }
    return rows;
  }
}

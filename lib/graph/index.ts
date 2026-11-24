// One graph for the app: the embedded copy always, Neo4j as the database of record when it is
// configured. If Neo4j stops answering, the app carries on with the embedded graph and says so.
import neo4j, { type Driver } from "neo4j-driver";
import { config, modes } from "../config";
import type { EdgeType, GEdge, GNode, NodeLabel, Props } from "../types";
import { CYPHER, type QueryName } from "./cypher";
import { MemoryGraph, type DisplacementRow, type PathRow, type ReferralRow, type SignalRow } from "./memory";

export interface QueryResult<T> {
  rows: T[];
  engine: "neo4j" | "embedded";
  cypher: string | null;
  ms: number;
}

export type Rows = {
  warmPaths: PathRow;
  referralPaths: ReferralRow;
  displacement: DisplacementRow;
  signals: SignalRow;
};

const LABELS: NodeLabel[] = ["Product", "Company", "Person", "Competitor", "Signal", "School"];

export class Graph {
  memory = new MemoryGraph();
  private driver: Driver | null = null;
  private queue: Promise<void> = Promise.resolve();
  private failures = 0;
  neo4jError: string | null = null;

  constructor() {
    if (modes().graph === "neo4j") {
      try {
        this.driver = neo4j.driver(config.neo4jUri, neo4j.auth.basic(config.neo4jUser, config.neo4jPassword), {
          connectionTimeout: 8000,
          maxTransactionRetryTime: 5000,
        });
        this.write("CREATE CONSTRAINT tact_id IF NOT EXISTS FOR (n:Tact) REQUIRE n.id IS UNIQUE", {});
      } catch (e) {
        this.fail(e);
      }
    }
  }

  get engine(): "neo4j" | "embedded" {
    return this.driver && this.failures < 3 ? "neo4j" : "embedded";
  }

  private fail(e: unknown) {
    this.failures += 1;
    this.neo4jError = e instanceof Error ? e.message : String(e);
    console.warn("[tact] Neo4j:", this.neo4jError);
  }

  private run(query: string, params: Record<string, unknown>) {
    return this.driver!.executeQuery(query, params, config.neo4jDatabase ? { database: config.neo4jDatabase } : undefined);
  }

  /** Mirror a write to Neo4j, in order, without making the caller wait. */
  private write(query: string, params: Record<string, unknown>) {
    if (!this.driver || this.failures >= 3) return;
    this.queue = this.queue.then(async () => {
      if (this.failures >= 3) return;
      try {
        await this.run(query, params);
      } catch (e) {
        this.fail(e);
      }
    });
  }

  upsertNode(label: NodeLabel, id: string, name: string, props: Props = {}): GNode {
    const node = this.memory.upsertNode(label, id, name, props);
    if (LABELS.includes(label)) {
      this.write(`MERGE (n:Tact {id: $id}) SET n:${label}, n.name = $name, n += $props`, { id, name: node.name, props: clean(props) });
    }
    return node;
  }

  upsertEdge(type: EdgeType, from: string, to: string, props: Props = {}): GEdge {
    const edge = this.memory.upsertEdge(type, from, to, props);
    this.write(`MATCH (a:Tact {id: $from}) MATCH (b:Tact {id: $to}) MERGE (a)-[r:${type}]->(b) SET r += $props`, { from, to, props: clean(props) });
    return edge;
  }

  removeNode(id: string) {
    this.memory.removeNode(id);
    this.write("MATCH (n:Tact {id: $id}) DETACH DELETE n", { id });
  }

  clear() {
    this.memory.clear();
    this.write("MATCH (n:Tact) DETACH DELETE n", {});
  }

  /** Put everything the embedded graph holds into Neo4j (after loading a saved workspace). */
  resync() {
    if (!this.driver) return;
    this.write("MATCH (n:Tact) DETACH DELETE n", {});
    for (const n of this.memory.nodes.values()) {
      this.write(`MERGE (x:Tact {id: $id}) SET x:${n.label}, x.name = $name, x += $props`, { id: n.id, name: n.name, props: clean(n.props) });
    }
    for (const e of this.memory.edges.values()) {
      this.write(`MATCH (a:Tact {id: $from}) MATCH (b:Tact {id: $to}) MERGE (a)-[r:${e.type}]->(b) SET r += $props`, { from: e.from, to: e.to, props: clean(e.props) });
    }
  }

  async flush() {
    await this.queue;
  }

  async query<K extends QueryName>(name: K): Promise<QueryResult<Rows[K]>> {
    const started = Date.now();
    if (this.engine === "neo4j") {
      try {
        await this.flush();
        const res = await this.run(CYPHER[name], {});
        const rows = res.records.map((r) => {
          const o = r.toObject() as Record<string, unknown>;
          if (Array.isArray(o.hubLabels)) {
            o.hubLabel = (o.hubLabels as string[]).find((l) => l !== "Tact") || "Company";
            delete o.hubLabels;
          }
          return o as unknown as Rows[K];
        });
        return { rows, engine: "neo4j", cypher: CYPHER[name], ms: Date.now() - started };
      } catch (e) {
        this.fail(e);
      }
    }
    const rows = (this.memory[name]() as unknown) as Rows[K][];
    return { rows, engine: "embedded", cypher: null, ms: Date.now() - started };
  }

  /** For the key check script: can we reach the database? */
  async ping(): Promise<string> {
    if (!this.driver) return "not configured";
    const res = await this.run("RETURN 1 AS ok", {});
    return res.records.length === 1 ? "ok" : "no rows";
  }

  async close() {
    await this.flush().catch(() => {});
    await this.driver?.close().catch(() => {});
  }
}

function clean(props: Props): Props {
  const out: Props = {};
  for (const [k, v] of Object.entries(props)) if (v !== undefined && v !== null) out[k] = v;
  return out;
}

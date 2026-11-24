// The two nets: what each one shows, and how far everyone is from the founder.
import assert from "node:assert/strict";
import { test } from "node:test";
import { howYouKnow, netOf, reach, ringOf } from "../lib/graph/nets";
import type { EdgeType, GEdge, GNode, NodeLabel } from "../lib/types";

const node = (label: NodeLabel, id: string, name = id, props: GNode["props"] = {}): GNode => ({ id, label, name, props });
const edge = (type: EdgeType, from: string, to: string): GEdge => ({ id: `${from}-${type}-${to}`, type, from, to, props: {} });

// The founder went to UCLA. Maya did too, and works at Brightpath with Jo. Maya used to work
// at Lumen with Alan, who is now at Northlight. Priya, at Cedar, has no tie to any of them.
const graph = {
  nodes: [
    node("Product", "product", "Glyph"),
    node("Person", "founder", "Yoon Woo", { isFounder: true }),
    node("School", "ucla", "UCLA"),
    node("Company", "brightpath", "Brightpath", { isTarget: true }),
    node("Company", "northlight", "Northlight", { isTarget: true }),
    node("Company", "cedar", "Cedar", { isTarget: true }),
    node("Company", "lumen", "Lumen", { isTarget: false }),
    node("Person", "maya", "Maya"),
    node("Person", "jo", "Jo"),
    node("Person", "alan", "Alan"),
    node("Person", "priya", "Priya"),
    node("Signal", "sig", "Hiring"),
    node("Competitor", "rival", "QuizNest"),
  ],
  edges: [
    edge("STUDIED_AT", "founder", "ucla"),
    edge("STUDIED_AT", "maya", "ucla"),
    edge("WORKS_AT", "maya", "brightpath"),
    edge("WORKS_AT", "jo", "brightpath"),
    edge("PREVIOUSLY_EMPLOYED_AT", "maya", "lumen"),
    edge("PREVIOUSLY_EMPLOYED_AT", "alan", "lumen"),
    edge("WORKS_AT", "alan", "northlight"),
    edge("WORKS_AT", "priya", "cedar"),
    edge("MATCHED_TO", "brightpath", "product"),
    edge("MATCHED_TO", "northlight", "product"),
    edge("MATCHED_TO", "cedar", "product"),
    edge("ABOUT", "sig", "brightpath"),
    edge("USES", "brightpath", "rival"),
    edge("COMPETES_WITH", "rival", "product"),
  ],
};

test("the product's net leaves out the founder and the places people came through", () => {
  const net = netOf(graph, "product");
  const ids = net.nodes.map((n) => n.id);
  for (const gone of ["founder", "ucla", "lumen"]) assert.equal(ids.includes(gone), false, gone);
  for (const kept of ["product", "brightpath", "maya", "sig", "rival"]) assert.ok(ids.includes(kept), kept);
  assert.equal(net.edges.some((e) => e.type === "STUDIED_AT" || e.type === "PREVIOUSLY_EMPLOYED_AT"), false);
});

test("your net keeps the people and the places on the way to them, and nothing about the product", () => {
  const net = netOf(graph, "you");
  const ids = net.nodes.map((n) => n.id);
  for (const gone of ["product", "sig", "rival"]) assert.equal(ids.includes(gone), false, gone);
  for (const kept of ["founder", "ucla", "lumen", "maya", "brightpath", "alan", "northlight", "priya"]) assert.ok(ids.includes(kept), kept);
  assert.equal(ids.includes("cedar"), false, "a company where nobody is within reach is left out");
  assert.equal(net.edges.some((e) => e.from === "product" || e.to === "product"), false);
});

test("your net leaves out a school that ties nobody to the founder", () => {
  const more = { nodes: [...graph.nodes, node("School", "utexas", "UT Austin")], edges: [...graph.edges, edge("STUDIED_AT", "priya", "utexas")] };
  const ids = netOf(more, "you").nodes.map((n) => n.id);
  assert.equal(ids.includes("utexas"), false);
  assert.ok(ids.includes("ucla"));
  assert.ok(ids.includes("lumen")); // Maya and Alan share it
});

test("people are placed by how many people stand between them and the founder", () => {
  const map = reach(graph);
  assert.equal(ringOf(map.get("maya")), 1);
  assert.equal(ringOf(map.get("jo")), 2); // works with Maya
  assert.equal(ringOf(map.get("alan")), 2); // used to work with Maya
  assert.equal(ringOf(map.get("priya")), 0); // no way in
  assert.equal(map.has("priya"), false);
  assert.equal(howYouKnow("maya", graph, map), "Shares UCLA with you");
  assert.match(howYouKnow("alan", graph, map), /One introduction away: Maya shares UCLA with you, and both are tied to Lumen/);
  assert.equal(howYouKnow("priya", graph, map), "No way in yet");
});

test("a message the rep approved is a tie from the founder in your net", () => {
  const sent = { ...graph, edges: [...graph.edges, edge("CONTACTED_VIA", "product", "priya")] };
  const net = netOf(sent, "you");
  assert.ok(net.edges.some((e) => e.type === "CONTACTED_VIA" && e.from === "founder" && e.to === "priya"));
  const map = reach(sent);
  assert.equal(ringOf(map.get("priya")), 1);
  assert.equal(howYouKnow("priya", sent, map), "You have written to them");
});

test("with no founder on the graph, your net is empty and nobody is in reach", () => {
  const bare = { nodes: graph.nodes.filter((n) => n.id !== "founder"), edges: graph.edges.filter((e) => e.from !== "founder") };
  assert.equal(netOf(bare, "you").nodes.length, 0);
  assert.equal(reach(bare).size, 0);
});

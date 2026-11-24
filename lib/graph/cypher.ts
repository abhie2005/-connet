// The reasoning queries, in Cypher. These are what a spreadsheet cannot do: each one walks
// several relationships in one go. The same questions are answered by lib/graph/memory.ts
// when no database is connected.

export const CYPHER = {
  warmPaths: `MATCH (f:Person:Tact {isFounder: true})-[fe:STUDIED_AT|WORKS_AT|PREVIOUSLY_EMPLOYED_AT]->(hub:Tact)
      <-[pe:STUDIED_AT|WORKS_AT|PREVIOUSLY_EMPLOYED_AT]-(p:Person:Tact)
      -[:WORKS_AT]->(c:Company:Tact)-[:MATCHED_TO]->(:Product)
WHERE p <> f AND c <> hub
RETURN p.id AS personId, c.id AS companyId, hub.id AS hubId, hub.name AS hubName,
       labels(hub) AS hubLabels, type(fe) AS founderEdge, type(pe) AS personEdge`,

  referralPaths: `MATCH (p1:Person:Tact)-[:REPLIED_TO]->(:Product),
      (p1)-[:WORKS_AT|PREVIOUSLY_EMPLOYED_AT]->(hub:Company:Tact)
      <-[:PREVIOUSLY_EMPLOYED_AT]-(p2:Person:Tact)
      -[:WORKS_AT]->(c:Company:Tact)-[:MATCHED_TO]->(:Product)
WHERE p1 <> p2 AND c <> hub AND NOT (:Product)-[:CONTACTED_VIA]->(p2)
RETURN DISTINCT p1.id AS fromPersonId, p2.id AS toPersonId, c.id AS companyId,
       hub.id AS hubId, hub.name AS hubName`,

  displacement: `MATCH (c:Company:Tact)-[:USES]->(k:Competitor:Tact)-[:COMPETES_WITH]->(:Product),
      (c)-[:MATCHED_TO]->(:Product)
RETURN c.id AS companyId, k.id AS competitorId, k.name AS competitorName`,

  signals: `MATCH (s:Signal:Tact)-[:ABOUT]->(c:Company:Tact)-[:MATCHED_TO]->(:Product)
RETURN c.id AS companyId, s.id AS signalId, s.kind AS kind`,

  jobSignals: `MATCH (c:Company:Tact)-[:MATCHED_TO]->(:Product),
      (c)-[:POSTED]->(j:JobPost:Tact)-[:NEEDS]->(:Product)
WHERE j.date IS NOT NULL AND j.date >= toString(date() - duration({days: 30}))
RETURN c.id AS companyId, j.id AS jobId, j.title AS title, j.date AS date,
       j.team AS team, j.firstHire AS firstHire
ORDER BY j.date DESC`,
} as const;

export type QueryName = keyof typeof CYPHER;

/** How each query reads in plain words, for the activity feed. */
export const QUERY_MEANING: Record<QueryName, string> = {
  warmPaths: "People at target accounts who share a school or an employer with the founder",
  referralPaths: "Someone who replied, and a former colleague of theirs at another target account",
  displacement: "Target accounts that already use a competitor",
  signals: "Buying signals attached to target accounts",
  jobSignals: "New job postings linked to buying cycles: target accounts hiring for a role our product serves, in the last 30 days",
};

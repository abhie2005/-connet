// Checks every key in .env.local with one small real call each, and says what works.
// It never prints a key.   npm run doctor            (read-only checks)
//                          npm run doctor -- --event  (also sends one test usage event to Flexprice)
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());
process.env.TACT_CACHE = "0"; // every check here must reach the real service, never a saved answer

const ok = (name: string, note: string) => console.log(`  OK    ${name.padEnd(12)} ${note}`);
const bad = (name: string, note: string) => console.log(`  FAIL  ${name.padEnd(12)} ${note}`);
const skip = (name: string, note: string) => console.log(`  --    ${name.padEnd(12)} ${note}`);

async function main() {
  const { config, modes } = await import("../lib/config");
  const m = modes();
  console.log("\nTact: checking connections\n");

  // Gemini
  if (m.llm !== "gemini") skip("Gemini", "no GEMINI_API_KEY: the app will use sample answers");
  else {
    try {
      const { llm } = await import("../lib/providers/llm");
      const started = Date.now();
      const out = await llm().json<{ ok: boolean }>({ task: "doctor", system: "Return only JSON.", user: 'Return {"ok": true}' });
      ok("Gemini", `answered in ${((Date.now() - started) / 1000).toFixed(1)} s (${JSON.stringify(out)}). Models, in order: ${config.geminiModels.join(", ")}`);
    } catch (e) {
      bad("Gemini", (e as Error).message);
    }
    // Which models this key can use (costs no quota). Names change often, so compare with GEMINI_MODELS.
    try {
      const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": config.geminiKey }, signal: AbortSignal.timeout(15_000) });
      if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 160)}`);
      const data = (await res.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
      const usable = (data.models || []).filter((x) => (x.supportedGenerationMethods || []).includes("generateContent")).map((x) => x.name.replace(/^models\//, ""));
      const missing = config.geminiModels.filter((x) => !usable.includes(x));
      const flash = usable.filter((x) => /flash/.test(x) && !/image|tts|audio|live|embedding/.test(x));
      if (missing.length) bad("  models", `not available to this key: ${missing.join(", ")}. Set GEMINI_MODELS in .env.local to some of: ${flash.slice(-8).join(", ")}`);
      else ok("  models", `all ${config.geminiModels.length} in GEMINI_MODELS are available to this key`);
    } catch (e) {
      skip("  models", `could not list models: ${(e as Error).message}`);
    }
    console.log("        One run is about 35 model calls. A free key may not finish one: check your limits at https://aistudio.google.com/rate-limit");
  }

  // Tavily
  if (m.search !== "tavily") skip("Tavily", "no TAVILY_API_KEY: the app will use sample pages");
  else {
    try {
      const { search } = await import("../lib/providers/search");
      const pages = await search("after-school tutoring centers hiring tutors", { purpose: "accounts" }, 2);
      ok("Tavily", `${pages.length} results, first: ${pages[0]?.url || "(none)"} (${pages[0]?.text.length || 0} characters of text)`);
    } catch (e) {
      bad("Tavily", (e as Error).message);
    }
  }

  // Hunter (the account call uses no credits)
  if (m.enrich !== "hunter") skip("Hunter", "no HUNTER_API_KEY: the app will use sample records");
  else {
    try {
      const res = await fetch(`https://api.hunter.io/v2/account?api_key=${encodeURIComponent(config.hunterKey)}`);
      const body = await res.json();
      if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body).slice(0, 160)}`);
      const searches = body?.data?.requests?.searches;
      ok("Hunter", `plan: ${body?.data?.plan_name || "?"}, searches used ${searches?.used ?? "?"} of ${searches?.available ?? "?"}`);
    } catch (e) {
      bad("Hunter", (e as Error).message);
    }
  }

  // Neo4j: connect, then have the database check each reasoning query without running it.
  if (m.graph !== "neo4j") skip("Neo4j", "no NEO4J_URI / NEO4J_PASSWORD: the app will use the embedded graph");
  else {
    const neo4j = (await import("neo4j-driver")).default;
    const driver = neo4j.driver(config.neo4jUri, neo4j.auth.basic(config.neo4jUser, config.neo4jPassword), { connectionTimeout: 10000 });
    try {
      const db = config.neo4jDatabase ? { database: config.neo4jDatabase } : undefined;
      await driver.executeQuery("RETURN 1 AS ok", {}, db);
      const { CYPHER } = await import("../lib/graph/cypher");
      const failed: string[] = [];
      for (const [name, query] of Object.entries(CYPHER)) {
        try {
          await driver.executeQuery(`EXPLAIN ${query}`, {}, db);
        } catch (e) {
          failed.push(`${name}: ${(e as Error).message.slice(0, 140)}`);
        }
      }
      // One write and one delete, on a node only this check uses.
      await driver.executeQuery("MERGE (n:Tact {id: 'doctor'}) SET n:Company, n.name = 'doctor' WITH n DETACH DELETE n", {}, db);
      if (failed.length) bad("Neo4j", `connected, but ${failed.length} query did not pass: ${failed.join(" | ")}`);
      else ok("Neo4j", `connected, can write, and all ${Object.keys(CYPHER).length} reasoning queries are valid`);
    } catch (e) {
      bad("Neo4j", (e as Error).message);
    } finally {
      await driver.close();
    }
  }

  // Flexprice
  if (m.billing !== "flexprice") skip("Flexprice", "no FLEXPRICE_API_KEY: credits are kept in a local ledger");
  else {
    const billing = await import("../lib/providers/billing");
    const wallet = await billing.readWallet();
    if (wallet.id) ok("Flexprice", `wallet found for customer "${config.flexpriceCustomer}", balance ${wallet.balance ?? "unreadable"}`);
    else bad("Flexprice", `no wallet for customer "${config.flexpriceCustomer}" (${billing.lastError || "none returned"}). Usage events can still be sent; the credit gate will use the local balance.`);
    if (process.argv.includes("--event")) {
      const result = await billing.trackUsage("graph.query", { credits: 0, ref: "doctor" }, `tact_doctor_${Date.now()}`);
      if (result === "sent") ok("Flexprice", "test usage event accepted");
      else bad("Flexprice", `test usage event not accepted: ${billing.lastError}`);
    } else skip("Flexprice", "run with -- --event to also send one test usage event");
  }

  // Band
  if (!m.band) skip("Band", "no BAND_CHAT_ID and BAND_API_KEY: the agents talk in the app only");
  else {
    for (const [agent, key] of Object.entries(config.bandKeys)) {
      if (!key) continue;
      try {
        const res = await fetch(`${config.bandHost}/agent/me`, { headers: { "x-api-key": key } });
        if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 120)}`);
        ok("Band", `${agent} key accepted`);
      } catch (e) {
        bad("Band", `${agent}: ${(e as Error).message}`);
      }
    }
  }

  console.log("\nAnything marked -- runs on sample data. Anything marked FAIL also falls back, but fix it before the demo.\n");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

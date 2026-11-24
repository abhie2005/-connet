// Every setting comes from the environment (.env.local). Nothing here is required:
// a missing key switches that one integration to clearly labeled sample data.
import type { Modes } from "./types";

const env = (name: string) => (process.env[name] || "").trim();

export const config = {
  appName: env("NEXT_PUBLIC_APP_NAME") || "Tact",

  geminiKey: env("GEMINI_API_KEY"),
  // Tried in order. A model the key cannot use is skipped, one that is busy is tried last.
  geminiModels: (env("GEMINI_MODELS") || "gemini-3.8-flash,gemini-flash-latest,gemini-3.5-flash-lite,gemini-flash-lite-latest")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  llmTimeoutMs: Number(env("LLM_TIMEOUT_SECONDS") || 45) * 1000,

  tavilyKey: env("TAVILY_API_KEY"),
  hunterKey: env("HUNTER_API_KEY"),

  neo4jUri: env("NEO4J_URI"),
  neo4jUser: env("NEO4J_USERNAME") || env("NEO4J_USER") || "neo4j",
  neo4jPassword: env("NEO4J_PASSWORD"),
  neo4jDatabase: env("NEO4J_DATABASE"),

  flexpriceKey: env("FLEXPRICE_API_KEY"),
  flexpriceHost: (env("FLEXPRICE_API_HOST") || "https://us.api.flexprice.io/v1").replace(/\/+$/, ""),
  flexpriceCustomer: env("FLEXPRICE_CUSTOMER_ID") || "tact-demo",

  bandChatId: env("BAND_CHAT_ID"),
  bandKeys: {
    planner: env("BAND_API_KEY_PLANNER") || env("BAND_API_KEY"),
    builder: env("BAND_API_KEY_BUILDER") || env("BAND_API_KEY"),
    reviewer: env("BAND_API_KEY_REVIEWER") || env("BAND_API_KEY"),
    security: env("BAND_API_KEY_SECURITY") || env("BAND_API_KEY"),
  },
  bandHost: (env("BAND_API_HOST") || "https://app.band.ai/api/v1").replace(/\/+$/, ""),

  // TACT_SAMPLE=1 forces sample data everywhere (the safe demo, no network at all).
  forceSample: env("TACT_SAMPLE") === "1",
  startCredits: Number(env("TACT_START_CREDITS") || 30),
  maxCompanies: Number(env("TACT_MAX_COMPANIES") || 10),
  maxDrafts: Number(env("TACT_MAX_DRAFTS") || 5),
  dataDir: env("TACT_DATA_DIR") || ".data",
};

export function modes(): Modes {
  const s = config.forceSample;
  return {
    llm: !s && config.geminiKey ? "gemini" : "sample",
    search: !s && config.tavilyKey ? "tavily" : "sample",
    enrich: !s && config.hunterKey ? "hunter" : "sample",
    graph: !s && config.neo4jUri && config.neo4jPassword ? "neo4j" : "embedded",
    billing: !s && config.flexpriceKey ? "flexprice" : "local",
    band: !s && !!config.bandChatId && !!config.bandKeys.planner,
    send: "simulate",
  };
}

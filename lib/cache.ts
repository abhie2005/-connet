// Saved answers. Every answer from a live service (a search, a model call, a contact lookup) is
// written to .data/cache, keyed by exactly what was asked. Asking the same thing again within
// TACT_CACHE_HOURS reads the saved answer instead of the network.
//
// Why: a run costs about 40 model calls and 25 searches, free quotas are small, and conference
// wifi fails. Run a brief once on live data and it can be replayed, with the same real companies,
// for nothing and with no network. The page says "replayed" when that is what happened.
// TACT_CACHE=0 turns it off; `npm run fresh` deletes the saved answers.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { config } from "./config";
import { hooks } from "./providers/hooks";

const dir = (kind: string) => path.join(process.cwd(), config.dataDir, "cache", kind);

export function cacheKey(key: unknown): string {
  return crypto.createHash("sha256").update(JSON.stringify(key)).digest("hex").slice(0, 32);
}

export async function remember<T>(kind: "llm" | "search" | "enrich", key: unknown, make: () => Promise<T>): Promise<T> {
  if (config.cacheHours <= 0) return make();
  const file = path.join(dir(kind), cacheKey(key) + ".json");
  try {
    const saved = JSON.parse(fs.readFileSync(file, "utf8")) as { at: number; value: T };
    if (Date.now() - saved.at < config.cacheHours * 3_600_000) {
      hooks.replayed(kind);
      // A short pause, so a replayed run still unfolds on the page instead of appearing at once.
      await new Promise((r) => setTimeout(r, config.replayPaceMs * (0.6 + Math.random() * 0.8)));
      return saved.value;
    }
  } catch {
    // not saved yet, or unreadable: ask for real
  }
  const value = await make();
  try {
    fs.mkdirSync(dir(kind), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify({ at: Date.now(), value }));
    fs.renameSync(tmp, file);
  } catch (e) {
    console.warn("[tact] could not save an answer for replay:", (e as Error).message);
  }
  return value;
}

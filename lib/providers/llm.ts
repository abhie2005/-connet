// The language model. One call shape for the whole app: give it a task and get JSON back.
// Gemini when a key is set; otherwise the sample model in lib/sample, which answers from the
// sample data so the whole pipeline still runs with no network.
import { remember } from "../cache";
import { config, modes } from "../config";
import { sampleAnswer } from "../sample/model";
import { hooks } from "./hooks";

export interface LlmCall {
  task: string;
  system: string;
  user: string;
  /** The same information as `user`, structured. Only the sample model reads it. */
  input?: unknown;
  temperature?: number;
  maxTokens?: number;
}

export interface Llm {
  name: string;
  json<T>(call: LlmCall): Promise<T>;
}

/** Pull the JSON out of a model reply, tolerating code fences and stray words around it. */
export function parseJson<T>(text: string): T {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const start = trimmed.search(/[{[]/);
    const end = Math.max(trimmed.lastIndexOf("}"), trimmed.lastIndexOf("]"));
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1)) as T;
    throw new Error("The model did not return JSON");
  }
}

/** What a 429 from Gemini says: which kind of limit was hit, and how long it asks us to wait. */
export function readQuota(body: string): { daily: boolean; waitMs: number | null } {
  let daily = /PerDay/i.test(body);
  let waitMs: number | null = null;
  try {
    const details = (JSON.parse(body)?.error?.details || []) as { "@type"?: string; retryDelay?: string; violations?: { quotaId?: string }[] }[];
    for (const d of details) {
      if (d.retryDelay) {
        const seconds = parseFloat(d.retryDelay);
        if (Number.isFinite(seconds)) waitMs = Math.ceil(seconds * 1000);
      }
      for (const v of d.violations || []) if (/PerDay/i.test(v.quotaId || "")) daily = true;
    }
  } catch {
    const m = body.match(/retry in ([\d.]+)s/i);
    if (m) waitMs = Math.ceil(parseFloat(m[1]) * 1000);
  }
  return { daily, waitMs };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

class Gemini implements Llm {
  name = "gemini";
  private order = [...config.geminiModels];
  private noBudget = new Set<string>(); // models that refused the thinking setting
  private resting = new Map<string, number>(); // model -> time it may be asked again
  private spent = new Set<string>(); // models out of quota for the day
  private inFlight = 0;
  private waiting: (() => void)[] = [];
  private lastNotice = 0;

  /** Only a few calls at a time: free keys allow few requests a minute. */
  private async slot<T>(work: () => Promise<T>): Promise<T> {
    if (this.inFlight >= config.llmConcurrency) await new Promise<void>((go) => this.waiting.push(go));
    this.inFlight += 1;
    try {
      return await work();
    } finally {
      this.inFlight -= 1;
      this.waiting.shift()?.();
    }
  }

  private async once(model: string, call: LlmCall, withBudget: boolean): Promise<string> {
    const generationConfig: Record<string, unknown> = {
      responseMimeType: "application/json",
      temperature: call.temperature ?? 0.3,
      maxOutputTokens: call.maxTokens ?? 8192,
    };
    if (withBudget) generationConfig.thinkingConfig = { thinkingBudget: 0 };
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), config.llmTimeoutMs);
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": config.geminiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: call.system }] },
          contents: [{ role: "user", parts: [{ text: call.user }] }],
          generationConfig,
        }),
        signal: ctrl.signal,
        cache: "no-store",
      });
      const body = await res.text();
      if (!res.ok) throw Object.assign(new Error(`Gemini ${model}: ${res.status} ${body.slice(0, 240)}`), { status: res.status, body });
      const data = JSON.parse(body);
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const text = parts.map((p: { text?: string }) => p.text || "").join("");
      if (!text) throw Object.assign(new Error(`Gemini ${model}: empty reply (${data?.candidates?.[0]?.finishReason || "no candidate"})`), { status: 0 });
      return text;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Ask one model. Returns the parsed answer, or throws after noting why this model should rest. */
  private async askModel<T>(model: string, call: LlmCall): Promise<T> {
    let last: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const text = await this.once(model, call, !this.noBudget.has(model));
        return parseJson<T>(text);
      } catch (e) {
        last = e;
        const err = e as { status?: number; body?: string; name?: string; message: string };
        if (err.status === 400 && !this.noBudget.has(model)) {
          this.noBudget.add(model); // most likely the thinking setting: ask once more without it
          continue;
        }
        if (e instanceof SyntaxError || /did not return JSON/.test(err.message)) continue; // bad JSON: one more try
        if (err.status === 404) this.order = this.order.filter((m) => m !== model); // this key cannot use it
        if (err.status === 429) {
          const q = readQuota(err.body || "");
          if (q.daily) {
            this.spent.add(model);
            hooks.notice(`${model} is out of its free quota for today. Trying the next model.`);
          } else {
            this.resting.set(model, Date.now() + Math.min(65_000, (q.waitMs ?? 30_000) + 1000));
          }
        }
        if (err.status === 500 || err.status === 503) this.resting.set(model, Date.now() + 8000); // overloaded
        if (err.name === "AbortError") this.order = [...this.order.filter((m) => m !== model), model]; // slow: ask it last from now on
        break;
      }
    }
    throw last instanceof Error ? last : new Error(String(last));
  }

  private async ask<T>(call: LlmCall): Promise<T> {
    let last: unknown = new Error("No Gemini model is configured (GEMINI_MODELS)");
    // A few passes over the models. Between passes, wait out a per-minute limit if that is all that is wrong.
    for (let pass = 0; pass < 5; pass++) {
      const usable = this.order.filter((m) => !this.spent.has(m));
      if (usable.length === 0) {
        if (this.order.length === 0) throw new Error("Gemini: this key cannot use any of the models in GEMINI_MODELS. Run `npm run doctor` to see which ones it can.");
        throw new Error("Gemini: every model is out of quota for today on this key. Add billing in Google AI Studio (the smallest top-up is enough), or wait until midnight Pacific.");
      }
      const now = Date.now();
      const ready = usable.filter((m) => (this.resting.get(m) || 0) <= now);
      if (ready.length === 0) {
        const wait = Math.min(...usable.map((m) => this.resting.get(m) || 0)) - now;
        if (wait > 70_000) break;
        if (now - this.lastNotice > 5000) {
          this.lastNotice = now;
          hooks.notice(`Gemini asked us to slow down. Waiting ${Math.ceil(wait / 1000)} s, then carrying on.`);
        }
        await sleep(wait + 250);
        continue;
      }
      for (const model of ready) {
        try {
          hooks.llmCall(call);
          return await this.askModel<T>(model, call);
        } catch (e) {
          last = e;
        }
      }
    }
    throw last instanceof Error ? last : new Error(String(last));
  }

  json<T>(call: LlmCall): Promise<T> {
    // The saved answer is keyed by what was asked, not by which model answered.
    return remember("llm", { system: call.system, user: call.user, temperature: call.temperature ?? 0.3 }, () => this.slot(() => this.ask<T>(call)));
  }
}

class Sample implements Llm {
  name = "sample";
  async json<T>(call: LlmCall): Promise<T> {
    await new Promise((r) => setTimeout(r, 350 + Math.random() * 400)); // so the page has something to show
    return sampleAnswer(call.task, call.input) as T;
  }
}

let cached: Llm | null = null;
export function llm(): Llm {
  if (!cached) cached = modes().llm === "gemini" ? new Gemini() : new Sample();
  return cached;
}

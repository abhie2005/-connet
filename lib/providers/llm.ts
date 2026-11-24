// The language model. One call shape for the whole app: give it a task and get JSON back.
// Gemini when a key is set; otherwise the sample model in lib/sample, which answers from the
// sample data so the whole pipeline still runs with no network.
import { config, modes } from "../config";
import { sampleAnswer } from "../sample/model";

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

class Gemini implements Llm {
  name = "gemini";
  private order = [...config.geminiModels];
  private noBudget = new Set<string>(); // models that refused the thinking setting
  private resting = new Map<string, number>(); // model -> time it may be asked again

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
      if (!res.ok) throw Object.assign(new Error(`Gemini ${model}: ${res.status} ${body.slice(0, 240)}`), { status: res.status });
      const data = JSON.parse(body);
      const parts = data?.candidates?.[0]?.content?.parts || [];
      const text = parts.map((p: { text?: string }) => p.text || "").join("");
      if (!text) throw Object.assign(new Error(`Gemini ${model}: empty reply (${data?.candidates?.[0]?.finishReason || "no candidate"})`), { status: 0 });
      return text;
    } finally {
      clearTimeout(timer);
    }
  }

  async json<T>(call: LlmCall): Promise<T> {
    const now = Date.now();
    const ready = this.order.filter((m) => (this.resting.get(m) || 0) <= now);
    const models = ready.length ? ready : this.order;
    let last: unknown = new Error("No Gemini model is configured");
    for (const model of models) {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const text = await this.once(model, call, !this.noBudget.has(model));
          return parseJson<T>(text);
        } catch (e) {
          last = e;
          const status = (e as { status?: number }).status;
          const aborted = (e as Error).name === "AbortError";
          if (status === 400 && !this.noBudget.has(model)) {
            this.noBudget.add(model); // most likely the thinking setting: ask once more without it
            continue;
          }
          if (status === 404) this.order = this.order.filter((m) => m !== model); // this key cannot use it
          if (status === 429 || status === 503) this.resting.set(model, Date.now() + 60_000);
          if (aborted) this.order = [...this.order.filter((m) => m !== model), model]; // slow: ask it last from now on
          if (e instanceof SyntaxError || /did not return JSON/.test((e as Error).message)) continue; // bad JSON: one more try
          break;
        }
      }
    }
    throw last instanceof Error ? last : new Error(String(last));
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

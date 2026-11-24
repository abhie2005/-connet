// A few places where the rest of the app (and the tests) can listen to what the providers do,
// without the providers having to know about the workspace.
import type { SearchHint } from "./search";

export interface LlmCallInfo {
  task: string;
  system: string;
  user: string;
  input?: unknown;
}

export const hooks = {
  /** Something the person watching should know, e.g. "waiting 30 s for the rate limit". */
  notice: (text: string): void => void text,
  /** An answer was taken from the saved copies instead of the network. */
  replayed: (kind: "llm" | "search" | "enrich"): void => void kind,
  /** Called before every model call that goes to the network. */
  llmCall: (call: LlmCallInfo): void => void call,
  /** Called before every web search that goes to the network. */
  searchCall: (query: string, hint: SearchHint): void => void [query, hint],
};

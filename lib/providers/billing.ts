// Usage metering. Every metered action is written to the local ledger and, when a Flexprice key
// is set, sent to Flexprice as a usage event. The credit gate uses the Flexprice wallet balance
// when one can be read, and the local balance otherwise.
import { config, modes } from "../config";

export interface WalletInfo {
  id: string | null;
  balance: number | null;
}

const headers = () => ({ "content-type": "application/json", "x-api-key": config.flexpriceKey });

export async function trackUsage(event: string, properties: Record<string, string | number>, eventId: string): Promise<"sent" | "failed" | "local"> {
  if (modes().billing !== "flexprice") return "local";
  try {
    const res = await fetch(`${config.flexpriceHost}/events`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        event_name: event,
        external_customer_id: config.flexpriceCustomer,
        event_id: eventId,
        timestamp: new Date().toISOString(),
        source: "tact",
        properties,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Flexprice ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return "sent";
  } catch (e) {
    lastError = e instanceof Error ? e.message : String(e);
    return "failed";
  }
}

export let lastError: string | null = null;

function num(v: unknown): number | null {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
}

/** The customer's first active wallet and its live credit balance, if Flexprice has one. */
export async function readWallet(): Promise<WalletInfo> {
  if (modes().billing !== "flexprice") return { id: null, balance: null };
  try {
    const url = `${config.flexpriceHost}/customers/wallets?lookup_key=${encodeURIComponent(config.flexpriceCustomer)}&include_real_time_balance=true`;
    const res = await fetch(url, { headers: headers(), cache: "no-store", signal: AbortSignal.timeout(10_000) });
    if (!res.ok) throw new Error(`Flexprice wallets ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const data = await res.json();
    const list = (Array.isArray(data) ? data : data?.items || []) as Record<string, unknown>[];
    const wallet = list.find((w) => w.wallet_status === "active") || list[0];
    if (!wallet) return { id: null, balance: null };
    const balance = num(wallet.real_time_credit_balance) ?? num(wallet.credit_balance) ?? num(wallet.real_time_balance) ?? num(wallet.balance);
    return { id: String(wallet.id || ""), balance };
  } catch (e) {
    lastError = e instanceof Error ? e.message : String(e);
    return { id: null, balance: null };
  }
}

export async function topUpWallet(walletId: string, credits: number): Promise<boolean> {
  try {
    const res = await fetch(`${config.flexpriceHost}/wallets/${encodeURIComponent(walletId)}/top-up`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ credits_to_add: String(credits), transaction_reason: "FREE_CREDIT_GRANT", description: "Top-up from Tact" }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Flexprice top-up ${res.status}: ${(await res.text()).slice(0, 200)}`);
    return true;
  } catch (e) {
    lastError = e instanceof Error ? e.message : String(e);
    return false;
  }
}

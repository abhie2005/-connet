// One-time Flexprice setup, so nobody has to click through the dashboard:
//   1. finds which region the key belongs to,
//   2. creates the customer (external id from FLEXPRICE_CUSTOMER_ID, "tact-demo" by default),
//   3. creates a metered feature for each event Tact sends,
//   4. gives the customer a wallet with 30 credits,
//   5. sends one test event and reads the wallet back.
// Safe to run twice: whatever already exists is left alone.   npm run setup:flexprice
import { loadEnvConfig } from "@next/env";
import { setEnv } from "./envfile";

loadEnvConfig(process.cwd());

const say = (mark: string, text: string) => console.log(`  ${mark.padEnd(5)} ${text}`);

const HOSTS = ["https://us.api.flexprice.io/v1", "https://api.cloud.flexprice.io/v1"];
const FEATURES: { event: string; name: string; sum: boolean }[] = [
  { event: "discovery.run", name: "Discovery run", sum: true },
  { event: "lead.enriched", name: "Lead enriched", sum: true },
  { event: "outreach.drafted", name: "Message drafted", sum: true },
  { event: "outreach.sent", name: "Message sent", sum: false },
  { event: "graph.query", name: "Graph query", sum: false },
];

export async function setupFlexprice(): Promise<boolean> {
  const key = (process.env.FLEXPRICE_API_KEY || "").trim();
  const customer = (process.env.FLEXPRICE_CUSTOMER_ID || "tact-demo").trim();
  if (!key) {
    say("FAIL", "No FLEXPRICE_API_KEY in .env.local. Create one in the Flexprice dashboard (API Keys, Add, Read & Write) and paste it in.");
    return false;
  }
  const call = async (host: string, method: string, path: string, body?: unknown) => {
    const res = await fetch(`${host}${path}`, {
      method,
      headers: { "content-type": "application/json", "x-api-key": key },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15_000),
    });
    const text = await res.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      // not JSON
    }
    return { ok: res.ok, status: res.status, text: text.slice(0, 220), data: data as Record<string, unknown> | Record<string, unknown>[] | null };
  };

  // 1. Region. A key only works on the region its account was created in.
  const configured = (process.env.FLEXPRICE_API_HOST || "").trim().replace(/\/+$/, "");
  let host = "";
  let lastStatus = "";
  for (const h of [...new Set([configured, ...HOSTS].filter(Boolean))]) {
    try {
      const r = await call(h, "GET", `/customers/external/${encodeURIComponent(customer)}`);
      lastStatus = `${r.status} ${r.text}`;
      if (r.status !== 401 && r.status !== 403) {
        host = h;
        break;
      }
    } catch (e) {
      lastStatus = (e as Error).message;
    }
  }
  if (!host) {
    say("FAIL", `The key was refused on every region (${lastStatus}). Check that it was copied whole and has Read & Write.`);
    return false;
  }
  if (host !== (configured || HOSTS[0])) {
    setEnv("FLEXPRICE_API_HOST", host);
    say("OK", `Your account is on ${host}. Saved as FLEXPRICE_API_HOST in .env.local.`);
  } else say("OK", `Region: ${host}`);

  // 2. Customer.
  let customerId = "";
  const found = await call(host, "GET", `/customers/external/${encodeURIComponent(customer)}`);
  if (found.ok && found.data && !Array.isArray(found.data) && found.data.id) {
    customerId = String(found.data.id);
    say("OK", `Customer "${customer}" already exists.`);
  } else {
    const made = await call(host, "POST", "/customers", { external_id: customer, name: "Tact demo workspace" });
    if (!made.ok || !made.data || Array.isArray(made.data) || !made.data.id) {
      say("FAIL", `Could not create the customer: ${made.status} ${made.text}`);
      return false;
    }
    customerId = String(made.data.id);
    say("OK", `Customer "${customer}" created.`);
  }

  // 3. A metered feature per event. The event name must match exactly, and cannot be changed later.
  for (const f of FEATURES) {
    const r = await call(host, "POST", "/features", {
      name: f.name,
      type: "metered",
      lookup_key: f.event.replace(/\W+/g, "_"),
      description: `Tact: ${f.name.toLowerCase()}`,
      unit_singular: f.sum ? "credit" : "event",
      unit_plural: f.sum ? "credits" : "events",
      meter: {
        name: f.name,
        event_name: f.event,
        reset_usage: "BILLING_PERIOD",
        aggregation: f.sum ? { type: "SUM", field: "credits" } : { type: "COUNT" },
      },
    });
    if (r.ok) say("OK", `Feature "${f.name}" counts the event ${f.event}.`);
    else if (r.status === 409 || /exist|duplicate|already/i.test(r.text)) say("OK", `Feature for ${f.event} already exists.`);
    else say("FAIL", `Feature for ${f.event}: ${r.status} ${r.text}`);
  }

  // 4. Wallet.
  const wallets = await call(host, "GET", `/customers/wallets?lookup_key=${encodeURIComponent(customer)}&include_real_time_balance=true`);
  const list = (Array.isArray(wallets.data) ? wallets.data : ((wallets.data as { items?: Record<string, unknown>[] } | null)?.items ?? [])) as Record<string, unknown>[];
  if (wallets.ok && list.length > 0) {
    say("OK", `Wallet already exists (balance ${list[0].real_time_credit_balance ?? list[0].credit_balance ?? "?"}).`);
  } else {
    const start = String(process.env.TACT_START_CREDITS || 30);
    const made = await call(host, "POST", "/wallets", { customer_id: customerId, currency: "usd", name: "Tact credits", conversion_rate: "1", initial_credits_to_load: start });
    if (made.ok) say("OK", `Wallet created with ${start} credits.`);
    else say("FAIL", `Wallet: ${made.status} ${made.text}. You can add one by hand: Customers, ${customer}, Wallet, Create wallet.`);
  }

  // 5. One event, to see it is accepted.
  const event = await call(host, "POST", "/events", {
    event_name: "graph.query",
    external_customer_id: customer,
    event_id: `tact_setup_${Date.now()}`,
    timestamp: new Date().toISOString(),
    source: "tact",
    properties: { credits: 0, ref: "setup check" },
  });
  if (event.ok) say("OK", "A test event was accepted. It should show under Events in the Flexprice dashboard within a minute.");
  else say("FAIL", `Test event: ${event.status} ${event.text}`);
  return true;
}

if (process.argv[1] && /setup-flexprice/.test(process.argv[1])) {
  console.log("\nTact: setting up Flexprice\n");
  setupFlexprice()
    .then((ok) => console.log(ok ? "\nDone. Restart the app (Ctrl+C, then npm run dev) so it reads the wallet.\n" : "\nNot finished: see the FAIL line above.\n"))
    .catch((e) => console.log(`\n  FAIL  ${(e as Error).message}\n`));
}

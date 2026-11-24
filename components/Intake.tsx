"use client";
// The opening screen: one question, a few optional details, and a button.
import { useState } from "react";
import { APP_NAME, post } from "@/lib/client";
import { GLYPH_FOUNDER, GLYPH_PRODUCT } from "@/lib/sample/data";
import type { Founder, Product } from "@/lib/types";
import { Icon, Logo } from "./ui";

export function Intake({ initial, founder, sample, onStarted }: { initial: Product | null; founder: Founder; sample: boolean; onStarted: () => void }) {
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [url, setUrl] = useState(initial?.url || "");
  const [pricing, setPricing] = useState(initial?.pricing || "");
  const [customers, setCustomers] = useState(initial?.customers || "");
  const [who, setWho] = useState(founder.name || "");
  const [schools, setSchools] = useState(founder.schools.join(", "));
  const [employers, setEmployers] = useState(founder.employers.join(", "));
  const [more, setMore] = useState(!!(initial?.pricing || initial?.customers));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const example = () => {
    setName(GLYPH_PRODUCT.name);
    setDescription(GLYPH_PRODUCT.description);
    setUrl(GLYPH_PRODUCT.url);
    setPricing(GLYPH_PRODUCT.pricing);
    setCustomers(GLYPH_PRODUCT.customers);
    setWho(GLYPH_FOUNDER.name);
    setSchools(GLYPH_FOUNDER.schools.join(", "));
    setEmployers("");
    setMore(true);
    setError("");
  };

  const start = async () => {
    setBusy(true);
    setError("");
    const res = await post("/api/run", { product: { name, description, url, pricing, customers }, founder: { name: who, schools, employers } });
    setBusy(false);
    if (res.error) return setError(res.error);
    onStarted();
  };

  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="sheet w-full max-w-[640px] p-9 arrive">
        <div className="flex items-center gap-3">
          <Logo size={44} />
          <div className="text-[26px] font-extrabold tracking-tight leading-none">{APP_NAME}</div>
        </div>
        <h1 className="text-[30px] leading-[1.12] font-extrabold tracking-tight mt-7 mb-1.5">What are you selling?</h1>
        <p className="text-soft m-0 mb-5">Describe it in plain words. {APP_NAME} works out who should buy it, finds them with proof, and drafts the first message for you to approve.</p>

        <div className="grid gap-3">
          <div className="grid grid-cols-[1fr_1fr] gap-3">
            <input className="input" placeholder="Product name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Product name" />
            <input className="input" placeholder="Website (optional)" value={url} onChange={(e) => setUrl(e.target.value)} aria-label="Website" />
          </div>
          <textarea className="input" rows={5} placeholder="What it does, who uses it, and what problem it solves." value={description} onChange={(e) => setDescription(e.target.value)} aria-label="Product description" />
          {more && (
            <div className="grid grid-cols-[1fr_1fr] gap-3 arrive">
              <input className="input" placeholder="Pricing (optional)" value={pricing} onChange={(e) => setPricing(e.target.value)} aria-label="Pricing" />
              <input className="input" placeholder="Customers so far (optional)" value={customers} onChange={(e) => setCustomers(e.target.value)} aria-label="Customers so far" />
            </div>
          )}
          <div className="rounded-2xl bg-raise p-3.5">
            <div className="flex items-center gap-2 text-[13.5px] font-bold mb-2">
              <Icon name="path" />
              For warm introductions: who is selling?
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <input className="input" placeholder="Your name" value={who} onChange={(e) => setWho(e.target.value)} aria-label="Your name" />
              <input className="input" placeholder="Schools" value={schools} onChange={(e) => setSchools(e.target.value)} aria-label="Schools, separated by commas" />
              <input className="input" placeholder="Past employers" value={employers} onChange={(e) => setEmployers(e.target.value)} aria-label="Past employers, separated by commas" />
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <span className="text-bad font-semibold text-sm">{error}</span>
            {/credits/i.test(error) && (
              <button
                className="btn"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  await post("/api/action", { type: "topup", credits: 20 });
                  start();
                }}
              >
                Top up 20 and search
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 mt-6">
          <button className="btn btn-main" onClick={start} disabled={busy}>
            {busy ? "Starting" : "Find my customers"}
          </button>
          <button className="btn btn-plain" onClick={example}>
            Use the Glyph example
          </button>
          {!more && (
            <button className="btn btn-plain" onClick={() => setMore(true)}>
              Add pricing and customers
            </button>
          )}
        </div>
        {sample && <p className="text-faint text-[13px] mt-4 mb-0">Running on sample data: no API keys are set, so the companies you will see are invented. Add keys to .env.local for live results.</p>}
      </div>
    </div>
  );
}

"use client";
// The brief: who the agent thinks should buy this, how sure it is, the adjacent segments it
// suggests (accept, adjust or dismiss), and the competitors it found.
import { useState } from "react";
import type { IcpExpansion, Workspace } from "@/lib/types";
import { Confidence, Empty, Icon, SectionTitle, SourceLink } from "./ui";

export type Act = (body: Record<string, unknown>, key?: string) => Promise<boolean>;

function Expansion({ x, act, busy }: { x: IcpExpansion; act: Act; busy: boolean }) {
  const [name, setName] = useState(x.segment);
  const [editing, setEditing] = useState(false);
  return (
    <div className={`rounded-2xl p-4 ${x.status === "dismissed" ? "bg-raise opacity-60" : "bg-raise"}`}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          {editing ? (
            <input className="input !py-1.5 font-bold" value={name} onChange={(e) => setName(e.target.value)} autoFocus aria-label="Segment name" />
          ) : (
            <div className="font-bold">{x.status === "suggested" ? name : x.segment}</div>
          )}
          <p className="text-soft text-[14px] mt-1 mb-2">{x.reasoning}</p>
          <Confidence value={x.confidence} />
        </div>
        <div className="flex gap-1.5 flex-none">
          {x.status === "suggested" ? (
            <>
              <button className="btn" disabled={busy} onClick={() => act({ type: "expansion", id: x.id, action: "accept", segment: name }, `x:${x.id}`)}>
                <Icon name="check" />
                {busy ? "Searching" : "Accept"}
              </button>
              <button className="btn btn-quiet" disabled={busy} onClick={() => setEditing(!editing)}>
                <Icon name="edit" />
                Adjust
              </button>
              <button className="btn btn-plain" disabled={busy} onClick={() => act({ type: "expansion", id: x.id, action: "dismiss" })}>
                Dismiss
              </button>
            </>
          ) : (
            <span className={`chip ${x.status === "accepted" ? "chip-signal" : "chip-line"}`}>{x.status === "accepted" ? "Accepted and searched" : "Dismissed"}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function BriefTab({ ws, act, busy }: { ws: Workspace; act: Act; busy: Set<string> }) {
  const icp = ws.icp;
  if (!icp) return <Empty title="Reading the product">The ideal customer profile appears here in a few seconds.</Empty>;
  return (
    <div>
      <p className="text-[17px] leading-snug font-medium m-0">{icp.summary}</p>

      <SectionTitle count={icp.industries.length}>Who buys</SectionTitle>
      <div>
        {icp.industries.map((i, n) => (
          <div key={i.name} className={`grid grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)_auto] gap-4 items-start py-2.5 ${n ? "rowline" : ""}`}>
            <div>
              <div className="font-bold">{i.name}</div>
              {i.naics && <span className="chip chip-line mt-1">NAICS {i.naics}</span>}
            </div>
            <div className="text-soft text-[14px]">{i.why}</div>
            <Confidence value={i.confidence} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="rounded-2xl bg-raise p-3.5">
          <div className="label">Company size</div>
          <div className="font-bold">{icp.companySize.headcount}</div>
          <div className="text-soft text-[14px]">{icp.companySize.revenue} revenue</div>
        </div>
        <div className="rounded-2xl bg-raise p-3.5">
          <div className="label">Start in</div>
          <div className="font-bold">{icp.regions.join(", ") || "Anywhere"}</div>
          <div className="text-soft text-[14px]">{icp.companySize.why}</div>
        </div>
      </div>

      <SectionTitle count={icp.personas.length}>Who to reach</SectionTitle>
      <div>
        {icp.personas.map((p, n) => (
          <div key={p.title} className={`grid grid-cols-[minmax(0,1.1fr)_minmax(0,2fr)_auto] gap-4 items-start py-2.5 ${n ? "rowline" : ""}`}>
            <div>
              <div className="font-bold">{p.title}</div>
              <span className="text-faint text-[13px]">
                {p.function}
                {p.seniority ? `, ${p.seniority}` : ""}
              </span>
            </div>
            <div className="text-soft text-[14px]">{p.caresAbout}</div>
            <Confidence value={p.confidence} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <SectionTitle>Write when</SectionTitle>
          <ul className="m-0 p-0 list-none grid gap-2.5">
            {icp.triggers.map((t) => (
              <li key={t.event} className="flex gap-2.5">
                <span className="text-signal mt-0.5">
                  <Icon name="zap" />
                </span>
                <div>
                  <div className="font-semibold leading-snug">{t.event}</div>
                  <div className="text-soft text-[13.5px] leading-snug">{t.whyItMatters}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <SectionTitle>Leave out when</SectionTitle>
          <ul className="m-0 p-0 list-none grid gap-2.5">
            {icp.negatives.map((t) => (
              <li key={t.signal} className="flex gap-2.5">
                <span className="text-faint mt-0.5">
                  <Icon name="pause" />
                </span>
                <div>
                  <div className="font-semibold leading-snug">{t.signal}</div>
                  <div className="text-soft text-[13.5px] leading-snug">{t.why}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <SectionTitle count={icp.expansions.filter((x) => x.status === "suggested").length}>Segments you may not have thought of</SectionTitle>
      <div className="grid gap-2.5">
        {icp.expansions.map((x) => (
          <Expansion key={x.id} x={x} act={act} busy={busy.has(`x:${x.id}`)} />
        ))}
      </div>

      <SectionTitle count={ws.competitors.length}>What they could buy instead</SectionTitle>
      {ws.competitors.length === 0 ? (
        <div className="text-faint text-sm">No competitors found yet.</div>
      ) : (
        <div className="grid gap-2.5">
          {ws.competitors.map((c) => (
            <div key={c.id} className="rounded-2xl border border-line p-4">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="font-bold">{c.name}</div>
                <span className="chip">{c.category}</span>
                {c.pricing && <span className="chip chip-line">{c.pricing}</span>}
                <span className="flex-1" />
                <SourceLink evidence={c.evidence[0] || null} sources={ws.sources} />
              </div>
              <div className="text-soft text-[14px] mt-1.5">{c.positioning}</div>
              <div className="text-[14px] mt-1.5">
                <span className="font-bold">Our edge: </span>
                {c.ourEdge}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

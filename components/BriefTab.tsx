"use client";
// Target: who should buy this, read at a glance. Each line is a name and how sure the agent is;
// the reasoning behind a line opens when it is pressed. Nothing is hidden for good, and nothing
// has to be read to get the picture.
import { useState } from "react";
import type { IcpExpansion, Workspace } from "@/lib/types";
import { Confidence, Empty, Icon, SectionTitle, SourceLink } from "./ui";

export type Act = (body: Record<string, unknown>, key?: string) => Promise<boolean>;

/** One line of the picture: a name, how sure, and the reasoning one press away. */
function Line({ name, note, sure, right, children }: { name: string; note?: string; sure?: number; right?: React.ReactNode; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="tline">
      <div className="tline-row">
        <button className="tline-main" onClick={() => setOpen(!open)} aria-expanded={open} disabled={!children}>
          {children && (
            <span className="tline-arrow" style={{ transform: open ? "rotate(90deg)" : "none" }}>
              <Icon name="right" size={14} />
            </span>
          )}
          <span className="font-bold leading-snug min-w-0">{name}</span>
          {note && <span className="text-faint text-[13px] leading-snug truncate">{note}</span>}
        </button>
        {sure != null && <Confidence value={sure} word="sure" />}
        {right}
      </div>
      {open && children && <div className="tline-more arrive">{children}</div>}
    </div>
  );
}

function Expansion({ x, act, busy }: { x: IcpExpansion; act: Act; busy: boolean }) {
  const [name, setName] = useState(x.segment);
  const [editing, setEditing] = useState(false);
  return (
    <Line
      name={x.status === "suggested" ? name : x.segment}
      sure={x.confidence}
      right={
        x.status === "suggested" ? (
          <span className="flex gap-1.5 flex-none">
            <button className="btn !py-1 !px-3 !text-[13px]" disabled={busy} onClick={() => act({ type: "expansion", id: x.id, action: "accept", segment: name }, `x:${x.id}`)} title="Search this segment for companies too">
              <Icon name="check" size={14} />
              {busy ? "Searching" : "Accept"}
            </button>
            <button className="btn btn-plain !py-1 !px-2.5 !text-[13px]" disabled={busy} onClick={() => act({ type: "expansion", id: x.id, action: "dismiss" })}>
              Dismiss
            </button>
          </span>
        ) : (
          <span className={`chip flex-none ${x.status === "accepted" ? "chip-signal" : "chip-line"}`}>{x.status === "accepted" ? "Accepted" : "Dismissed"}</span>
        )
      }
    >
      <p className="m-0">{x.reasoning}</p>
      {x.status === "suggested" &&
        (editing ? (
          <input className="input !py-1.5 mt-2 font-bold" value={name} onChange={(e) => setName(e.target.value)} autoFocus aria-label="Segment name" />
        ) : (
          <button className="btn btn-quiet !py-1 !px-3 !text-[13px] mt-2" disabled={busy} onClick={() => setEditing(true)}>
            <Icon name="edit" size={14} />
            Adjust the name before accepting
          </button>
        ))}
    </Line>
  );
}

export function BriefTab({ ws, act, busy }: { ws: Workspace; act: Act; busy: Set<string> }) {
  const icp = ws.icp;
  const [why, setWhy] = useState(false);
  if (!icp) return <Empty title="Reading the product">The ideal customer profile appears here in a few seconds.</Empty>;
  const top = [...icp.industries].sort((a, b) => b.confidence - a.confidence)[0];
  const suggested = icp.expansions.filter((x) => x.status === "suggested").length;
  return (
    <div>
      <p className="m-0 mb-3 text-[14.5px] leading-snug text-soft">
        Who should buy <span className="font-bold text-ink">{ws.product?.name || "this"}</span>, worked out from your description. Each line shows how sure the agent is. Press a line to see why.
      </p>
      {/* The whole answer in three boxes. */}
      <div className="tiles">
        <div className="tile">
          <div className="tile-k">Sell to</div>
          <div className="tile-v">{top?.name || "Not worked out yet"}</div>
        </div>
        <div className="tile">
          <div className="tile-k">Company size</div>
          <div className="tile-v">{icp.companySize.headcount} staff</div>
          <div className="tile-s">{icp.companySize.revenue}</div>
        </div>
        <div className="tile">
          <div className="tile-k">Start in</div>
          <div className="tile-v" title={icp.regions.join(", ")}>
            {icp.regions[0] || "Anywhere"}
          </div>
          {icp.regions.length > 1 && <div className="tile-s">then {icp.regions.length - 1} more</div>}
        </div>
      </div>
      <button className="tline-why" onClick={() => setWhy(!why)} aria-expanded={why}>
        <span style={{ transform: why ? "rotate(90deg)" : "none", transition: "transform .2s", display: "inline-grid" }}>
          <Icon name="right" size={14} />
        </span>
        Why these
      </button>
      {why && (
        <div className="tline-more arrive !ml-0 !mt-1">
          <p className="m-0">{icp.summary}</p>
          {icp.companySize.why && <p className="m-0 mt-1.5">{icp.companySize.why}</p>}
        </div>
      )}

      <SectionTitle count={icp.industries.length}>Who buys</SectionTitle>
      {icp.industries.map((i) => (
        <Line key={i.name} name={i.name} sure={i.confidence}>
          <p className="m-0">{i.why}</p>
          {i.naics && <span className="chip chip-line mt-2">NAICS {i.naics}</span>}
        </Line>
      ))}

      <SectionTitle count={icp.personas.length}>Who to reach</SectionTitle>
      {icp.personas.map((p) => (
        <Line key={p.title} name={p.title} note={p.function} sure={p.confidence}>
          <p className="m-0">{p.caresAbout}</p>
        </Line>
      ))}

      <div className="grid grid-cols-2 gap-x-7 mt-7">
        <div className="min-w-0">
          <SectionTitle>Write when</SectionTitle>
          {icp.triggers.map((t) => (
            <Line key={t.event} name={t.event}>
              <p className="m-0">{t.whyItMatters}</p>
            </Line>
          ))}
        </div>
        <div className="min-w-0">
          <SectionTitle>Leave out when</SectionTitle>
          {icp.negatives.map((t) => (
            <Line key={t.signal} name={t.signal}>
              <p className="m-0">{t.why}</p>
            </Line>
          ))}
        </div>
      </div>

      {icp.expansions.length > 0 && (
        <>
          <SectionTitle count={suggested}>Also worth a look</SectionTitle>
          {icp.expansions.map((x) => (
            <Expansion key={x.id} x={x} act={act} busy={busy.has(`x:${x.id}`)} />
          ))}
        </>
      )}

      <SectionTitle count={ws.competitors.length}>What they could buy instead</SectionTitle>
      {ws.competitors.length === 0 ? (
        <div className="text-faint text-sm">No competitors found yet.</div>
      ) : (
        ws.competitors.map((c) => (
          <Line key={c.id} name={c.name} note={c.pricing || undefined} right={<span className="chip flex-none">{c.category}</span>}>
            <p className="m-0">{c.positioning}</p>
            <p className="m-0 mt-1.5 text-ink">
              <span className="font-bold">Our edge: </span>
              {c.ourEdge}
            </p>
            <div className="mt-2">
              <SourceLink evidence={c.evidence[0] || null} sources={ws.sources} />
            </div>
          </Line>
        ))
      )}
    </div>
  );
}

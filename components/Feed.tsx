"use client";
// The agents' conversation: who said what to whom, what was checked, what was stopped.
import { useEffect, useRef, useState } from "react";
import type { Activity } from "@/lib/types";
import { AGENTS, AgentMark, Icon } from "./ui";

function Line({ a }: { a: Activity }) {
  const [open, setOpen] = useState(false);
  const agent = AGENTS[a.agent];
  const flagged = a.kind === "flag" || a.kind === "error";
  return (
    <div className={`arrive flex gap-2.5 px-3 py-1.5 rounded-lg ${flagged ? "bg-flag" : ""}`}>
      <span className={`mt-[5px] ${flagged ? "text-warn" : a.agent === "system" ? "text-faint" : "text-soft"}`}>
        <AgentMark agent={a.agent} />
      </span>
      <div className="min-w-0 text-[13.5px] leading-snug">
        <span className={`font-bold ${a.agent === "system" ? "text-soft" : ""}`}>{agent.name}</span>
        {a.to && <span className="text-faint font-semibold"> @{AGENTS[a.to].name.toLowerCase()}</span>}{" "}
        <span className={a.kind === "step" || a.kind === "query" ? "text-soft" : "text-ink"}>{a.text}</span>
        {a.detail && (
          <>
            {" "}
            <button className="link text-[12.5px] border-0 bg-transparent p-0 font-semibold" onClick={() => setOpen(!open)}>
              {open ? "hide" : a.kind === "query" ? "show query" : "show"}
            </button>
            {open && <pre className="mono whitespace-pre-wrap bg-black rounded-lg border border-line p-2.5 mt-1.5 mb-1 text-ink overflow-x-auto">{a.detail}</pre>}
          </>
        )}
      </div>
    </div>
  );
}

export function Feed({ activity, running, visible = true }: { activity: Activity[]; running: boolean; visible?: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  // Closed, it is one line: the latest thing an agent said. Open, it is the whole conversation.
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [activity.length, open, visible]);

  const flags = activity.filter((a) => a.kind === "flag").length;
  const last = activity[activity.length - 1];
  return (
    <div className="frost rounded-2xl flex flex-col min-h-0 overflow-hidden" style={{ maxHeight: open ? "100%" : 48 }}>
      <button className="flex items-center gap-2.5 px-4 h-12 flex-none border-0 bg-transparent text-left w-full" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className={`lamp ${running ? "busy" : ""}`} />
        <span className="font-bold text-[14px] flex-none">Agents</span>
        {open || !last ? (
          <span className="flex items-center gap-1.5">
            {(["planner", "builder", "reviewer", "security"] as const).map((k) => (
              <span key={k} className="chip chip-line" title={AGENTS[k].does}>
                <AgentMark agent={k} />
                {AGENTS[k].name}
              </span>
            ))}
          </span>
        ) : (
          <span className="flex items-center gap-2 min-w-0 text-[13.5px] text-soft">
            <span className="flex-none">
              <AgentMark agent={last.agent} />
            </span>
            <span className="truncate">
              <span className="font-bold text-ink">{AGENTS[last.agent].name}</span> {last.text}
            </span>
          </span>
        )}
        <span className="flex-1" />
        {open && flags > 0 && (
          <span className="chip chip-flag flex-none" title="Things the reviewer or security agent stopped">
            <Icon name="flag" size={13} />
            {flags} stopped
          </span>
        )}
        <span style={{ transform: open ? "none" : "rotate(180deg)", transition: "transform .2s" }}>
          <Icon name="down" />
        </span>
      </button>
      {open && (
        <div
          ref={box}
          className="scroll flex-1 min-h-0 pb-2 px-1"
          onScroll={(e) => {
            const el = e.currentTarget;
            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
          }}
        >
          {activity.length === 0 ? <div className="px-4 py-3 text-soft text-sm">The agents will talk here once a run starts.</div> : activity.map((a) => <Line key={a.seq} a={a} />)}
        </div>
      )}
    </div>
  );
}

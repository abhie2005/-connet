"use client";
/* The app's own graph, on the dashboard.

   The canvas is the very component the app at / draws — one renderer, not two — so what shows
   here is the real net as the agents built it, and not a picture of one. Everything around it is
   written fresh in gd- classes: the app's key and net switch are dressed by app/globals.css in
   the product's violet, and the rule on this page is that neither stylesheet may reach the other.
   The marks themselves come from components/graph-marks.tsx, so the two keys cannot drift.

   The colours are this page's, not the app's: GraphView takes a palette, so the same drawing is
   violet at / and grey here, and the key below reads the same palette so the two cannot disagree. */
import { useMemo, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { GraphView, type Spot } from "@/components/GraphView";
import { graphMarks } from "@/components/graph-marks";
import { bestNext } from "@/components/leads";
import { reach as reachOf, ringOf, type Net } from "@/lib/graph/nets";
import { SLATE, SLATE_DARK } from "@/components/graph-palette";
import type { Workspace } from "@/lib/types";

/** The switch between the two nets, in this page's clothes. */
function Nets({ net, onChange, product, canYou, within }: { net: Net; onChange: (n: Net) => void; product: string; canYou: boolean; within: number }) {
  return (
    <div className="gd-nets" role="group" aria-label="Which net to show">
      <button type="button" aria-pressed={net === "product"} onClick={() => onChange("product")} title={`Who ${product} is connected to`}>
        {product}&rsquo;s net
      </button>
      <button
        type="button"
        aria-pressed={net === "you"}
        disabled={!canYou}
        onClick={() => onChange("you")}
        title={canYou ? "Who you can reach. Closer in is a closer tie." : "Add your name and schools under New search in the app to see your own net"}
      >
        Your net
        {within > 0 && <span className="gd-nets-count">{within}</span>}
      </button>
    </div>
  );
}

export function DashboardGraph({ ws, appHref, theme, picked, onPick }: { ws: Workspace; appHref: string; theme: "light" | "dark"; picked: string | null; onPick: (id: string | null) => void }) {
  const C = theme === "dark" ? SLATE_DARK : SLATE;
  const [net, setNet] = useState<Net>("product");
  const [spot, setSpot] = useState<Spot | null>(null);

  const reach = useMemo(() => reachOf(ws.graph), [ws]);
  // Who has a draft waiting: the person it was written to when the graph knows them, else the
  // company. The same rule the app uses, so the dashed rings fall on the same nodes.
  const waiting = useMemo(() => {
    const on = new Set(ws.graph.nodes.map((n) => n.id));
    return new Set(ws.messages.filter((m) => m.status === "draft").map((m) => (m.contactId && on.has(m.contactId) ? m.contactId : m.leadId)));
  }, [ws]);

  const canYou = ws.graph.nodes.some((n) => n.props.isFounder);
  const within = ws.graph.nodes.filter((n) => n.label === "Person" && !n.props.isFounder && ringOf(reach.get(n.id)) !== 0).length;
  const competitors = ws.graph.nodes.some((n) => n.label === "Competitor");
  const jobposts = ws.graph.nodes.some((n) => n.label === "JobPost");
  const best = bestNext(ws);
  // A spotlight on something that is no longer there is let go, as the app lets it go.
  const shown: Spot | null = spot === "waiting" && waiting.size === 0 ? null : spot === "competitor" && !competitors ? null : spot;
  const marks = graphMarks({ net, waiting: waiting.size > 0, competitors, jobposts, palette: C });

  /* A click on the graph names the lead under the list below rather than opening a profile:
     profiles are the app's job, and this page sends you there to act. */
  const pick = (id: string) => {
    const lead = ws.leads.find((l) => l.id === id) || ws.leads.find((l) => l.contacts.some((c) => c.id === id)) || ws.leads.find((l) => l.signals.some((s) => s.id === id));
    onPick(lead && lead.id !== picked ? lead.id : null);
  };

  return (
    <section className="gd-panel gd-graph-panel">
      <header className="gd-panel-head gd-graph-head">
        <div>
          <h2>The net</h2>
          <p className="gd-graph-note">Every company, person and reason to write the agents found, and how they connect.</p>
        </div>
        <Nets net={net} onChange={setNet} product={ws.product?.name || "The product"} canYou={canYou} within={within} />
      </header>

      <div className="gd-key" aria-label="What the shapes on the graph mean. Point at one to pick it out." onMouseLeave={() => setSpot(null)}>
        {marks.map((it) =>
          it.spot ? (
            <button
              type="button"
              key={it.key}
              className="gd-key-item gd-key-btn"
              aria-pressed={shown === it.spot}
              title={`Shows ${it.hint}`}
              onMouseEnter={() => setSpot(it.spot!)}
              onFocus={() => setSpot(it.spot!)}
              onBlur={() => setSpot(null)}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">{it.mark}</svg>
              {it.label}
            </button>
          ) : (
            <span key={it.key} className="gd-key-item">
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">{it.mark}</svg>
              {it.label}
            </span>
          ),
        )}
      </div>

      <div className="gd-canvas">
        <GraphView
          nodes={ws.graph.nodes}
          edges={ws.graph.edges}
          leads={ws.leads}
          net={net}
          reach={reach}
          highlight={null}
          spot={shown}
          flows={[]}
          waiting={waiting}
          best={best?.lead.id || null}
          palette={C}
          onPick={pick}
        />
      </div>

      <footer className="gd-graph-foot">
        <span>{ws.graph.nodes.length} things found · {ws.graph.edges.length} connections between them</span>
        <a className="gd-secondary" href={appHref}>Open it in the app <ArrowUpRight aria-hidden="true" /></a>
      </footer>
    </section>
  );
}

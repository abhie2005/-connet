// What the shapes on the graph mean, as data. The app at / and the dashboard at /home both draw
// this key, in stylesheets that may not touch each other: the app's is dressed by globals.css in
// the product's violet, the dashboard's by its own gd- rules. Only the presentation is allowed to
// differ. Keeping the marks here means the two keys cannot drift apart and start describing the
// same canvas differently — the canvas is one component, so the key had better be one list.
import type { ReactNode } from "react";
import type { Spot } from "./GraphView";
import type { Net } from "@/lib/graph/nets";
import { VIOLET, type GraphPalette } from "./graph-palette";

export interface GraphMark {
  key: string;
  label: string;
  mark: ReactNode;
  /** The kind this picks out on the graph, when it is one that can be picked out. */
  spot?: Spot;
  hint?: string;
}

export interface MarkOptions {
  net: Net;
  /** The inks the graph beside this key is drawn in. Defaults to the app's violet. */
  palette?: GraphPalette;
  /** Someone has a draft waiting, so the dashed ring is worth explaining. */
  waiting: boolean;
  competitors: boolean;
  jobposts: boolean;
}

/** The marks to show, in reading order. Drawn on an 18x18 viewBox. */
export function graphMarks({ net, waiting, competitors, jobposts, palette: C = VIOLET }: MarkOptions): GraphMark[] {
  // Your net needs no key of its own: each ring says what it means on the graph.
  const items: GraphMark[] =
    net === "you"
      ? [
          {
            key: "rings",
            label: "The closer to you, the closer the tie",
            mark: (
              <>
                <circle cx="9" cy="9" r="7" fill="none" stroke={C.ink} strokeOpacity="0.5" strokeWidth="1.200" strokeDasharray="2 2.600" />
                <circle cx="9" cy="9" r="3" fill={C.accent} />
              </>
            ),
          },
        ]
      : [
          { key: "company", spot: "company", hint: "the companies that could buy", label: "Company", mark: <circle cx="9" cy="9" r="6" fill={C.paper} stroke={C.ink} strokeWidth="2.200" /> },
          { key: "person", spot: "person", hint: "the people found there", label: "Person", mark: <circle cx="9" cy="9" r="4.400" fill={C.person} stroke={C.paper} strokeWidth="1.400" /> },
          { key: "signal", spot: "signal", hint: "the reasons to write now", label: "Reason to write", mark: <path d="M9 2.500 15.500 9 9 15.500 2.500 9Z" fill={C.accent} stroke={C.paper} strokeWidth="1.200" /> },
          ...(jobposts
            ? [
                {
                  key: "jobpost",
                  spot: "jobpost" as Spot,
                  hint: "the job postings behind them",
                  label: "Job post",
                  mark: (
                    <>
                      <rect x="4.400" y="2.600" width="9.200" height="12.800" rx="2" fill={C.pale} stroke={C.accent} strokeWidth="1.300" />
                      <path d="M6.800 7.400h4.400M6.800 10.600h4.400" stroke={C.accent} strokeWidth="1.100" />
                    </>
                  ),
                },
              ]
            : []),
          ...(competitors
            ? [{ key: "competitor", spot: "competitor" as Spot, hint: "what they could buy instead", label: "Competitor", mark: <circle cx="9" cy="9" r="5.800" fill={C.pale} stroke={C.ink} strokeOpacity="0.5" strokeWidth="1.600" /> }]
            : []),
        ];
  if (waiting) items.push({ key: "waiting", spot: "waiting", hint: "who has a draft waiting for you", label: "Draft waiting", mark: <circle cx="9" cy="9" r="6" fill="none" stroke={C.paper} strokeWidth="2" strokeDasharray="3 2.600" /> });
  return items;
}

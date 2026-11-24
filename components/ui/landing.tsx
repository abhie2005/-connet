"use client";

/* Everything below the hero. Same black, white and grey as the hero, same glass, and every
   claim on the page is one the app can actually back: the quote check, the graph questions,
   the Radar, the approval gate and the meter are all real parts of lib/. */
import { useEffect, useRef, useState } from "react";

const CSS = `
.lnd{
  --base:#f6f6f7;--ink:#18181b;--ink2:#3f3f46;--muted:#71717a;--line:#e4e4e7;
  --glass:rgba(255,255,255,.62);--glass-strong:rgba(255,255,255,.78);--glass-line:rgba(255,255,255,.8);
  position:relative;background:var(--base);color:var(--ink);
  font-family:var(--font-archivo),ui-sans-serif,system-ui,sans-serif;-webkit-font-smoothing:antialiased
}
html:has(.lnd),body:has(.lnd){background:#f6f6f7}
.lnd,.lnd *{box-sizing:border-box}
.lnd a{color:inherit;text-decoration:none}

/* a quiet monochrome backdrop, drifting, so the glass has something to sit against */
.lnd .lndfield{position:absolute;inset:0;overflow:hidden;pointer-events:none}
.lnd .lndfield i{position:absolute;border-radius:50%;filter:blur(90px);opacity:.42}
.lnd .f1{left:-10%;top:4%;width:46%;height:38%;background:#d9d9de;animation:lnd-a 30s ease-in-out infinite alternate}
.lnd .f2{right:-12%;top:30%;width:44%;height:42%;background:#e8e8ec;animation:lnd-b 34s ease-in-out infinite alternate}
.lnd .f3{left:18%;bottom:2%;width:50%;height:34%;background:#dedee3;animation:lnd-a 26s ease-in-out infinite alternate-reverse}
@keyframes lnd-a{to{transform:translate(7%,-5%) scale(1.09)}}
@keyframes lnd-b{to{transform:translate(-6%,5%) scale(1.07)}}

.lnd .wrap{position:relative;z-index:1;max-width:1120px;margin:0 auto;padding:0 24px}
.lnd section{position:relative;padding:128px 0}
.lnd section + section{padding-top:0}

.lnd .eyebrow{display:inline-flex;align-items:center;gap:9px;font-size:11.5px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:var(--muted)}
.lnd .eyebrow i{width:5px;height:5px;border-radius:50%;background:var(--ink);box-shadow:0 0 0 3.5px rgba(24,24,27,.1)}
.lnd h2{margin:16px 0 0;font-family:ui-serif,"Iowan Old Style",Georgia,"Times New Roman",serif;font-size:50px;line-height:1.1;letter-spacing:-1.3px;font-weight:400;max-width:17ch}
.lnd h2.wide{max-width:22ch}
.lnd .sub{margin:18px 0 0;font-size:17.5px;line-height:1.62;color:var(--muted);max-width:60ch}
.lnd .head{margin-bottom:52px}

/* the one glass recipe, used everywhere below */
.lnd .glass{
  background:var(--glass);
  -webkit-backdrop-filter:blur(22px) saturate(180%);backdrop-filter:blur(22px) saturate(180%);
  border:1px solid var(--glass-line);border-radius:18px;
  box-shadow:0 1px 0 rgba(255,255,255,.75) inset,0 22px 50px -26px rgba(24,24,27,.4)
}
.lnd .glass.tight{border-radius:14px}

.lnd .grid{display:grid;gap:18px}
.lnd .g4{grid-template-columns:repeat(4,1fr)}
.lnd .g3{grid-template-columns:repeat(3,1fr)}
.lnd .g2{grid-template-columns:1.05fr .95fr;align-items:center;gap:48px}

.lnd .step{padding:26px 24px 28px}
.lnd .step .n{display:grid;place-items:center;width:30px;height:30px;border-radius:9px;background:var(--ink);color:#fff;font:600 13px/1 var(--font-code),ui-monospace,monospace}
.lnd .step h3{margin:18px 0 0;font-size:17px;font-weight:650;letter-spacing:-.01em}
.lnd .step p{margin:9px 0 0;font-size:14.5px;line-height:1.58;color:var(--muted)}

/* the quote check, shown rather than described */
.lnd .proof{padding:26px}
.lnd .q{display:flex;gap:13px;align-items:flex-start;padding:15px 0}
.lnd .q + .q{border-top:1px solid rgba(24,24,27,.07)}
.lnd .mk{flex:none;display:grid;place-items:center;width:22px;height:22px;border-radius:50%;margin-top:1px}
.lnd .mk.y{background:var(--ink);color:#fff}
.lnd .mk.n{background:rgba(24,24,27,.08);color:var(--muted)}
.lnd .mk svg{width:12px;height:12px}
.lnd .q .t{font-size:14.5px;line-height:1.55}
.lnd .q .t em{font-style:normal;color:var(--muted)}
.lnd .q.no .t > span{text-decoration:line-through;text-decoration-color:rgba(24,24,27,.35);color:var(--muted)}
.lnd .src{margin-top:5px;font:500 11.5px/1.4 var(--font-code),ui-monospace,monospace;color:var(--muted)}

/* the graph questions */
.lnd .qy{padding:24px}
.lnd .qy h3{margin:0;font-size:15.5px;font-weight:650}
.lnd .qy p{margin:8px 0 14px;font-size:14px;line-height:1.56;color:var(--muted)}
.lnd .cy{display:block;padding:12px 13px;border-radius:10px;background:rgba(24,24,27,.045);border:1px solid rgba(24,24,27,.06);font:500 11.5px/1.65 var(--font-code),ui-monospace,monospace;color:var(--ink2);white-space:pre-wrap;overflow-x:auto}

/* the radar flow */
.lnd .flow{display:grid;grid-template-columns:1fr auto 1fr auto 1fr;align-items:stretch;gap:14px}
.lnd .fc{padding:20px}
.lnd .fc .k{font:500 11px/1 var(--font-code),ui-monospace,monospace;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.lnd .fc .v{margin-top:11px;font-size:14.5px;line-height:1.5;font-weight:600}
.lnd .fc .m{margin-top:7px;font-size:13px;line-height:1.5;color:var(--muted)}
.lnd .arw{display:grid;place-items:center;color:rgba(24,24,27,.3)}
.lnd .arw svg{width:20px;height:20px}

/* the gate */
.lnd .lndgate{padding:34px 32px;display:flex;align-items:center;gap:26px}
.lnd .lndgate .big{font-family:ui-serif,"Iowan Old Style",Georgia,serif;font-size:40px;line-height:1.1;letter-spacing:-1px;flex:none}
.lnd .lndgate p{margin:0;font-size:15.5px;line-height:1.6;color:var(--muted)}

/* closing call */
.lnd .close{text-align:center;padding:40px 0 132px}
.lnd .close h2{margin:0 auto;max-width:18ch}
.lnd .lndbtn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:48px;padding:0 22px;border-radius:12px;border:1px solid var(--glass-line);background:var(--glass-strong);-webkit-backdrop-filter:blur(20px) saturate(180%);backdrop-filter:blur(20px) saturate(180%);box-shadow:0 1px 0 rgba(255,255,255,.7) inset,0 10px 26px -14px rgba(24,24,27,.4);font-size:15.5px;font-weight:600;transition:background .2s,transform .35s cubic-bezier(.3,1.6,.5,1),box-shadow .3s}
.lnd .lndbtn:hover{background:#fff;transform:translateY(-1px)}
.lnd .lndbtn.pri{border-color:transparent;background:var(--ink);color:#fff;-webkit-backdrop-filter:none;backdrop-filter:none;box-shadow:inset 0 1px 0 rgba(255,255,255,.2),0 12px 28px -12px rgba(24,24,27,.85)}
.lnd .lndbtn.pri:hover{background:#000}
.lnd .ctas{display:flex;justify-content:center;gap:10px;margin-top:28px}

.lnd footer{position:relative;z-index:1;border-top:1px solid rgba(24,24,27,.08)}
.lnd footer .in{max-width:1120px;margin:0 auto;padding:26px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px;font-size:13.5px;color:var(--muted)}
.lnd footer .in a:hover{color:var(--ink)}

/* the nav that arrives once the hero is behind you */
.lndnav{position:fixed;z-index:50;top:0;left:0;right:0;height:62px;transform:translateY(-100%);transition:transform .45s cubic-bezier(.2,.8,.2,1)}
.lndnav.on{transform:none}
.lndnav .lndsheet{position:absolute;inset:0;background:rgba(255,255,255,.72);-webkit-backdrop-filter:blur(22px) saturate(180%);backdrop-filter:blur(22px) saturate(180%);border-bottom:1px solid rgba(24,24,27,.07)}
.lndnav .in{position:relative;max-width:1120px;height:100%;margin:0 auto;padding:0 24px;display:flex;align-items:center;justify-content:space-between}
.lndnav .brand{display:inline-flex;align-items:center;gap:9px;font-size:17px;font-weight:700;letter-spacing:-.02em;color:#18181b}
.lndnav .lk{display:flex;gap:28px;font-size:14px;color:#3f3f46}
.lndnav .lk a{opacity:.76;transition:opacity .2s}
.lndnav .lk a:hover{opacity:1}
.lndnav .go{display:inline-flex;align-items:center;height:36px;padding:0 15px;border-radius:9px;background:#18181b;color:#fff;font-size:14px;font-weight:600}

/* what scrolls into view, arrives */
.lnd [data-rise]{opacity:0;transform:translateY(20px);transition:opacity .75s cubic-bezier(.2,.7,.2,1),transform .75s cubic-bezier(.2,.7,.2,1)}
.lnd [data-rise].in{opacity:1;transform:none}
.lnd [data-rise][data-d="1"]{transition-delay:.07s}
.lnd [data-rise][data-d="2"]{transition-delay:.14s}
.lnd [data-rise][data-d="3"]{transition-delay:.21s}
.lnd [data-rise][data-d="4"]{transition-delay:.28s}

@media (max-width:980px){
  .lnd section{padding:92px 0}
  .lnd h2{font-size:38px;letter-spacing:-.8px}
  .lnd .g4{grid-template-columns:repeat(2,1fr)}
  .lnd .g3{grid-template-columns:1fr}
  .lnd .g2{grid-template-columns:1fr;gap:30px}
  .lnd .flow{grid-template-columns:1fr}
  .lnd .arw{transform:rotate(90deg);height:26px}
  .lnd .lndgate{flex-direction:column;align-items:flex-start;gap:16px}
  .lndnav .lk{display:none}
}
@media (max-width:640px){
  .lnd h2{font-size:30px}
  .lnd .g4{grid-template-columns:1fr}
  .lnd .ctas{flex-direction:column;align-items:center}
}
@media (prefers-reduced-motion:reduce){
  .lnd [data-rise]{opacity:1;transform:none;transition:none}
  .lnd .lndfield i{animation:none}
  .lndnav{transition:none}
}
`;

function Tick() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

function Cross() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" d="M7 7l10 10M17 7L7 17" />
    </svg>
  );
}

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-5-6 6 6-6 6" />
    </svg>
  );
}

function BrandMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 40 40" aria-hidden="true" style={{ display: "block" }}>
      <rect width="40" height="40" rx="10" fill="#18181b" />
      <path d="M25.3 12.6A9.8 9.8 0 1 0 25.3 27.4" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <circle cx="28.5" cy="20" r="3.1" fill="#fff" fillOpacity="0.72" />
    </svg>
  );
}

const STEPS = [
  { h: "Say what you sell", p: "One paragraph in plain words. The planner writes the ideal customer profile from it: industries, size, the people who buy, and what has to be true for them to buy now." },
  { h: "It finds accounts, with proof", p: "It searches, reads the pages, and keeps a company only when a quote about it is found word for word on the page it cites. No quote, no company." },
  { h: "It asks the graph", p: "Companies, people, products, competitors and signals in one graph, so it can answer questions a list cannot: who you already know, who is replacing what, who just started hiring." },
  { h: "You approve every send", p: "A second agent checks each claim in the draft against the proof, and a number that is in no fact is refused. Then it stops and waits for you." },
];

const QUERIES = [
  {
    h: "A warm way in",
    p: "People at target accounts who share a school or an employer with the founder. Four hops, one pattern.",
    c: "MATCH (f:Person {isFounder:true})\n  -[:STUDIED_AT|WORKS_AT]->(hub)\n  <-[:STUDIED_AT|WORKS_AT]-(p:Person)\n  -[:WORKS_AT]->(c:Company)",
  },
  {
    h: "Who to displace",
    p: "Target accounts already paying for something you compete with, and what they are paying for.",
    c: "MATCH (c:Company)-[:USES]->(k:Competitor)\n  -[:COMPETES_WITH]->(:Product),\n  (c)-[:MATCHED_TO]->(:Product)",
  },
  {
    h: "Job postings → buying cycles",
    p: "Target accounts hiring for a role your product serves, in the last 30 days, newest first.",
    c: "MATCH (c:Company)-[:POSTED]->(j:JobPost)\n  -[:NEEDS]->(:Product)\nWHERE j.date >= date() - duration('P30D')\nORDER BY j.date DESC",
  },
];

export function Landing({ brand = "Connet", appHref = "/" }: { brand?: string; appHref?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.12 },
    );
    root.querySelectorAll("[data-rise]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    /* the second nav only exists once the hero is behind you, so the hero keeps its own */
    const onScroll = () => setStuck(window.scrollY > innerHeight * 0.8);
    onScroll();
    addEventListener("scroll", onScroll, { passive: true });
    return () => removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <div className={`lndnav ${stuck ? "on" : ""}`}>
        <style>{CSS}</style>
        <div className="lndsheet" />
        <div className="in">
          <a className="brand" href={appHref}>
            <BrandMark />
            {brand}
          </a>
          <nav className="lk">
            <a href="#proof">Proof</a>
            <a href="#how">How it works</a>
            <a href="#radar">Hiring Radar</a>
            <a href="#graph">The graph</a>
          </nav>
          <a className="go" href={appHref}>
            Open the app
          </a>
        </div>
      </div>

      <div className="lnd" ref={ref}>
        <div className="lndfield" aria-hidden="true">
          <i className="f1" />
          <i className="f2" />
          <i className="f3" />
        </div>

        <section id="proof">
          <div className="wrap">
            <div className="g2">
              <div data-rise>
                <span className="eyebrow">
                  <i />
                  The rule
                </span>
                <h2>The model proposes. Plain code decides.</h2>
                <p className="sub">
                  Every fact {brand} states has to arrive with a quote, and ordinary code checks that the quote is on the page it cites, word for word. If it cannot be found, the fact is dropped and counted — you can see how many were thrown away on every run.
                </p>
              </div>
              <div className="glass proof" data-rise data-d="1">
                <div className="q">
                  <span className="mk y">
                    <Tick />
                  </span>
                  <div>
                    <div className="t">
                      <em>“</em>runs 42 after-school tutoring centers across California and Arizona<em>”</em>
                    </div>
                    <div className="src">found on brightpath.example/about · kept</div>
                  </div>
                </div>
                <div className="q">
                  <span className="mk y">
                    <Tick />
                  </span>
                  <div>
                    <div className="t">
                      <em>“</em>is hiring its first Head of Revenue Operations<em>”</em>
                    </div>
                    <div className="src">found on the posting · kept</div>
                  </div>
                </div>
                <div className="q no">
                  <span className="mk n">
                    <Cross />
                  </span>
                  <div>
                    <div className="t">
                      <span>
                        <em>“</em>raised a $40M round to expand nationwide<em>”</em>
                      </span>
                    </div>
                    <div className="src">not on the cited page · dropped</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how">
          <div className="wrap">
            <div className="head" data-rise>
              <span className="eyebrow">
                <i />
                How it works
              </span>
              <h2 className="wide">From one paragraph to a message you approve.</h2>
            </div>
            <div className="grid g4">
              {STEPS.map((s, i) => (
                <div className="glass step" key={s.h} data-rise data-d={String(i + 1)}>
                  <span className="n">{i + 1}</span>
                  <h3>{s.h}</h3>
                  <p>{s.p}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="radar">
          <div className="wrap">
            <div className="head" data-rise>
              <span className="eyebrow">
                <i />
                Hiring Radar
              </span>
              <h2 className="wide">A job posting is a buying signal with a date on it.</h2>
              <p className="sub">
                When a company posts its first Head of RevOps, it is about to buy tools for that role — and it has said so in public. Most tools find companies and then hunt for a reason to write. The Radar starts from the posting, so the lead arrives with its reason already attached.
              </p>
            </div>
            <div className="flow">
              <div className="glass fc" data-rise>
                <div className="k">The posting</div>
                <div className="v">“is hiring its first Head of Revenue Operations”</div>
                <div className="m">Read off the board, quote checked against the page, posted 1 day ago.</div>
              </div>
              <div className="arw" data-rise data-d="1">
                <Arrow />
              </div>
              <div className="glass fc" data-rise data-d="1">
                <div className="k">Why now</div>
                <div className="v">+6 — their first, not a backfill</div>
                <div className="m">Three roles on one team inside 30 days adds more again. Every point has its reason printed next to it.</div>
              </div>
              <div className="arw" data-rise data-d="2">
                <Arrow />
              </div>
              <div className="glass fc" data-rise data-d="2">
                <div className="k">The draft</div>
                <div className="v">“Saw you’re hiring your first RevOps lead —”</div>
                <div className="m">Written to whoever the posting says the role reports to. They are the one who signs.</div>
              </div>
            </div>
          </div>
        </section>

        <section id="graph">
          <div className="wrap">
            <div className="head" data-rise>
              <span className="eyebrow">
                <i />
                The knowledge graph
              </span>
              <h2 className="wide">Questions a spreadsheet cannot answer.</h2>
              <p className="sub">Companies, people, schools, competitors, signals and job postings in one graph. Each question below walks several relationships at once, which is the whole reason it is a graph and not a table.</p>
            </div>
            <div className="grid g3">
              {QUERIES.map((q, i) => (
                <div className="glass qy" key={q.h} data-rise data-d={String(i + 1)}>
                  <h3>{q.h}</h3>
                  <p>{q.p}</p>
                  <code className="cy">{q.c}</code>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section>
          <div className="wrap">
            <div className="glass lndgate" data-rise>
              <div className="big">Nothing is sent without you.</div>
              <p>
                Every draft is reviewed against the checked facts before you ever see it, and a number that appears in no fact is refused outright. Then it stops. {brand} moves the deal when you approve it, and the record says it was you, not the agent.
              </p>
            </div>
          </div>
        </section>

        <div className="wrap close">
          <h2 data-rise>Find out who is about to buy.</h2>
          <div className="ctas" data-rise data-d="1">
            <a className="lndbtn pri" href={appHref}>
              Find my customers
            </a>
            <a className="lndbtn" href="#how">
              See how it works
            </a>
          </div>
        </div>

        <footer>
          <div className="in">
            <span>
              {brand} — the go-to-market agent that thinks before it sends.
            </span>
            <a href={appHref}>Open the app →</a>
          </div>
        </footer>
      </div>
    </>
  );
}

export default Landing;

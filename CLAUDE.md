# Tact: context for Claude

Read this first. The README covers how to run it; `docs/ARCHITECTURE.md` covers how it is built; this file covers why, where it stands, and what is next.

## Handoff rule (both Claudes, every session)

1. **Before starting:** `git fetch origin && git show origin/main:HANDOFF.md` and read the newest entries. Do anything marked `[open]` that is addressed to your side, or say why not.
2. **Before stopping:** add an entry to `HANDOFF.md` on `main` (what you did, what you found, what you need from the other side) and push it.
3. Yoon Woo and Skylar should only have to say "check the handoff". Do not ask them to relay messages.

## The team and the goal

- **Yoon Woo** and **Skylar**, UCLA. **HackwithBay 4.0**, AWS Builder Loft, San Francisco, **Tue Nov 24, 2026**. Doors 9:40, opening 10:00, hacking 11:00 to 15:30, submission 15:30, top five present at 16:00.
- **The pivot (Nov 23, 21:00):** the organizer's email named the problem statement: an "AI GTM Engine" (product in, then ICP, discovery with citations, a knowledge graph, enrichment, human-approved outreach, a pipeline dashboard). Their paper tutor, Glyph (`yoonwoo-lee/glyph-practice`), does not answer it. Glyph is now the product this engine sells in the demo.
- **Pre-building is allowed** (Yoon Woo: "they said I could prebuild"). This repo is what they submit. It was built overnight Nov 23 to 24.
- **Who does what:** Yoon Woo writes the code (with Claude). Skylar does the pitch, the demo video and reads over the architecture document.
- **The name may change.** It is one setting, `NEXT_PUBLIC_APP_NAME`. Don't hard-code it.

## What they are judged on

| Criterion | Weight |
|---|---|
| ICP & discovery | 20% |
| Enrichment & outreach | 20% |
| Dashboard | 15% |
| Startup viability | 15% |
| Technical execution | 10% |
| Band (multi-agent) bonus | +20 |
| Flexprice (metering) bonus | +20 |

Deliverables: a working prototype, a public repository with documentation, a 2 to 3 minute demo video, an architecture document (`docs/ARCHITECTURE.md`). `docs/DEMO.md` is the script.

## The edge (what Yoon Woo asked for: "better than other teams", "something showy")

Keep these four working above everything else. They are the pitch.

1. **Nothing without proof.** The model proposes facts with quotes; `lib/verify.ts` checks each quote is on the page. Failures are dropped and counted in the feed.
2. **No reason, no email.** No signal and no warm path: held. A bad sign or do-not-contact: left out, no draft.
3. **Warm paths from the graph.** Shared school or employer with the founder; referral paths after a reply. Shown as a bright dashed line on the graph. This is the showpiece.
4. **A second agent reviews every draft.** Unsupported claims are sent back once, then handed to the rep.

## The look: black and grey (his request, Nov 23, 22:40)

He first chose Glyph's sky blue and pink, then asked for "black for me and cool tech vibe", "black and grey ish". That is what is built. Tokens are in `app/globals.css`.

- **Black field** `#000000`, panels `#0E0E0E`, boxes inside a panel `#171717`, hairlines `#262626`. Hairlines instead of shadows; corners 6 to 14 px.
- **Brightness is the hierarchy.** White `#F2F2F2` is the main action, the selected tab, Tier A. Tier B is a grey outline, Tier C a dim one.
- **Ice blue `#5CC8FF` only for what is live:** the running lamp, buying signals, the founder, the warm path on the graph (a bright dashed line with a glow), links, focus.
- **Amber `#F2B45A` only for what an agent stopped** or what needs the rep: dropped quotes, unsupported claims, guessed addresses.
- Green and red appear as small ticks and error text, nowhere else.
- Agents are told apart by a small mark each (ring, square, eye, triangle), not by a color each.
- The graph sits straight on the black with a faint dot grid. The product is a white disc with light round it; accounts are rings, brighter for a better tier.
- Archivo for everything; JetBrains Mono for Cypher and the few instrument-style readouts (`.mono`, `.num`).

What he has said about interfaces, from a week of Glyph feedback. Follow these without being asked:

- No lag and no shaking. Nothing resizes while it animates. No text that scrambles or types itself letter by letter into place.
- Don't overload a screen. An empty state is a logo and one quiet line.
- No all-caps labels, no gradient headlines, no stripes, one stroke weight for icons, tabular numbers.
- "Less like AI slop": plain words, nothing decorative that carries no information.
- Don't show how long the model took (he had "answered in N s" removed from Glyph's cards).
- He found strong pink too much in Glyph. If a color comes back, keep it soft.

## Status (Nov 23, 23:12)

**Works, checked on sample data in the terminal and in the browser (dev and production build):** the whole run in about 16 seconds; every tab; approve, reject and edit; drag a deal; log a reply and get referral paths; accept an expansion; enrich; the credit gate at zero and top-up. Lint and type-check are clean.

**Setup commands (Nov 23, midnight).** `npm run setup:flexprice` creates the customer, the metered features and the wallet from one API key; `npm run setup:band` registers the four agents, makes the room and writes the keys from one user key (Band's human API may be refused on a free plan: the command then prints the by-hand steps). Both are tested against stand-ins, not the real services.

**37 checks pass (`npm test`).** 21 are the sample run and the quote check. 14 are in `tests/live.test.ts`: the live code for Gemini, Tavily, Hunter, Flexprice and Band runs against stand-ins that answer in each service's documented format, and must end where the sample run ends. The stand-ins include a model the key cannot use (404), a refused thinking setting (400), a per-minute and a per-day rate limit (429), a reply that is not JSON, and pages that are mostly menu. The Cypher was checked with Neo4j's own language package (`@neo4j-cypher/language-support`, not a dependency): all clean.

**Still never run against the real services** (the machine it was built on could not reach them). What that leaves open:

- Whether the services answer as their documentation says. `npm run doctor` checks each one, lists which Gemini models the key can use, and never reads a saved answer.
- The two request bodies that were guesses are now confirmed against the API references (Nov 23): the Flexprice wallet top-up takes `credits_to_add` (a string), `transaction_reason` and `description`; a Band event is `{event: {content, message_type, metadata?}}` with `message_type` one of `tool_call`, `tool_result`, `thought`, `error`, `task`, `attention`.
- How many quotes a real model gets word for word. If the first live run keeps too little, look at the prompts in `lib/agents/discover.ts` (they ask for short quotes of 5 to 25 words copied exactly) and at what `lib/passages.ts` showed the model, before touching `lib/verify.ts`. Don't loosen the check to make numbers look better: it is the pitch.
- Neo4j itself (no database could be run here). The embedded graph answers the same four questions if it fails.

**What one live run costs: about 35 model calls, 20 searches, up to 3 Hunter lookups.** Yoon Woo's free Gemini key showed about 10 requests a day for its first model (Nov 20), so a free key will probably not finish a run. He planned to buy the $5 of credit: that is now needed before the first live run. Tavily's free 1,000 a month is about 50 runs; Hunter's free 25 a month about 8.

**Replay (built for the stage).** Every answer from a live service is saved in `.data/cache` for 72 hours, keyed by exactly what was asked (`lib/cache.ts`). The same brief run again reads the saved answers: real companies, no requests, no network. The header says "Live data, replayed". Plan: one live run of the Glyph brief in the morning, present from the replay. `npm run fresh` deletes the saved answers. Replays do not depend on the order parallel lookups finish in (tested).

**Rate limits.** A 429 from Gemini is read for which quota was hit: per-minute is waited out and the feed says so, per-day retires the model for the session and the next in `GEMINI_MODELS` takes over. `LLM_CONCURRENCY` (3) caps calls in flight.

**Credits.** The balance starts from the Flexprice wallet and follows it down, but Tact also counts each spend itself, because a wallet does not move when the events have no price attached in Flexprice. The credits panel says which is happening.

**The quote check ignores punctuation, not words.** Both texts are reduced to words and figures in order, so a model that swaps a curly quote, adds a full stop or writes "after school" for "after-school" still passes; a changed word or number fails. Link addresses and images are stripped from page text before the model sees it.

**Discovery leans towards the founder's own region.** The ICP prompt is told the founder's schools and past employers and asked to aim a search there when it makes commercial sense, because the warm path (the showpiece) needs people who share a school or employer. Whether a real model finds one on live pages is unknown until the first live run. If none shows up, sample data still shows it.

**Simulated on purpose:** sending email (approval records it), reading an inbox (replies are pasted in).

## Keys

All in `.env.local`, never committed, never pasted into chat or printed. Yoon Woo has a Gemini key and said he can get Tavily, Hunter.io, Neo4j Aura and Flexprice. Band and Snyk are optional.

## Next up, in order

0. Before any live run: Gemini billing on (the $5), then `npm run doctor`.
1. First live run on the Mac: `npm run dev`, describe Glyph, and read the feed for what was dropped. That run is also the one the stage demo replays, so do it with the final brief.
2. Fix whatever the live run breaks. Keep the sample path working after every fix (`npm test`): it is the backup demo.
3. Band room: four agents registered, keys in `.env.local`, check the hand-offs appear.
4. Record the video on sample data (`npm run demo`), following `docs/DEMO.md`.
5. If there is time: a hosted copy. The workspace is in memory and in a local file, so a serverless host needs it stored in Neo4j or similar first. Not needed to submit.

## Conventions

- Next.js 16 with breaking changes from earlier versions: see `AGENTS.md` and read `node_modules/next/dist/docs/` before changing framework code.
- Every integration keeps its sample fallback. A missing key or a failed call must never stop a run.
- Run `npm test && npm run lint && npm run build` before pushing.
- Don't commit `.env*` (except `.env.example`), `.data*`, `.next`, `node_modules`.
- If the page shows an old look after a pull or a stylesheet change, stop the server, run `npm run clean`, and start it again (the dev cache held on to an old stylesheet once during the build).

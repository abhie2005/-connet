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
3. **Warm paths from the graph.** Shared school or employer with the founder; referral paths after a reply. Shown as a pink line on the graph. This is the showpiece.
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
- Never show how long something took.
- He found strong pink too much in Glyph. If a color comes back, keep it soft.

## Status (Nov 23, 23:15)

**Works, checked on sample data in the terminal and in the browser (dev and production build):** the whole run in about 16 seconds; every tab; approve, reject and edit; drag a deal; log a reply and get referral paths; accept an expansion; enrich; the credit gate at zero and top-up. 20 checks pass (`npm test`), lint and type-check are clean.

**Never run against the real services** (the machine it was built on could not reach them):

- Gemini, Tavily, Hunter, Neo4j Aura, Flexprice, Band. `npm run doctor` checks each one and says what is wrong.
- Two request bodies are guesses from the documentation: the Flexprice wallet top-up (`credits_to_add`) and the Band event (`{event: {content, message_type}}`).
- The quote check may drop a lot on live pages if the model paraphrases. If the first live run keeps too little, look at the prompts in `lib/agents/discover.ts` (they ask for short quotes of 5 to 25 words copied exactly) before loosening `lib/verify.ts`. Don't loosen the check to make numbers look better: it is the pitch.
- Gemini model names come from `GEMINI_MODELS`. `gemini-3.5-flash-lite` is known to work on Yoon Woo's key.

**Simulated on purpose:** sending email (approval records it), reading an inbox (replies are pasted in).

## Keys

All in `.env.local`, never committed, never pasted into chat or printed. Yoon Woo has a Gemini key and said he can get Tavily, Hunter.io, Neo4j Aura and Flexprice. Band and Snyk are optional.

## Next up, in order

1. First live run on the Mac: `npm run doctor`, then `npm run dev`, describe Glyph, and read the feed for what was dropped.
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

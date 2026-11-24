# Connet: context for Claude

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
- **The name is Connet** (connect and network; his choice, Nov 24, 00:59). It was Tact until then. It is one setting, `NEXT_PUBLIC_APP_NAME`, read in `lib/name.ts`; the old value "Tact" in an `.env.local` counts as not set, so nobody has to edit their file. Don't hard-code the name. The repo is still `tact-gtm`, the settings are still `TACT_*`, the graph label is still `:Tact`, and the Band agents and the Flexprice wallet he registered keep the old name: leave all of those alone.

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

## The look: blue into purple (his request, Nov 24, 03:02)

The fourth look in two days, each at his request: Glyph's sky blue and pink, then black and grey ("cool tech vibe", Nov 23), then peach all over (Nov 24, 02:56: "no like the whole thing make it peachy color"; built, never pushed), then, six minutes later, "try purple and like a matching blue kind of vibe. Make sure it's appealing to the eyes". That last one is what is built. Tokens are in `app/globals.css`. Where older notes below say black, grey, peach, ice blue or yellow, this section wins.

- **One soft field behind the whole window:** sky blue `#84B4FA` on the left running into violet `#B08DF3` on the right (`.field::before`), with a white light behind the graph. In "Your net" a second still layer fades in and the field is purple all over (`#A79BF7` to `#C583EA`, `.field::after`), the way Glyph's field changes with its mode. Only opacity moves.
- **White sheets float on it** (`#FDFCFF`, soft indigo shadow); boxes inside a sheet are lilac `#F3F1FD`, hairlines `#E4E0F7`. Corners 6 to 14 px.
- **Deep indigo ink `#1B1640` is the hierarchy:** the main action, the selected tab, the "Best first" flag, Tier A rings. Softer text `#4D4873`, faint `#807BA6`.
- **Violet `#6541E0` only for what is live:** the running lamp, reasons to write, the way in, links, focus, the "Your net" thumb and the founder's disc (`#5A34D6` on the canvas).
- **Amber `#B06F00` only for what an agent stopped** or what needs the rep: dropped quotes, guessed addresses, a draft waiting for approval (the dot on "Review draft").
- Green, amber and red color the match score. Red also strikes out what to delete in a draft and green marks what was added. Otherwise green and red are small ticks and error text.
- Agents are told apart by a small mark each (ring, square, eye, triangle), not by a color each.
- **The graph is drawn straight on the field** with a faint dot grid (palette at the top of `components/GraphView.tsx`). The product is a white disc with light round it; companies are white discs with an ink ring, darker for a better tier; people are dark dots with a white outline; reasons to write are violet diamonds; names sit on white pills. White is what moves or waits: the way in (a dashed white line), a draft on its way (white dots), a draft waiting for you (a dashed white ring). Dots for an approved message are ink.
- Archivo for everything; JetBrains Mono for Cypher and the few instrument-style readouts (`.mono`, `.num`).

## The screen: easy first (his request, Nov 24, 00:50 to 00:59)

After the first live run he said the screen was "all complex and hard", that every team's will look like that, and that a B2B product has to be so easy people drop the old way for it. He then asked for the things below. They are built; don't undo them.

- **"Clear which one to send to is best."** The Leads tab opens on one card, "Best to contact first" (`Best` in `components/LeadsTab.tsx`): the person, why now, the way in, the address, one button. The rest follow in rank order as plain rows, one button each. On hold and Left out are folded away. On the graph the same lead wears a white "Best first" flag. "Best" is the highest-scoring active lead that has not been written to (`bestNext` in `components/leads.ts`).
- **One line says what to do next** (`Guide` in `components/App.tsx`), at the top of the work on every tab.
- **Tabs are named for the order of the work:** Target, Leads, Approve, Pipeline (they were Brief, Accounts, Approvals, Pipeline).
- **"Like a Pokédex, not fully": a profile card for each company and person** (`components/Profile.tsx`). Left: the entry's own small graph, name, type chips, the score bar by bar. Right: who to write to (title, address, LinkedIn, where they were found, what that role cares about), why now, the way in, the others there, the proof. Arrow keys and the two arrows flip entries. Any click on the graph opens the card of what was clicked; a competitor has a smaller card. With no profile address in the sources, the LinkedIn chip searches LinkedIn for the name and company and says so.
- **"Little dots going from Glyph to the person getting the email whenever draft is clicked."** `Flow` in `components/GraphView.tsx`: dots leave the product and run through the company to the person for as long as the writing takes (at least 1.6 s). The agent's own drafts during a run do the same. An amber ring round a person means a draft is waiting for approval; on approval the dots run once more in white.
- **So that there is a Draft to click, the agent drafts for the best three only** (`TACT_MAX_DRAFTS`, was 5). The rest wait for the rep.
- **"Make sure the human approves before AI sends."** Unchanged in the code (only `decideMessage` with "approve" marks a message sent, and sending is simulated), now said plainly in the Approve tab, the guide line and the profile card. He wrote "don't actually draft anything", read as "don't actually send anything".
- **The legend** is one panel above the graph, drawn in the graph's own shapes, with counts. Each net has its own.
- **Two nets (his request, Nov 24, 02:07: "instead of one net, could you make two", "like the stem and humanities for glyph thing").** A switch above the graph, `NetSwitch` in `components/App.tsx`: two equal halves and a thumb that slides without overshoot, white under "Glyph's net", ice blue under "Your net". The light behind the graph turns a little blue in your net (a second still layer fading in, as in Glyph's mode switch), and one ring opens out from the new middle. The nodes both nets share glide to their new places (`GLIDE` in `components/GraphView.tsx`: each frame draws a node part of the way to where the layout holds it).
  - **Glyph's net:** the product in the middle; companies, their people, reasons to write, competitors. The founder and the schools are no longer in it.
  - **Your net:** you in the middle, people on rings: "same school or employer", "one introduction away", "no way in yet" (small unnamed dots; hover for who). Only the schools and companies on a way to someone are drawn. The count on the switch is how many people are within reach.
  - The split and the distances are in `lib/graph/nets.ts` (plain functions, tested). "Show on graph" for a warm way in turns to your net by itself. A Draft clicked while your net is on show sends its dots from you. A new search starts in the product's net.
- **"What is the enrich button?"** It was jargon. It is "Find emails" now, next to "no address yet".
- **The agents' feed is one line** (the latest thing said) until it is clicked open. Skylar opens it for the video.

**Simpler again (Nov 24, 02:31: "make the UI more simple please. Still too much going on", "it'll just make the judges get overwhelmed"; he sent the profile card on live data).** These replace what is said above where they differ. The rule from here on: a screen opens on the few things that decide what to do, and everything else is one click away, folded. Before adding anything to a screen, put something else behind a fold.

- **Profile card:** one column, 700 wide. The top is the entry's small graph, its name, one line, and the match number. Then three sections: who to write to (name, title, address, LinkedIn; "Find emails" beside "no address yet"), why now (the strongest reason and its quote), a warm way in if there is one. Folded underneath: "Other people here", "Why it scored N" (the bars), "More proof". Cut from it: the two-pane layout, the type chips, "Target buyer", the "people in this role care about" line, the source chip on a person, the second action button, the credit prices.
- **Leads rows:** a person, one line on why now, the "Way in" tag if there is one, the match number, one button. Cut: the date, the source chip, the address chip, "Find emails", "Uses X". The best card lost its "Reach at" line. "Written to" is folded like On hold and Left out.
- **Above the graph:** the switch, "Hide graph", and one plain line of marks (Company, Person, Reason to write, Competitor, Draft waiting for you), with no box and no counts. Your net has no key: the rings say what they mean. Cut: the caption beside the switch, the line of node and edge counts under the graph, "Selling Glyph" in the header, the "N stopped" chip on the closed agents bar.
- **Approve:** a draft is "To", the subject, the message, one line ("A second agent checked it: 3 claims, each backed by a source", or in amber what it stopped), and Approve, Edit, Reject. "Show proof" opens the claims with their sources, the security note and the LinkedIn note. Cut: the two columns, the variant chip, the tier badge, the box explaining the rule (the line at the top says "Nothing is sent until you approve it").

**Nov 24, 02:48 (he sent the Approve tab on live data, with a long reviewer note open). These replace what is said above where they differ:**

- **"Make the color like the peach color that glyph was."** The one accent is Glyph's peach `#F4A98C` now, not ice blue: the running lamp, reasons to write, the way in, links, focus, and everything about "Your net" (the thumb, the founder's disc, the light behind the graph). (Superseded twice the same night: see "The look" above. The accent is violet and the field blue into purple.)
- **"Make the number rating 49/100 rather than match out of 100 and color it … green yellow red."** `Score` in `components/ui.tsx`: "49/100", green from 70 (tier A), yellow from 45 (tier B), red below (tier C). Used on the best card, the rows and the profile card.
- **"Remove the compress and keep the old version of that."** The Approve card is two columns again (the message, and beside it what the second agent made of it), with nothing folded. The folds in the profile card stay: he asked for those to be simpler and did not ask for them back.
- **"Less wordy and simple to understand what needs to be added and deleted."** In the message itself, a sentence that makes a claim nothing backs is struck out in red, and the line the security check added is green (`lib/marks.ts`, tested). The right column is short lists under small labels: Delete, Added, Backed by a source, Taken out before you saw it. The reviewer's paragraph of instructions is no longer shown (each claim's reason is its tooltip). "Delete them" takes the red sentences out in one click (an edit by the rep, so it is recorded as one); a subject that was nothing but the claim becomes "<product> for <company>".
- **"Is it possible to change the initials to a profile picture of their LinkedIn?"** No, and it was not built: LinkedIn has no public way to fetch a member's photo and forbids scraping them, and for most people found there is only a search link, not a profile. Initials stay. Offered instead, not built: a Gravatar looked up from a verified work email (it sends a hash of each lead's address to an outside service, so it waits for his yes).

What he has said about interfaces, from a week of Glyph feedback. Follow these without being asked:

- No lag and no shaking. Nothing resizes while it animates. No text that scrambles or types itself letter by letter into place.
- Don't overload a screen. An empty state is a logo and one quiet line.
- No all-caps labels, no gradient headlines, no stripes, one stroke weight for icons, tabular numbers.
- "Less like AI slop": plain words, nothing decorative that carries no information.
- Don't show how long the model took (he had "answered in N s" removed from Glyph's cards).
- He found strong pink too much in Glyph. If a color comes back, keep it soft.

## Status (Nov 24, 03:20)

**The blue-into-purple look is checked on sample data only** (1512 wide): every tab, both nets, the profile card, a Draft click with its dots, the first screen. No console errors. He has not seen it yet. 51 checks pass; lint and build are clean. After pulling he must run `npm run clean` before `npm run dev`, or the old stylesheet stays.

### Earlier status (Nov 24, 03:00)

**Checked on sample data only** (1512 wide): the peach accent in both nets, the colored scores, the two-column Approve card on a draft made to look like his live one (three unbacked claims: struck out, then "Delete them"), a clean draft, a rewritten one. He has not seen it yet. 51 checks pass (5 new in `tests/marks.test.ts`).

## Status before that (Nov 24, 02:40)

**The simpler screens are checked on sample data only** (1512 wide): leads, the profile card with each fold opened, an approval card, both nets, a Draft click. He has not seen them yet. 46 checks pass.

## Status before that (Nov 24, 02:30)

**The two nets are checked on sample data only**, at 1512 and 1280 wide: the switch both ways, a search watched from each, a Draft clicked in your net, "Show on graph", the hover notes. He has not seen them yet.

**Found while checking, and fixed:** a search started with fewer than 5 credits did nothing at all (the refusal happened after the page had been told "ok"). The start screen now says "Out of credits: a search costs 5 and N are left" with a "Top up 20 and search" button. He starts with 30 and a search with its drafts uses about 12, so he will meet this on the third search.

**46 checks pass** (6 new in `tests/nets.test.ts`).

## Status before that (Nov 24, 01:25)

**Live services on his Mac (Nov 24, 00:40, from `npm run doctor` and the two setup commands):** Gemini, Tavily, Hunter and Flexprice answer (wallet 30). Band is set up: four agents registered, the room made, a first line posted. **Neo4j does not connect** ("No routing servers available"): the host resolves and port 7687 is open, the address is right, and the username line was found doubled (`NEO4J_USERNAME=NEO4J_USERNAME=neo4j`). He has not re-run doctor since fixing it. The embedded graph stands in. He ran the app live and said "this is good" before asking for the screen to be made easier.

**The new screen is checked on sample data only**, in a browser at 1440 and 1512 wide: the run, each tab, the profile card from a row and from the graph, a Draft click (dots, then the amber ring), an approval. Not yet seen by him.

## Status before that (Nov 23, 23:12)

**Works, checked on sample data in the terminal and in the browser (dev and production build):** the whole run in about 16 seconds; every tab; approve, reject and edit; drag a deal; log a reply and get referral paths; accept an expansion; enrich; the credit gate at zero and top-up. Lint and type-check are clean.

**Setup commands (Nov 23, midnight).** `npm run setup:flexprice` creates the customer, the metered features and the wallet from one API key; `npm run setup:band` registers the four agents, makes the room and writes the keys from one user key (Band's human API may be refused on a free plan: the command then prints the by-hand steps). Both are tested against stand-ins, not the real services.

**51 checks pass (`npm test`).** 23 are the sample run and the quote check, 1 is the name, 6 are the two nets, 5 are the marks in a draft. 14 are in `tests/live.test.ts`: the live code for Gemini, Tavily, Hunter, Flexprice and Band runs against stand-ins that answer in each service's documented format, and must end where the sample run ends. The stand-ins include a model the key cannot use (404), a refused thinking setting (400), a per-minute and a per-day rate limit (429), a reply that is not JSON, and pages that are mostly menu. The Cypher was checked with Neo4j's own language package (`@neo4j-cypher/language-support`, not a dependency): all clean.

**Still never run against the real services** (the machine it was built on could not reach them). What that leaves open:

- Whether the services answer as their documentation says. `npm run doctor` checks each one, lists which Gemini models the key can use, and never reads a saved answer.
- The two request bodies that were guesses are now confirmed against the API references (Nov 23): the Flexprice wallet top-up takes `credits_to_add` (a string), `transaction_reason` and `description`; a Band event is `{event: {content, message_type, metadata?}}` with `message_type` one of `tool_call`, `tool_result`, `thought`, `error`, `task`, `attention`.
- How many quotes a real model gets word for word. If the first live run keeps too little, look at the prompts in `lib/agents/discover.ts` (they ask for short quotes of 5 to 25 words copied exactly) and at what `lib/passages.ts` showed the model, before touching `lib/verify.ts`. Don't loosen the check to make numbers look better: it is the pitch.
- Neo4j itself (no database could be run here). The embedded graph answers the same four questions if it fails.

**What one live run costs: about 35 model calls, 20 searches, up to 3 Hunter lookups.** Yoon Woo's free Gemini key showed about 10 requests a day for its first model (Nov 20), so a free key will probably not finish a run. He planned to buy the $5 of credit: that is now needed before the first live run. Tavily's free 1,000 a month is about 50 runs; Hunter's free 25 a month about 8.

**Replay (built for the stage).** Every answer from a live service is saved in `.data/cache` for 72 hours, keyed by exactly what was asked (`lib/cache.ts`). The same brief run again reads the saved answers: real companies, no requests, no network. The header says "Live data, replayed". Plan: one live run of the Glyph brief in the morning, present from the replay. `npm run fresh` deletes the saved answers. Replays do not depend on the order parallel lookups finish in (tested).

**Rate limits.** A 429 from Gemini is read for which quota was hit: per-minute is waited out and the feed says so, per-day retires the model for the session and the next in `GEMINI_MODELS` takes over. `LLM_CONCURRENCY` (3) caps calls in flight.

**Credits.** The balance starts from the Flexprice wallet and follows it down, but Connet also counts each spend itself, because a wallet does not move when the events have no price attached in Flexprice. The credits panel says which is happening.

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

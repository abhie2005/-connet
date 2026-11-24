# Handoff notes

Notes between Yoon Woo's Claude and Skylar's Claude. Newest entry first.

**To add an entry:** `git pull`, add a section at the top under this text, then
`git add HANDOFF.md && git commit -m "Handoff: <one line>" && git push`. Mark anything you need from the other side `[open]` and change it to `[done]` when it is dealt with.

---

## Nov 24, 04:00. Yoon Woo's Claude: logos in place of the white circles

**Why.** Yoon Woo, 03:30: "can you get the public photos of the schools instead of white circles?"

**Done (on `main`).** A company's disc on the graph, and its picture on the profile card, show the icon its own website publishes. A school with a one-word name ("UCLA") is tried as `name.edu`. No icon found: white, as before. Sample data shows none (its sites are not real). People keep their initials. 58 checks pass. Checked with stand-in pictures only: the real service could not be reached from where this was built.

**03:40, a crash and its fix.** On live data the graph threw "radius is negative" as soon as a cached logo arrived (his screenshot). Fixed in `e9d3d7c`; pull again.

**Need.**
- `[open]` Yoon Woo: `git pull`, `npm run clean`, `npm run dev`, then a live search, and say whether the logos look right (size, any wrong one).

## Nov 24, 03:50. Yoon Woo's Claude: a menu, a setting for the AI, keep or delete per claim (and a deep look, undone)

**Why.** Yoon Woo, 03:11 and 03:17: a setting for "how much is made up in the email by the AI"; a hamburger menu that slides in from the left with Target, Leads, Approve, Pipeline in it; "delete claims separately, what if someone wants to keep something"; and "the darker purple and some sort of blue that matches, a very rich vibe". At 03:24: "go back that's weird"; asked which look, he chose the light blue into purple.

**Done (on `main`).**
- **Menu.** The tab row is gone. The button at the top left (or the section name beside "Connet") slides a menu in from the left: the four sections and Settings.
- **Setting: "How much may the AI add on its own?"** Nothing (facts only; what is still unbacked is cut before you see it), A little (the default, as before), More (a sentence or two of its own pitch, marked for you). A number in no source is flagged at every setting. Applies to drafts written from then on.
- **Each unbacked claim has its own Keep and Delete.** Kept is shown as "Kept by you", never as backed, and is in the audit trail.
- **The look is the light blue into purple of the 03:20 entry.** The deep version was built (commit `d39a81d`) and reverted the same half hour at his word. Don't darken it again unless he asks.
- 55 checks pass. Checked in a browser on sample data only. "Nothing" and "More" have not been run on the live model yet.
- All of it is written up in `CLAUDE.md`.

**Need.**
- `[open]` Yoon Woo: `git pull`, `npm run clean` (or the old colors stay), `npm run dev`. Then try the setting on live data: set it, click Draft on a lead, look at the draft under Approve.
- `[open]` Skylar: the video should show the light blue-into-purple look and the menu. `docs/DEMO.md` now says "Menu, Target" and so on where it said "Target tab", and at 1:48 "Delete on one and Keep on another".

## Nov 24, 03:20. Yoon Woo's Claude: the whole app is blue into purple

**Why.** Yoon Woo, 02:56: "no like the whole thing make it peachy color" (peach had been made the accent only). Then at 03:02, before the peach version was pushed: "try purple and like a matching blue kind of vibe. Make sure it's appealing to the eyes".

**Done (on `main`).** No black anywhere now.
- One soft field behind the window, sky blue on the left into violet on the right. In "Your net" it turns purple all over (like Glyph's field changing with its mode).
- The work sits on white sheets. Deep indigo for text, the main button and the selected tab; violet for what is live; amber for what waits for you; scores still green, amber, red.
- The graph is drawn on the field: white discs for companies, dark dots for people, violet diamonds for reasons to write, white for the way in, the moving dots and the "draft waiting" ring.
- Only colors changed. Layout, words and behavior are as in the 03:00 entry. 51 checks pass. Checked in a browser on sample data only.
- The look is written up in `CLAUDE.md` ("The look: blue into purple").

**Need.**
- `[done]` Yoon Woo: `git pull`, `npm run clean`, `npm run dev` (superseded by the 03:45 entry).
- `[done]` Skylar: the video should show this look, not the black or peach one (superseded by the 03:45 entry). `docs/DEMO.md` at 1:38 now says "dashed white ring" where it said "yellow ring".

## Nov 24, 03:00. Yoon Woo's Claude: peach, scores out of 100, and a draft that shows what to delete

**Done (on `main`), all at Yoon Woo's request.**
- **The accent is Glyph's peach** (it was ice blue). "Waiting for you" is yellow now, so the two are not mistaken.
- **The match score reads "49/100"** and is green from 70, yellow from 45, red below.
- **The Approve card is two columns again**, nothing folded. A sentence that makes a claim nothing backs is struck out in red in the message, with one "Delete them" button; what the security check added is green. The long reviewer note is gone.
- LinkedIn photos in place of initials: not possible (no public way to fetch them, and scraping them is against LinkedIn's terms). Initials stay.
- 51 checks pass. Checked in a browser on sample data only.

**Need.**
- `[open]` Yoon Woo: `git pull`, `npm run clean`, `npm run dev`.
- `[done]` Skylar: the video should show the peach look (superseded by the 03:20 entry). One click changed in `docs/DEMO.md` at 1:48 (no more "Show proof").

## Nov 24, 02:40. Yoon Woo's Claude: every screen cut down

**Why.** Yoon Woo, looking at the profile card on live data: "Still too much going on", "it'll just make the judges get overwhelmed".

**Done (on `main`).** Each screen now opens on the few things that decide what to do; the rest is folded, one click away.
- **Profile card:** one column. Who to write to, why now, the way in. Folded: other people, why it scored, more proof.
- **Leads:** a row is a person, one line on why now, one button.
- **Approve:** the message, one line on what the second agent made of it, three buttons. "Show proof" opens the rest.
- **Above the graph:** the switch and one plain line of marks. The counts and captions are gone.
- 46 checks pass. Checked in a browser on sample data only.

**Need.**
- `[open]` Yoon Woo: `git pull`, `npm run clean`, `npm run dev`. Say which screen still feels busy.
- `[open]` Skylar: two clicks changed in `docs/DEMO.md`: at 1:20 open "Why it scored" in the card; at 1:48 click "Show proof" on the Summit Prep draft.

## Nov 24, 02:30. Yoon Woo's Claude: two nets, and a search that ran out of credits said nothing

**Done (on `main`).**
- **Two nets with a switch above the graph** (Yoon Woo's request: like Glyph's STEM | Humanities). **Glyph's net** is who the product is connected to. **Your net** puts the founder in the middle and everyone found on a ring: same school or employer, one introduction away, or no way in yet. Hover a person to read how they are tied. "Show on graph" for a warm way in turns to your net by itself.
- **Fixed:** with fewer than 5 credits, "Find my customers" did nothing and said nothing. It now says so on the start screen, with a "Top up 20 and search" button.
- 46 checks pass. Checked in a browser on sample data only.

**Need.**
- `[open]` Yoon Woo: `git pull`, `npm run clean`, `npm run dev`, and try the switch on your live run.
- `[open]` Skylar: `docs/DEMO.md` changed again at 1:20 and 1:38 (the graph turns to "Your net" for the warm way in, then back). The earlier `[open]` items still stand.

## Nov 24, 01:25. Yoon Woo's Claude: the name is Connet, and the screen is rebuilt to be easy

**What happened.** Yoon Woo ran it live (Gemini, Tavily, Hunter, Flexprice and Band all answer; Neo4j does not connect yet, the embedded graph stands in). He said it works but looks "complex and hard", like every other team's will, and asked for it to be much easier to use. He also renamed it: **Connet** (connect + network).

**Done (all on `main`).**
- **Name.** Connet everywhere it shows, with a new logo. Nobody needs to edit `.env.local`: the old value "Tact" there counts as not set. The repo name, the `TACT_*` settings and the Band agents' names stay as they are.
- **Leads tab** opens on one card, "Best to contact first", then the rest in order. One button per row. A line at the top of every tab says what to do next.
- **Tabs renamed** to the order of the work: Target, Leads, Approve, Pipeline (were Brief, Accounts, Approvals, Pipeline).
- **Profile card** for every company and person (click a row, or anything on the graph): score bars, who to write to, address, LinkedIn, why now, proof. Arrow keys flip through them.
- **Graph.** Dots run from Glyph to the person when a draft is written. An amber ring means a draft is waiting for approval. A clearer legend. A "Best first" flag.
- **"Enrich" is now "Find emails".** The agent drafts for the best three on its own (was five), so there are leads left to click **Draft** on.
- The agents' feed is one line until it is clicked open.
- 40 checks pass. Checked in a browser on sample data only. Yoon Woo has not seen it yet.

**Need.**
- `[open]` Yoon Woo: `git pull`, `npm run clean`, `npm run dev`. Say what still feels hard.
- `[open]` Yoon Woo: Neo4j. The username line in `.env.local` was doubled (`NEO4J_USERNAME=NEO4J_USERNAME=neo4j`); after fixing it, run `npm run doctor` once. If it still fails, leave it: the demo does not need it.
- `[open]` Skylar: `docs/DEMO.md` is rewritten for the new screen (new tab names, the profile card, a Draft click at 1:38, and "click the Agents bar open" at 0:20). Re-read it before recording. The video should say Connet.
- `[done]` The first live run, Band, and Gemini billing from the entries below.

## Nov 23, 23:48. Yoon Woo's Claude: the repo is public, setup commands

**Done.** The repo is live at https://github.com/yoonwoo-lee/tact-gtm. Two new commands: `npm run setup:flexprice` and `npm run setup:band` do the dashboard setup from one key each (see the README). 37 checks pass. Yoon Woo is collecting keys now.

**Need.**
- `[open]` Skylar: clone the repo, `npm install`, `npm run demo`. No keys needed. Then the items in the entry below.

## Nov 23, 23:12. Yoon Woo's Claude: live paths tested, replay

**Done.**
- The code that talks to Gemini, Tavily, Hunter, Flexprice and Band now runs in the tests against stand-ins that answer in each service's documented format (`tests/live.test.ts`). 33 checks pass. The real services are still untested.
- Rate limits are handled: a per-minute limit is waited out, a per-day limit moves to the next model.
- Replay: every live answer is saved on the machine; the same brief run again needs no network and says "Live data, replayed".
- The model is shown the paragraphs of a page that bear on the question, not its first 2,200 characters.
- The credit gate counts down even when the Flexprice wallet does not.

**Found.** One live run is about 35 model calls and 20 searches. A free Gemini key will probably not finish one.

**Need.**
- `[done]` Yoon Woo: turn on Gemini billing (the $5) before the first live run.
- `[open]` Skylar: for the video, sample data (`npm run demo`) still works with no keys. If Yoon Woo gets a live run done first, record from the replay instead: real companies look better.

## Nov 23, 22:53. Yoon Woo's Claude: first build

**What happened.** The organizer's email on Nov 23 named the problem statement: an AI go-to-market engine, not open "AI for productivity". Glyph does not answer it, so Yoon Woo asked for the engine to be built overnight. Pre-building is allowed. Glyph is the product it sells in the demo.

**What is here.** The whole loop: product intake, ICP with confidence, discovery with checked quotes, a knowledge graph (Neo4j when connected, embedded otherwise), enrichment, reviewed drafts, an approval queue, a pipeline board with analytics and an audit record, credit metering. It runs end to end on sample data with no keys. 20 checks pass.

**The look.** Black and grey with one ice-blue accent, at Yoon Woo's request at 22:40 (it started in Glyph's colors). See "The look" in `CLAUDE.md` before changing anything visual.

**What is not proven.** Nothing has been run against the live services yet. See "Status" in `CLAUDE.md`.

**For Skylar's side:**

- `[open]` Read `docs/DEMO.md` and rewrite the spoken lines in your own words. The order of clicks should stay: it follows the judging weights.
- `[open]` Record the 2 to 3 minute video on sample data: `npm install`, then `npm run demo`, open http://localhost:3000. No keys needed.
- `[open]` Read `docs/ARCHITECTURE.md` as a judge would and note anything unclear here.
- `[open]` The "who pays and why" answer for startup viability: buyer, price per result, why now. Three sentences for the pitch.
- `[open]` Both of you: finish the AWS Builder registration from the organizer's email ("CRITICAL STEP") and bring a physical ID.

**For Yoon Woo's side:**

- `[done]` First live run on the Mac: `npm run doctor`, then `npm run dev`.
- `[done]` Band: register four agents (Planner, Builder, Reviewer, Security), put their keys and the room id in `.env.local`.

# Handoff notes

Notes between Yoon Woo's Claude and Skylar's Claude. Newest entry first.

**To add an entry:** `git pull`, add a section at the top under this text, then
`git add HANDOFF.md && git commit -m "Handoff: <one line>" && git push`. Mark anything you need from the other side `[open]` and change it to `[done]` when it is dealt with.

---

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
- `[open]` Yoon Woo: turn on Gemini billing (the $5) before the first live run.
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

- `[open]` First live run on the Mac: `npm run doctor`, then `npm run dev`.
- `[open]` Band: register four agents (Planner, Builder, Reviewer, Security), put their keys and the room id in `.env.local`.

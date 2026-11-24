# Handoff notes

Notes between Yoon Woo's Claude and Skylar's Claude. Newest entry first.

**To add an entry:** `git pull`, add a section at the top under this text, then
`git add HANDOFF.md && git commit -m "Handoff: <one line>" && git push`. Mark anything you need from the other side `[open]` and change it to `[done]` when it is dealt with.

---

## Nov 23, 23:15. Yoon Woo's Claude: first build

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

# Demo script (2 to 3 minutes)

One line to open with: **"Every team here built an agent that sends email. Ours decides whether it should."**

Three ways to run it, best first:

1. **Live, replayed (the one to aim for on stage).** In the morning, with keys and good wifi, run the Glyph brief once on live data (`npm run dev`). Every answer is saved on the laptop. On stage, run the same brief again: real companies, real quotes, no network needed, and it cannot hit a rate limit. The header says "Live data, replayed".
2. **Live.** The same, with nothing saved yet. Needs wifi and Gemini quota (about 35 model calls and 20 searches a run).
3. **Sample data** (`npm run demo`). Invented companies, no keys, no network. Use it for the video if live is not ready, and as the last fallback.

The header always says which one is running, so nothing is passed off as something it is not.

Before recording: click **New brief** so the workspace is empty, and set the browser to about 1440 wide.

## The run

| Time | Do | Say | Scores under |
|---|---|---|---|
| 0:00 | Empty first screen. | "This is Tact. You describe what you sell. It finds who to sell to, proves why, and drafts the message. A person approves every send." | Startup viability |
| 0:10 | Click **Use the Glyph example**, then **Find my customers**. | "We're selling Glyph, the paper AI tutor we built last week. One sentence is all it gets." | ICP & discovery |
| 0:20 | Watch the graph draw itself and the agents talk on the left. | "Four agents: a planner, a builder, a reviewer and a security check. Everything they find goes into a knowledge graph, live. That's Neo4j." | Technical execution |
| 0:40 | Point at the reviewer line: "checked N quotes ... M not found and dropped". Click it open. | "Here's the first thing other builds don't do. Every fact has to come with a quote, and plain code checks that the quote is really on the page. This one wasn't, so it's gone. The model cannot make a customer up." | ICP & discovery |
| 0:55 | **Brief** tab. Confidence bars; one suggested segment. Click **Accept**. | "The ICP comes with how sure it is and why. It suggests markets we didn't ask for, and I decide." | ICP & discovery |
| 1:10 | **Accounts** tab. Point at the three sections. | "Ranked by fit and by intent. And the second thing: an account with no reason to write today is held. One with a bad sign is left out. No reason, no email." | Enrichment & outreach |
| 1:25 | Open Brightpath. Score breakdown, then **Show on graph**. | "Every point of the score has a reason. And this is the graph earning its place: the buyer went to UCLA, so did I. That lit line is a four-hop query, and it becomes the first line of the email." | Enrichment & outreach |
| 1:45 | **Approvals** tab. Open the Summit Prep draft. | "Third thing. A second agent reviews every draft against the facts. The first version claimed scores rose thirty percent. Nothing we found says that, so it was sent back and rewritten. Each claim links to its proof." | Enrichment & outreach |
| 2:05 | Click **Approve and send** on Brightpath. | "Nothing leaves without a person. Approving moves the deal, and the audit trail records that I did it, not the agent." | Dashboard |
| 2:15 | **Pipeline** tab. **Log a reply**, paste "This looks interesting, can we talk next week?" | "A reply comes in. The agent reads it, moves the deal, and asks the graph a new question: who does she know? Two former colleagues at other target accounts. Two warm introductions." | Dashboard |
| 2:35 | Scroll to the funnel, the agent vs rep split, the audit record. Click the credits pill. | "Conversion by stage and segment, what the agent did and what I did, and every action metered through Flexprice. Out of credits, the agent stops." | Dashboard, Flexprice bonus |
| 2:50 | Back to the graph. | "Tact. The agent that thinks before it sends." | |

## If they ask

- **"Is that real data?"** The header says which. "Live data, replayed" means real pages found on the live web this morning, read back from the laptop so the wifi cannot break the demo. "Sample data" is an invented market. The quote check works the same way on all of them.
- **"What stops it hallucinating?"** The model proposes, code verifies. A fact without a word-for-word quote from a page we fetched is dropped and counted. Numbers in an email must appear in the facts.
- **"Why a graph and not a table?"** Warm paths and referrals are path questions: founder to school to person to company. In SQL that is a pile of self-joins; in Cypher it is one pattern. The queries are in `lib/graph/cypher.ts` and each run shows in the feed.
- **"Does it actually send email?"** Not in this build, on purpose. Approval records the send. Connecting a mailbox is one function (`decideMessage` in `lib/pipeline.ts`).
- **"Who pays for this?"** A founder doing their own sales, or a two-person sales team. They pay per result: credits for a discovery run, an enriched lead, a drafted message. That is what the Flexprice metering is for.
- **"How is this different from Clay or Apollo?"** Those are databases with sequences on top. Tact starts from the product, shows its proof for every claim, and refuses to write when there is no reason to.
- **"What would you build next?"** Mailbox and calendar connections, CRM sync, and learning from which approved messages got replies.

## Mapping to the scoring

| Criterion | Weight | Where it shows |
|---|---|---|
| ICP & discovery | 20% | Brief tab (confidence, reasons, expansions), quotes with sources on every account |
| Enrichment & outreach | 20% | Hunter contacts with verification status, warm paths, reviewed drafts, the approval gate |
| Dashboard | 15% | Pipeline board, funnel, by segment and tier, variant test, agent vs rep, audit record |
| Startup viability | 15% | A clear buyer, pricing per result, a reason to trust it |
| Technical execution | 10% | Live graph, Cypher reasoning, tests, fallbacks, `npm run doctor` |
| Band bonus | +20 | Four agents with hand-offs, mirrored to a Band room when keys are set |
| Flexprice bonus | +20 | Usage events per action, wallet balance, the credit gate and top-up |

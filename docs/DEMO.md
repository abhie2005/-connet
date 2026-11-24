# Demo script (2 to 3 minutes)

One line to open with: **"Every team here built an agent that sends email. Ours decides whether it should."**

Three ways to run it, best first:

1. **Live, replayed (the one to aim for on stage).** In the morning, with keys and good wifi, run the Glyph brief once on live data (`npm run dev`). Every answer is saved on the laptop. On stage, run the same brief again: real companies, real quotes, no network needed, and it cannot hit a rate limit. The header says "Live data, replayed".
2. **Live.** The same, with nothing saved yet. Needs wifi and Gemini quota (about 35 model calls and 20 searches a run).
3. **Sample data** (`npm run demo`). Invented companies, no keys, no network. Use it for the video if live is not ready, and as the last fallback.

The header always says which one is running, so nothing is passed off as something it is not.

Before recording: click **New search** so the workspace is empty, and set the browser to about 1440 wide.

## The run

| Time | Do | Say | Scores under |
|---|---|---|---|
| 0:00 | Empty first screen. | "This is Connet. You describe what you sell. It finds who to sell to, proves why, and drafts the message. A person approves every send." | Startup viability |
| 0:10 | Click **Use the Glyph example**, then **Find my customers**. | "We're selling Glyph, the paper AI tutor we built last week. One sentence is all it gets." | ICP & discovery |
| 0:20 | Click the **Agents** bar at the bottom left to open it. Watch the graph draw itself and the agents talk. Near the end, dots run from Glyph to three people. | "Four agents: a planner, a builder, a reviewer and a security check. Everything they find goes into a knowledge graph, live. That's Neo4j. Those dots are drafts being written." | Technical execution |
| 0:40 | Point at the reviewer line: "checked N quotes ... M not found and dropped". Click it open. | "Here's the first thing other builds don't do. Every fact has to come with a quote, and plain code checks that the quote is really on the page. This one wasn't, so it's gone. The model cannot make a customer up." | ICP & discovery |
| 0:52 | Menu (top left), **Target**. Confidence bars; one suggested segment. Click **Accept**. | "The ICP comes with how sure it is and why. It suggests markets we didn't ask for, and I decide." | ICP & discovery |
| 1:05 | Menu, **Leads**. Point at the card on top, then open **Left out**. | "It doesn't hand me a database. It tells me who to write to first, and why today. And the second thing: a company with no reason to write is put on hold. One with a bad sign is left out. No reason, no email." | Enrichment & outreach |
| 1:20 | Click **View profile**. Open **Why it scored**, then click **Show on graph** (the graph turns to **Your net** by itself). | "Every company and person has a card: who to write to, why now, the way in. Every point of the score has a reason. And this is the graph earning its place. It has two sides: who the product is connected to, and who I am. This is mine. The buyer went to UCLA, so did I: inner ring. The next ring is one introduction away. That lit line becomes the first line of the email." | Enrichment & outreach |
| 1:38 | Click **Glyph's net** to turn the graph back. Click **Draft** on the fourth lead. Watch the dots, then the dashed white ring. | "I ask for one more. It's written, checked, and it stops. That ring means it's waiting for me." | Enrichment & outreach |
| 1:48 | Click **Review them** (or menu, **Approve**). Scroll to the Summit Prep draft. Point at "Taken out before you saw it" on its right. (On a live draft with red, struck-out sentences, click **Delete** on one and **Keep** on another.) | "Third thing. A second agent reviews every draft against the facts. The first version claimed scores rose thirty percent. Nothing we found says that, so it was sent back and rewritten. Each claim links to its proof." | Enrichment & outreach |
| 2:05 | Click **Approve and send** on Brightpath. | "Nothing leaves without a person. Approving moves the deal, and the audit trail records that I did it, not the agent." | Dashboard |
| 2:15 | Menu, **Pipeline**. **Log a reply**, paste "This looks interesting, can we talk next week?" | "A reply comes in. The agent reads it, moves the deal, and asks the graph a new question: who does she know? Two former colleagues at other target accounts. Two warm introductions." | Dashboard |
| 2:35 | Scroll to the funnel, the agent vs rep split, the audit record. Click the credits pill. | "Conversion by stage and segment, what the agent did and what I did, and every action metered through Flexprice. Out of credits, the agent stops." | Dashboard, Flexprice bonus |
| 2:50 | Back to the graph. | "Connet. The agent that thinks before it sends." | |

## If they ask

- **"Is that real data?"** The header says which. "Live data, replayed" means real pages found on the live web this morning, read back from the laptop so the wifi cannot break the demo. "Sample data" is an invented market. The quote check works the same way on all of them.
- **"What stops it hallucinating?"** The model proposes, code verifies. A fact without a word-for-word quote from a page we fetched is dropped and counted. Numbers in an email must appear in the facts.
- **"Why a graph and not a table?"** Warm paths and referrals are path questions: founder to school to person to company. In SQL that is a pile of self-joins; in Cypher it is one pattern. The queries are in `lib/graph/cypher.ts` and each run shows in the feed.
- **"Does it actually send email?"** Not in this build, on purpose. Approval records the send. Connecting a mailbox is one function (`decideMessage` in `lib/pipeline.ts`).
- **"Who pays for this?"** A founder doing their own sales, or a two-person sales team. They pay per result: credits for a discovery run, an enriched lead, a drafted message. That is what the Flexprice metering is for.
- **"How is this different from Clay or Apollo?"** Those are databases with sequences on top. Connet starts from the product, shows its proof for every claim, and refuses to write when there is no reason to.
- **"What would you build next?"** Mailbox and calendar connections, CRM sync, and learning from which approved messages got replies.

## Mapping to the scoring

| Criterion | Weight | Where it shows |
|---|---|---|
| ICP & discovery | 20% | Target tab (confidence, reasons, expansions), quotes with sources on every lead |
| Enrichment & outreach | 20% | Profile cards (Hunter contacts with verification status, LinkedIn), warm paths, reviewed drafts, the approval gate |
| Dashboard | 15% | Pipeline board, funnel, by segment and tier, variant test, agent vs rep, audit record |
| Startup viability | 15% | A clear buyer, pricing per result, a reason to trust it, and a screen that says what to do next |
| Technical execution | 10% | Live graph, Cypher reasoning, tests, fallbacks, `npm run doctor` |
| Band bonus | +20 | Four agents with hand-offs, mirrored to a Band room when keys are set |
| Flexprice bonus | +20 | Usage events per action, wallet balance, the credit gate and top-up |

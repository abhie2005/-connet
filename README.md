# Tact

**The go-to-market agent that thinks before it sends.**

Describe your product in plain words. Tact works out who should buy it, finds real accounts and the people to talk to, proves every fact with a quote from its source, looks for a warm way in before it writes a cold email, and drafts outreach that you approve. Everything it learns goes into a knowledge graph you can watch being built.

Built for HackwithBay 4.0 ("Thoughtful Agents for Productivity") by Yoon Woo and Skylar.

## What makes it different

1. **It cannot make things up.** The model only proposes facts. Each one must come with a quote, and plain code checks that the quote is on the page it cites, word for word. No match, no fact. A company with no checked quote does not appear at all.
2. **It needs a reason to write.** An account with no buying signal is held, not emailed. An account that shows a bad fit (a hiring freeze, a do-not-contact) is left out and the agent refuses to draft for it.
3. **It looks for a warm way in.** The graph links the founder's schools and past employers to people at target accounts, and after a reply it finds former colleagues of that person at other accounts ("ask Maya for an introduction to Hannah").
4. **Every draft is reviewed before you see it.** A second model call checks each claim against the checked facts, and plain code rejects any number that is not in them. One rewrite is allowed; after that the draft comes to you marked "needs you". A security pass checks links and adds a way to opt out. Nothing is sent without your approval.

## Run it

Needs Node 20 or newer.

```bash
npm install
cp .env.example .env.local     # then paste in the keys you have
npm run doctor                 # checks each key with one small real call
npm run dev                    # http://localhost:3000
```

No keys yet, or no network at the venue:

```bash
npm run demo                   # the whole app on sample data, no network
```

For the demo itself, the production build is faster and has no dev overlay:

```bash
npm run build && npm start
```

Other commands: `npm test` (35 checks, no network: the sample run, plus the live code run against stand-ins for every service), `npm run smoke` (the whole run printed in the terminal), `npm run lint`, `npm run clean` (clears the build cache: use it if the page looks out of date after a pull), `npm run fresh` (deletes the saved answers, see below).

## Keys

Every key is optional. A missing key switches that one part to sample data, and the page says so (the "Sample data" pill at the top right lists what is live).

| Key in `.env.local` | What it turns on | Where to get it |
|---|---|---|
| `GEMINI_API_KEY` | The model: ICP, extraction, writing, review | aistudio.google.com/apikey |
| `TAVILY_API_KEY` | Live web search with page text to check quotes against | tavily.com |
| `HUNTER_API_KEY` | Business email addresses and their verification status | hunter.io |
| `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD` | Neo4j as the graph database; reasoning queries run there in Cypher | console.neo4j.io (Aura free) |
| `FLEXPRICE_API_KEY` | Usage events sent to Flexprice; the credit gate reads the Flexprice wallet | flexprice.io |
| `BAND_CHAT_ID`, `BAND_API_KEY_*` | The agents' conversation mirrored into a Band room | band.ai |

**Never commit `.env.local`.** It is in `.gitignore`.

### What a run costs, and replay

One run on live data makes about **35 model calls, 20 web searches and up to 3 Hunter lookups**. That matters:

- **Gemini.** A free key allows few requests a minute and a small number a day per model. Tact waits out a per-minute limit (the feed says so) and moves to the next model in `GEMINI_MODELS` when one runs out for the day, but a free key may not finish a run. Adding billing in Google AI Studio (the smallest top-up) removes the problem. On a free key, set `LLM_CONCURRENCY=1`.
- **Tavily.** The free plan's 1,000 searches a month is about 50 runs.
- **Hunter.** The free plan's 25 domain searches a month is about 8 runs' worth.

So every answer from a live service is **saved on this machine** (`.data/cache`, 72 hours). Running the same brief again reads the saved answers: the same real companies and quotes, no requests spent, no network needed. The header then says "Live data, replayed", and the connections panel says how many lookups were replayed. Change the brief and only the new questions go out. `npm run fresh` deletes the saved answers; `TACT_CACHE=0` turns saving off.

For a demo: run your brief once on live data while the wifi is good, then present from the replay.

### Flexprice setup (about five minutes)

1. Create a customer whose external id is `tact-demo` (or set `FLEXPRICE_CUSTOMER_ID`).
2. Create metered features with these event names: `discovery.run`, `lead.enriched`, `outreach.drafted`, `outreach.sent`, `graph.query`.
3. Give the customer a wallet with some credits. Tact starts from that balance and stops paid steps at zero. If the events have no price attached in Flexprice, the wallet does not move by itself; Tact then keeps its own count from the wallet's starting balance, and the credits panel says so.
4. `npm run doctor -- --event` sends one test event and reads the wallet.

Without a wallet, events are still metered in Flexprice and the gate uses the local balance.

### Band setup

Create a room in Band, register four external agents named Planner, Builder, Reviewer and Security, add them and yourself to the room, and put the room id and the four agent keys in `.env.local`. Every hand-off between agents is then posted in the room with an @mention.

## How a run goes

1. **Brief.** The planner reads the product and writes the ideal customer profile: industries (with NAICS codes), company size, personas, trigger events, signs of a bad fit, each with a confidence. It also suggests adjacent segments, which you accept, adjust or dismiss.
2. **Accounts.** The builder searches each segment and extracts companies, each fact with a quote. The verifier keeps only what is on the page.
3. **Signals and people.** One more search per account for fresh buying signals, one for the people in the roles the ICP names, and one for people who share a school or employer with the founder.
4. **Competitors.** Positioning, pricing where the page states it, and how the product differs.
5. **Graph reasoning.** Multi-hop queries: warm paths, accounts using a competitor, signals per account. Then a fit and intent score from 0 to 100, as plain arithmetic you can read, and a tier.
6. **Outreach.** The best accounts are enriched (metered) and drafted (metered). Each draft is reviewed, rewritten once if needed, security-checked, and queued for you.
7. **Pipeline.** Approve, edit or reject. Log a reply and the agent reads it, moves the account, and looks for referral paths. Every move is recorded with who made it, the agent or you.

## What is real and what is simulated

- **Sending is simulated.** Approving a message records it as sent and moves the account. Nothing leaves the machine. This is deliberate: a demo should not email strangers.
- **Sample data is invented.** With no keys, the companies and people are made up (domains end in `.example`) and labeled as sample pages.
- **Replies are pasted in by the rep.** There is no inbox connection.
- **Tested here:** the whole pipeline on sample data; the live code for Gemini, Tavily, Hunter, Flexprice and Band against stand-ins that answer in each service's documented format, including rate limits, a refused setting, a model the key cannot use and a reply that is not JSON (`tests/live.test.ts`); the Cypher, with Neo4j's own syntax checker; every screen in a browser; the production build. **Not tested by the author:** the real services themselves, because the build machine could not reach them. `npm run doctor` checks each one on your machine.

## Where things are

| Path | What it holds |
|---|---|
| `lib/pipeline.ts` | The run, start to finish, and every action the rep can take |
| `lib/agents/` | ICP, discovery (accounts, people, competitors), outreach (writer, reviewer, security) |
| `lib/verify.ts` | The quote check that every fact has to pass |
| `lib/score.ts` | Fit and intent scoring |
| `lib/graph/` | The graph: `cypher.ts` (the reasoning queries), `index.ts` (Neo4j), `memory.ts` (embedded fallback) |
| `lib/providers/` | Gemini, Tavily, Hunter, Flexprice, Band: each with a fallback |
| `lib/cache.ts` | Saved answers from live services, for replay |
| `lib/passages.ts` | Picks the paragraphs of a long page that bear on the question |
| `lib/sample/` | The invented sample market |
| `lib/store.ts` | The workspace, the activity feed, the audit trail, credits |
| `app/api/` | `state` (polled by the page), `run`, `action` |
| `components/` | The page: live graph, agent feed, brief, accounts, approvals, pipeline |
| `scripts/doctor.ts` | Checks your keys |
| `docs/ARCHITECTURE.md` | System design: ontology, queries, reasoning loops |
| `docs/DEMO.md` | The demo script |

## Stack

Next.js 16 (App Router), React 19, Tailwind CSS 4, Radix UI, d3-force on canvas, Neo4j (with an embedded fallback), Gemini, Tavily, Hunter.io, Flexprice, Band, Snyk in CI.

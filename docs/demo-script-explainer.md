# Demo Script: The Explainer

A second cut, alongside [demo-script.md](demo-script.md). That one is a story told almost entirely through the conversation. This one explains: the problem, one round, how Trivi works, three uses, then how it's built. Judges may stop at 3:00 and score tech implementation first on ties, so the technical section has to start by 2:15, and the AWS and MCP names also appear once early (scene 3) in case they stop.

**One-liner:** Hey Trivi is a family game show that keeps score, and the points get spent on the fun stuff.

**Voices:** three. A narrator (VO), Dad on camera, and Trivi, the host. Trivi is the simulator's speaker voice (Polly). Nobody says "Alexa" and no Echo appears: the hackathon rules ban third-party marks without permission, and that question is still open. The simulator's "Alexa+ simulator. Not an Amazon product." label stays in frame.

**The family:** Mom, Dad, Sally (9), and John (12). These are the store seed's players, so live play works without re-seeding. Parent phrase: "purple pancakes."

**On screen:** the `/demo` stage on a laptop or tablet at the end of the dinner table, and the parent page on Mom's phone. The MCP button in the stage header opens the protocol panel; use it in scenes 2 and 7.

**Word budget:** about 435 spoken words, which is 2:55 at 150 a minute with no pauses. That's tight once the drumroll and on-screen beats are in, so expect to trim. Each scene lists its target. If a take runs long, cut from scenes 4 to 6, never from 7.

---

## 1. The problem (0:00–0:20) · ~55 words

*On screen:* Dinner. John and Sally talking over each other. Dad reaches for his phone to look it up; everyone loses interest.

**VO:** Every family has the same three arguments. Who's right. Whose turn it is. Who picks the movie. Usually someone looks it up on a phone, and nobody learns a thing.

*On screen:* The phone goes face down. The stage lights up; the marquee lights chase.

**VO:** Hey Trivi turns those arguments into a game show. Everyone guesses, Trivi judges, and the score is kept from day to day.

## 2. One round (0:20–0:45) · ~60 words

**DAD:** Trivi, how many teeth does a snail have? I say zero. Mom says ten. John says a hundred. Sally says ten thousand.

**TRIVI:** Drumroll… A garden snail has about fourteen thousand tiny teeth. Sally is closest! That's a point for Sally, and she's tied with John for the lead.

*On screen:* Glow hops. Sally's row on the leaderboard lights up and moves up. Sally does a victory lap around the table.

*On screen (2 seconds):* Dad taps the MCP button. The panel shows `tools/call record_round` and its result. Close it.

## 3. How Trivi works (0:45–1:05) · ~55 words

*On screen:* A simple three-part graphic, built up one part at a time: a speaker, a scoreboard, a phone.

**VO:** Trivi has three parts. The voice assistant is the host: it asks, listens, and judges every guess, fairly for every age. A scoreboard server on AWS keeps every point, chore, and deal, so nothing gets made up or forgotten. And a parent page sets the rules.

*Caption on the scoreboard part:* MCP server · AWS Lambda · DynamoDB

**VO:** Guessing first, even guessing wrong, is what makes a fact stick.

## 4. Settle a bet (1:05–1:30) · ~55 words

*On screen:* John and Sally, mid-argument.

**JOHN:** Sharks are older than trees.

**SALLY:** No way.

**DAD:** Trivi, settle it. Loser does the dishes. Which came first, sharks or trees? John says sharks. Sally says trees.

**TRIVI:** John's right! Sharks have been around for more than 400 million years. That's older than the first trees. Sally, the dishes are yours tonight.

*On screen:* "Owes: dishes tonight" appears under Sally's name. Sally groans.

## 5. Theme week (1:30–1:55) · ~55 words

*On screen:* Mom opens the settings drawer and taps Ask Trivi.

**MOM** *(typing or speaking)***:** The kids are into space this week. Make six questions and riddles for a 9 and a 12 year old. And rest the dinosaur theme.

*On screen:* "Writing…" then "Double-checking…". The draft appears. One question is flagged: the blind checker gave a different answer, so it's left out. Mom skims and presses Save. The dinosaur theme shows Paused.

**VO:** One model writes the questions. Another answers them without the key, and a third checks the facts. Nothing reaches the kids until a parent saves it.

**DAD:** Trivi, play the space theme.

**TRIVI:** I'm a star, but you'll never see me at night. What am I?

**SALLY:** The sun!

## 6. Points that mean something (1:55–2:15) · ~50 words

*Caption:* Friday.

**DAD:** Sally's spending 5 points to pick the movie.

**TRIVI:** I need a parent's OK for that. What's the phrase?

**DAD** *(quietly)***:** Purple pancakes.

**TRIVI:** Done! Sally picks tonight's movie.

**DAD:** And Sally will give John 2 points to do her dishes.

**TRIVI:** John, is it a deal?

**JOHN:** Deal.

*On screen:* Mom's phone, the parent page: points history shows the spend and the trade. Settings show "Reset points: weekly." (2 seconds; no VO needed.)

## 7. How it's built (2:15–2:55) · ~95 words

*On screen:* The architecture diagram (see below), each box lighting up as it's named. Cut to the protocol panel scrolling `initialize`, `tools/list`, `tools/call` during the second paragraph.

*Caption:* MCP 2025-11-25 · Streamable HTTP

**VO:** Hey Trivi is an MCP server running on AWS Lambda. The assistant hosts and calls our tools: start a round, record it, spend, trade. The server applies the rules and keeps the record in DynamoDB, so the model can't invent a score.

**VO:** Parents sign in with Amazon Cognito. That same token links the account, so every family uses one URL and gets their own household. The scoreboard ships as an MCP App.

**VO:** Our simulator stands in for Alexa+: Amazon Nova hosts, Amazon Polly speaks. Deployed with CDK, hosted on Amplify, built with Kiro.

## 8. End card (2:55–3:00)

*Title card:* **Hey Trivi.** Settle it with a question. · github.com/… · Built with Kiro on AWS

---

## The architecture diagram (scene 7)

Left to right, three columns:

| Family | Host | Hey Trivi on AWS |
|---|---|---|
| Speaker and display (the simulator, standing in for Alexa+) | Amazon Nova 2 Lite: judges guesses, picks tools, speaks only through a `say` tool | MCP server on Lambda (function URL, Streamable HTTP) → DynamoDB single table |
| Parent page (Amplify) | Ask Trivi and the theme helper: Claude Haiku 5.5 writes and answers blind, Claude Sonnet 5.5 fact-checks | Cognito: parent sign-in, the bearer token, OAuth discovery for account linking |
| | Amazon Polly: the voice | Scoreboard MCP App (`ui://hey-trivi/scoreboard`) · CDK · Kiro specs and steering |

Arrows: speaker → host model → `tools/call` → MCP server. Parent page → `/parent` API → same MCP server and table. Keep the nine tool names in small type under the server box: `get_household`, `add_player`, `start_round`, `record_round`, `complete_chore`, `spend_points`, `transfer_points`, `show_scoreboard`, `list_packs`.

## Before recording

| Script moment | Check |
|---|---|
| Snail teeth (scene 2) | "About 14,000" is the usual figure for the garden snail. Confirm the host says it, and that it awards Sally as closest; the "closest number wins" rule isn't in `record_round`'s description yet (see demo-script.md). |
| Sharks before trees (scene 4) | Dad asks the question himself, so this is a `family` round with a chore stake (`start_round` mode `family`). Confirm the host starts it that way rather than recording a round with no stake. |
| "Theme" | Done (decisions #32): the parent page, Ask Trivi, and the host say "theme", and the stage's look is now the "Look" tab. Check the host plays the space theme when Dad asks by that name. |
| Ask Trivi pausing a theme (scene 5) | Ask Trivi can turn packs on and off (decisions #31). Confirm it does both in one request, or split Mom's line in two. |
| Flagged question left out | Ask Trivi leaves flagged questions out on save. Make sure one actually gets flagged on the take, or cut that half sentence. |
| Sally's movie spend | Sally needs at least 5 points by Friday. Set balances on the parent page before the take. |
| End card | Add the repo URL. |
| Length | Read scenes 1 to 7 aloud against a timer before filming. Over 2:55 means cutting from 4 to 6. |

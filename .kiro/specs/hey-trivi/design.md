# Hey Trivi — Design

## Overview

```
Family ──voice──► Simulator (Next.js on Amplify)
                    │  model: Bedrock Nova 2 Lite
                    │  speech out: Polly
                    │  MCP client ──Streamable HTTP──► MCP server (Lambda + function URL)
                    │                                    │
Parent ──browser──► Parent page (same Next.js app)       ├─► DynamoDB (one table)
                    │  sign-in: Cognito                  │
                    └─► pack request ──┐                 └─► pack-worker (Lambda, async)
                                       └────────────────────► pack-agent (Strands on AgentCore)
                                                                 │  model: Bedrock
                                                                 └─► DynamoDB (writes the pack)
```

In real Alexa+, the simulator box is replaced by Alexa+ itself. Nothing in the MCP server may depend on the simulator.

## Data model

One DynamoDB table. Partition key PK, sort key SK.

| Item | PK | SK | Main fields |
|---|---|---|---|
| Household | HH#\<id\> | META | showTitle, pointSettings, openRoundId, timeZone, resetSchedule, periodStart, phraseHash, phraseSalt, phraseRequiredFor, phraseFailures |
| Player | HH#\<id\> | PLAYER#\<playerId\> | name, role, gradeBand, balance, lifetime, streak |
| Round | HH#\<id\> | ROUND#\<time\>#\<roundId\> | mode, stake, question, correctAnswer, explanation, source, packId, guesses, status, tiebreakOf |
| Chore | HH#\<id\> | CHORE#\<choreId\> | label, owedBy, status, roundId, transferredFrom |
| Ledger entry | HH#\<id\> | LEDGER#\<time\> | playerId, change, reason, roundId |
| Pack | HH#\<id\> | PACK#\<packId\> | title, topic, forPlayerId, status, failReason |
| Pack question | HH#\<id\> | PACK#\<packId\>#Q#\<n\> | question, answer, accept, explanation, difficulty, usedAt |
| News | HH#\<id\> | NEWS#\<time\> | text, seen |
| Period result | HH#\<id\> | PERIOD#\<periodStart\> | leader, finalBalances |
| User link | USER#\<cognitoSub\> | META | householdId |
| Dev token | TOKEN#\<token\> | META | householdId (local mode only) |

`get_household` is one query on `PK = HH#<id>` with a filter that skips closed rounds, ledger entries, pack questions, and period results.

## MCP tools

Descriptions must use family phrases, because the assistant picks tools by description.

| Tool | When the host calls it | Input | Returns |
|---|---|---|---|
| get_household | Start of every session. "Let's play...", "what's the score" | none | players, scores, open chores, open round, packs, news |
| add_player | "Add Grandma to the game" | name, role, gradeBand? | players |
| start_round | "Ask us one", "quiz us", "for the garbage", "riddles", or a tiebreak | mode, packId?, stake?, players?, tiebreakOf? | roundId, question, answerKey, or needsHostQuestion |
| record_round | After guesses are in. "Mom says... Dad says..." | roundId? or question; correctAnswer; explanation?; guesses[player, guess, verdict]; stake?; idempotencyKey? | awarded points, scoreboard, outcome, scoreboard UI |
| complete_chore | "John took out the garbage" | choreId or player + label | open chores |
| spend_points | "Sally spends 3 points to pick the movie" | player, amount, reason, parentPhrase? | new balance |
| transfer_points | "I'll give Sally 3 points", "I'll pay John 2 points to take the garbage for me" | from, to, amount, reason, choreId?, parentPhrase? | both balances, the chore if it moved |
| show_scoreboard | "Show the scores" | none | scoreboard, scoreboard UI |
| request_pack | "Build a fractions pack for Sally" | topic, forPlayer?, count? | pack with status building |
| list_packs | "What packs do we have" | none | packs with status and remaining count |

`outcome` on `record_round` is one of: `none`, `settled` (with winner or loser, and the chore if one was created), or `tiebreak_needed` (with the tied players).

The answer key from `start_round` carries a `hostNote: do not reveal before guesses are recorded`.

## Key flows

**One-breath round.** The family says the name, the question, and all guesses. Host calls `get_household` if it hasn't this session, decides verdicts, calls `record_round` once, speaks the result. Screen shows the scoreboard.

**Chore with a tiebreak.** Host calls `start_round` with a chore stake. Family answers. `record_round` returns `tiebreak_needed` with two players. Host calls `start_round` with `tiebreakOf` and those two players. Next `record_round` returns `settled` and the chore.

**Pack request.** `request_pack` writes the pack as `building`, invokes pack-worker asynchronously, and returns. The worker invokes the agent on AgentCore Runtime. The agent writes questions, sets the pack to `ready`, and adds a news item. The next `get_household` returns the news, and the host announces it.

**Trade with a chore.** John owes the garbage. John says "I'll give Sally 3 points to take the garbage for me." The host asks Sally to agree out loud. On yes, the host calls `transfer_points` once with the chore. The server moves the points and the chore in one DynamoDB transaction, so a failure changes nothing.

**Protected spend.** `spend_points` without the phrase returns an error saying a parent phrase is needed. The host asks a parent to say it, then calls again with `parentPhrase`. The server normalizes it, hashes it with the household salt, and compares. The host never repeats the phrase.

**Reset.** Every tool call starts by comparing the household's `periodStart` with the current time in the household time zone. If the period has ended, the server resets balances in one transaction, stores a period result, and adds a news item, then carries on with the tool. No scheduler is needed. This call may use more than two DynamoDB requests.

## Pack builder agent

Built with the Strands Agents TypeScript SDK, deployed to AgentCore Runtime.

1. **Orchestrator agent.** Receives householdId, packId, topic, target player, count. Runs the steps below and retries failed questions up to a limit.
2. **Tool: get_player_context.** Reads the player's grade band and their recently missed questions on the topic.
3. **Writer agent (as a tool).** Drafts questions with answer, accepted alternatives, explanation, difficulty.
4. **Checker agent (as a tool).** Receives only the question. Answers it. Also judges whether it works out loud.
5. **Tool: save_pack.** Writes the questions, sets status, adds the news item.

**Suitability:** before writing, the orchestrator decides whether the topic is appropriate for children. If not, it fails the pack with a plain reason.

## Sign-in design

- Cognito user pool with managed login handles signup, sign-in, and the authorization code flow with PKCE.
- The MCP server serves both metadata documents itself. The authorization server document points at the Cognito endpoints.
- The MCP server validates the token signature, issuer, expiry, and audience, then looks up `USER#<sub>` to find the household.
- Check whether Cognito honours the `resource` parameter. If it does not, validate the audience by client id, and add a friction log entry.
- Phase order: development token first (milestone 1), full flow in milestone 5.

## Simulator design

- Three panels: conversation, device frame, protocol log.
- The host prompt makes the model behave like a voice assistant: short spoken replies, no markdown, no lists read aloud.
- The MCP client wrapper records each JSON-RPC message with a timestamp and duration, and feeds the protocol panel.
- The device frame renders the UI resource in a sandboxed iframe and passes the tool result to it.
- Replay mode reads a script of user lines and plays them in order, for regression checks and for recording the video.
- The speaker is an inline SVG with a light ring driven by one state value: idle, listening, thinking, or speaking. The display frame sits beside it and holds the scoreboard.
- Any `parentPhrase` argument is replaced with dots before a message reaches the protocol panel or the conversation panel.

## Local mode

`pnpm dev:local` runs the MCP server on localhost with the in-memory store and the development token. The simulator needs AWS credentials for Bedrock and Polly; if `MOCK_MODEL=1`, it uses recorded model turns from the replay scripts so the whole thing runs with no AWS account.

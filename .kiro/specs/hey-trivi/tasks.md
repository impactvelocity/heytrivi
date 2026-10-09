# Hey Trivi — Tasks

## Milestone 0: a server that speaks MCP

- [x] 1.1 Create the pnpm workspace and the folder structure from structure.md. Add MIT LICENSE, .env.example, and empty docs files.
- [x] 1.2 Create docs/friction-log.md with the known protocol-version entry from hackathon-rules.md.
- [x] 1.3 Build services/mcp-server with Hono and one tool, get_household, returning a hard-coded demo family. Run it locally. (R1.2, R1.4)
- [x] 1.4 Write protocol tests: initialize with 2025-11-25 succeeds, tools/list returns the tool, tools/call returns structured and text content. If these fail with mcp-handler, apply the version fallback in tech.md. (R1.1, R1.3)
- [x] 1.5 Create the CDK app with the DynamoDB table and the Lambda with a function URL. Deploy. Run the protocol tests against the deployed URL.

**CHECKPOINT 0.** Show me the protocol test output and the deployed URL.

## Milestone 1: the game

- [x] 2.1 In packages/core, write the types and pure functions for verdicts, points, stakes, tiebreaks, spending, trading, phrase matching, and resets, with unit tests for every rule in product.md. (R3.1, R4.1 to R4.4, R5.1, R5.5 to R5.7, R13.2, R13.8, R13.9)
- [x] 2.2 In packages/store, define the store interface, then the in-memory version with the demo family seed. (R12.1)
- [x] 2.3 Add the DynamoDB version of the store with the data model in design.md.
- [x] 2.4 Implement get_household and add_player for real. (R2.1 to R2.4)
- [x] 2.5 Implement record_round for family questions, with idempotency. (R3.1, R3.5)
- [x] 2.6 Implement start_round and the hosted path of record_round. Seed one trivia pack and one riddle pack of original questions. (R3.2 to R3.4, R3.6)
- [x] 2.7 Implement stakes, tiebreaks, and complete_chore. (R4.1 to R4.5)
- [x] 2.8 Implement spend_points, the ledger, show_scoreboard, and list_packs. (R5.2 to R5.4, R6.1)
- [x] 2.9 Implement transfer_points, including handing over a chore in the same transaction. (R5.5 to R5.7)
- [x] 2.10 Implement the parent phrase check on spend_points and transfer_points, with hashing and the lockout. Seed the demo family with a phrase and document it in the README. (R13.2 to R13.5)
- [x] 2.11 Implement the reset schedule: check the period at the start of every tool call and reset when it has ended. (R13.8, R13.9)
- [x] 2.12 Add the development token check. (R9.7)
- [x] 2.13 Write a latency test that calls each tool 50 times against the deployed URL and reports the 95th percentile. (R1.5)

If scope has to be cut from this milestone, cut in this order: the phrase lockout (R13.4), then monthly resets (keep weekly and never).

**CHECKPOINT 1.** Show me all tests passing and the latency report.

## Milestone 2: the simulator

- [x] 3.1 Create apps/simulator on Next.js 15 with the three-panel layout, the speaker artwork, the display frame, and the simulator label. (R14.1, R14.3, R14.4)
- [x] 3.2 Build the MCP client wrapper with message logging, and the protocol panel. Mask the parent phrase. (R10.1, R10.2, R13.6)
- [x] 3.3 Build the model loop with Bedrock Nova 2 Lite and the MCP tools, with typed input first. Write the host prompt. (R10.3, R10.5, R10.7)
- [x] 3.4 Add speech in (browser) and speech out (Polly route). Map common mishearings of the name back to it. Drive the light ring from the listening, thinking, and speaking states. (R10.3, R10.10, R14.2)
- [x] 3.5 Add "New session." (R10.6)
- [x] 3.6 Add replay mode and write four scripts: one-breath round, chore with tiebreak, next-day session, and a points-for-chore trade followed by a protected spend. (R10.8)
- [ ] 3.7 Deploy to Amplify Hosting.

**CHECKPOINT 2.** I play all four scripts by voice on the deployed simulator.

## Milestone 3: the scoreboard screen

- [ ] 4.1 Build packages/scoreboard-ui as a single self-contained HTML bundle, in the shared visual style. (R8.2 to R8.4, R14.4)
- [ ] 4.2 Register it as the ui://hey-trivi/scoreboard resource and reference it from record_round and show_scoreboard. (R8.1)
- [ ] 4.3 Render it in the simulator's device frame. (R10.4)

**CHECKPOINT 3.** Show me the scoreboard updating after a round.

## Milestone 4: the pack builder agent

- [ ] 5.1 Build services/pack-agent with the orchestrator, writer, checker, and the two data tools. Run it locally against the in-memory store. (R7.3 to R7.6)
- [ ] 5.2 Deploy it to AgentCore Runtime through CDK, or a deploy script if the CDK construct does not work. Record which in decisions.md.
- [ ] 5.3 Build services/pack-worker and the request_pack tool. (R7.1)
- [ ] 5.4 Add completion, news items, and failure handling. (R7.7, R7.8)
- [ ] 5.5 Add a replay script: request a pack, new session, host announces it, play a question from it.
- [ ] 5.6 Fill in docs/aws-integrations.md for every service so far.

**CHECKPOINT 4.** I request a pack by voice and play from it in a new session.

## Milestone 5: parents, signup, and account linking

- [x] 6.1 Add the Cognito user pool to CDK. Add signup, sign-in, and household creation to the Next.js app. (R11.1)
- [ ] 6.2 Build the parent page: players, packs, manual questions, build-a-pack form, pack status. (R6.2, R6.3, R7.2, R11.2) Players, leaderboard, points history, and question history are done; packs are not.
- [x] 6.3 Add parent controls to the parent page: parent phrase, what it protects, reset schedule, time zone, and "reset now." (R13.1, R13.7, R13.10)
- [x] 6.4 Add token validation, the two metadata documents, and the 401 behaviour to the MCP server. (R9.1 to R9.6)
- [x] 6.5 Add "Link account" to the simulator. (R10.9) Done as decisions #21: the simulator plays as the signed-in parent's family.

**CHECKPOINT 5.** I sign up as a new parent, link the simulator, and play as that family.

Questions for hackathon office hours: does MCP spec 2026-07-28 count as a "later version," what do judges expect for MCP Apps rendering in a simulator, and may Alexa brand assets be used in the simulator and the video.

## Milestone 6: hardening and documents

- [ ] 7.1 Write the README: what it is, local run, AWS deploy, teardown, how to connect any MCP client. (R12.3)
- [ ] 7.2 Add MOCK_MODEL=1 and confirm a fresh clone runs with no AWS account. (R12.1, R12.2)
- [ ] 7.3 Add pnpm infra:destroy. (R12.4)
- [ ] 7.4 Connect a second MCP client to the deployed server and record it working.
- [ ] 7.5 Complete friction-log.md, product-feedback.md, and aws-integrations.md.
- [ ] 7.6 Write docs/demo-script.md from the outline below. Rehearse it in replay mode.

**CHECKPOINT 6.** I do a full run-through from a fresh clone.

## Milestone 7: video and submission

- [ ] 8.1 Record the video. Under three minutes.
- [ ] 8.2 Submit on Devpost: description, repo, video, product feedback, friction log, Alexa+ track, AWS Builder mini challenge.
- [ ] 8.3 If the repo is private, add the reviewer accounts listed on the hackathon page as collaborators when submitting.

## Stretch (only after milestones 0 to 5 are done)

- [ ] S1 Replace speech in and out with Amazon Nova Sonic speech-to-speech. Needs a long-lived streaming server.
- [ ] S2 Add Bedrock Guardrails to the pack builder's suitability check.
- [ ] S3 Per-household host style: catchphrases and how winners are announced.

## Video outline (for task 7.6)

1. Chore round by voice in one breath. Verdict with partial credit. Scoreboard appears.
2. Tiebreak settles who owes the garbage.
3. "New session," next day. The host remembers the scores and the open chore.
4. Parent asks for a fractions pack for Sally. Show the agent's writer and checker steps briefly.
5. New session. The host announces the pack and asks a question from it.
6. John gives Sally 3 points to take the garbage for him. Sally spends them to pick the movie, after Mom says the parent phrase.
7. Protocol panel, second MCP client, and the list of AWS services.
8. One line on what it would take to ship on Alexa+.

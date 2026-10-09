# Hey Trivi — Requirements

## R1. Protocol

- R1.1 WHEN a client sends initialize with protocolVersion "2025-11-25", THE MCP server SHALL respond successfully and agree a version the client supports.
- R1.2 THE MCP server SHALL serve Streamable HTTP at a single HTTPS endpoint and SHALL NOT require a session identifier.
- R1.3 WHEN a client calls tools/list, THE MCP server SHALL return every tool listed in design.md with an input schema and a description.
- R1.4 THE MCP server SHALL return structuredContent and a text content block on every successful tool call.
- R1.5 THE MCP server SHALL respond to every tool call within 500 ms at the 95th percentile.

## R2. Household and players

- R2.1 WHEN get_household is called, THE server SHALL return the show title, all players with balance, lifetime, and streak, open chores, the open round if any, ready packs, and unseen news items.
- R2.2 WHEN add_player is called with a name and role, THE server SHALL create the player and return the updated player list.
- R2.3 IF a tool receives a player name that matches no player, ignoring case, THEN THE server SHALL return an error result listing the known player names.
- R2.4 THE server SHALL store only a first name, role, and optional grade band for each player.

## R3. Rounds

- R3.1 WHEN record_round is called with a question, a correct answer, and guesses with verdicts, THE server SHALL store the round, award points by the household's point settings, and return the updated scoreboard.
- R3.2 WHEN start_round is called with mode hosted or riddle, THE server SHALL choose an unused question from the named pack, or any ready pack if none is named, store it as the open round, and return the question with its answer key.
- R3.3 IF no unused pack question is available, THEN start_round SHALL return needsHostQuestion: true so the host can supply its own.
- R3.4 WHEN record_round is called with a roundId, THE server SHALL close that open round and mark its pack question as used.
- R3.5 IF record_round is called twice with the same idempotencyKey, THEN THE server SHALL return the first result and award no further points.
- R3.6 WHILE a round is open, get_household SHALL include it, so a new conversation can pick it up.

## R4. Stakes

- R4.1 WHEN a round with a chore stake has exactly one player with a wrong verdict, THE server SHALL create a chore owed by that player and return it.
- R4.2 WHEN a round with a pick stake has exactly one player with a correct verdict, THE server SHALL return that player as the winner of the pick.
- R4.3 IF a staked round does not produce exactly one loser (chore) or one winner (pick), THEN THE server SHALL return tiebreak_needed with the tied players.
- R4.4 WHEN start_round is called with tiebreakOf and a list of players, THE server SHALL link the new round to the original and carry the stake forward.
- R4.5 WHEN complete_chore is called, THE server SHALL mark the chore done.

## R5. Points

- R5.1 THE server SHALL keep a spendable balance and a non-decreasing lifetime total for each player.
- R5.2 WHEN spend_points is called and the player's balance covers the amount, THE server SHALL deduct it, record the reason, and return the new balance.
- R5.3 IF the balance does not cover the amount, THEN spend_points SHALL return an error result stating the shortfall.
- R5.4 THE server SHALL write a ledger entry for every change to a balance.
- R5.5 WHEN transfer_points is called and the giving player's balance covers the amount, THE server SHALL move the amount from the giver's balance to the receiver's balance, record the reason, and leave both lifetime totals unchanged.
- R5.6 WHEN transfer_points names a chore owed by the giving player, THE server SHALL reassign that chore to the receiving player in the same operation as the points.
- R5.7 IF the giver's balance does not cover the amount, the giver and receiver are the same player, or the named chore is not owed by the giver, THEN transfer_points SHALL return an error result and change nothing.

## R6. Packs

- R6.1 WHEN list_packs is called, THE server SHALL return each pack's title, topic, status, and remaining unused question count.
- R6.2 THE parent page SHALL let a signed-in parent add, edit, and delete questions in a pack by hand.
- R6.3 Each pack question SHALL have a question, an answer, accepted alternative answers, a one-sentence explanation, and a difficulty.

## R7. Pack builder agent

- R7.1 WHEN request_pack is called with a topic, THE server SHALL create a pack with status building, start the pack builder without waiting for it, and return within the R1.5 limit.
- R7.2 WHEN the parent page submits a "build a pack" form, THE system SHALL start the same pack builder.
- R7.3 THE pack builder SHALL read the target player's grade band and that player's recently missed questions on the topic, and use them to set difficulty.
- R7.4 THE pack builder SHALL have a writer step that drafts questions and a separate checker step that answers each question without seeing the answer key.
- R7.5 IF the checker's answer disagrees with the writer's answer, THEN THE pack builder SHALL rewrite or drop that question.
- R7.6 THE pack builder SHALL reject any question that cannot be asked aloud in about 15 seconds, needs a picture, or is ambiguous when heard.
- R7.7 WHEN the pack builder finishes, THE system SHALL set the pack to ready and add a news item, so the host announces it in the family's next session.
- R7.8 IF the pack builder fails or the topic is not suitable for children, THEN THE system SHALL set the pack to failed with a reason, and the parent page SHALL offer a retry.

## R8. Scoreboard screen

- R8.1 WHEN show_scoreboard or record_round succeeds, THE result SHALL reference ui://hey-trivi/scoreboard.
- R8.2 THE scoreboard SHALL show the show title, each player's balance and lifetime total, the last round's result, and open chores.
- R8.3 THE scoreboard SHALL be readable from across a room: large type, high contrast, no scrolling for up to six players.
- R8.4 THE scoreboard SHALL render correctly with no network access other than the data passed to it.

## R9. Sign-in and account linking

- R9.1 IF a request has no valid bearer token, THEN THE MCP server SHALL respond 401 with no WWW-Authenticate header.
- R9.2 THE MCP server SHALL publish protected resource metadata at /.well-known/oauth-protected-resource.
- R9.3 THE system SHALL publish authorization server metadata at /.well-known/oauth-authorization-server, including code_challenge_methods_supported with S256.
- R9.4 THE system SHALL support the OAuth authorization code flow with PKCE (S256) and the resource parameter.
- R9.5 THE MCP server SHALL accept the bearer token only in the Authorization header.
- R9.6 WHEN a token is valid, THE MCP server SHALL load the household linked to that user and no other.
- R9.7 WHERE the server runs in local mode, THE server SHALL accept a fixed development token mapped to the demo household.

## R10. Simulator

- R10.1 THE simulator SHALL connect to the MCP server as a real MCP client and send initialize, tools/list, and tools/call over Streamable HTTP.
- R10.2 THE simulator SHALL show every MCP request and response in a protocol panel, in order.
- R10.3 WHEN the user speaks or types, THE simulator SHALL pass the text to the model with the MCP tools available, and speak the reply.
- R10.4 THE simulator SHALL render the scoreboard UI resource inside a device frame when a tool result references it.
- R10.5 THE simulator's host SHALL call get_household at the start of each session and SHALL NOT reveal an answer key before guesses are recorded.
- R10.6 WHEN the user presses "New session," THE simulator SHALL clear the conversation and keep nothing except what the MCP server returns.
- R10.7 THE simulator SHALL accept a request that names the game and a request that does not ("settle who takes out the garbage").
- R10.8 THE simulator SHALL offer a replay mode that runs a scripted conversation from scripts/replays/.
- R10.9 THE simulator SHALL offer a "Link account" action that runs the R9 flow as the OAuth client.
- R10.10 WHEN speech recognition returns a common mishearing of the name ("hey trivia", "hey Trevi", "a trivi"), THE simulator SHALL treat it as the name.

## R11. Parent page

- R11.1 A parent SHALL be able to sign up, sign in, and create a household with a show title.
- R11.2 A signed-in parent SHALL be able to add and edit players, manage packs (R6.2), request a built pack (R7.2), see pack status, and set the parent controls (R13).

## R12. Running it

- R12.1 pnpm dev:local SHALL start the MCP server with the in-memory store, seeded with a demo family (Mom, Dad, Sally, John), with no AWS account needed.
- R12.2 pnpm test SHALL run all unit and protocol tests with no AWS account needed.
- R12.3 THE README SHALL document local setup, AWS deployment, and teardown.
- R12.4 pnpm infra:destroy SHALL remove every AWS resource the project created.

## R13. Parent controls

- R13.1 A signed-in parent SHALL be able to set, change, and remove a parent phrase, and choose whether it is required for spending only or for spending and trading.
- R13.2 WHILE a parent phrase is required for an action, THE server SHALL reject spend_points, and transfer_points where set, unless the call includes the matching phrase, compared after lowercasing and removing punctuation and extra spaces.
- R13.3 IF the phrase is missing or wrong, THEN THE server SHALL return an error result saying a parent phrase is needed, without revealing the phrase or how close the attempt was.
- R13.4 IF five wrong phrases are given within ten minutes, THEN THE server SHALL reject protected actions for the next ten minutes.
- R13.5 THE server SHALL store only a salted hash of the phrase, SHALL NOT log it, and SHALL NOT return it from any tool.
- R13.6 THE simulator SHALL mask the phrase in the protocol panel and the conversation panel, and the host SHALL NOT say it back.
- R13.7 A signed-in parent SHALL be able to set the reset schedule to weekly, monthly, or never, and set the household time zone.
- R13.8 WHEN any tool is called and the household's current period has ended, THE server SHALL first set every balance to zero, write a ledger entry for each player, store the period's final balances and leader, and add a news item naming the leader. A weekly period starts Monday at midnight and a monthly period starts on the first of the month, in the household time zone.
- R13.9 A reset SHALL NOT change lifetime totals, open chores, or packs.
- R13.10 A signed-in parent SHALL be able to reset balances immediately from the parent page.

## R14. Look of the demo app

- R14.1 THE simulator SHALL show a round, fabric-textured speaker with a light ring, drawn as original artwork, beside a rounded display frame.
- R14.2 THE light ring SHALL show four distinct states: idle, listening, thinking, and speaking.
- R14.3 THE simulator SHALL NOT use Amazon or Alexa logos, product photographs, or copied brand artwork, and SHALL show the label "Alexa+ simulator. Not an Amazon product."
- R14.4 THE simulator, the parent page, and the scoreboard SHALL share one visual style: rounded shapes, soft colours, and large friendly type.

# Demo Script

Video outline for the submission. Target: under three minutes.

## Scene 1 — Chore round in one breath (~25 s)
Voice: "Alexa, let's play Hey Trivi for the garbage. Can penguins fly? Mom says no. Dad says yes. Sally says no. John says yes."
Show: verdict delivered, Mom and Sally right, tiebreak triggered. Scoreboard appears.

## Scene 2 — Tiebreak settles it (~20 s)
Voice: "Ask us another one for the garbage."
Show: tiebreak question, Dad loses, chore assigned to Dad. Scoreboard updates.

## Scene 3 — New session, next day (~20 s)
Voice: "Alexa, let's play Hey Trivi."
Show: host greets the family, mentions Dad still owes the garbage, recaps scores. Demonstrates cross-session state.

## Scene 4 — Pack builder (~30 s)
Voice: "Hey Trivi, build a fractions pack for Sally."
Show: pack created in background. Briefly show the agent's writer and checker steps in the protocol panel or logs.

## Scene 5 — Play from the new pack (~20 s)
Voice: "New session."
Show: host announces the fractions pack is ready, asks a question from it.

## Scene 6 — Trade and protected spend (~30 s)
Voice: "I'll give Sally 3 points to take the garbage for me."
Show: host asks Sally to agree out loud. Sally agrees. Points and chore move.
Voice: "Sally spends 3 points to pick the movie."
Show: parent phrase requested. Mom says it. Spend recorded. Balance updates.

## Scene 7 — Under the hood (~15 s)
Show: protocol panel with JSON-RPC messages, second MCP client connected, list of AWS services.

## Scene 8 — What's next (~10 s)
Narration: one line on what it would take to ship on Alexa+ (replace the simulator with the real Alexa+ MCP client; the server is unchanged).

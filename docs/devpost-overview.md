# Hey Trivi

**Family trivia that keeps score.**

![Hey Trivi, family trivia that keeps score: the demo stage as Sally wins a round, with the leaderboard and the live MCP server connection beside it, above three features: Alexa+ Hosts, Score That Lasts, and Learning Kids Can Win.](https://www.heytrivi.app/devpost/01-hero.png)

**[Live site](https://heytrivi.app)** · **[Try the demo](https://heytrivi.app/demo)** · **[Parent page](https://heytrivi.app/parent)** · **[Code](https://github.com/impactvelocity/heytrivi)**

The demo runs in Chrome with no sign-up. It's an Alexa+ simulator, not an Amazon product.

The public demo plays a scripted game, so it doesn't call the live MCP server, the model, or the voice. Live play runs the same page against the real server on AWS, and on the public site it's behind an unlock code to keep model costs down. The video shows it working, and the README runs the live game locally, or the whole game with no AWS account at all.

## Inspiration

Every family has the same three dinner-table debates: who's right, whose turn it is, and who picks the movie. Usually someone grabs a phone, reads the answer out loud, and the moment's over. Nobody learns anything, and the same debate comes back next week.

Alexa+ is already in the room when those debates start. Everyone can talk to it at once, nobody has to pass a screen around, and it's good at conversation. What it can't do on its own is keep a fair score that lasts: who won yesterday, who picks dinner tonight, who has points saved up for movie night. I wanted to give Alexa+ that job, so the assistant in the kitchen becomes the family's game show host and the score carries from one day to the next.

## What it does

Hey Trivi turns those debates into rounds of trivia and riddles. Alexa+ is the host, called Trivi. It asks a question, the whole table answers in one breath ("I say zero, Mom says ten, John says a hundred"), and Trivi judges every guess, explains the answer, and hands out points.

![Everyone guesses, Trivi hands out points: Dad asks how many teeth a snail has, each person's guess appears as a chat bubble under their name, and Sally's 10,000 wins the point.](https://www.heytrivi.app/devpost/02-round.png)

**It settles debates.** Say "winner picks dinner" before the question, and when Trivi rules, the winner gets the pick. A tie means one more question.

![Got a debate? Trivi settles it: Sally says sharks are older than trees with dinner on the line, Trivi rules for Sally, and it's pizza night with +1 point for Sally.](https://www.heytrivi.app/devpost/03-bet.png)

**It makes learning a competition kids can win.** Each kid gets a grade band, so Trivi asks a 6-year-old questions a 6-year-old can answer, and they can still beat Dad on the leaderboard. Everyone guesses before hearing the answer, and guessing first, even guessing wrong, is what makes a fact stick.

**Parents pick what the kids learn about.** On the parent page, a parent types something like "my kids are 6 and 8 and learning about dinosaurs, make 6 questions and riddles." A helper writes a draft, answers each question blind, and fact-checks it. Anything that doesn't hold up gets flagged. Nothing reaches the kids until a parent approves it, and then the family says "play the dinosaur theme."

![Today's lesson, tonight's trivia: Mom says Sally's class is learning about space, a new Space Explorers theme joins themes for every age, and each one goes Trivi Writes, Answers Blind, Fact-Checks, Parent Approves.](https://www.heytrivi.app/devpost/04-themes.png)

**Points buy the fun stuff.** Kids spend points to pick movie night or choose dinner, but spending needs a parent phrase said out loud. Siblings can trade points too, and both sides have to say yes.

![Win points, cash them in: Sally picks movie night for 5 points, a parent says the magic words, and it's movie night.](https://www.heytrivi.app/devpost/05-spend.png)

**The score lasts.** The server keeps the family's state between conversations, so a point won on Tuesday still counts on Friday. Balances reset weekly or monthly (the parent chooses), and lifetime totals never go down, so there's always a record of who's right most often.

**It knows very little about kids.** Trivi keeps a first name and a grade band. No birthdays, no voice recordings, no notes about a child.

The parent page also shows every point earned, spent, traded, or reset, and every question with everyone's answer and what was at stake.

## How I built it

The design rests on one split. Alexa+ runs the conversation and decides who's right. The Hey Trivi MCP server stores what happened and applies the rules. Scores never come from a model's memory, so nobody can sweet-talk Trivi into a bonus point.

![Alexa+ hosts, the server keeps score: the family talks to Alexa+, which calls the MCP server on AWS Lambda, which keeps score in DynamoDB. Parents sign in with Amazon Cognito.](https://www.heytrivi.app/devpost/06-built.png)

**The MCP server** is TypeScript, using the MCP TypeScript SDK and Hono on AWS Lambda. A Lambda function URL serves Streamable HTTP (protocol 2025-11-25), with no API Gateway. It has nine tools: `get_household`, `start_round`, `record_round`, `complete_chore`, `spend_points`, `transfer_points`, `show_scoreboard`, `add_player`, and `list_packs`. None of them call a model. The game rules (verdicts, points, stakes, tiebreaks, trades, resets) are pure functions in their own package, and everything is stored in one on-demand DynamoDB table. `show_scoreboard` and `record_round` return the scoreboard as an MCP App (`ui://hey-trivi/scoreboard`), so a host with a screen can show it.

**Accounts.** Parents sign up with Amazon Cognito, and Cognito's access tokens are the bearer tokens the server checks. The server publishes the OAuth discovery documents so Alexa+ can link a parent's account. Every family uses the same server URL, and the parent's login decides which household loads.

**The simulator.** Hackathon entrants can't connect to a real Alexa+ device, so I built a stand-in: a speaker that listens and talks, a smart display, and a panel that shows every MCP message. It's a real MCP client. Amazon Nova 2 Lite hosts the game and Amazon Polly speaks for Trivi. It ships with replay scripts and a mock mode, so the whole game runs without an AWS account.

![You talk, Trivi calls MCP tools: what the family says, and the tool Trivi calls for it.](https://www.heytrivi.app/devpost/07-tools.png)

**The theme helper.** Claude Haiku 5.5 writes the questions and answers them blind, and Claude Sonnet 5.5 checks the facts.

**Infrastructure.** One AWS CDK stack creates the table, the user pool, the Lambda, and least-privilege IAM roles, and one command tears it down. The Next.js app (the game, the parent page, and the landing page) runs on AWS Amplify Hosting, and the server's URL lives in Systems Manager Parameter Store.

## Challenges I ran into

**There's no Alexa+ to test against.** That's why the simulator exists. I mapped every Alexa+ requirement to how the server meets it, but the docs disagreed in places: whether account linking needs a client secret, and which protocol version Alexa+ sends (2025-03-26 on one page, 2025-11-25 on another). The server implements 2025-11-25 and also accepts clients that open with 2025-03-26.

**My new AWS account had zero Bedrock quota.** Every Nova model had a daily token quota of 0, and Bedrock reported it as "Too many tokens per day, please wait." Waiting never helped, and the quota can't be raised from the console. I built in mock mode until I moved the host to the same Nova 2 Lite model through the Vercel AI Gateway. The direct Bedrock path is still there behind a flag.

**The host read the answer out loud.** Mid-game, Nova sometimes put its reasoning in the reply ("The answer key says the Sun, but I must not reveal that yet") and the speaker said it. Now Trivi speaks only through a `say` tool, and any loose text is dropped. Then the model skipped the required tool about one step in ten, so when that happens the simulator asks again with `say` itself required.

**Polly's neural voices aren't in us-east-2.** The voice lookup returned an empty list with no error. Trivi uses a standard voice, with the browser's voice as a fallback.

I kept a friction log the whole way through, with each issue, the workaround, and a suggestion for the team that owns it.

## Accomplishments that I'm proud of

- Scores, chores, and deals are all kept by the server. A model can't make one up or forget it.
- Nine tools, and the slowest one's 95th percentile is 125 ms across 50 calls each.
- 117 tests passing, and all of them run without an AWS account.
- The parent controls are real: theme approval before anything is asked, a parent phrase stored only as a salted hash, and five wrong tries lock spending for ten minutes.
- I built all of it solo during the hackathon, starting October 8, 2026, and it's open source under the MIT license.

![Fast, tested, and built on AWS: 9 MCP tools, 117 tests passing, 1 CDK stack, and the AWS services behind them.](https://www.heytrivi.app/devpost/08-stats.png)

## What I learned

Let the model judge and let the server count. A model is good at hearing four guesses in one sentence and deciding who was closest. It shouldn't be the one remembering who's ahead this week. Once the rules lived in plain functions behind MCP tools, I could test every one of them.

In a voice app, the only safe text is the text you chose to speak. Routing speech through a `say` tool is what stopped Trivi from giving away answers.

And voice changes the design of every tool. A family answers all at once, so `record_round` takes everyone's guesses in one call. A bet, a trade, or a spend has to be said out loud and confirmed out loud, because there's no button to press.

## What's next for Hey Trivi

**Put it on real Alexa+.** The server is built as an Alexa+ add-on: OAuth account linking through Cognito, a family created on first link so nobody has to open a web page, the store listing in `alexa/addon-package/addon.json`, and the `alexa-ai` registration steps in `docs/alexa-plus.md`. When add-on tools open to more developers, the first job is checking the short list of things I couldn't verify without Alexa+.

**Themes by voice.** Today a parent describes a theme on the parent page. Next is "Trivi, make a fractions theme for Sally": the same write, answer-blind, and fact-check steps running in the background, with the draft still waiting for a parent's OK before the kids hear it.

**All on AWS.** The host model already has a Bedrock path behind a flag. Once the account's Nova quota is raised, the host and the theme helper move off the gateway and onto Bedrock.

**Beyond one kitchen.** Families are the first audience, but the same scoreboard already works for couples settling who was right and housemates trading chore nights.

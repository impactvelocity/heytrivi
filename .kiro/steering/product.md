# Hey Trivi — Product

## What this is

A voice game for families on Alexa+. A family uses trivia and riddles to settle things: who is right, who takes out the garbage, who picks the movie. It keeps a running family scoreboard across days, and parents can add their own question packs, including packs an AI agent builds from a topic like "fractions for Sally."

It is an entry in the Amazon Developer Hackathon, Alexa+ track, and the AWS Builder mini challenge.

## The three parts

**MCP server.** This is the submission. It holds the family's players, scores, rounds, chores, and packs, and exposes them as MCP tools.

**Simulator.** A web app that stands in for Alexa+, because hackathon entrants cannot connect to a real Alexa+ device. It listens, talks, shows a device screen, and shows every MCP message it sends.

**Pack builder agent.** A background agent that writes a question pack from a topic, checks its own answers, and saves the pack.

## What a round sounds like

> "Alexa, let's play Hey Trivi. The question is: can you look at the sun through sunglasses? Mom says no, never. Dad says only when you're upside down. Sally says yes. John says yes."

> "Mom's right, and it isn't close. Sunglasses don't block enough light to make it safe. Mom gets a point. Mom leads with 7."

Other openers:

- "Let's play Hey Trivi for the garbage." The host asks a question, and the loser owes the chore.
- "Let's play Hey Trivi, riddles." The host asks from a riddle pack.
- "Hey Trivi, build a fractions pack for Sally." The pack builder starts in the background.
- "Hey Trivi, I'll give Sally 3 points to take the garbage for me." The points move to Sally, and so does the chore.

## Rules of the game

**Players.** First name, role (parent or kid), optional grade band for kids.

**Verdicts.** Each guess is correct, partial, or wrong. Correct earns 1 point. Partial earns 0 by default but is acknowledged out loud. Point values are configurable per household.

**Two totals per player.** `balance` can be spent. `lifetime` never goes down and is for bragging.

**Stakes.** A round can have no stake, a chore stake (the loser owes it), or a pick stake (the winner gets it).

**Tiebreaks.** A chore needs exactly one loser and a pick needs exactly one winner. If the round doesn't produce that, the tied players play another question until it does.

**Spending.** A player can spend points from their balance to claim something, for example 3 points to pick the movie. Spending lowers the balance and never the lifetime total.

**Trading.** A player can give points to another player, as a gift or as payment in a deal. A deal can hand over a chore: "I'll give Sally 3 points to take the garbage for me" moves 3 points to Sally and moves the chore to Sally. The host asks the receiving player to agree out loud before recording a deal. Trades do not change lifetime totals.

**Parent phrase.** Parents can set a spoken phrase that must be said before points are spent, and optionally before points are traded. The server checks the phrase, and the host never repeats it. A phrase said aloud can be overheard, so parents can change it at any time on the parent page.

**Resets.** Parents choose whether balances reset every week, every month, or never. A reset sets every balance to zero, records who led the period, and leaves lifetime totals and open chores alone.

## Principles

- **Voice first.** Everything must work with no screen. The screen adds a scoreboard, never required information.
- **The host judges, the server keeps the record.** The assistant's model decides who is right. The server stores what happened and applies the rules.
- **No model calls inside MCP tools.** Tools are fast data operations only.
- **Children's privacy.** Store first names and a grade band only. No birthdates, no audio, no free-text notes about a child.
- **The server is the product.** It must work with any MCP client, not only our simulator.
- **The parent phrase stays secret.** It is never stored in plain text, never logged, never returned by a tool, and never shown on screen.

## Look of the demo app

The simulator should feel like a friendly smart speaker next to a smart display, so a viewer understands at a glance that this is a voice assistant in a kitchen.

- **The speaker.** A small, round, fabric-textured speaker with a glowing light ring at its base, drawn as original artwork. Cute and soft, with no hard edges.
- **The light ring.** It shows four states: idle, listening, thinking, speaking.
- **The display.** A rounded screen frame beside the speaker, where the scoreboard appears.
- **The style.** Rounded shapes, soft colours, large friendly type. The parent page and the scoreboard share it.
- **Original artwork only.** Do not use Amazon or Alexa logos, product photographs, or copied brand artwork. Show a small label on the simulator: "Alexa+ simulator. Not an Amazon product."

## Out of scope

Real Alexa+ deployment, payments, more than one household per account, per-family trigger names, mobile apps.

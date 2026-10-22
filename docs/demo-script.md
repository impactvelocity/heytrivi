# Demo Script

The north-star version: written as if every feature is finished, so it doubles as the target for what to build next. Before recording, check it against "North star vs. today" at the end and trim anything that isn't working yet. Judges may stop at 3:00, so the best material comes first.

**One-liner:** Hey Trivi is a family game show that keeps score, and the points get spent on the fun stuff.

**Supporting paragraph:** Hey Trivi lives on your Alexa. Ask it anything at dinner, everyone guesses, and Trivi judges and keeps the scoreboard from day to day. Questions are fair for every age, so a 6-year-old can beat Dad. The points are worth something: the weekly winner picks movie night or chooses dinner, and kids can trade points with each other, even to get out of a chore.

**Voices:** two. Dad, on camera and in voiceover, and Alexa as the Trivi host. Dad speaks for the family, saying everyone's guesses in one breath, which is how Trivi is meant to be played.

**The family:** Mom, Dad, Billy (8), and Jill (6). Parent phrase: "purple pancakes."

**Words:** the app is called Hey Trivi. Out loud it's just "Trivi." Question sets are "themes," never "packs."

---

## 1. Cold open (0:00–0:12)

*On screen:* A family at the dinner table, an Echo Show at the end of it.

**DAD (VO):** Every family argues about something. Who's right. Who picks the movie. Who takes out the garbage.

*Title card:* **Hey Trivi.** A family game show that keeps score, and the points get spent on the fun stuff.

## 2. Meet the family (0:12–0:35)

*On screen:* Dad's phone, the Alexa app. He taps Enable on Hey Trivi and signs in.

**DAD:** Alexa, let's play Trivi.

**ALEXA:** Welcome to Trivi, the family game show! Who's playing?

**DAD:** Me, Mom, Billy who's eight, and Jill who's six.

**ALEXA:** Hi Dad, Mom, Billy, and Jill! I'll keep every question fair for all ages, and I'll keep score from day to day.

*On screen:* Mom's phone, the parent page. She sets the parent phrase; the field shows dots.

**DAD (VO):** Mom and I set a parent phrase, so spending points needs our OK.

## 3. Ask anything (0:35–1:10)

*Caption:* Tuesday.

**DAD:** Alexa, let's play Trivi.

**ALEXA:** Welcome back! Billy's in the lead with 3 points, and Jill's right behind him with 2.

**DAD:** Trivi, how hot is the surface of the sun? I say 300 degrees. Mom passes. Billy says a million. Jill says 5,000.

**ALEXA:** Drumroll, please… The surface of the sun is about 5,500 degrees Celsius. Jill is closest! That's a point for Jill, and she's tied for the lead.

*On screen:* The scoreboard on the Echo Show. Jill's row lights up; she does a victory dance.

**ALEXA:** Here's one to talk about: the middle of the sun is even hotter. About 15 million degrees.

*On screen:* Billy, jaw dropped.

## 4. Trivi asks (1:10–1:35)

**DAD:** Trivi, ask us one about history.

**ALEXA:** Here's one everyone can get. Which came first: the pyramids in Egypt, or the last woolly mammoths?

**DAD:** Jill says mammoths. Billy says pyramids. Mom says pyramids. I say mammoths.

**ALEXA:** Billy and Mom are right! The pyramids were built while the last woolly mammoths were still alive on a tiny island near the Arctic. A point each for Billy and Mom.

## 5. This week's theme (1:35–2:05)

**DAD:** Trivi, the kids can't stop talking about dinosaurs. Make that this week's theme.

**ALEXA:** Dinosaur week! I'll write questions and riddles for Billy and Jill, check every fact, and send them to your phone to look over.

*On screen:* A phone notification: "Dinosaur Week is ready to review." Dad scrolls the questions. One carries a note: "Fixed: T. rex walked on two legs, not four." He taps Approve.

**DAD:** Trivi, what's tonight's dinosaur riddle?

**ALEXA:** I have three horns and a big frill, but I only eat plants. What am I?

**DAD:** Jill says Triceratops!

**ALEXA:** Jill got it! Triceratops means "three-horned face."

## 6. Spend the points (2:05–2:35)

*Caption:* Friday.

**DAD:** Trivi, who won the week?

**ALEXA:** Jill, with 9 points!

**DAD:** Jill's spending 5 points to pick the movie.

**ALEXA:** I need a parent's OK for that. What's the phrase?

**DAD** *(quietly, away from the kids)***:** Purple pancakes.

**ALEXA:** Done! Jill picks tonight's movie, and she has 4 points left.

**DAD:** And Billy will give Jill 2 points to take out the garbage for him.

**ALEXA:** Jill, is it a deal?

*On screen:* Jill nods hard.

**DAD:** She says deal.

**ALEXA:** Deal! Two points to Jill, and the garbage is hers tonight.

## 7. Why it works, and how it's built (2:35–2:58)

*On screen:* The family laughing over the scoreboard, then the architecture diagram with labels: Alexa+ (host model), Hey Trivi MCP server on AWS Lambda, DynamoDB, Cognito, the theme writer and fact-checkers, the scoreboard as an MCP App, built with Kiro.

**DAD (VO):** Trying to answer a question, even getting it wrong, makes a fact stick. Talking it over afterward makes it stick better. Under the hood, Hey Trivi is an MCP server on AWS. Alexa hosts the show, and our server keeps the score, so nothing gets made up. Every theme is written by one model, answered blind by another, and fact-checked before a parent sees it.

*Title card (to 3:00):* **Hey Trivi.** Curiosity and fairness, for the whole family.

---

## North star vs. today

What this script needs that isn't built or isn't true yet. Close these, or cut the line before recording.

| Script moment | Today | To do |
|---|---|---|
| "Trivi" out loud | `addon.json` invocation phrases say "Hey Trivi" | Change the phrases to "Let's play Trivi" and similar. The first line of a session still needs "Alexa," on a real device. |
| Billy and Jill | The demo seed is Mom, Dad, Sally, and John | Re-seed with Billy (3–5) and Jill (K–2), and set the scores the script opens with |
| Closest guess wins (scene 3) | The host judges each guess, but nothing says the closest number wins | Add the rule to the `record_round` description |
| Themes, not packs | Done: the parent page, Ask Trivi, and spoken messages say "theme", and the host knows a theme is a pack (decisions #32). The code and MCP tool names still say "pack". | — |
| Theme by voice (scene 5) | Themes are drafted only on the parent page (decisions #26) | Start a draft by voice, notify the parent, approve on the phone |
| Phone notification | None | A push notification or email when a theme is ready to review |
| "Who won the week?" | Balances reset weekly, so this week's points are there; there's no explicit weekly winner | Check the host answers it from `get_household`, or add a weekly winner to the result |
| Parent phrase said aloud | Kids can overhear it | Fine for the demo. Later: approve a spend on the parent's phone instead. |
| Alexa name and voice in the video | Open question for office hours (hackathon-rules.md) | Confirm before recording. Otherwise keep the "Not an Amazon product" label and use a generic speaker. |

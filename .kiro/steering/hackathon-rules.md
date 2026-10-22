# Hey Trivi — Hackathon Rules

Notes from the Devpost rules, overview, resources, FAQ, and updates pages (amazonappdev2026.devpost.com), read 2026-10-14. Where this file and the official rules disagree, the rules win.

## Key dates (Pacific Time)

| What | When |
|---|---|
| Submission deadline | **Friday, October 23, 2026, 12:00 pm PT** (noon, not midnight) |
| Office hours #2 | Monday, October 19, 9:00–10:00 am PT (register via the Updates page) |
| Judging | November 9–20, 2026 |
| Winners announced | On or around December 3, 2026 |

AWS credits are gone (out of codes since October 7). Spin resources down when not testing; nothing has to stay live after submitting (FAQ).

## Alexa+ track: what counts

- A working **self-hosted MCP server** (or Agent Skill) implementing MCP spec **2025-11-25 or later, over Streamable HTTP**.
- The repo must **import and call MCP at runtime** (a library import, an entry point, or a loaded MCP config). A mention in the README is not enough.
- No real Alexa+ device or console is reachable. The Alexa+ add-on tools (Category SDK, MCP Toolkit, `alexa-ai` CLI, Web Simulator) are select-partners only (FAQ). **Demo through our own web simulator.**
- FAQ, verbatim intent: a web page that acts as a real MCP client (sending `initialize`, `tools/list`, `tools/call` over Streamable HTTP) satisfies the requirement. Showing an existing AI assistant app calling the same server is "a nice bonus, but not required."
- Hosting isn't required. A locally runnable public repo plus the video is enough; judges may build and run it themselves.
- Prizes: 1st $25k + $15k AWS credits + meeting; 2nd $15k + $5k; 3rd $4k + $1k. A project can win one track prize **and** one mini-challenge prize.

## AWS Builder mini challenge

- Any primary-track project that uses AWS services "with documented integrations." Prize: $5k + $5k credits + meeting.
- **Kiro qualifies on its own** as a development tool. Name Kiro (specs, steering, agents in `.kiro/`) in the submission.
- The AWS services used and how must be described **inside the Product Feedback answer** on the form.
- Judges call "single Bedrock call for text generation, S3 for storage" obvious; "multi-service pipeline (Bedrock + AgentCore + Strands), agentic architecture with Claude/Kiro for development workflow, agent orchestration patterns" creative.

## What the submission must contain

- **Text description** of features and functionality.
- **GitHub repo URL** (GitHub only). Public with an open-source license that GitHub detects in the About sidebar, or private and shared with the reviewers. All source, assets, and clear setup and run instructions.
- **Demo video under 3 minutes**, public on YouTube or Vimeo, in English. Judges may stop at 3:00, so lead with the best material. It must show the project working on its target platform (for us: the simulator acting as an MCP client against our server). No third-party trademarks, copyrighted music, or footage without permission.
- **Product feedback for every tool, API, and SDK used**: what it was used for, what worked, what needs work, onboarding (zero to hello world), and would we build with it again, yes/no and why. Be specific and name the tool.
- **Tracks entered**: Alexa+ track; AWS Builder mini challenge.
- **If the project predates the window**: explain what changed. Hey Trivi's first commit is 2026-10-08, inside the window (opened August 31), so say it was built during the hackathon.
- Optional **feature requests**: description, why it matters, priority (Critical / Important / Nice-to-have).
- Optional **friction log entries** (up to a **10% bonus**, assessed in Stage 1): task attempted, steps taken, expected vs. actual, severity, workaround, actionable suggestion.

## Judging

- Stage 1: pass/fail on fitting the theme and applying the required tech. Judging may use AI-driven analysis, so the repo and docs should make the MCP usage obvious.
- Stage 2, four criteria with equal weight. Ties are broken in this order:
  1. **Tech implementation**: how well it's built and how well it uses the required tech.
  2. **Design**: a complete, coherent product. Is the interaction model intuitive for voice?
  3. **Potential impact**: a credible, specific case for customer need, with an audience beyond the hackathon.
  4. **Quality of the idea**: creative versus obvious.
- Alexa+ "obvious": a single-turn Q&A bot, or a basic MCP wrapper around an existing API. Alexa+ "creative": an agentic workflow that orchestrates services autonomously, a context-aware add-on that keeps state across sessions, purchasing, media support (cards, carousels), **MCP Apps**, Agent Skills.

## Keep these documents current as you work

**docs/friction-log.md.** Add an entry every time a tool, SDK, or document gets in the way:

```
### <short title>
- Tool / doc:
- Task attempted:
- Steps taken:
- Expected:
- Actual:
- Severity: blocker | major | minor
- Workaround:
- Suggestion:
```

**docs/product-feedback.md.** For each tool: what it was used for, what worked, what needs work, how onboarding went, and whether we would use it again and why.

**docs/aws-integrations.md.** One row per AWS service: what it does here and the file paths that use it.

## Other rules worth remembering

- Third-party SDKs and APIs must be used within their terms. This covers the AI Gateway, Claude, and Nova.
- Each submission must be original work owned by the entrant. Open-source dependencies are fine.
- Office hours questions still open: does MCP 2026-07-28 count as a "later version" (we negotiate 2025-11-25 anyway), and may we use the Alexa name and wake word in the simulator and video? The rules ban third-party trademarks without permission, and Alexa is the sponsor's mark. Keep the "Not an Amazon product" label and avoid Amazon logos and the Echo likeness.

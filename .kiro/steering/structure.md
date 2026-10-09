# Hey Trivi — Structure

```
/
├── apps/
│   └── simulator/            Next.js 15: simulator, parent page, signup
├── services/
│   ├── mcp-server/           Lambda + Hono: the MCP server
│   ├── pack-agent/           Strands agent for AgentCore Runtime
│   └── pack-worker/          Lambda: starts the agent without blocking
├── packages/
│   ├── core/                 Game rules, types, brand name. No AWS imports.
│   ├── store/                DynamoDB access + in-memory version for local runs
│   └── scoreboard-ui/        The MCP App (single HTML bundle)
├── infra/                    CDK app
├── docs/
│   ├── decisions.md          Any deviation from this plan, with the reason
│   ├── friction-log.md       Hackathon friction log (see hackathon rules)
│   ├── product-feedback.md   Notes per tool used
│   ├── aws-integrations.md   Each AWS service and where the code uses it
│   └── demo-script.md        The video script
├── scripts/                  seed, replay, destroy
├── KIRO_PLAN.md
├── LICENSE                   MIT
└── README.md
```

## Conventions

- Game rules live in `packages/core` as pure functions with unit tests. The MCP server and the parent page both call them.
- `packages/store` exposes one interface with two implementations: DynamoDB and in-memory.
- One file per MCP tool in `services/mcp-server/src/tools/`.
- Tool descriptions live next to the tool and are written in words a family would say.

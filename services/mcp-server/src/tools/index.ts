import type { McpServer } from "@modelcontextprotocol/server";
import { registerAddPlayer } from "./add-player.js";
import { registerCompleteChore } from "./complete-chore.js";
import { registerGetHousehold } from "./get-household.js";
import { registerListPacks } from "./list-packs.js";
import { registerRecordRound } from "./record-round.js";
import { registerShowScoreboard } from "./show-scoreboard.js";
import { registerSpendPoints } from "./spend-points.js";
import { registerStartRound } from "./start-round.js";
import { registerTransferPoints } from "./transfer-points.js";

export function registerTools(server: McpServer): void {
  registerGetHousehold(server);
  registerAddPlayer(server);
  registerStartRound(server);
  registerRecordRound(server);
  registerCompleteChore(server);
  registerSpendPoints(server);
  registerTransferPoints(server);
  registerShowScoreboard(server);
  registerListPacks(server);
}

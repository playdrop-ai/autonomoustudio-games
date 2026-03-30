import { buildChartReport } from "../src/game/logic.ts";

const report = buildChartReport();

console.log(JSON.stringify(report, null, 2));

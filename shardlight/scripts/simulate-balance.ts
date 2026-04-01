import { BOT_ACTION_DELAY_MS, applyBotAction, chooseBotAction, type BotMode } from "../src/bots";
import { createInitialState, createNextChamber } from "../src/game";

interface RunResult {
  mode: BotMode;
  seed: number;
  score: number;
  chambersCleared: number;
  actions: number;
  seconds: number;
  failed: boolean;
}

const RUNS = Number.parseInt(process.argv[2] ?? "", 10) || 80;
const MAX_ACTIONS = 2200;
const MAX_SECONDS = 12 * 60;
const CLEAR_DELAY_SECONDS = 0.46;
const MODES: BotMode[] = ["idle", "casual", "expert"];

const allResults = MODES.map((mode) => {
  const runs = Array.from({ length: RUNS }, (_, offset) => simulateRun(mode, 0x4f2a6c1d + offset * 977));
  return {
    mode,
    runs,
  };
});

for (const group of allResults) {
  const seconds = group.runs.map((run) => run.seconds);
  const scores = group.runs.map((run) => run.score);
  const clears = group.runs.map((run) => run.chambersCleared);
  const failRate = group.runs.filter((run) => run.failed).length / group.runs.length;

  console.log(`${group.mode.toUpperCase()}`);
  console.log(`  runs: ${group.runs.length}`);
  console.log(`  median seconds: ${round(quantile(seconds, 0.5))}`);
  console.log(`  p25 seconds: ${round(quantile(seconds, 0.25))}`);
  console.log(`  p75 seconds: ${round(quantile(seconds, 0.75))}`);
  console.log(`  median score: ${round(quantile(scores, 0.5))}`);
  console.log(`  median chambers cleared: ${round(quantile(clears, 0.5))}`);
  console.log(`  fail rate: ${round(failRate * 100)}%`);
  console.log("");
}

function simulateRun(mode: BotMode, seed: number): RunResult {
  let state = createInitialState(seed);
  let actions = 0;
  let seconds = 0;

  while (actions < MAX_ACTIONS && seconds < MAX_SECONDS) {
    const action = chooseBotAction(state, mode);
    if (!action) break;

    const result = applyBotAction(state, action);
    state = result.state;
    actions += 1;
    seconds += BOT_ACTION_DELAY_MS[mode] / 1000;

    if (result.outcome === "clear") {
      seconds += CLEAR_DELAY_SECONDS;
      state = createNextChamber(state);
      continue;
    }

    if (result.outcome === "failed") {
      break;
    }
  }

  return {
    mode,
    seed,
    score: state.score,
    chambersCleared: state.chambersCleared,
    actions,
    seconds,
    failed: state.status === "failed",
  };
}

function quantile(values: number[], percentile: number): number {
  const sorted = [...values].sort((left, right) => left - right);
  const index = (sorted.length - 1) * percentile;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower] ?? 0;
  const weight = index - lower;
  return (sorted[lower] ?? 0) * (1 - weight) + (sorted[upper] ?? 0) * weight;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

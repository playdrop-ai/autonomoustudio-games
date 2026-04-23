import { chooseAutoplayTarget, createInitialState, stepGame } from "../src/game/sim";
import type { AutoplayMode } from "../src/game/types";

type RunSummary = {
  seconds: number;
  score: number;
  deliveries: number;
  bestRunStreak: number;
};

const RUNS = 24;
const STEP_MS = 16;
const MAX_MS = 8 * 60 * 1000;

const policies: AutoplayMode[] = ["idle", "casual", "expert"];

for (const policy of policies) {
  const runs: RunSummary[] = [];
  for (let index = 0; index < RUNS; index += 1) {
    let state = createInitialState(index + 1);
    let elapsedMs = 0;
    let target = 0;
    let reactionTimerMs = 0;

    while (!state.gameOver && elapsedMs < MAX_MS) {
      reactionTimerMs -= STEP_MS;
      if (reactionTimerMs <= 0) {
        target = chooseAutoplayTarget(state, policy);
        reactionTimerMs = nextReactionWindow(policy);
      }
      const result = stepGame(state, STEP_MS, target);
      state = result.state;
      elapsedMs += STEP_MS;
    }

    runs.push({
      seconds: Number((elapsedMs / 1000).toFixed(1)),
      score: state.score,
      deliveries: state.deliveries,
      bestRunStreak: state.bestRunStreak,
    });
  }

  const sortedSeconds = runs.map((run) => run.seconds).sort((a, b) => a - b);
  const median = percentile(sortedSeconds, 0.5);
  const p25 = percentile(sortedSeconds, 0.25);
  const averageScore = runs.reduce((sum, run) => sum + run.score, 0) / runs.length;
  const averageDeliveries = runs.reduce((sum, run) => sum + run.deliveries, 0) / runs.length;

  console.log(
    JSON.stringify(
      {
        policy,
        medianSeconds: Number(median.toFixed(1)),
        p25Seconds: Number(p25.toFixed(1)),
        averageScore: Number(averageScore.toFixed(1)),
        averageDeliveries: Number(averageDeliveries.toFixed(1)),
        shortest: sortedSeconds[0],
        longest: sortedSeconds[sortedSeconds.length - 1],
      },
      null,
      2,
    ),
  );
}

function nextReactionWindow(policy: AutoplayMode): number {
  if (policy === "idle") return 760;
  if (policy === "casual") return 620;
  return 48;
}

function percentile(sorted: number[], fraction: number): number {
  const index = (sorted.length - 1) * fraction;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower] ?? 0;
  const weight = index - lower;
  return (sorted[lower] ?? 0) * (1 - weight) + (sorted[upper] ?? 0) * weight;
}

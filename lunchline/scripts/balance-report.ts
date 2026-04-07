import { COMPLAINT_LIMIT } from "../src/game/data";
import { canAcceptInput, chooseAutoplayMove, createInitialState, performMove, stepGame } from "../src/game/sim";
import type { AutoplayMode } from "../src/game/types";

type RunResult = {
  mode: AutoplayMode;
  seed: number;
  durationMs: number;
  score: number;
  ordersServed: number;
  complaints: number;
};

type PolicyConfig = {
  decisionDelayMs: number;
  skipChance: number;
};

type RandomState = {
  seed: number;
};

function nextRandom(state: RandomState): number {
  state.seed = (state.seed + 0x6d2b79f5) | 0;
  let t = Math.imul(state.seed ^ (state.seed >>> 15), 1 | state.seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function quantile(values: number[], q: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * q;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower] ?? 0;
  const lowerValue = sorted[lower] ?? 0;
  const upperValue = sorted[upper] ?? 0;
  return lowerValue + (upperValue - lowerValue) * (index - lower);
}

function simulate(mode: AutoplayMode, seed: number): RunResult {
  const state = createInitialState(seed);
  let elapsedMs = 0;
  const capMs = 15 * 60 * 1000;
  const policy: Record<AutoplayMode, PolicyConfig> = {
    idle: {
      decisionDelayMs: Number.POSITIVE_INFINITY,
      skipChance: 1,
    },
    casual: {
      decisionDelayMs: 450,
      skipChance: 0.12,
    },
    expert: {
      decisionDelayMs: 160,
      skipChance: 0,
    },
  };
  const randomState: RandomState = { seed: seed >>> 0 || 1 };
  let decisionCooldownMs = 0;

  while (!state.gameOver && elapsedMs < capMs) {
    decisionCooldownMs = Math.max(0, decisionCooldownMs - 100);

    if (mode !== "idle" && canAcceptInput(state) && state.autoplayCooldownMs <= 0 && decisionCooldownMs <= 0) {
      decisionCooldownMs = policy[mode].decisionDelayMs;
      if (nextRandom(randomState) >= policy[mode].skipChance) {
        const move = chooseAutoplayMove(state, mode);
        if (move) {
          performMove(state, move.col, move.row);
        }
      }
    }

    stepGame(state, 100);
    elapsedMs += 100;
  }

  return {
    mode,
    seed,
    durationMs: elapsedMs,
    score: state.score,
    ordersServed: state.ordersServed,
    complaints: state.complaints,
  };
}

function summarize(mode: AutoplayMode, runs: RunResult[]) {
  const durations = runs.map((run) => run.durationMs / 1000);
  const scores = runs.map((run) => run.score);
  const orders = runs.map((run) => run.ordersServed);
  return {
    mode,
    samples: runs.length,
    durationSeconds: {
      min: Math.min(...durations),
      p25: quantile(durations, 0.25),
      median: quantile(durations, 0.5),
      p75: quantile(durations, 0.75),
      max: Math.max(...durations),
    },
    score: {
      median: quantile(scores, 0.5),
      p75: quantile(scores, 0.75),
    },
    ordersServed: {
      median: quantile(orders, 0.5),
      p75: quantile(orders, 0.75),
    },
    complaintLimit: COMPLAINT_LIMIT,
  };
}

const MODES: readonly AutoplayMode[] = ["idle", "casual", "expert"];
const RUNS_PER_MODE = 40;

const allRuns = MODES.flatMap((mode) =>
  Array.from({ length: RUNS_PER_MODE }, (_, index) => simulate(mode, index + 1)),
);

const summary = MODES.map((mode) => summarize(mode, allRuns.filter((run) => run.mode === mode)));

console.log(JSON.stringify({ summary, runs: allRuns }, null, 2));

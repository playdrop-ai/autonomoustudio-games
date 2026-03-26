import fs from "node:fs";

import {
  DIFFICULTY_TIERS,
  ROW_COUNT,
  activePairs,
  createInitialState,
  targetLaneForKind,
  toggleLatch,
  updateGame,
} from "../src/game/logic.ts";

const STEP_MS = 50;
const CASUAL_REACTION_MS = 350;
const EXPERT_REACTION_MS = 50;
const DEFAULT_SAMPLES = 200;
const DEFAULT_MAX_MS = 360_000;
const OUTPUT_DIR = new URL("../output/balance/", import.meta.url);

const samples = readNumberFlag("--samples", DEFAULT_SAMPLES);
const maxMs = readNumberFlag("--max-ms", DEFAULT_MAX_MS);

const policies = [
  {
    name: "idle",
    reactionMs: Infinity,
    runPolicy: (state) => state,
  },
  {
    name: "casual",
    reactionMs: CASUAL_REACTION_MS,
    runPolicy: (state) => applyCasualToggle(state),
  },
  {
    name: "expert",
    reactionMs: EXPERT_REACTION_MS,
    runPolicy: (state) => applyExpertToggle(state),
  },
];

const results = policies.map((policy) => {
  const runs = [];
  for (let seed = 1; seed <= samples; seed += 1) {
    runs.push(simulate(policy, seed, maxMs));
  }
  return {
    name: policy.name,
    ...summarizeRuns(runs, maxMs),
  };
});

const casual = results.find((result) => result.name === "casual");
const expert = results.find((result) => result.name === "expert");

const report = [
  "# Latchbloom Balance Report",
  "",
  `- Generated: ${new Date().toISOString()}`,
  `- Samples per policy: ${samples}`,
  `- Max simulated run: ${formatSeconds(maxMs)}`,
  `- Step interval: ${STEP_MS}ms`,
  "",
  "## Difficulty Schedule",
  "",
  "| Tier | Spawn Interval | Travel Duration | Same-Lane Repeat | Same-Kind Repeat | Max Active |",
  "| --- | ---: | ---: | ---: | ---: | ---: |",
  ...DIFFICULTY_TIERS.map((tier, index) => {
    const label = index === 0 ? "0-20s" : index === 1 ? "20-60s" : index === 2 ? "60-120s" : "120s+";
    return `| ${label} | ${tier.spawnInterval}ms | ${tier.travelDuration}ms | ${formatRepeat(tier.sameLaneRepeatChance)} | ${formatRepeat(tier.sameKindRepeatChance)} | ${tier.maxActiveBlossoms} |`;
  }),
  "",
  "## Results",
  "",
  "| Policy | Median | P25 | P75 | Avg | Max | Avg Score | Notes |",
  "| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
  ...results.map((result) => {
    const note = result.name === "casual" ? casualNote(result) : result.name === "expert" ? expertNote(result, maxMs) : idleNote(result);
    return `| ${result.name} | ${formatSeconds(result.medianMs)} | ${formatSeconds(result.p25Ms)} | ${formatSeconds(result.p75Ms)} | ${formatSeconds(result.avgMs)} | ${formatSeconds(result.maxMs)} | ${Math.round(result.avgScore)} | ${note} |`;
  }),
  "",
  "## Gate Targets",
  "",
  `- Casual median target 60-120s: ${casual && casual.medianMs >= 60_000 && casual.medianMs <= 120_000 ? "PASS" : "FAIL"}`,
  `- Expert median target 300s+: ${expert && expert.medianMs >= 300_000 ? "PASS" : "FAIL"}`,
  `- Expert p25 target 240s+: ${expert && expert.p25Ms >= 240_000 ? "PASS" : "FAIL"}`,
];

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(new URL("balance-report.md", OUTPUT_DIR), `${report.join("\n")}\n`);
process.stdout.write(`${report.join("\n")}\n`);

function simulate(policy, seed, maxDurationMs) {
  let state = createInitialState(seed);
  let elapsedMs = 0;
  let nextReactionAt = Number.isFinite(policy.reactionMs) ? 0 : Infinity;

  while (!state.gameOver && elapsedMs < maxDurationMs) {
    while (elapsedMs >= nextReactionAt) {
      state = policy.runPolicy(state);
      nextReactionAt += policy.reactionMs;
    }
    state = updateGame(state, STEP_MS).state;
    elapsedMs += STEP_MS;
  }

  return {
    durationMs: elapsedMs,
    score: state.score,
  };
}

function summarizeRuns(runs, maxDurationMs) {
  const durations = runs.map((run) => run.durationMs).sort((left, right) => left - right);
  const scores = runs.map((run) => run.score);
  return {
    medianMs: percentile(durations, 0.5),
    p25Ms: percentile(durations, 0.25),
    p75Ms: percentile(durations, 0.75),
    avgMs: average(durations),
    maxMs: Math.max(...durations),
    avgScore: average(scores),
    cappedRate: runs.filter((run) => run.durationMs >= maxDurationMs).length / runs.length,
  };
}

function idleNote(result) {
  return result.medianMs < 20_000 ? "sanity pass" : "too survivable while idle";
}

function casualNote(result) {
  if (result.medianMs < 60_000) return "too punishing";
  if (result.medianMs > 120_000) return "too forgiving";
  return "target window";
}

function expertNote(result, maxDurationMs) {
  if (result.medianMs < 300_000) return "ceiling too low";
  if (result.cappedRate > 0.5) return `strong ceiling (${Math.round(result.cappedRate * 100)}% hit ${formatSeconds(maxDurationMs)})`;
  return "target window";
}

function applyCasualToggle(state) {
  const target = sortByImminence(state.blossoms)[0];
  if (!target) return state;
  return applySingleHelpfulToggle(state, [candidateFromBlossom(target)]);
}

function applySingleHelpfulToggle(state, candidates) {
  for (const candidate of candidates) {
    const plan = findBestPlan(state, candidate);
    if (!plan) continue;
    const action = plan.find((step) => state.latches[step.row]?.[step.pairIndex] !== step.state);
    if (!action) continue;
    return toggleLatch(state, action.row, action.pairIndex);
  }
  return state;
}

function candidateFromBlossom(blossom) {
  return {
    blossom,
    startRow: Math.min(ROW_COUNT, blossom.segment + 1),
    currentLane: blossom.toLane,
    targetLane: targetLaneForKind(blossom.kind),
  };
}

function sortByImminence(blossoms) {
  return [...blossoms].sort((left, right) => right.segment + right.progress - (left.segment + left.progress));
}

function applyExpertToggle(state) {
  let bestAction = null;
  let bestScore = evaluateExpertState(state);

  for (let row = 0; row < state.latches.length; row += 1) {
    const pairCount = state.latches[row]?.length ?? 0;
    for (let pairIndex = 0; pairIndex < pairCount; pairIndex += 1) {
      const toggled = toggleLatch(state, row, pairIndex);
      const score = evaluateExpertState(toggled);
      if (score < bestScore) {
        bestScore = score;
        bestAction = { row, pairIndex };
      }
    }
  }

  return bestAction ? toggleLatch(state, bestAction.row, bestAction.pairIndex) : state;
}

function findBestPlan(state, candidate) {
  const plans = [];
  collectPlans(candidate.startRow, candidate.currentLane, candidate.targetLane, [], plans);
  if (plans.length === 0) return null;

  plans.sort((left, right) => {
    const mismatchDelta = countMismatches(state, left) - countMismatches(state, right);
    if (mismatchDelta !== 0) return mismatchDelta;
    const earliestDelta = earliestMismatchRow(state, left) - earliestMismatchRow(state, right);
    if (earliestDelta !== 0) return earliestDelta;
    return left.length - right.length;
  });

  return plans[0];
}

function collectPlans(row, lane, targetLane, plan, plans) {
  if (row >= ROW_COUNT) {
    if (lane === targetLane) plans.push(plan);
    return;
  }

  const pairs = activePairs(row);
  for (let pairIndex = 0; pairIndex < pairs.length; pairIndex += 1) {
    const [left, right] = pairs[pairIndex];
    if (lane !== left && lane !== right) continue;
    collectPlans(row + 1, lane, targetLane, [...plan, { row, pairIndex, state: "straight" }], plans);
    collectPlans(
      row + 1,
      lane === left ? right : left,
      targetLane,
      [...plan, { row, pairIndex, state: "cross" }],
      plans,
    );
    return;
  }

  collectPlans(row + 1, lane, targetLane, plan, plans);
}

function countMismatches(state, plan) {
  return plan.filter((step) => state.latches[step.row]?.[step.pairIndex] !== step.state).length;
}

function earliestMismatchRow(state, plan) {
  const mismatch = plan.find((step) => state.latches[step.row]?.[step.pairIndex] !== step.state);
  return mismatch ? mismatch.row : Number.POSITIVE_INFINITY;
}

function evaluateExpertState(state) {
  let score = 0;
  for (const blossom of state.blossoms) {
    const candidate = candidateFromBlossom(blossom);
    const plan = findBestPlan(state, candidate);
    if (!plan) return Number.POSITIVE_INFINITY;
    const mismatchCount = countMismatches(state, plan);
    const mismatch = plan.find((step) => state.latches[step.row]?.[step.pairIndex] !== step.state);
    const deadlineMs = mismatch ? timeUntilRow(blossom, mismatch.row) : Number.POSITIVE_INFINITY;
    score += mismatchCount * 600;
    score += deadlinePenalty(deadlineMs);
  }

  const previewCandidate = {
    startRow: 0,
    currentLane: state.nextSpawn.lane,
    targetLane: targetLaneForKind(state.nextSpawn.kind),
  };
  const previewPlan = findBestPlan(state, previewCandidate);
  if (!previewPlan) return Number.POSITIVE_INFINITY;
  score += countMismatches(state, previewPlan) * 40;
  return score;
}

function deadlinePenalty(deadlineMs) {
  if (!Number.isFinite(deadlineMs)) return 0;
  if (deadlineMs < 120) return 2500;
  if (deadlineMs < 240) return 1200;
  if (deadlineMs < 400) return 500;
  if (deadlineMs < 700) return 200;
  if (deadlineMs < 1000) return 80;
  return 0;
}

function timeUntilRow(blossom, row) {
  const segmentDuration = blossom.travelDuration / (ROW_COUNT + 1);
  const remainingCurrentSegmentMs = (1 - blossom.progress) * segmentDuration;
  const fullSegmentsAfterCurrent = Math.max(0, row - (blossom.segment + 1));
  return remainingCurrentSegmentMs + fullSegmentsAfterCurrent * segmentDuration;
}

function percentile(sortedValues, ratio) {
  if (sortedValues.length === 0) return 0;
  const index = Math.floor((sortedValues.length - 1) * ratio);
  return sortedValues[index];
}

function average(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatRepeat(value) {
  return value === null ? "uniform" : `${Math.round(value * 100)}%`;
}

function formatSeconds(ms) {
  return `${(ms / 1000).toFixed(1)}s`;
}

function readNumberFlag(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  const raw = process.argv[index + 1];
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

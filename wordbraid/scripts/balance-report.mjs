import fs from "node:fs";

import { commitWord, createInitialState, findCandidateWords, summarizeThreats } from "../src/game/logic.ts";

const DEFAULT_SAMPLES = 200;
const DEFAULT_MAX_TURNS = 240;
const OUTPUT_DIR = new URL("../output/balance/", import.meta.url);
const ANIMATION_MS = 420;

const samples = readNumberFlag("--samples", DEFAULT_SAMPLES);
const maxTurns = readNumberFlag("--max-turns", DEFAULT_MAX_TURNS);

const policies = [
  {
    name: "idle",
    reactionMs: 3000,
    chooseCandidate(state) {
      const candidates = findSafeCandidates(state, 24);
      return [...candidates].sort((left, right) => left.word.length - right.word.length || left.score - right.score)[0] ?? null;
    },
  },
  {
    name: "casual",
    reactionMs: 2600,
    chooseCandidate(state) {
      const candidates = findSafeCandidates(state, 24);
      return candidates.find((candidate) => candidate.word.length === 3) ?? candidates[0] ?? null;
    },
  },
  {
    name: "expert",
    reactionMs: 1100,
    chooseCandidate(state) {
      const candidates = findSafeCandidates(state, 24);
      if (candidates.length === 0) return null;

      let best = null;
      let bestScore = Number.NEGATIVE_INFINITY;
      for (const candidate of candidates) {
        const result = commitWord(state, candidate.pulls);
        if (!result) continue;
        const threats = summarizeThreats(result.state.ribbons);
        const maxDanger = Math.max(0, ...threats.map((threat) => threat.dangerScore));
        const futureCount = findCandidateWords(result.state.ribbons, 16).length;
        const evaluation =
          result.scoreGain +
          result.scrubCount * 150 +
          futureCount * 22 -
          maxDanger * 7 +
          result.state.combo * 18 -
          (result.state.gameOver ? 1 : 0) * 5000;
        if (evaluation > bestScore) {
          bestScore = evaluation;
          best = candidate;
        }
      }
      return best;
    },
  },
];

const results = policies.map((policy) => {
  const runs = [];
  for (let seed = 1; seed <= samples; seed += 1) {
    runs.push(simulate(policy, seed, maxTurns));
  }
  return {
    name: policy.name,
    ...summarizeRuns(runs),
  };
});

const casual = results.find((result) => result.name === "casual");
const expert = results.find((result) => result.name === "expert");
const idle = results.find((result) => result.name === "idle");

const report = [
  "# Wordbraid Balance Report",
  "",
  `- Generated: ${new Date().toISOString()}`,
  `- Samples per policy: ${samples}`,
  `- Max turns per run: ${maxTurns}`,
  `- Per-submit animation budget: ${ANIMATION_MS}ms`,
  "",
  "## Results",
  "",
  "| Policy | Median | P25 | P75 | Avg | Max | Avg Score | Avg Turns | Notes |",
  "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
  ...results.map((result) => {
    const note =
      result.name === "idle"
        ? result.medianMs < 45_000
          ? "sanity pass"
          : "too survivable for low-skill play"
        : result.name === "casual"
          ? result.medianMs < 60_000
            ? "too punishing"
            : result.medianMs > 120_000
              ? "too forgiving"
              : "target window"
          : result.medianMs < 300_000
            ? "ceiling too low"
            : result.p25Ms < 240_000
              ? "floor too low"
              : "target window";
    return `| ${result.name} | ${formatSeconds(result.medianMs)} | ${formatSeconds(result.p25Ms)} | ${formatSeconds(result.p75Ms)} | ${formatSeconds(result.avgMs)} | ${formatSeconds(result.maxMs)} | ${Math.round(result.avgScore)} | ${result.avgTurns.toFixed(1)} | ${note} |`;
  }),
  "",
  "## Gate Targets",
  "",
  `- Idle sanity target under 45s median: ${idle && idle.medianMs < 45_000 ? "PASS" : "FAIL"}`,
  `- Casual median target 60-120s: ${casual && casual.medianMs >= 60_000 && casual.medianMs <= 120_000 ? "PASS" : "FAIL"}`,
  `- Expert median target 300s+: ${expert && expert.medianMs >= 300_000 ? "PASS" : "FAIL"}`,
  `- Expert p25 target 240s+: ${expert && expert.p25Ms >= 240_000 ? "PASS" : "FAIL"}`,
];

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.writeFileSync(new URL("balance-report.md", OUTPUT_DIR), `${report.join("\n")}\n`);
process.stdout.write(`${report.join("\n")}\n`);

function simulate(policy, seed, maxTurnsPerRun) {
  let state = createInitialState(seed);
  let turns = 0;
  let elapsedMs = 0;

  while (!state.gameOver && turns < maxTurnsPerRun) {
    const candidate = policy.chooseCandidate(state);
    if (!candidate) break;
    const result = commitWord(state, candidate.pulls);
    if (!result) break;
    state = result.state;
    turns += 1;
    elapsedMs += policy.reactionMs + ANIMATION_MS;
  }

  return {
    durationMs: elapsedMs,
    score: state.score,
    turns,
  };
}

function findSafeCandidates(state, limit) {
  const candidates = findCandidateWords(state.ribbons, Math.max(limit * 3, 18));
  const safe = [];
  for (const candidate of candidates) {
    try {
      const result = commitWord(state, candidate.pulls);
      if (result == null) continue;
      safe.push(candidate);
      if (safe.length >= limit) break;
    } catch {
      // Skip dead-end braids from automated policies.
    }
  }
  return safe;
}

function summarizeRuns(runs) {
  const durations = runs.map((run) => run.durationMs).sort((left, right) => left - right);
  const scores = runs.map((run) => run.score);
  const turns = runs.map((run) => run.turns);
  return {
    medianMs: percentile(durations, 0.5),
    p25Ms: percentile(durations, 0.25),
    p75Ms: percentile(durations, 0.75),
    avgMs: average(durations),
    maxMs: Math.max(...durations),
    avgScore: average(scores),
    avgTurns: average(turns),
  };
}

function percentile(values, amount) {
  if (values.length === 0) return 0;
  const index = Math.max(0, Math.min(values.length - 1, Math.round((values.length - 1) * amount)));
  return values[index] ?? 0;
}

function average(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatSeconds(value) {
  return `${(value / 1000).toFixed(1)}s`;
}

function readNumberFlag(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index < 0) return fallback;
  const value = Number.parseInt(process.argv[index + 1] ?? "", 10);
  return Number.isFinite(value) ? value : fallback;
}

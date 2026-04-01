import fs from "node:fs";

import {
  applyShotAtSlot,
  createInitialState,
  swapShots,
} from "../src/game/logic.ts";
import {
  chooseCasualPlacement,
  chooseExpertPlacement,
  chooseIdlePlacement,
} from "../src/game/bots.ts";

const STEP_MS = 550;
const DEFAULT_SAMPLES = 120;
const DEFAULT_MAX_MS = 360_000;
const OUTPUT_DIR = new URL("../output/balance/", import.meta.url);

const samples = readNumberFlag("--samples", DEFAULT_SAMPLES);
const maxMs = readNumberFlag("--max-ms", DEFAULT_MAX_MS);

const policies = [
  { name: "idle", chooser: chooseIdlePlacement },
  { name: "casual", chooser: chooseCasualPlacement },
  { name: "expert", chooser: chooseExpertPlacement },
];

const results = policies.map((policy) => {
  const runs = [];
  for (let seed = 1; seed <= samples; seed += 1) {
    runs.push(simulate(seed, maxMs, policy.chooser));
  }
  return {
    name: policy.name,
    ...summarizeRuns(runs, maxMs),
  };
});

const casual = results.find((result) => result.name === "casual");
const expert = results.find((result) => result.name === "expert");

const report = [
  "# Fruit Salad Balance Report",
  "",
  `- Generated: ${new Date().toISOString()}`,
  `- Samples per policy: ${samples}`,
  `- Max simulated run: ${formatSeconds(maxMs)}`,
  "",
  "## Results",
  "",
  "| Policy | Median | P25 | P75 | Avg | Max | Avg Score | Notes |",
  "| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |",
  ...results.map((result) => {
    const note =
      result.name === "casual"
        ? result.medianMs < 60_000
          ? "too punishing"
          : result.medianMs > 120_000
            ? "too forgiving"
            : "target window"
        : result.name === "expert"
          ? result.medianMs < 300_000
            ? "ceiling too low"
            : result.p25Ms < 240_000
              ? "expert floor too low"
              : "target window"
          : result.medianMs < 15_000
            ? "sanity pass"
            : "idle survives too long";
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

function simulate(seed, maxMs, chooser) {
  let state = createInitialState(seed);
  let elapsedMs = 0;

  while (!state.gameOver && elapsedMs < maxMs) {
    const choice = chooser(state);
    if (!choice) break;
    state = choice.useReserve ? swapShots(state) : state;
    state = applyShotAtSlot(state, choice.slot).state;
    elapsedMs += STEP_MS;
  }

  return { durationMs: elapsedMs, score: state.score };
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

function percentile(values, ratio) {
  if (values.length === 0) return 0;
  const index = Math.min(values.length - 1, Math.max(0, Math.floor((values.length - 1) * ratio)));
  return values[index];
}

function average(values) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
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

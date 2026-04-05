import { runPolicySample, type PolicyName } from "../src/game/sim";

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) * 0.5;
}

function percentile(values: number[], ratio: number): number {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.min(sorted.length - 1, Math.floor(ratio * (sorted.length - 1))));
  return sorted[index];
}

function runSeries(policy: PolicyName, seeds: number[]): number[] {
  return seeds.map((seed) => runPolicySample({ seed, policy, seconds: 420 }).time);
}

const seeds = Array.from({ length: 12 }, (_, index) => 1000 + index * 17);
const idle = runSeries("idle", seeds);
const casual = runSeries("casual", seeds);
const expert = runSeries("expert", seeds);

console.log("Overvolt balance sweep");
console.log(`Idle median: ${median(idle).toFixed(1)}s`);
console.log(`Casual median: ${median(casual).toFixed(1)}s`);
console.log(`Expert median: ${median(expert).toFixed(1)}s`);
console.log(`Expert p25: ${percentile(expert, 0.25).toFixed(1)}s`);

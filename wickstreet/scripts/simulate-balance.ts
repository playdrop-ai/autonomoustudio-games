import { simulatePolicyRun, type PolicyName } from '../src/game/logic';

const seeds = [11, 29, 47, 83, 131, 197, 263, 347];
const policies: PolicyName[] = ['idle', 'casual', 'expert'];

for (const policy of policies) {
  const runs = seeds.map(seed => simulatePolicyRun(seed, policy));
  const durations = runs.map(run => run.duration).sort((a, b) => a - b);
  const scores = runs.map(run => run.score).sort((a, b) => a - b);
  console.log(`${policy.toUpperCase()}`);
  console.log(`  median duration: ${formatSeconds(percentile(durations, 0.5))}`);
  console.log(`  p25 duration: ${formatSeconds(percentile(durations, 0.25))}`);
  console.log(`  median score: ${Math.round(percentile(scores, 0.5)).toLocaleString('en-US')}`);
}

function percentile(values: number[], ratio: number): number {
  if (values.length === 0) {
    return 0;
  }
  const index = Math.min(values.length - 1, Math.max(0, Math.floor((values.length - 1) * ratio)));
  return values[index] ?? 0;
}

function formatSeconds(value: number): string {
  return `${value.toFixed(1)}s`;
}

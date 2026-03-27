import { applyLanePress, createInitialState, getVisibleNotes, startRun, updateGame } from "../src/game/logic.ts";

type Policy = "idle" | "casual" | "expert";

const POLICIES: Policy[] = ["idle", "casual", "expert"];
const RUNS = 12;
const DURATION_LIMIT_MS = 6 * 60 * 1000;
const FRAME_MS = 16;

const requestedPolicy = process.argv[2] as Policy | undefined;
const policies = requestedPolicy ? [requestedPolicy] : POLICIES;
const reports = policies.map((policy) => {
  const samples = Array.from({ length: RUNS }, (_, index) => simulate(policy, index + 1));
  samples.sort((a, b) => a - b);
  return {
    policy,
    runs: samples,
    medianMs: quantile(samples, 0.5),
    p25Ms: quantile(samples, 0.25),
    p75Ms: quantile(samples, 0.75),
  };
});

console.log(JSON.stringify(reports.length === 1 ? reports[0] : reports, null, 2));

function simulate(policy: Policy, seed: number): number {
  const rng = mulberry32(hashSeed(seed, policySalt(policy)));
  let state = startRun(createInitialState(seed, { bestScore: 0, bestCombo: 0 }));
  const pressed = new Set<number>();
  const scheduled = new Map<number, { pressAt: number; releaseAt: number }>();

  for (let elapsed = 0; elapsed < DURATION_LIMIT_MS && state.screen === "playing"; elapsed += FRAME_MS) {
    const visible = getVisibleNotes(state);
    for (const note of visible) {
      if (scheduled.has(note.id)) continue;
      if (policy === "idle") continue;
      const offset = policy === "expert" ? randomBetween(rng, -8, 8) : randomBetween(rng, -76, 94);
      const pressAt = Math.max(elapsed, note.timeMs + offset);
      const releaseAt =
        note.kind === "hold"
          ? note.timeMs + note.durationMs + holdReleaseOffset(policy, rng)
          : pressAt + 40;
      scheduled.set(note.id, { pressAt, releaseAt });
    }

    for (const [noteId, action] of scheduled) {
      const note = state.notes.find((entry) => entry.id === noteId);
      if (!note) {
        scheduled.delete(noteId);
        continue;
      }
      if (elapsed >= action.pressAt && note.lanes.every((lane) => !pressed.has(lane))) {
        if (policy === "casual" && rng() < 0.13) {
          scheduled.delete(noteId);
          continue;
        }
        for (const lane of note.lanes) {
          pressed.add(lane);
          const result = applyLanePress(state, lane, action.pressAt);
          state = result.state;
        }
      }
      if (elapsed >= action.releaseAt) {
        note.lanes.forEach((lane) => pressed.delete(lane));
        scheduled.delete(noteId);
      }
    }

    const result = updateGame(state, FRAME_MS, pressed);
    state = result.state;
  }

  return state.elapsedMs;
}

function quantile(values: number[], amount: number): number {
  const index = Math.floor((values.length - 1) * amount);
  return values[index];
}

function holdReleaseOffset(policy: Policy, rng: () => number): number {
  if (policy === "expert") return 36;
  if (policy === "casual" && rng() < 0.22) return -randomBetween(rng, 20, 96);
  return 18;
}

function policySalt(policy: Policy): number {
  switch (policy) {
    case "idle":
      return 11;
    case "casual":
      return 29;
    case "expert":
      return 53;
  }
}

function randomBetween(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

function hashSeed(seed: number, salt: number): number {
  let value = seed ^ salt;
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return value ^ (value >>> 16);
}

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

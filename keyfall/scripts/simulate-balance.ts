import {
  applyLanePress,
  createInitialState,
  getVisibleNotes,
  setSelectedDifficulty,
  setSelectedSong,
  startRun,
  updateGame,
} from "../src/game/logic.ts";
import { DIFFICULTIES, SONG_IDS, type DifficultyId, type SongId } from "../src/game/songbook.ts";

type Policy = "idle" | "casual" | "expert";

interface RunSample {
  screen: "clear" | "gameover" | "playing";
  elapsedMs: number;
  score: number;
  combo: number;
  lives: number;
}

const POLICIES: Policy[] = ["idle", "casual", "expert"];
const RUNS = 8;
const FRAME_MS = 16;

const requestedPolicy = process.argv[2] as Policy | undefined;
const policies = requestedPolicy ? [requestedPolicy] : POLICIES;

const report = SONG_IDS.flatMap((songId) =>
  DIFFICULTIES.map((difficulty) => ({
    songId,
    difficulty,
    policies: policies.map((policy) => summarize(songId, difficulty, policy)),
  })),
);

console.log(JSON.stringify(report, null, 2));

function summarize(songId: SongId, difficulty: DifficultyId, policy: Policy) {
  const runs = Array.from({ length: RUNS }, (_, index) => simulate(songId, difficulty, policy, index + 1));
  const clearedRuns = runs.filter((run) => run.screen === "clear");
  const failedRuns = runs.filter((run) => run.screen === "gameover");
  const elapsed = runs.map((run) => run.elapsedMs).sort((a, b) => a - b);
  const scores = runs.map((run) => run.score).sort((a, b) => a - b);
  const combos = runs.map((run) => run.combo).sort((a, b) => a - b);

  return {
    policy,
    clearRate: clearedRuns.length / runs.length,
    failRate: failedRuns.length / runs.length,
    medianElapsedMs: quantile(elapsed, 0.5),
    medianScore: quantile(scores, 0.5),
    medianCombo: quantile(combos, 0.5),
  };
}

function simulate(songId: SongId, difficulty: DifficultyId, policy: Policy, seed: number): RunSample {
  const rng = mulberry32(hashSeed(seed, policySalt(policy)));
  let state = createInitialState({ bestScore: 0, bestCombo: 0 });
  state = setSelectedSong(state, songId);
  state = setSelectedDifficulty(state, difficulty);
  state = startRun(state);

  const pressed = new Set<number>();
  const scheduled = new Map<number, { pressAt: number; releaseAt: number }>();
  const durationLimitMs = Math.max(90000, (state.run?.endMs ?? 0) + 1200);

  while (state.screen === "playing" && state.elapsedMs < durationLimitMs) {
    const visible = getVisibleNotes(state);
    for (const note of visible) {
      if (scheduled.has(note.id) || policy === "idle") continue;
      const offset = policy === "expert" ? randomBetween(rng, -8, 8) : randomBetween(rng, -76, 94);
      const pressAt = Math.max(state.elapsedMs, note.timeMs + offset);
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
      if (state.elapsedMs >= action.pressAt && note.lanes.every((lane) => !pressed.has(lane))) {
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
      if (state.elapsedMs >= action.releaseAt) {
        note.lanes.forEach((lane) => pressed.delete(lane));
        scheduled.delete(noteId);
      }
    }

    const result = updateGame(state, FRAME_MS, pressed);
    state = result.state;
  }

  return {
    screen: state.screen,
    elapsedMs: Math.round(state.elapsedMs),
    score: state.score,
    combo: state.bestCombo,
    lives: state.lives,
  };
}

function quantile(values: number[], amount: number): number {
  const index = Math.floor((values.length - 1) * amount);
  return values[index] ?? 0;
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

import {
  DIFFICULTIES,
  SONG_IDS,
  getDefaultDifficulty,
  getDefaultSongId,
  getSongDefinition,
  summarizeChart,
  type ChartSourceRole,
  type ChartDefinition,
  type DifficultyId,
  type SongDefinition,
  type SongId,
} from "./songbook.ts";

export const LANE_COUNT = 4;
export const INITIAL_LIVES = 4;
export const HIT_WINDOWS = {
  perfect: 80,
  good: 150,
} as const;

const NOTE_CLEAR_MS = 540;
const HOLD_SCORE = 60;
const TAP_SCORE = 100;

export type Screen = "start" | "playing" | "gameover" | "clear";
export type NoteKind = "tap" | "hold";
export type Judgement = "perfect" | "good" | "miss";

export interface NoteEvent {
  id: number;
  kind: NoteKind;
  lanes: number[];
  timeMs: number;
  beatMs: number;
  durationMs: number;
  sourceRole: ChartSourceRole;
  confidence: number;
  phraseId: number | string;
  motifId: string | number | null;
  hits: boolean[];
  hitQuality: Judgement | null;
  resolved: boolean;
  success: boolean;
  startedAtMs: number | null;
  releasedEarly: boolean;
  resolvedAtMs: number | null;
}

export interface RunDefinition {
  song: SongDefinition;
  difficulty: DifficultyId;
  chart: ChartDefinition;
  durationMs: number;
  endMs: number;
}

export interface GameEvent {
  kind: "hit" | "miss" | "gameover" | "clear";
  judgement?: Judgement;
  combo?: number;
}

export interface PreviewCluster {
  lanes: number[];
  kind: NoteKind;
}

export interface ChartSummary {
  songId: SongId;
  songLabel: string;
  difficulty: DifficultyId;
  noteCount: number;
  holdCount: number;
  distinctLaneCount: number;
  longestLaneStreak: number;
  firstNoteMs: number;
  durationMs: number;
}

export interface GameState {
  screen: Screen;
  elapsedMs: number;
  score: number;
  bestScore: number;
  combo: number;
  bestCombo: number;
  lives: number;
  notes: NoteEvent[];
  nextNoteId: number;
  selectedSongId: SongId;
  selectedDifficulty: DifficultyId;
  currentSongLabel: string;
  currentDifficultyLabel: string;
  lastEvent: GameEvent | null;
  run: RunDefinition | null;
}

export function createInitialState(persisted?: { bestScore?: number; bestCombo?: number }): GameState {
  const songId = getDefaultSongId();
  const difficulty = getDefaultDifficulty();
  return {
    screen: "start",
    elapsedMs: 0,
    score: 0,
    bestScore: persisted?.bestScore ?? 0,
    combo: 0,
    bestCombo: persisted?.bestCombo ?? 0,
    lives: INITIAL_LIVES,
    notes: [],
    nextNoteId: 1,
    selectedSongId: songId,
    selectedDifficulty: difficulty,
    currentSongLabel: getSongDefinition(songId).label,
    currentDifficultyLabel: difficulty.toUpperCase(),
    lastEvent: null,
    run: null,
  };
}

export function setSelectedSong(state: GameState, songId: SongId): GameState {
  const next = cloneState(state);
  next.selectedSongId = songId;
  next.currentSongLabel = getSongDefinition(songId).label;
  if (next.screen !== "playing") {
    next.run = null;
  }
  return next;
}

export function setSelectedDifficulty(state: GameState, difficulty: DifficultyId): GameState {
  const next = cloneState(state);
  next.selectedDifficulty = difficulty;
  next.currentDifficultyLabel = difficulty.toUpperCase();
  if (next.screen !== "playing") {
    next.run = null;
  }
  return next;
}

export function startRun(state: GameState): GameState {
  const selectionSongId = state.selectedSongId;
  const selectionDifficulty = state.selectedDifficulty;
  const reset = createInitialState({ bestScore: state.bestScore, bestCombo: state.bestCombo });
  const song = getSongDefinition(selectionSongId);
  const chart = song.charts[selectionDifficulty];
  const notes = chart.notes.map((note) => ({
    id: reset.nextNoteId++,
    kind: (note.durationMs > 0 ? "hold" : "tap") as NoteKind,
    lanes: [note.lane],
    timeMs: note.timeMs,
    beatMs: note.beatMs,
    durationMs: note.durationMs,
    sourceRole: note.sourceRole,
    confidence: note.confidence,
    phraseId: note.phraseId,
    motifId: note.motifId,
    hits: [false],
    hitQuality: null,
    resolved: false,
    success: false,
    startedAtMs: null,
    releasedEarly: false,
    resolvedAtMs: null,
  }));

  const endMs = Math.max(chart.durationMs, ...notes.map((note) => note.timeMs + note.durationMs)) + 220;

  reset.screen = "playing";
  reset.selectedSongId = selectionSongId;
  reset.selectedDifficulty = selectionDifficulty;
  reset.currentSongLabel = song.label;
  reset.currentDifficultyLabel = selectionDifficulty.toUpperCase();
  reset.elapsedMs = -chart.leadInMs;
  reset.notes = notes;
  reset.run = {
    song,
    difficulty: selectionDifficulty,
    chart,
    durationMs: chart.durationMs,
    endMs,
  };

  return reset;
}

export function updateGame(state: GameState, elapsedMs: number, pressedLanes: Set<number>): { state: GameState; events: GameEvent[] } {
  if (state.screen !== "playing" || !state.run) {
    return { state, events: [] };
  }

  const next = cloneState(state);
  next.elapsedMs += elapsedMs;
  const events: GameEvent[] = [];

  for (const note of next.notes) {
    if (note.resolved) continue;

    if (note.kind === "hold" && note.startedAtMs !== null) {
      const lane = note.lanes[0];
      if (lane === undefined) continue;
      if (!pressedLanes.has(lane) && next.elapsedMs < note.timeMs + note.durationMs - 40) {
        note.resolved = true;
        note.success = false;
        note.releasedEarly = true;
        note.resolvedAtMs = next.elapsedMs;
        miss(next, events);
        continue;
      }

      if (next.elapsedMs >= note.timeMs + note.durationMs) {
        note.resolved = true;
        note.success = true;
        note.resolvedAtMs = next.elapsedMs;
        scoreHit(next, note.hitQuality ?? "good", HOLD_SCORE);
      }
    }

    if (note.startedAtMs === null && next.elapsedMs > note.timeMs + HIT_WINDOWS.good) {
      note.resolved = true;
      note.success = false;
      note.hitQuality = "miss";
      note.resolvedAtMs = next.elapsedMs;
      miss(next, events);
    }
  }

  next.notes = next.notes.filter((note) => note.resolvedAtMs === null || next.elapsedMs - note.resolvedAtMs < NOTE_CLEAR_MS);

  if (next.lives <= 0 && next.screen !== "gameover") {
    next.screen = "gameover";
    next.bestScore = Math.max(next.bestScore, next.score);
    next.bestCombo = Math.max(next.bestCombo, next.combo);
    events.push({ kind: "gameover" });
  } else if (
    next.screen === "playing" &&
    next.run !== null &&
    next.elapsedMs >= next.run.endMs &&
    next.notes.every((note) => note.resolved || note.timeMs < next.elapsedMs - HIT_WINDOWS.good)
  ) {
    next.screen = "clear";
    next.bestScore = Math.max(next.bestScore, next.score);
    next.bestCombo = Math.max(next.bestCombo, next.combo);
    events.push({ kind: "clear" });
  }

  next.lastEvent = events.length > 0 ? events[events.length - 1]! : next.lastEvent;
  return { state: next, events };
}

export function applyLanePress(state: GameState, lane: number, pressTimeMs = state.elapsedMs): { state: GameState; events: GameEvent[] } {
  if (state.screen !== "playing") return { state, events: [] };
  const next = cloneState(state);
  const target = findTargetNote(next, lane, pressTimeMs);
  if (!target) return { state: next, events: [] };

  const laneIndex = target.lanes.indexOf(lane);
  if (laneIndex === -1 || target.hits[laneIndex]) return { state: next, events: [] };

  const delta = Math.abs(target.timeMs - pressTimeMs);
  const judgement: Judgement = delta <= HIT_WINDOWS.perfect ? "perfect" : "good";
  target.hits[laneIndex] = true;
  target.hitQuality = pickBestJudgement(target.hitQuality, judgement);

  const events: GameEvent[] = [];
  if (target.kind === "hold") {
    target.startedAtMs = pressTimeMs;
    scoreHit(next, judgement, TAP_SCORE - HOLD_SCORE);
    events.push({ kind: "hit", judgement, combo: next.combo });
    next.lastEvent = events[0] ?? next.lastEvent;
    return { state: next, events };
  }

  if (target.hits.every(Boolean)) {
    target.resolved = true;
    target.success = true;
    target.resolvedAtMs = pressTimeMs;
    scoreHit(next, target.hitQuality ?? judgement, TAP_SCORE);
    events.push({ kind: "hit", judgement: target.hitQuality ?? judgement, combo: next.combo });
  }

  next.lastEvent = events.length > 0 ? events[events.length - 1]! : next.lastEvent;
  return { state: next, events };
}

export function getSong(state: GameState): SongDefinition {
  return state.run?.song ?? getSongDefinition(state.selectedSongId);
}

export function getRun(state: GameState): RunDefinition | null {
  return state.run;
}

export function getUpcomingClusters(state: GameState, count = 3): PreviewCluster[] {
  return state.notes
    .filter((note) => !note.resolved && note.timeMs >= state.elapsedMs - 20)
    .sort((a, b) => a.timeMs - b.timeMs)
    .slice(0, count)
    .map((note) => ({ lanes: note.lanes.slice(), kind: note.kind }));
}

export function getVisibleNotes(state: GameState): NoteEvent[] {
  return state.notes
    .filter((note) => {
      const beatLead = (note.timeMs - state.elapsedMs) / note.beatMs;
      const tailLead = (note.timeMs + note.durationMs - state.elapsedMs) / note.beatMs;
      return tailLead > -0.25 && beatLead < 7;
    })
    .sort((a, b) => a.timeMs - b.timeMs);
}

export function getBalanceSnapshot(state: GameState) {
  return {
    screen: state.screen,
    elapsedMs: state.elapsedMs,
    score: state.score,
    combo: state.combo,
    bestScore: state.bestScore,
    lives: state.lives,
    song: state.currentSongLabel,
    difficulty: state.currentDifficultyLabel,
    selectionSongId: state.selectedSongId,
    selectionDifficulty: state.selectedDifficulty,
    preview: getUpcomingClusters(state, 3),
    visible: getVisibleNotes(state).slice(0, 6).map((note) => ({
      lanes: note.lanes.slice(),
      kind: note.kind,
      role: note.sourceRole,
      inMs: Math.round(note.timeMs - state.elapsedMs),
      holdMs: Math.round(note.durationMs),
      confidence: Number(note.confidence.toFixed(3)),
      phraseId: note.phraseId,
      motifId: note.motifId,
    })),
  };
}

export function buildChartReport(): ChartSummary[] {
  return SONG_IDS.flatMap((songId) =>
    DIFFICULTIES.map((difficulty) => {
      const summary = summarizeChart(songId, difficulty);
      return {
        songId,
        songLabel: getSongDefinition(songId).label,
        difficulty,
        ...summary,
      };
    }),
  );
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    notes: state.notes.map((note) => ({ ...note, hits: note.hits.slice(), lanes: note.lanes.slice() })),
  };
}

function findTargetNote(state: GameState, lane: number, timeMs: number): NoteEvent | undefined {
  return state.notes
    .filter((note) => !note.resolved && note.lanes.includes(lane) && note.startedAtMs === null)
    .filter((note) => Math.abs(note.timeMs - timeMs) <= HIT_WINDOWS.good)
    .sort((a, b) => Math.abs(a.timeMs - timeMs) - Math.abs(b.timeMs - timeMs))[0];
}

function scoreHit(state: GameState, judgement: Judgement, baseScore: number): void {
  const multiplier = 1 + Math.min(4, Math.floor(state.combo / 20));
  const base = judgement === "perfect" ? baseScore : Math.round(baseScore * 0.7);
  state.combo += 1;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  state.score += base * multiplier;
}

function miss(state: GameState, events: GameEvent[]): void {
  state.combo = 0;
  state.lives = Math.max(0, state.lives - 1);
  events.push({ kind: "miss", judgement: "miss" });
}

function pickBestJudgement(previous: Judgement | null, next: Judgement): Judgement {
  if (!previous) return next;
  if (previous === "perfect" || next === "perfect") return "perfect";
  if (previous === "good" || next === "good") return "good";
  return next;
}

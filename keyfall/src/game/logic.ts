import { SONGS, type SongConfig } from "./songs.ts";

export const LANE_COUNT = 4;
export const INITIAL_LIVES = 4;
export const PHRASE_BEATS = 16;
export const PHRASES_PER_SONG = 2;
export const HIT_WINDOWS = {
  perfect: 70,
  good: 130,
} as const;

const LOOKAHEAD_PHRASES = 6;
const NOTE_CLEAR_MS = 540;
const HOLD_SCORE = 60;
const TAP_SCORE = 100;

export type Screen = "start" | "playing" | "gameover";
export type NoteKind = "tap" | "hold";
export type Judgement = "perfect" | "good" | "miss";

export interface NoteEvent {
  id: number;
  kind: NoteKind;
  lanes: number[];
  timeMs: number;
  beatMs: number;
  durationMs: number;
  phraseIndex: number;
  songIndex: number;
  hits: boolean[];
  hitQuality: Judgement | null;
  resolved: boolean;
  success: boolean;
  startedAtMs: number | null;
  releasedEarly: boolean;
  resolvedAtMs: number | null;
}

export interface PhraseMeta {
  index: number;
  songIndex: number;
  bpm: number;
  startMs: number;
  endMs: number;
  accent: string;
}

export interface GameEvent {
  kind: "hit" | "miss" | "phrase" | "gameover";
  judgement?: Judgement;
  combo?: number;
  phraseIndex?: number;
}

export interface PreviewCluster {
  lanes: number[];
  kind: NoteKind;
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
  generatedThroughPhrase: number;
  phrases: PhraseMeta[];
  lastPhraseSignal: number;
  seed: number;
  songIndex: number;
  currentSongLabel: string;
  currentAccent: string;
  lastEvent: GameEvent | null;
}

export function createInitialState(seed = 1, persisted?: { bestScore?: number; bestCombo?: number }): GameState {
  const firstSong = getSongByIndex(0);
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
    generatedThroughPhrase: 0,
    phrases: [],
    lastPhraseSignal: -1,
    seed,
    songIndex: 0,
    currentSongLabel: firstSong.label,
    currentAccent: firstSong.accent,
    lastEvent: null,
  };
}

export function startRun(state: GameState): GameState {
  const reset = createInitialState(state.seed, { bestScore: state.bestScore, bestCombo: state.bestCombo });
  reset.screen = "playing";
  ensureLookahead(reset, 0);
  return reset;
}

export function updateGame(state: GameState, elapsedMs: number, pressedLanes: Set<number>): { state: GameState; events: GameEvent[] } {
  if (state.screen !== "playing") {
    return { state, events: [] };
  }

  const next = cloneState(state);
  next.elapsedMs += elapsedMs;
  ensureLookahead(next, next.elapsedMs);
  const phraseEvents = syncCurrentPhrase(next);
  const events: GameEvent[] = [...phraseEvents];

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

export function getSong(state: GameState): SongConfig {
  return getSongByIndex(state.songIndex);
}

export function getCurrentPhrase(state: GameState): PhraseMeta {
  const phrase = state.phrases.find((entry) => state.elapsedMs >= entry.startMs && state.elapsedMs < entry.endMs);
  if (phrase) return phrase;
  const fallback = state.phrases[state.phrases.length - 1];
  if (fallback) return fallback;
  const song = getSong(state);
  return {
    index: 0,
    songIndex: state.songIndex,
    bpm: song.bpm,
    startMs: 0,
    endMs: (60000 / song.bpm) * PHRASE_BEATS,
    accent: song.accent,
  };
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
  const phrase = getCurrentPhrase(state);
  return {
    screen: state.screen,
    score: state.score,
    combo: state.combo,
    bestScore: state.bestScore,
    lives: state.lives,
    song: state.currentSongLabel,
    phrase: phrase.index,
    preview: getUpcomingClusters(state, 3),
  };
}

function cloneState(state: GameState): GameState {
  return {
    ...state,
    notes: state.notes.map((note) => ({ ...note, hits: note.hits.slice(), lanes: note.lanes.slice() })),
    phrases: state.phrases.map((phrase) => ({ ...phrase })),
  };
}

function ensureLookahead(state: GameState, nowMs: number): void {
  const currentPhraseIndex = state.phrases.find((phrase) => nowMs >= phrase.startMs && nowMs < phrase.endMs)?.index ?? 0;
  while (state.generatedThroughPhrase < currentPhraseIndex + LOOKAHEAD_PHRASES) {
    const phraseIndex = state.generatedThroughPhrase;
    const songIndex = Math.floor(phraseIndex / PHRASES_PER_SONG) % SONGS.length;
    const song = getSongByIndex(songIndex);
    const beatMs = 60000 / song.bpm;
    const previousPhrase = state.phrases[state.phrases.length - 1];
    const startMs = previousPhrase ? previousPhrase.endMs : 0;
    const endMs = startMs + beatMs * PHRASE_BEATS;
    state.phrases.push({
      index: phraseIndex,
      songIndex,
      bpm: song.bpm,
      startMs,
      endMs,
      accent: song.accent,
    });
    state.notes.push(...generatePhrase(state, phraseIndex, startMs, songIndex));
    state.generatedThroughPhrase += 1;
  }
}

function syncCurrentPhrase(state: GameState): GameEvent[] {
  const phrase = getCurrentPhrase(state);
  const song = getSongByIndex(phrase.songIndex);
  state.songIndex = phrase.songIndex;
  state.currentSongLabel = song.label;
  state.currentAccent = song.accent;
  if (phrase.index > state.lastPhraseSignal) {
    state.lastPhraseSignal = phrase.index;
    return [{ kind: "phrase", phraseIndex: phrase.index }];
  }
  return [];
}

function generatePhrase(state: GameState, phraseIndex: number, startMs: number, songIndex: number): NoteEvent[] {
  const song = getSongByIndex(songIndex);
  const beatMs = 60000 / song.bpm;
  const rng = mulberry32(hashSeed(state.seed, phraseIndex * 17 + songIndex * 101));
  const difficultyTier = Math.min(8, Math.floor(phraseIndex / 2));
  const offbeatChance = 0.12 + difficultyTier * 0.03;
  const chordChance = difficultyTier < 2 ? 0.08 : 0.12 + difficultyTier * 0.02;
  const holdChance = 0.06 + difficultyTier * 0.018;
  const laneBusyUntil = Array<number>(LANE_COUNT).fill(-1);
  const events: NoteEvent[] = [];
  let lastLane = Math.floor(rng() * LANE_COUNT);

  for (let slot = 0; slot < 32; slot += 1) {
    const onBeat = slot % 2 === 0;
    if (!onBeat && rng() > offbeatChance) continue;
    const freeLanes = Array.from({ length: LANE_COUNT }, (_, lane) => lane).filter((lane) => (laneBusyUntil[lane] ?? -1) <= slot);
    if (freeLanes.length === 0) continue;

    const baseTimeMs = startMs + slot * 0.5 * beatMs;
    const useHold = onBeat && rng() < holdChance && slot < 28;
    const useChord = onBeat && freeLanes.length > 2 && rng() < chordChance;

    if (useHold) {
      const lane = pickLane(freeLanes, lastLane, rng);
      const durationSlots = rng() > 0.58 ? 4 : 3;
      laneBusyUntil[lane] = slot + durationSlots;
      lastLane = lane;
      events.push({
        id: state.nextNoteId++,
        kind: "hold",
        lanes: [lane],
        timeMs: baseTimeMs,
        beatMs,
        durationMs: durationSlots * 0.5 * beatMs,
        phraseIndex,
        songIndex,
        hits: [false],
        hitQuality: null,
        resolved: false,
        success: false,
        startedAtMs: null,
        releasedEarly: false,
        resolvedAtMs: null,
      });
      continue;
    }

    if (useChord) {
      const chordLanes = freeLanes.filter(
        (candidate) => candidate < LANE_COUNT - 1 && (laneBusyUntil[candidate + 1] ?? -1) <= slot,
      );
      const lane = pickLane(chordLanes, lastLane, rng);
      if (lane !== -1) {
        lastLane = lane + 1;
        events.push({
          id: state.nextNoteId++,
          kind: "tap",
          lanes: [lane, lane + 1],
          timeMs: baseTimeMs,
          beatMs,
          durationMs: 0,
          phraseIndex,
          songIndex,
          hits: [false, false],
          hitQuality: null,
          resolved: false,
          success: false,
          startedAtMs: null,
          releasedEarly: false,
          resolvedAtMs: null,
        });
        continue;
      }
    }

    const lane = pickLane(freeLanes, lastLane, rng);
    if (lane === -1) continue;
    lastLane = lane;
    events.push({
      id: state.nextNoteId++,
      kind: "tap",
      lanes: [lane],
      timeMs: baseTimeMs,
      beatMs,
      durationMs: 0,
      phraseIndex,
      songIndex,
      hits: [false],
      hitQuality: null,
      resolved: false,
      success: false,
      startedAtMs: null,
      releasedEarly: false,
      resolvedAtMs: null,
    });
  }

  return events;
}

function pickLane(available: number[], lastLane: number, rng: () => number): number {
  if (available.length === 0) return -1;
  const sorted = available.slice().sort((a, b) => Math.abs(a - lastLane) - Math.abs(b - lastLane));
  const nearest = sorted[0];
  if (nearest === undefined) return -1;
  if (rng() < 0.55) return nearest;
  return sorted[Math.floor(rng() * sorted.length)] ?? nearest;
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

function getSongByIndex(index: number): SongConfig {
  const song = SONGS[index];
  if (!song) {
    throw new Error(`Missing song config at index ${index}`);
  }
  return song;
}

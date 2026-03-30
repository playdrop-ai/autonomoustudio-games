import { AI_TRACK_DATA } from "./generated/aiTrackData.ts";
import { SONGS, type SongConfig } from "./songs.ts";

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type DifficultyId = (typeof DIFFICULTIES)[number];

export const SONG_IDS = ["synth", "piano", "rock"] as const;
export type SongId = (typeof SONG_IDS)[number];

export interface SongTheme {
  accent: string;
  ambient: string;
}

export type ChartSourceRole = "melody" | "hook" | "accent" | "sustain";

export interface BeatAnchor {
  index: number;
  timeMs: number;
  intervalMs: number;
  barIndex: number;
  beatInBar: number;
}

export interface ChartSection {
  id: string;
  label: string;
  startMs: number;
  endMs: number;
  startBar: number;
  endBar: number;
}

export interface ChartNoteTemplate {
  timeMs: number;
  durationMs: number;
  beatMs: number;
  lane: number;
  sourceRole: ChartSourceRole;
  confidence: number;
  phraseId: number | string;
  motifId: string | number | null;
}

export interface ChartDefinition {
  durationMs: number;
  leadInMs: number;
  bpm: number;
  beatAnchors: BeatAnchor[];
  sections: ChartSection[];
  notes: ChartNoteTemplate[];
}

export interface ProceduralStep {
  timeMs: number;
  song: SongConfig;
  kick: boolean;
  hat: boolean;
  bass: number | null;
  lead: number | null;
}

export type SongAudioSource =
  | {
      kind: "procedural";
      durationMs: number;
      steps: ProceduralStep[];
    }
  | {
      kind: "file";
      durationMs: number;
      assetId: "pianoEtude" | "rockDrive";
      gain: number;
    };

export interface SongDefinition {
  id: SongId;
  label: string;
  theme: SongTheme;
  charts: Record<DifficultyId, ChartDefinition>;
  audio: SongAudioSource;
}

interface SongStep {
  slot: number;
  timeMs: number;
  beatMs: number;
  strongBeat: boolean;
  offbeat: boolean;
  kick: boolean;
  hat: boolean;
  bass: number | null;
  lead: number | null;
  energy: number;
}

interface ChartProfile {
  energyThreshold: number;
  allowOffbeats: boolean;
  allowHolds: boolean;
  allowHatSteps: boolean;
  maxJump: number;
  minSpacingSlots: number;
}

const BASE_THEME: SongTheme = {
  accent: "#7ef0c0",
  ambient: "#10281f",
};
const PROCEDURAL_PHRASE_BEATS = 16;
const PROCEDURAL_PHRASES_PER_SONG = 2;

const AI_SONGS = {
  piano: buildAiSongDefinition("piano", "pianoEtude"),
  rock: buildAiSongDefinition("rock", "rockDrive"),
} as const;

const SYNTH_SONG = buildSynthSongDefinition();

export const SONG_LIBRARY: SongDefinition[] = [SYNTH_SONG, AI_SONGS.piano, AI_SONGS.rock];

export function getSongDefinition(songId: SongId): SongDefinition {
  const song = SONG_LIBRARY.find((entry) => entry.id === songId);
  if (!song) {
    throw new Error(`Unknown song ${songId}`);
  }
  return song;
}

export function getDefaultSongId(): SongId {
  return "synth";
}

export function getDefaultDifficulty(): DifficultyId {
  return "easy";
}

export function summarizeChart(songId: SongId, difficulty: DifficultyId) {
  const chart = getSongDefinition(songId).charts[difficulty];
  const distinctLaneCount = new Set(chart.notes.map((note) => note.lane)).size;
  let longestLaneStreak = 0;
  let currentStreak = 0;
  let previousLane = -1;
  for (const note of chart.notes) {
    currentStreak = note.lane === previousLane ? currentStreak + 1 : 1;
    previousLane = note.lane;
    longestLaneStreak = Math.max(longestLaneStreak, currentStreak);
  }
  return {
    noteCount: chart.notes.length,
    holdCount: chart.notes.filter((note) => note.durationMs > 0).length,
    distinctLaneCount,
    longestLaneStreak,
    firstNoteMs: chart.notes[0]?.timeMs ?? 0,
    durationMs: chart.durationMs,
  };
}

function buildAiSongDefinition(trackId: "piano" | "rock", assetId: "pianoEtude" | "rockDrive"): SongDefinition {
  const data = AI_TRACK_DATA[trackId];
  const id: SongId = trackId;
  return {
    id,
    label: data.label,
    theme: BASE_THEME,
    charts: {
      easy: cloneChart(data.charts.easy),
      medium: cloneChart(data.charts.medium),
      hard: cloneChart(data.charts.hard),
    },
    audio: {
      kind: "file",
      durationMs: data.durationMs,
      assetId,
      gain: trackId === "rock" ? 0.22 : 0.18,
    },
  };
}

function cloneChart(chart: {
  durationMs: number;
  leadInMs: number;
  bpm: number;
  notes: readonly {
    timeMs: number;
    durationMs: number;
    beatMs: number;
    lane: number;
    sourceRole: ChartSourceRole;
    confidence: number;
    phraseId: number | string;
    motifId: string | number | null;
  }[];
  beatAnchors: readonly BeatAnchor[];
  sections: readonly ChartSection[];
}): ChartDefinition {
  return {
    durationMs: chart.durationMs,
    leadInMs: chart.leadInMs,
    bpm: chart.bpm,
    beatAnchors: chart.beatAnchors.map((anchor) => ({ ...anchor })),
    sections: chart.sections.map((section) => ({ ...section })),
    notes: chart.notes.map((note) => ({
      timeMs: note.timeMs,
      durationMs: note.durationMs,
      beatMs: note.beatMs,
      lane: note.lane,
      sourceRole: note.sourceRole,
      confidence: note.confidence,
      phraseId: note.phraseId,
      motifId: note.motifId,
    })),
  };
}

function buildSynthSongDefinition(): SongDefinition {
  const charts: Record<DifficultyId, ChartDefinition> = {
    easy: buildSynthChart("easy"),
    medium: buildSynthChart("medium"),
    hard: buildSynthChart("hard"),
  };
  return {
    id: "synth",
    label: "SYNTH",
    theme: BASE_THEME,
    charts,
    audio: {
      kind: "procedural",
      durationMs: charts.medium.durationMs,
      steps: buildSynthAudioSteps(),
    },
  };
}

function buildSynthAudioSteps(): ProceduralStep[] {
  const steps: ProceduralStep[] = [];
  let phraseStartMs = 0;
  const phraseCount = SONGS.length * PROCEDURAL_PHRASES_PER_SONG;

  for (let phraseIndex = 0; phraseIndex < phraseCount; phraseIndex += 1) {
    const song = SONGS[Math.floor(phraseIndex / PROCEDURAL_PHRASES_PER_SONG) % SONGS.length]!;
    const phraseSteps = buildSongSteps(song, phraseStartMs);
    for (const step of phraseSteps) {
      steps.push({
        timeMs: step.timeMs,
        song,
        kick: step.kick,
        hat: step.hat,
        bass: step.bass,
        lead: step.lead,
      });
    }
    phraseStartMs += (60000 / song.bpm) * PROCEDURAL_PHRASE_BEATS;
  }

  return steps;
}

function buildSynthChart(difficulty: DifficultyId): ChartDefinition {
  const notes: ChartNoteTemplate[] = [];
  const beatAnchors: BeatAnchor[] = [];
  const sections: ChartSection[] = [];
  let phraseStartMs = 0;
  let globalBeatIndex = 0;
  let globalBarIndex = 0;
  const phraseCount = SONGS.length * PROCEDURAL_PHRASES_PER_SONG;

  for (let phraseIndex = 0; phraseIndex < phraseCount; phraseIndex += 1) {
    const song = SONGS[Math.floor(phraseIndex / PROCEDURAL_PHRASES_PER_SONG) % SONGS.length]!;
    const steps = buildSongSteps(song, phraseStartMs);
    const profile = getChartProfile(song, phraseIndex, difficulty);
    const beatMs = 60000 / song.bpm;
    const laneBusyUntil = Array<number>(4).fill(-1);
    const laneUsage = Array<number>(4).fill(0);
    let lastLane = 1;
    let lastLaneStreak = 1;
    let lastPlacedSlot = -99;
    let previousPitch: number | null = null;

    for (let beatInPhrase = 0; beatInPhrase < PROCEDURAL_PHRASE_BEATS; beatInPhrase += 1) {
      beatAnchors.push({
        index: globalBeatIndex,
        timeMs: Math.round(phraseStartMs + beatInPhrase * beatMs),
        intervalMs: Math.round(beatMs),
        barIndex: globalBarIndex + Math.floor(beatInPhrase / 4),
        beatInBar: beatInPhrase % 4,
      });
      globalBeatIndex += 1;
    }

    sections.push({
      id: `section-${phraseIndex + 1}`,
      label: song.label.toUpperCase(),
      startMs: Math.round(phraseStartMs),
      endMs: Math.round(phraseStartMs + beatMs * PROCEDURAL_PHRASE_BEATS),
      startBar: globalBarIndex,
      endBar: globalBarIndex + Math.ceil(PROCEDURAL_PHRASE_BEATS / 4),
    });

    for (const step of steps) {
      if (!shouldPlaceStep(step, profile, lastPlacedSlot)) continue;
      const lane = resolveLaneForStep(step, phraseIndex, profile, lastLane, lastLaneStreak, laneUsage, laneBusyUntil, previousPitch);
      if (lane === null) continue;

      const holdSlots = resolveHoldSlots(steps, step.slot, profile, laneBusyUntil[lane] ?? -1);
      laneBusyUntil[lane] = step.slot + holdSlots;
      laneUsage[lane] = (laneUsage[lane] ?? 0) + 1;
      lastLaneStreak = lane === lastLane ? lastLaneStreak + 1 : 1;
      lastLane = lane;
      lastPlacedSlot = step.slot;
      previousPitch = currentStepPitch(step);

      const durationMs = Math.round(holdSlots * 0.5 * step.beatMs);
      const sourceRole =
        durationMs > 0 ? "sustain" : step.lead !== null ? "melody" : step.bass !== null ? "hook" : "accent";

      notes.push({
        timeMs: Math.round(step.timeMs),
        durationMs,
        beatMs: Math.round(step.beatMs),
        lane,
        sourceRole,
        confidence: 1,
        phraseId: phraseIndex,
        motifId: null,
      });
    }

    phraseStartMs += (60000 / song.bpm) * PROCEDURAL_PHRASE_BEATS;
    globalBarIndex += Math.ceil(PROCEDURAL_PHRASE_BEATS / 4);
  }

  const firstSong = SONGS[0]!;
  return {
    durationMs: Math.round(phraseStartMs),
    leadInMs: 180,
    bpm: firstSong.bpm,
    beatAnchors,
    sections,
    notes,
  };
}

function buildSongSteps(song: SongConfig, startMs: number): SongStep[] {
  const beatMs = 60000 / song.bpm;
  const steps: SongStep[] = [];
  for (let slot = 0; slot < 32; slot += 1) {
    const patternIndex = slot % 16;
    const kick = song.kick[patternIndex] ?? false;
    const hat = song.hat[patternIndex] ?? false;
    const bass = song.bass[patternIndex] ?? null;
    const lead = song.lead[patternIndex] ?? null;
    const strongBeat = slot % 4 === 0;
    const offbeat = slot % 2 !== 0;

    let energy = 0;
    if (kick) energy += 1;
    if (bass !== null) energy += 1.35;
    if (lead !== null) energy += 1.55;
    if (hat) energy += offbeat ? 0.35 : 0.18;
    if (strongBeat) energy += 0.35;

    steps.push({
      slot,
      timeMs: startMs + slot * 0.5 * beatMs,
      beatMs,
      strongBeat,
      offbeat,
      kick,
      hat,
      bass,
      lead,
      energy,
    });
  }
  return steps;
}

function getChartProfile(song: SongConfig, phraseIndex: number, difficulty: DifficultyId): ChartProfile {
  const phraseInSong = phraseIndex % PROCEDURAL_PHRASES_PER_SONG;
  const cycle = Math.floor(phraseIndex / (PROCEDURAL_PHRASES_PER_SONG * SONGS.length));
  const difficultyBoost = difficulty === "easy" ? 0 : difficulty === "medium" ? 2 : 4;
  const stage = Math.min(8, song.level + phraseInSong + cycle * 4 + difficultyBoost);

  switch (stage) {
    case 0:
      return { energyThreshold: 2.4, allowOffbeats: false, allowHolds: false, allowHatSteps: false, maxJump: 1, minSpacingSlots: 2 };
    case 1:
      return { energyThreshold: 2.1, allowOffbeats: false, allowHolds: false, allowHatSteps: false, maxJump: 1, minSpacingSlots: 1 };
    case 2:
      return { energyThreshold: 1.85, allowOffbeats: true, allowHolds: false, allowHatSteps: false, maxJump: 1, minSpacingSlots: 1 };
    case 3:
      return { energyThreshold: 1.62, allowOffbeats: true, allowHolds: true, allowHatSteps: false, maxJump: 1, minSpacingSlots: 1 };
    case 4:
      return { energyThreshold: 1.42, allowOffbeats: true, allowHolds: true, allowHatSteps: true, maxJump: 2, minSpacingSlots: 1 };
    case 5:
      return { energyThreshold: 1.22, allowOffbeats: true, allowHolds: true, allowHatSteps: true, maxJump: 2, minSpacingSlots: 0 };
    case 6:
      return { energyThreshold: 1.08, allowOffbeats: true, allowHolds: true, allowHatSteps: true, maxJump: 2, minSpacingSlots: 0 };
    case 7:
      return { energyThreshold: 1.0, allowOffbeats: true, allowHolds: true, allowHatSteps: true, maxJump: 2, minSpacingSlots: 0 };
    default:
      return { energyThreshold: 0.94, allowOffbeats: true, allowHolds: true, allowHatSteps: true, maxJump: 3, minSpacingSlots: 0 };
  }
}

function shouldPlaceStep(step: SongStep, profile: ChartProfile, lastPlacedSlot: number): boolean {
  const melodic = step.lead !== null || step.bass !== null;
  if (step.energy < profile.energyThreshold) return false;
  if (step.offbeat && !profile.allowOffbeats) return false;
  if (step.offbeat && !melodic && !profile.allowHatSteps) return false;
  if (!melodic && !step.kick) return false;
  if (step.slot - lastPlacedSlot <= profile.minSpacingSlots) return false;
  return step.strongBeat || melodic;
}

function pickLaneForStep(step: SongStep, lastLane: number, maxJump: number): number {
  const target =
    step.lead !== null
      ? intervalToLane(step.lead)
      : step.bass !== null
        ? intervalToLane(step.bass)
        : fallbackLane(step.slot);
  return clampLane(lastLane + Math.sign(target - lastLane) * Math.min(maxJump, Math.abs(target - lastLane)));
}

function resolveLaneForStep(
  step: SongStep,
  phraseIndex: number,
  profile: ChartProfile,
  lastLane: number,
  lastLaneStreak: number,
  laneUsage: number[],
  laneBusyUntil: number[],
  previousPitch: number | null,
): number | null {
  const pitchLane = pickLaneForStep(step, lastLane, profile.maxJump);
  const anchorLane = fallbackLane(step.slot + phraseIndex * 3 + (step.offbeat ? 1 : 0));
  const stepPitch = currentStepPitch(step);
  const contourDirection = previousPitch !== null && stepPitch !== null ? Math.sign(stepPitch - previousPitch) : 0;
  const contourLane = clampLane(lastLane + contourDirection);
  const desiredLane = clampLane(Math.round(anchorLane * 0.6 + pitchLane * 0.25 + contourLane * 0.15));

  let bestLane: number | null = null;
  let bestCost = Number.POSITIVE_INFINITY;

  for (let lane = 0; lane < 4; lane += 1) {
    if ((laneBusyUntil[lane] ?? -1) > step.slot) continue;

    const jump = Math.abs(lane - lastLane);
    let cost = 0;
    cost += Math.abs(lane - desiredLane) * 2.2;
    cost += Math.abs(lane - anchorLane) * 1.1;
    cost += (laneUsage[lane] ?? 0) * 1.25;
    cost += jump > profile.maxJump ? (jump - profile.maxJump) * 3.5 : jump * 0.35;
    if (lane === lastLane) {
      cost += 2.4 + lastLaneStreak * 1.8;
    }
    if (lastLaneStreak >= 2 && lane === lastLane) {
      cost += 6;
    }

    if (cost < bestCost) {
      bestCost = cost;
      bestLane = lane;
    }
  }

  return bestLane;
}

function resolveHoldSlots(steps: SongStep[], slot: number, profile: ChartProfile, laneBusyUntil: number): number {
  if (!profile.allowHolds) return 0;
  const current = steps[slot];
  if (!current || !current.strongBeat) return 0;
  if (laneBusyUntil > slot) return 0;
  if (current.lead === null && current.bass === null) return 0;

  const next = steps[slot + 1];
  const next2 = steps[slot + 2];
  const next3 = steps[slot + 3];
  if (!next || !next2) return 0;

  const nextIsRestish = isRestishStep(next, profile);
  const next2IsRestish = isRestishStep(next2, profile);
  const next3IsStrong = next3?.strongBeat ?? false;
  if (nextIsRestish && next2IsRestish && next3IsStrong) {
    return 4;
  }
  if (nextIsRestish && (next2.strongBeat || next2IsRestish)) {
    return 3;
  }
  if (nextIsRestish) {
    return 2;
  }
  return 0;
}

function isRestishStep(step: SongStep, profile: ChartProfile): boolean {
  return step.lead === null && step.bass === null && (!step.kick || profile.allowHatSteps);
}

function intervalToLane(interval: number): number {
  if (interval <= 3) return 0;
  if (interval <= 8) return 1;
  if (interval <= 14) return 2;
  return 3;
}

function fallbackLane(slot: number): number {
  const pattern = [1, 2, 1, 0, 1, 2, 3, 2];
  return pattern[Math.floor(slot / 2) % pattern.length] ?? 1;
}

function currentStepPitch(step: SongStep): number | null {
  return step.lead ?? step.bass;
}

function clampLane(value: number): number {
  return Math.max(0, Math.min(3, value));
}

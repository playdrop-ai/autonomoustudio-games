import test from "node:test";
import assert from "node:assert/strict";

import {
  applyLanePress,
  buildChartReport,
  createInitialState,
  getBalanceSnapshot,
  setSelectedDifficulty,
  setSelectedSong,
  startRun,
  updateGame,
} from "../src/game/logic.ts";
import { getSongDefinition } from "../src/game/songbook.ts";

test("default state starts on synth easy", () => {
  const state = createInitialState({ bestScore: 12, bestCombo: 3 });
  assert.equal(state.screen, "start");
  assert.equal(state.selectedSongId, "synth");
  assert.equal(state.selectedDifficulty, "easy");
  assert.equal(state.currentSongLabel, "SYNTH");
});

test("selection updates before a run", () => {
  let state = createInitialState();
  state = setSelectedSong(state, "rock");
  state = setSelectedDifficulty(state, "hard");
  assert.equal(state.selectedSongId, "rock");
  assert.equal(state.selectedDifficulty, "hard");
  assert.equal(state.currentSongLabel, "ROCK");
  assert.equal(state.currentDifficultyLabel, "HARD");
});

test("starting a run clones the selected chart", () => {
  let state = createInitialState();
  state = setSelectedSong(state, "piano");
  state = setSelectedDifficulty(state, "medium");
  state = startRun(state);
  const snapshot = getBalanceSnapshot(state);
  assert.equal(state.screen, "playing");
  assert.equal(state.currentSongLabel, "PIANO");
  assert.equal(state.currentDifficultyLabel, "MEDIUM");
  assert.ok(state.notes.length > 60);
  assert.ok(snapshot.visible.length > 0);
  assert.ok(state.notes.every((note) => note.sourceRole));
  assert.ok(state.notes.every((note) => typeof note.confidence === "number"));
});

test("successful hit increases score and combo", () => {
  let state = createInitialState();
  state = startRun(state);
  const note = state.notes[0];
  assert.ok(note);
  const result = applyLanePress(state, note.lanes[0], note.timeMs);
  state = result.state;
  assert.ok(state.score > 0);
  assert.equal(state.combo, 1);
});

test("missed note removes one life", () => {
  let state = createInitialState();
  state = startRun(state);
  const note = state.notes[0];
  assert.ok(note);
  const result = updateGame(state, note.timeMs + 500, new Set());
  state = result.state;
  assert.equal(state.lives, 3);
});

test("chart report exposes all song difficulty combinations", () => {
  const report = buildChartReport();
  assert.equal(report.length, 9);
  const pianoHard = report.find((entry) => entry.songId === "piano" && entry.difficulty === "hard");
  const rockEasy = report.find((entry) => entry.songId === "rock" && entry.difficulty === "easy");
  assert.ok(pianoHard);
  assert.ok(rockEasy);
  assert.ok((pianoHard?.noteCount ?? 0) > (rockEasy?.noteCount ?? 0));
  assert.ok(report.every((entry) => entry.distinctLaneCount === 4));
});

test("ai charts expose beat anchors, sections, and note metadata", () => {
  const piano = getSongDefinition("piano");
  for (const difficulty of ["easy", "medium", "hard"] as const) {
    const chart = piano.charts[difficulty];
    assert.ok(chart.beatAnchors.length > 100);
    assert.ok(chart.sections.length > 0);
    assert.ok(chart.notes.every((note) => typeof note.sourceRole === "string"));
    assert.ok(chart.notes.every((note) => typeof note.confidence === "number"));
    assert.ok(chart.notes.every((note) => note.phraseId !== undefined));
  }
});

test("ai chart difficulties preserve subset identity", () => {
  for (const songId of ["piano", "rock"] as const) {
    const song = getSongDefinition(songId);
    const hard = new Map(song.charts.hard.notes.map((note) => [`${note.timeMs}:${note.lane}:${note.durationMs}`, note]));
    const medium = song.charts.medium.notes.map((note) => [`${note.timeMs}:${note.lane}:${note.durationMs}`, note] as const);
    const easy = song.charts.easy.notes.map((note) => [`${note.timeMs}:${note.lane}:${note.durationMs}`, note] as const);

    for (const [key, note] of medium) {
      const hardNote = hard.get(key);
      assert.ok(hardNote, `${songId} medium note ${key} must exist in hard`);
      assert.equal(hardNote?.timeMs, note.timeMs);
      assert.equal(hardNote?.lane, note.lane);
      assert.equal(hardNote?.durationMs, note.durationMs);
    }

    const mediumMap = new Map(medium);
    for (const [key, note] of easy) {
      const mediumNote = mediumMap.get(key);
      assert.ok(mediumNote, `${songId} easy note ${key} must exist in medium`);
      assert.equal(mediumNote?.timeMs, note.timeMs);
      assert.equal(mediumNote?.lane, note.lane);
      assert.equal(mediumNote?.durationMs, note.durationMs);
    }
  }
});

test("run clears after the selected chart ends", () => {
  let state = createInitialState();
  state = setSelectedSong(state, "rock");
  state = setSelectedDifficulty(state, "easy");
  state = startRun(state);
  state.notes.forEach((note) => {
    note.resolved = true;
    note.success = true;
    note.resolvedAtMs = note.timeMs + note.durationMs;
  });
  const result = updateGame(state, 64000, new Set());
  state = result.state;
  assert.equal(state.screen, "clear");
});

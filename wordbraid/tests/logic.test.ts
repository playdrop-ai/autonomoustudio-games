import test from "node:test";
import assert from "node:assert/strict";

import { commitWord, createInitialState, findCandidateWords, previewPulls, scoreWord, type GameState, type Ribbon } from "../src/game/logic.ts";

function letter(letter: string) {
  return { kind: "letter" as const, letter };
}

function letters(value: string): Ribbon {
  return value.split("").map((entry) => letter(entry));
}

function makeState(ribbons: Ribbon[]): GameState {
  return {
    ribbons,
    score: 0,
    combo: 0,
    turns: 0,
    wordsPlayed: 0,
    rngState: 12345,
    gameOver: false,
    lastCommittedWord: null,
    lastScoreGain: 0,
    lastScrubCount: 0,
    lastThreatRibbon: null,
  };
}

test("previewPulls allows reusing the same ribbon as it advances", () => {
  const ribbons = [
    letters("catxxx"),
    letters("oooeee"),
    letters("sssiii"),
    letters("lllrrr"),
    letters("nnnttt"),
  ];

  const preview = previewPulls(ribbons, [0, 0, 0]);
  assert.equal(preview.blocked, false);
  assert.equal(preview.word, "cat");
});

test("findCandidateWords discovers obvious ribbon words", () => {
  const ribbons = [
    letters("czzzzz"),
    letters("ayyyyy"),
    letters("rrrrrr"),
    letters("eeeeee"),
    letters("tttttt"),
  ];

  const words = findCandidateWords(ribbons, 20).map((candidate) => candidate.word);
  assert.ok(words.includes("cat"));
  assert.ok(words.includes("care"));
  assert.ok(words.includes("cater"));
});

test("commitWord updates score and run counters", () => {
  const state = makeState([
    letters("czzzzz"),
    letters("ayyyyy"),
    letters("tttttt"),
    letters("eeeeee"),
    letters("rrrrrr"),
  ]);

  const result = commitWord(state, [0, 1, 2]);
  assert.ok(result);
  assert.equal(result.word, "cat");
  assert.equal(result.scoreGain, scoreWord("cat", 1));
  assert.equal(result.state.score, scoreWord("cat", 1));
  assert.equal(result.state.turns, 1);
  assert.equal(result.state.wordsPlayed, 1);
  assert.equal(result.state.combo, 1);
});

test("four-letter words scrub the newly inserted ink", () => {
  const state = makeState([
    letters("czzzzz"),
    letters("ayyyyy"),
    letters("rrrrrr"),
    letters("eeeeee"),
    letters("tttttt"),
  ]);

  const result = commitWord(state, [0, 1, 2, 3]);
  assert.ok(result);
  assert.equal(result.scrubCount, 1);
  const inkCount = result.state.ribbons.flat().filter((tile) => tile.kind === "ink").length;
  assert.equal(inkCount, 0);
});

test("commitWord rejects invalid braids", () => {
  const state = makeState([
    letters("qzzzzz"),
    letters("xyyyyy"),
    letters("jttttt"),
    letters("seeeee"),
    letters("rrrrrr"),
  ]);

  assert.equal(commitWord(state, [0, 1, 2]), null);
});

test("createInitialState always exposes candidates", () => {
  const state = createInitialState(7);
  assert.ok(findCandidateWords(state.ribbons, 12).length >= 1);
});

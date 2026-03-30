import { hasPrefix, isWord, scoreLetters } from "./dictionary.ts";

export const RIBBON_COUNT = 5;
export const RIBBON_DEPTH = 6;
export const MIN_WORD_LENGTH = 3;
export const MAX_WORD_LENGTH = 5;
const INITIAL_STATE_ATTEMPTS = 256;
const POST_WORD_ATTEMPTS = 2048;
export const LETTER_WEIGHTS: Array<[string, number]> = [
  ["e", 124],
  ["a", 92],
  ["r", 82],
  ["i", 79],
  ["o", 76],
  ["t", 74],
  ["n", 69],
  ["s", 63],
  ["l", 49],
  ["c", 44],
  ["u", 34],
  ["d", 33],
  ["p", 27],
  ["m", 26],
  ["h", 25],
  ["g", 23],
  ["b", 18],
  ["f", 17],
  ["y", 16],
  ["w", 15],
  ["k", 11],
  ["v", 9],
  ["x", 4],
  ["z", 3],
  ["j", 2],
  ["q", 2],
];

export type Screen = "start" | "playing" | "gameover";

export interface LetterTile {
  kind: "letter";
  letter: string;
}

export interface InkTile {
  kind: "ink";
}

export type RibbonTile = LetterTile | InkTile;
export type Ribbon = RibbonTile[];

export interface GameState {
  ribbons: Ribbon[];
  score: number;
  combo: number;
  turns: number;
  wordsPlayed: number;
  rngState: number;
  gameOver: boolean;
  lastCommittedWord: string | null;
  lastScoreGain: number;
  lastScrubCount: number;
  lastThreatRibbon: number | null;
}

export interface SelectionPreview {
  ribbons: Ribbon[];
  pulls: number[];
  word: string;
  blocked: boolean;
}

export interface CandidateWord {
  word: string;
  pulls: number[];
  score: number;
  scrubCount: number;
}

export interface CommitResult {
  state: GameState;
  word: string;
  scoreGain: number;
  scrubCount: number;
  threatRibbon: number;
  candidateCount: number;
}

export interface RibbonThreat {
  index: number;
  inkCount: number;
  firstInkIndex: number;
  dangerScore: number;
}

export function createInitialState(seed = Date.now() >>> 0): GameState {
  let rngState = seed >>> 0;
  for (let attempt = 0; attempt < INITIAL_STATE_ATTEMPTS; attempt += 1) {
    const ribbons: Ribbon[] = [];
    for (let ribbonIndex = 0; ribbonIndex < RIBBON_COUNT; ribbonIndex += 1) {
      const ribbon: Ribbon = [];
      while (ribbon.length < RIBBON_DEPTH) {
        const draw = randomLetter(rngState);
        rngState = draw.rngState;
        ribbon.push({ kind: "letter", letter: draw.letter });
      }
      ribbons.push(ribbon);
    }
    if (findCandidateWords(ribbons, 12).length >= 3) {
      return {
        ribbons,
        score: 0,
        combo: 0,
        turns: 0,
        wordsPlayed: 0,
        rngState,
        gameOver: false,
        lastCommittedWord: null,
        lastScoreGain: 0,
        lastScrubCount: 0,
        lastThreatRibbon: null,
      };
    }
  }
  throw new Error("[wordbraid] Failed to generate an initial viable board");
}

export function cloneState(state: GameState): GameState {
  return {
    ...state,
    ribbons: cloneRibbons(state.ribbons),
  };
}

export function cloneRibbons(ribbons: Ribbon[]): Ribbon[] {
  return ribbons.map((ribbon) => ribbon.map(cloneTile));
}

export function previewPulls(ribbons: Ribbon[], pulls: number[]): SelectionPreview {
  const preview = cloneRibbons(ribbons);
  const word: string[] = [];
  for (const ribbonIndex of pulls) {
    const ribbon = preview[ribbonIndex];
    if (!ribbon) {
      return { ribbons: preview, pulls, word: word.join(""), blocked: true };
    }
    const front = ribbon[0];
    if (!front || front.kind === "ink") {
      return { ribbons: preview, pulls, word: word.join(""), blocked: true };
    }
    word.push(front.letter);
    ribbon.shift();
  }
  return { ribbons: preview, pulls, word: word.join(""), blocked: false };
}

export function findCandidateWords(ribbons: Ribbon[], limit = Number.POSITIVE_INFINITY): CandidateWord[] {
  const results = new Map<string, CandidateWord>();

  function visit(currentRibbons: Ribbon[], pulls: number[], word: string): void {
    if (results.size >= limit) return;
    if (word.length > 0 && !hasPrefix(word)) return;
    if (word.length >= MIN_WORD_LENGTH && isWord(word)) {
      const key = `${word}:${pulls.join(",")}`;
      if (!results.has(key)) {
        results.set(key, {
          word,
          pulls: pulls.slice(),
          score: scoreWord(word, 0),
          scrubCount: scrubCountForWord(word),
        });
      }
    }
    if (word.length >= MAX_WORD_LENGTH) return;

    for (let ribbonIndex = 0; ribbonIndex < RIBBON_COUNT; ribbonIndex += 1) {
      const ribbon = currentRibbons[ribbonIndex];
      const front = ribbon?.[0];
      if (!front || front.kind === "ink") continue;
      const nextWord = `${word}${front.letter}`;
      if (!hasPrefix(nextWord) && !(nextWord.length >= MIN_WORD_LENGTH && isWord(nextWord))) continue;
      const nextRibbons = cloneRibbons(currentRibbons);
      nextRibbons[ribbonIndex]!.shift();
      visit(nextRibbons, [...pulls, ribbonIndex], nextWord);
    }
  }

  visit(ribbons, [], "");

  return [...results.values()].sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    if (right.word.length !== left.word.length) return right.word.length - left.word.length;
    return left.word.localeCompare(right.word);
  });
}

export function commitWord(state: GameState, pulls: number[]): CommitResult | null {
  if (state.gameOver) return null;
  const preview = previewPulls(state.ribbons, pulls);
  const word = preview.word.toLowerCase();
  if (preview.blocked) return null;
  if (word.length < MIN_WORD_LENGTH || word.length > MAX_WORD_LENGTH || !isWord(word)) return null;

  const baseRibbons = preview.ribbons;
  const usedRibbons = new Set(pulls);
  let rngState = state.rngState;
  const nextCombo = state.combo + 1;
  const scoreGain = scoreWord(word, nextCombo);
  const scrubCount = scrubCountForWord(word);

  for (let attempt = 0; attempt < POST_WORD_ATTEMPTS; attempt += 1) {
    let nextRibbons = cloneRibbons(baseRibbons);
    for (const ribbonIndex of usedRibbons) {
      while (nextRibbons[ribbonIndex]!.length < RIBBON_DEPTH) {
        const draw = randomLetter(rngState);
        rngState = draw.rngState;
        nextRibbons[ribbonIndex]!.push({ kind: "letter", letter: draw.letter });
      }
    }

    const threat = selectThreatRibbon(nextRibbons, pulls, state.turns, rngState);
    rngState = threat.rngState;
    nextRibbons[threat.index] = advanceRibbonWithInk(nextRibbons[threat.index]!);

    for (let scrubIndex = 0; scrubIndex < scrubCount; scrubIndex += 1) {
      const scrubbed = scrubMostThreatenedRibbon(nextRibbons, rngState);
      nextRibbons = scrubbed.ribbons;
      rngState = scrubbed.rngState;
    }

    const gameOver = nextRibbons.some((ribbon) => ribbon[0]?.kind === "ink");
    const candidateCount = gameOver ? 0 : findCandidateWords(nextRibbons, 16).length;

    if (gameOver || candidateCount > 0) {
      return {
        word,
        scoreGain,
        scrubCount,
        threatRibbon: threat.index,
        candidateCount,
        state: {
          ribbons: nextRibbons,
          score: state.score + scoreGain,
          combo: nextCombo,
          turns: state.turns + 1,
          wordsPlayed: state.wordsPlayed + 1,
          rngState,
          gameOver,
          lastCommittedWord: word,
          lastScoreGain: scoreGain,
          lastScrubCount: scrubCount,
          lastThreatRibbon: threat.index,
        },
      };
    }
  }

  throw new Error("[wordbraid] Failed to produce a viable post-word state");
}

export function scoreWord(word: string, combo: number): number {
  const letters = scoreLetters(word);
  const lengthBonus = word.length * 80;
  const comboBonus = Math.max(0, combo - 1) * 24;
  const scrubBonus = scrubCountForWord(word) * 90;
  return 120 + letters * 10 + lengthBonus + comboBonus + scrubBonus;
}

export function scrubCountForWord(word: string): number {
  if (word.length >= 5) return 2;
  if (word.length >= 4) return 1;
  return 0;
}

export function summarizeThreats(ribbons: Ribbon[]): RibbonThreat[] {
  return ribbons.map((ribbon, index) => {
    const firstInkIndex = ribbon.findIndex((tile) => tile.kind === "ink");
    const inkCount = ribbon.filter((tile) => tile.kind === "ink").length;
    return {
      index,
      inkCount,
      firstInkIndex,
      dangerScore: dangerScoreForRibbon(ribbon),
    };
  });
}

export function lcg(value: number): number {
  return (Math.imul(value >>> 0, 1664525) + 1013904223) >>> 0;
}

function scrubMostThreatenedRibbon(ribbons: Ribbon[], rngState: number): { ribbons: Ribbon[]; rngState: number } {
  const next = cloneRibbons(ribbons);
  const threats = summarizeThreats(next)
    .filter((threat) => threat.inkCount > 0)
    .sort((left, right) => right.dangerScore - left.dangerScore || left.index - right.index);
  if (threats.length === 0) return { ribbons: next, rngState };
  const target = threats[0]!;
  const ribbon = next[target.index]!;
  const inkIndex = ribbon.findIndex((tile) => tile.kind === "ink");
  if (inkIndex < 0) return { ribbons: next, rngState };
  ribbon.splice(inkIndex, 1);
  while (ribbon.length < RIBBON_DEPTH) {
    const draw = randomLetter(rngState);
    rngState = draw.rngState;
    ribbon.push({ kind: "letter", letter: draw.letter });
  }
  return { ribbons: next, rngState };
}

function advanceRibbonWithInk(ribbon: Ribbon): Ribbon {
  const next = ribbon.slice(1).map(cloneTile);
  next.push({ kind: "ink" });
  return next;
}

function selectThreatRibbon(ribbons: Ribbon[], pulls: number[], turns: number, rngState: number): { index: number; rngState: number } {
  const used = new Set(pulls);
  const threats = summarizeThreats(ribbons);
  const weights = threats.map((threat) => {
    const usedPenalty = used.has(threat.index) ? 0.3 : 0.95;
    const pressureBias = turns >= 8 ? threat.dangerScore * 0.12 : threat.dangerScore * 0.06;
    const frontVowel = ribbonFrontIsVowel(ribbons[threat.index]!) ? 0.25 : 0;
    return Math.max(0.2, 1 + usedPenalty + pressureBias + frontVowel);
  });
  const total = weights.reduce((sum, value) => sum + value, 0);
  rngState = lcg(rngState);
  const roll = (rngState / 0xffffffff) * total;
  let cursor = 0;
  for (let index = 0; index < weights.length; index += 1) {
    cursor += weights[index]!;
    if (roll <= cursor) return { index, rngState };
  }
  return { index: weights.length - 1, rngState };
}

function ribbonFrontIsVowel(ribbon: Ribbon): boolean {
  const front = ribbon[0];
  return front?.kind === "letter" ? "aeiouy".includes(front.letter) : false;
}

function dangerScoreForRibbon(ribbon: Ribbon): number {
  const firstInkIndex = ribbon.findIndex((tile) => tile.kind === "ink");
  if (firstInkIndex < 0) return 0;
  const inkCount = ribbon.filter((tile) => tile.kind === "ink").length;
  return (RIBBON_DEPTH - firstInkIndex) * 12 + inkCount * 8;
}

function cloneTile(tile: RibbonTile): RibbonTile {
  return tile.kind === "ink" ? { kind: "ink" } : { kind: "letter", letter: tile.letter };
}

function randomLetter(rngState: number): { letter: string; rngState: number } {
  const totalWeight = LETTER_WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0);
  const next = lcg(rngState);
  const roll = (next / 0xffffffff) * totalWeight;
  let cursor = 0;
  for (const [letter, weight] of LETTER_WEIGHTS) {
    cursor += weight;
    if (roll <= cursor) return { letter, rngState: next };
  }
  return { letter: "e", rngState: next };
}

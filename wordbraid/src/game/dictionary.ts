import { WORDS } from "./words.generated.ts";

export const WORD_SET = new Set<string>(WORDS);
export const PREFIX_SET = new Set<string>();

for (const word of WORDS) {
  for (let length = 1; length <= word.length; length += 1) {
    PREFIX_SET.add(word.slice(0, length));
  }
}

const LETTER_SCORES: Record<string, number> = {
  a: 1,
  b: 3,
  c: 3,
  d: 2,
  e: 1,
  f: 4,
  g: 2,
  h: 4,
  i: 1,
  j: 8,
  k: 5,
  l: 1,
  m: 3,
  n: 1,
  o: 1,
  p: 3,
  q: 10,
  r: 1,
  s: 1,
  t: 1,
  u: 1,
  v: 4,
  w: 4,
  x: 8,
  y: 4,
  z: 10,
};

export function isWord(value: string): boolean {
  return WORD_SET.has(value.toLowerCase());
}

export function hasPrefix(value: string): boolean {
  return PREFIX_SET.has(value.toLowerCase());
}

export function scoreLetters(word: string): number {
  return word
    .toLowerCase()
    .split("")
    .reduce((total, letter) => total + (LETTER_SCORES[letter] ?? 0), 0);
}

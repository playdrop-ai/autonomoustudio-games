export interface RandomSource {
  next(): number;
  range(min: number, max: number): number;
  int(min: number, maxExclusive: number): number;
  pick<T>(values: readonly T[]): T;
}

export function createRandom(seed: number): RandomSource {
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let result = Math.imul(state ^ (state >>> 15), 1 | state);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };

  return {
    next,
    range(min, max) {
      return min + (max - min) * next();
    },
    int(min, maxExclusive) {
      return min + Math.floor(next() * (maxExclusive - min));
    },
    pick(values) {
      if (values.length === 0) {
        throw new Error("[overvolt] Cannot pick from an empty list");
      }
      const index = this.int(0, values.length);
      const value = values[index];
      if (value === undefined) {
        throw new Error("[overvolt] Random pick resolved to an invalid index");
      }
      return value;
    },
  };
}

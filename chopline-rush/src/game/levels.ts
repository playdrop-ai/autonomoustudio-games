export type LevelChunkRef = readonly [zoneIndex: number, chunkIndex: number, gap: number];

export interface LevelBlueprint {
  number: number;
  name: string;
  act: number;
  accent: number;
  targetScore: number;
  chunks: readonly LevelChunkRef[];
}

type LevelSeed = readonly [name: string, targetScore: number, chunks: readonly LevelChunkRef[]];

const ACTS: ReadonlyArray<{ accent: number; levels: readonly LevelSeed[] }> = [
  {
    accent: 0xffc857,
    levels: [
      ["First Chop", 3, [[0, 0, 1.55], [0, 3, 1.15], [0, 2, 1.35]]],
      ["Fruit Flight", 3, [[0, 1, 1.35], [0, 2, 1.2]]],
      ["Camera Hop", 2, [[0, 2, 1.25], [0, 3, 1.3]]],
      ["Orange Steps", 3, [[0, 3, 1.35], [0, 5, 1.35]]],
      ["Picnic Line", 4, [[0, 1, 1.4], [0, 5, 1.45], [0, 6, 1.3]]],
      ["Donut Drop", 3, [[0, 6, 1.35], [0, 2, 1.5]]],
      ["Tall Order", 6, [[0, 0, 1.55], [0, 1, 1.45], [0, 4, 1.35]]],
      ["Soft Landing", 4, [[0, 5, 1.35], [0, 3, 1.5], [0, 2, 1.35]]],
      ["Meadow Mix", 5, [[0, 1, 1.5], [0, 6, 1.45], [0, 5, 1.55]]],
      ["Long Flip", 4, [[0, 3, 1.6], [0, 2, 1.7], [0, 1, 1.6]]],
      ["Slice Parade", 7, [[0, 0, 1.55], [0, 5, 1.55], [0, 6, 1.5]]],
      ["Meadow Crown", 8, [[0, 0, 1.65], [0, 1, 1.6], [0, 3, 1.6], [0, 6, 1.55]]],
    ],
  },
  {
    accent: 0x65d66e,
    levels: [
      ["Orchard Welcome", 4, [[1, 0, 1.7], [1, 1, 1.55]]],
      ["Apple Rise", 5, [[1, 1, 1.65], [1, 2, 1.7], [0, 5, 1.55]]],
      ["Book Balance", 5, [[1, 3, 1.65], [1, 0, 1.7], [1, 1, 1.6]]],
      ["Moving Lunch", 4, [[1, 4, 1.65], [1, 0, 1.75], [0, 3, 1.6]]],
      ["Low Stack", 5, [[1, 5, 1.7], [1, 2, 1.7], [1, 1, 1.65]]],
      ["Orchard Gap", 5, [[1, 0, 1.9], [1, 3, 1.85], [1, 2, 1.8]]],
      ["Rolling Shelf", 6, [[1, 4, 1.75], [1, 6, 1.7], [1, 0, 1.8]]],
      ["Fruit Ladder", 7, [[1, 1, 1.7], [1, 2, 1.75], [1, 5, 1.75]]],
      ["Split Decision", 6, [[1, 3, 1.85], [1, 4, 1.8], [1, 1, 1.8]]],
      ["Orchard Rush", 7, [[1, 6, 1.8], [1, 0, 1.9], [1, 5, 1.8]]],
      ["Harvest Run", 8, [[1, 2, 1.8], [1, 3, 1.85], [1, 6, 1.85], [1, 1, 1.8]]],
      ["Orchard Crown", 9, [[1, 4, 1.8], [1, 2, 1.9], [1, 5, 1.85], [1, 7, 1.9]]],
    ],
  },
  {
    accent: 0xff7a59,
    levels: [
      ["Brick Hello", 5, [[2, 0, 2.0], [1, 0, 1.8], [2, 1, 1.9]]],
      ["Spike Lesson", 4, [[2, 1, 1.9], [2, 2, 2.0], [1, 1, 1.85]]],
      ["Wall Walker", 7, [[2, 0, 1.95], [2, 3, 2.0], [0, 3, 1.85]]],
      ["Roof Line", 6, [[2, 4, 2.0], [2, 1, 1.95], [2, 0, 2.0]]],
      ["Red Alley", 7, [[2, 2, 2.05], [2, 5, 2.0], [2, 3, 2.05]]],
      ["Brick Bridge", 8, [[2, 0, 2.0], [2, 6, 2.1], [2, 1, 2.0]]],
      ["Over Under", 7, [[2, 4, 2.05], [2, 2, 2.1], [2, 5, 2.0]]],
      ["Hard Landing", 7, [[2, 3, 2.15], [2, 0, 2.05], [2, 6, 2.1]]],
      ["Hazard Lane", 8, [[2, 1, 2.05], [2, 5, 2.15], [2, 2, 2.1]]],
      ["Alley Air", 8, [[2, 6, 2.2], [2, 4, 2.05], [2, 0, 2.15]]],
      ["Brickstorm", 10, [[2, 0, 2.05], [2, 3, 2.15], [2, 5, 2.15], [2, 1, 2.1]]],
      ["Alley Crown", 11, [[2, 4, 2.1], [2, 0, 2.15], [2, 6, 2.2], [2, 7, 2.15]]],
    ],
  },
  {
    accent: 0x4cc9f0,
    levels: [
      ["Wind Check", 5, [[3, 0, 2.15], [2, 0, 2.0], [3, 1, 2.1]]],
      ["Moving Target", 6, [[3, 1, 2.15], [3, 2, 2.1], [1, 4, 2.0]]],
      ["Shelf Hop", 7, [[3, 3, 2.2], [3, 0, 2.15], [3, 4, 2.2]]],
      ["Wind Tunnel", 7, [[3, 8, 2.15], [3, 1, 2.2], [3, 3, 2.15]]],
      ["Rising Slice", 8, [[3, 5, 2.2], [3, 0, 2.2], [3, 2, 2.25]]],
      ["Double Hazard", 7, [[3, 2, 2.15], [3, 7, 2.25], [3, 1, 2.2]]],
      ["Tight Shelf", 8, [[3, 8, 2.2], [3, 4, 2.25], [3, 5, 2.2]]],
      ["Moving Wall", 9, [[3, 0, 2.2], [3, 5, 2.25], [3, 3, 2.3]]],
      ["Blue Streak", 5, [[3, 1, 2.3], [3, 6, 2.2], [3, 2, 2.25]]],
      ["Windy Precision", 9, [[3, 4, 2.25], [3, 8, 2.3], [3, 0, 2.3]]],
      ["Shelf Storm", 11, [[3, 5, 2.25], [3, 2, 2.3], [3, 7, 2.3], [3, 1, 2.25]]],
      ["Wind Crown", 12, [[3, 8, 2.3], [3, 0, 2.35], [3, 6, 2.3], [3, 4, 2.35]]],
    ],
  },
  {
    accent: 0xe64bb7,
    levels: [
      ["Chef's Door", 7, [[4, 0, 2.25], [3, 1, 2.2], [4, 1, 2.3]]],
      ["Purple Stack", 8, [[4, 2, 2.3], [4, 4, 2.25], [3, 0, 2.25]]],
      ["Gauntlet Gap", 8, [[4, 1, 2.4], [4, 3, 2.35], [4, 0, 2.3]]],
      ["Knife's Edge", 9, [[4, 5, 2.3], [4, 2, 2.4], [4, 6, 2.35]]],
      ["Cross Chop", 9, [[4, 4, 2.35], [4, 7, 2.4], [4, 1, 2.35]]],
      ["Deep Cut", 10, [[4, 0, 2.35], [4, 5, 2.4], [4, 3, 2.4]]],
      ["Royal Rush", 10, [[4, 2, 2.45], [4, 6, 2.4], [4, 4, 2.4]]],
      ["Two Spikes", 9, [[4, 3, 2.4], [4, 7, 2.45], [4, 5, 2.45]]],
      ["Master Shelf", 11, [[4, 4, 2.45], [4, 0, 2.4], [4, 8, 2.5]]],
      ["Chef's Tempo", 11, [[4, 1, 2.45], [4, 6, 2.5], [4, 2, 2.45]]],
      ["Final Service", 13, [[4, 0, 2.4], [4, 3, 2.5], [4, 5, 2.45], [4, 7, 2.5]]],
      ["Chopline Master", 15, [[4, 2, 2.5], [4, 4, 2.5], [4, 6, 2.55], [4, 8, 2.5]]],
    ],
  },
];

export const LEVELS: readonly LevelBlueprint[] = ACTS.flatMap((act, actIndex) =>
  act.levels.map(([name, targetScore, chunks], levelIndex) => ({
    number: actIndex * 12 + levelIndex + 1,
    name,
    act: actIndex + 1,
    accent: act.accent,
    targetScore,
    chunks,
  })),
);

export const TOTAL_LEVELS = LEVELS.length;

export function levelForNumber(value: number): LevelBlueprint {
  const number = Math.max(1, Math.min(TOTAL_LEVELS, Math.floor(value)));
  const level = LEVELS[number - 1];
  if (!level) throw new Error(`[chopline-rush] Missing authored level ${number}`);
  return level;
}

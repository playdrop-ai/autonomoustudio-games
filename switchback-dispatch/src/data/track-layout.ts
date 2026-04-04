export type TrackTile = {
  kind: 'empty' | 'forest' | 'tents' | 'corner' | 'finish' | 'straight';
  gridX: number;
  gridY: number;
  gridZ: number;
  orientationIndex: number;
  layer: number;
};

export const TRACK_TILE_COUNTS = {
  "forest": 109,
  "empty": 26,
  "tents": 3,
  "corner": 6,
  "straight": 9,
  "finish": 1
} as const;

export const TRACK_TILES: TrackTile[] = [
  {
    "kind": "forest",
    "gridX": -8,
    "gridY": 0,
    "gridZ": -9,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -7,
    "gridY": 0,
    "gridZ": -9,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -6,
    "gridY": 0,
    "gridZ": -9,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -5,
    "gridY": 0,
    "gridZ": -9,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -4,
    "gridY": 0,
    "gridZ": -9,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -3,
    "gridY": 0,
    "gridZ": -9,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -2,
    "gridY": 0,
    "gridZ": -9,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -1,
    "gridY": 0,
    "gridZ": -9,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": 0,
    "gridY": 0,
    "gridZ": -9,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": 1,
    "gridY": 0,
    "gridZ": -9,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": 2,
    "gridY": 0,
    "gridZ": -9,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -8,
    "gridY": 0,
    "gridZ": -8,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -7,
    "gridY": 0,
    "gridZ": -8,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -6,
    "gridY": 0,
    "gridZ": -8,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -5,
    "gridY": 0,
    "gridZ": -8,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -4,
    "gridY": 0,
    "gridZ": -8,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -3,
    "gridY": 0,
    "gridZ": -8,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -2,
    "gridY": 0,
    "gridZ": -8,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -1,
    "gridY": 0,
    "gridZ": -8,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": 0,
    "gridY": 0,
    "gridZ": -8,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": 1,
    "gridY": 0,
    "gridZ": -8,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": 2,
    "gridY": 0,
    "gridZ": -8,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -8,
    "gridY": 0,
    "gridZ": -7,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -7,
    "gridY": 0,
    "gridZ": -7,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -6,
    "gridY": 0,
    "gridZ": -7,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -5,
    "gridY": 0,
    "gridZ": -7,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "empty",
    "gridX": -4,
    "gridY": 0,
    "gridZ": -7,
    "orientationIndex": 0,
    "layer": 0
  },
  {
    "kind": "empty",
    "gridX": -3,
    "gridY": 0,
    "gridZ": -7,
    "orientationIndex": 0,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -2,
    "gridY": 0,
    "gridZ": -7,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -1,
    "gridY": 0,
    "gridZ": -7,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": 0,
    "gridY": 0,
    "gridZ": -7,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": 1,
    "gridY": 0,
    "gridZ": -7,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": 2,
    "gridY": 0,
    "gridZ": -7,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -8,
    "gridY": 0,
    "gridZ": -6,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -7,
    "gridY": 0,
    "gridZ": -6,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "empty",
    "gridX": -6,
    "gridY": 0,
    "gridZ": -6,
    "orientationIndex": 0,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -5,
    "gridY": 0,
    "gridZ": -6,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "empty",
    "gridX": -4,
    "gridY": 0,
    "gridZ": -6,
    "orientationIndex": 0,
    "layer": 0
  },
  {
    "kind": "empty",
    "gridX": -3,
    "gridY": 0,
    "gridZ": -6,
    "orientationIndex": 0,
    "layer": 0
  },
  {
    "kind": "empty",
    "gridX": -2,
    "gridY": 0,
    "gridZ": -6,
    "orientationIndex": 0,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -1,
    "gridY": 0,
    "gridZ": -6,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "empty",
    "gridX": 0,
    "gridY": 0,
    "gridZ": -6,
    "orientationIndex": 0,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": 1,
    "gridY": 0,
    "gridZ": -6,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": 2,
    "gridY": 0,
    "gridZ": -6,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -8,
    "gridY": 0,
    "gridZ": -5,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -7,
    "gridY": 0,
    "gridZ": -5,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -6,
    "gridY": 0,
    "gridZ": -5,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -5,
    "gridY": 0,
    "gridZ": -5,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -4,
    "gridY": 0,
    "gridZ": -5,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "empty",
    "gridX": -3,
    "gridY": 0,
    "gridZ": -5,
    "orientationIndex": 0,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -2,
    "gridY": 0,
    "gridZ": -5,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -1,
    "gridY": 0,
    "gridZ": -5,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": 0,
    "gridY": 0,
    "gridZ": -5,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": 1,
    "gridY": 0,
    "gridZ": -5,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": 2,
    "gridY": 0,
    "gridZ": -5,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -8,
    "gridY": 0,
    "gridZ": -4,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -7,
    "gridY": 0,
    "gridZ": -4,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "empty",
    "gridX": -6,
    "gridY": 0,
    "gridZ": -4,
    "orientationIndex": 0,
    "layer": 0
  },
  {
    "kind": "empty",
    "gridX": -5,
    "gridY": 0,
    "gridZ": -4,
    "orientationIndex": 0,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -4,
    "gridY": 0,
    "gridZ": -4,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -3,
    "gridY": 0,
    "gridZ": -4,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -2,
    "gridY": 0,
    "gridZ": -4,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "tents",
    "gridX": -1,
    "gridY": 0,
    "gridZ": -4,
    "orientationIndex": 22,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": 0,
    "gridY": 0,
    "gridZ": -4,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": 1,
    "gridY": 0,
    "gridZ": -4,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": 2,
    "gridY": 0,
    "gridZ": -4,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -8,
    "gridY": 0,
    "gridZ": -3,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -7,
    "gridY": 0,
    "gridZ": -3,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "empty",
    "gridX": -6,
    "gridY": 0,
    "gridZ": -3,
    "orientationIndex": 16,
    "layer": 0
  },
  {
    "kind": "empty",
    "gridX": -5,
    "gridY": 0,
    "gridZ": -3,
    "orientationIndex": 16,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -4,
    "gridY": 0,
    "gridZ": -3,
    "orientationIndex": 16,
    "layer": 0
  },
  {
    "kind": "corner",
    "gridX": -3,
    "gridY": 0,
    "gridZ": -3,
    "orientationIndex": 16,
    "layer": 0
  },
  {
    "kind": "straight",
    "gridX": -2,
    "gridY": 0,
    "gridZ": -3,
    "orientationIndex": 22,
    "layer": 0
  },
  {
    "kind": "straight",
    "gridX": -1,
    "gridY": 0,
    "gridZ": -3,
    "orientationIndex": 22,
    "layer": 0
  },
  {
    "kind": "corner",
    "gridX": 0,
    "gridY": 0,
    "gridZ": -3,
    "orientationIndex": 0,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": 1,
    "gridY": 0,
    "gridZ": -3,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": 2,
    "gridY": 0,
    "gridZ": -3,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -8,
    "gridY": 0,
    "gridZ": -2,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -7,
    "gridY": 0,
    "gridZ": -2,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "empty",
    "gridX": -6,
    "gridY": 0,
    "gridZ": -2,
    "orientationIndex": 16,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -5,
    "gridY": 0,
    "gridZ": -2,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "tents",
    "gridX": -4,
    "gridY": 0,
    "gridZ": -2,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "straight",
    "gridX": -3,
    "gridY": 0,
    "gridZ": -2,
    "orientationIndex": 0,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -2,
    "gridY": 0,
    "gridZ": -2,
    "orientationIndex": 22,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -1,
    "gridY": 0,
    "gridZ": -2,
    "orientationIndex": 22,
    "layer": 0
  },
  {
    "kind": "straight",
    "gridX": 0,
    "gridY": 0,
    "gridZ": -2,
    "orientationIndex": 0,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": 1,
    "gridY": 0,
    "gridZ": -2,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "empty",
    "gridX": 2,
    "gridY": 0,
    "gridZ": -2,
    "orientationIndex": 0,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -8,
    "gridY": 0,
    "gridZ": -1,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -7,
    "gridY": 0,
    "gridZ": -1,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "empty",
    "gridX": -6,
    "gridY": 0,
    "gridZ": -1,
    "orientationIndex": 16,
    "layer": 0
  },
  {
    "kind": "empty",
    "gridX": -5,
    "gridY": 0,
    "gridZ": -1,
    "orientationIndex": 16,
    "layer": 0
  },
  {
    "kind": "empty",
    "gridX": -4,
    "gridY": 0,
    "gridZ": -1,
    "orientationIndex": 0,
    "layer": 0
  },
  {
    "kind": "corner",
    "gridX": -3,
    "gridY": 0,
    "gridZ": -1,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "corner",
    "gridX": -2,
    "gridY": 0,
    "gridZ": -1,
    "orientationIndex": 0,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -1,
    "gridY": 0,
    "gridZ": -1,
    "orientationIndex": 22,
    "layer": 0
  },
  {
    "kind": "straight",
    "gridX": 0,
    "gridY": 0,
    "gridZ": -1,
    "orientationIndex": 0,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": 1,
    "gridY": 0,
    "gridZ": -1,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": 2,
    "gridY": 0,
    "gridZ": -1,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -8,
    "gridY": 0,
    "gridZ": 0,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -7,
    "gridY": 0,
    "gridZ": 0,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -6,
    "gridY": 0,
    "gridZ": 0,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -5,
    "gridY": 0,
    "gridZ": 0,
    "orientationIndex": 16,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -4,
    "gridY": 0,
    "gridZ": 0,
    "orientationIndex": 16,
    "layer": 0
  },
  {
    "kind": "empty",
    "gridX": -3,
    "gridY": 0,
    "gridZ": 0,
    "orientationIndex": 0,
    "layer": 0
  },
  {
    "kind": "straight",
    "gridX": -2,
    "gridY": 0,
    "gridZ": 0,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -1,
    "gridY": 0,
    "gridZ": 0,
    "orientationIndex": 22,
    "layer": 0
  },
  {
    "kind": "finish",
    "gridX": 0,
    "gridY": 0,
    "gridZ": 0,
    "orientationIndex": 0,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": 1,
    "gridY": 0,
    "gridZ": 0,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": 2,
    "gridY": 0,
    "gridZ": 0,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -8,
    "gridY": 0,
    "gridZ": 1,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -7,
    "gridY": 0,
    "gridZ": 1,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -6,
    "gridY": 0,
    "gridZ": 1,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "empty",
    "gridX": -5,
    "gridY": 0,
    "gridZ": 1,
    "orientationIndex": 16,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -4,
    "gridY": 0,
    "gridZ": 1,
    "orientationIndex": 16,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -3,
    "gridY": 0,
    "gridZ": 1,
    "orientationIndex": 22,
    "layer": 0
  },
  {
    "kind": "straight",
    "gridX": -2,
    "gridY": 0,
    "gridZ": 1,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "tents",
    "gridX": -1,
    "gridY": 0,
    "gridZ": 1,
    "orientationIndex": 22,
    "layer": 0
  },
  {
    "kind": "straight",
    "gridX": 0,
    "gridY": 0,
    "gridZ": 1,
    "orientationIndex": 0,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": 1,
    "gridY": 0,
    "gridZ": 1,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": 2,
    "gridY": 0,
    "gridZ": 1,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -8,
    "gridY": 0,
    "gridZ": 2,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -7,
    "gridY": 0,
    "gridZ": 2,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -6,
    "gridY": 0,
    "gridZ": 2,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "empty",
    "gridX": -5,
    "gridY": 0,
    "gridZ": 2,
    "orientationIndex": 16,
    "layer": 0
  },
  {
    "kind": "empty",
    "gridX": -4,
    "gridY": 0,
    "gridZ": 2,
    "orientationIndex": 16,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -3,
    "gridY": 0,
    "gridZ": 2,
    "orientationIndex": 16,
    "layer": 0
  },
  {
    "kind": "corner",
    "gridX": -2,
    "gridY": 0,
    "gridZ": 2,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "straight",
    "gridX": -1,
    "gridY": 0,
    "gridZ": 2,
    "orientationIndex": 16,
    "layer": 0
  },
  {
    "kind": "corner",
    "gridX": 0,
    "gridY": 0,
    "gridZ": 2,
    "orientationIndex": 22,
    "layer": 0
  },
  {
    "kind": "empty",
    "gridX": 1,
    "gridY": 0,
    "gridZ": 2,
    "orientationIndex": 0,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": 2,
    "gridY": 0,
    "gridZ": 2,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -8,
    "gridY": 0,
    "gridZ": 3,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -7,
    "gridY": 0,
    "gridZ": 3,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -6,
    "gridY": 0,
    "gridZ": 3,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "empty",
    "gridX": -5,
    "gridY": 0,
    "gridZ": 3,
    "orientationIndex": 0,
    "layer": 0
  },
  {
    "kind": "empty",
    "gridX": -4,
    "gridY": 0,
    "gridZ": 3,
    "orientationIndex": 0,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -3,
    "gridY": 0,
    "gridZ": 3,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -2,
    "gridY": 0,
    "gridZ": 3,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -1,
    "gridY": 0,
    "gridZ": 3,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "empty",
    "gridX": 0,
    "gridY": 0,
    "gridZ": 3,
    "orientationIndex": 0,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": 1,
    "gridY": 0,
    "gridZ": 3,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": 2,
    "gridY": 0,
    "gridZ": 3,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -8,
    "gridY": 0,
    "gridZ": 4,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -7,
    "gridY": 0,
    "gridZ": 4,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -6,
    "gridY": 0,
    "gridZ": 4,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -5,
    "gridY": 0,
    "gridZ": 4,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -4,
    "gridY": 0,
    "gridZ": 4,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "empty",
    "gridX": -3,
    "gridY": 0,
    "gridZ": 4,
    "orientationIndex": 0,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -2,
    "gridY": 0,
    "gridZ": 4,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": -1,
    "gridY": 0,
    "gridZ": 4,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": 0,
    "gridY": 0,
    "gridZ": 4,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": 1,
    "gridY": 0,
    "gridZ": 4,
    "orientationIndex": 10,
    "layer": 0
  },
  {
    "kind": "forest",
    "gridX": 2,
    "gridY": 0,
    "gridZ": 4,
    "orientationIndex": 10,
    "layer": 0
  }
] as const;

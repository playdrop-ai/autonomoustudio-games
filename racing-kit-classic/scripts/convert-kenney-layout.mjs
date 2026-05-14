import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const SCENE_SOURCE_PATH = path.resolve('source/main.tscn');
const MESH_LIBRARY_SOURCE_PATH = path.resolve('source/mesh-library.tres');
const TRACK_OUTPUT_PATH = path.resolve('src/data/track-layout.ts');
const COLLISION_OUTPUT_PATH = path.resolve('src/data/collision-shapes.ts');
const EXPECTED_COUNTS = {
  empty: 26,
  forest: 109,
  tents: 3,
  corner: 6,
  finish: 1,
  straight: 9,
};

const TILE_KIND_BY_ID = {
  0: 'empty',
  1: 'forest',
  2: 'tents',
  3: 'corner',
  4: 'finish',
  6: 'straight',
};

const COLLISION_SHAPE_IDS = {
  corner: 'ftcqc',
  straight: 'oxy43',
};

function decodeSigned16(value) {
  return value >= 0x8000 ? value - 0x10000 : value;
}

function decodeGridIndex(lowWord, highWord) {
  const key = BigInt(lowWord >>> 0) | (BigInt(highWord >>> 0) << 32n);
  return {
    gridX: decodeSigned16(Number(key & 0xffffn)),
    gridY: decodeSigned16(Number((key >> 16n) & 0xffffn)),
    gridZ: decodeSigned16(Number((key >> 32n) & 0xffffn)),
  };
}

function parseGridMapCells(input) {
  const match = input.match(/"cells": PackedInt32Array\(([\s\S]*?)\)\s*}/);
  if (!match) {
    throw new Error('[starter-kit-racing] GridMap cells array missing from source scene');
  }

  const numbers = match[1]
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => Number.parseInt(value, 10));

  if (numbers.length % 3 !== 0) {
    throw new Error('[starter-kit-racing] GridMap cells array length is invalid');
  }

  const tiles = [];
  for (let index = 0; index < numbers.length; index += 3) {
    const { gridX, gridY, gridZ } = decodeGridIndex(numbers[index], numbers[index + 1]);
    const packedValue = numbers[index + 2] >>> 0;
    const tileId = packedValue & 0xffff;
    const orientationIndex = (packedValue >>> 16) & 0x1f;
    const layer = (packedValue >>> 21) & 0xff;
    const kind = TILE_KIND_BY_ID[tileId];

    if (!kind) {
      throw new Error(`[starter-kit-racing] Unsupported tile id ${tileId}`);
    }
    if (orientationIndex < 0 || orientationIndex > 23) {
      throw new Error(`[starter-kit-racing] Unsupported orientation index ${orientationIndex}`);
    }

    tiles.push({ kind, gridX, gridY, gridZ, orientationIndex, layer });
  }

  return tiles.sort(
    (left, right) =>
      left.gridY - right.gridY ||
      left.gridZ - right.gridZ ||
      left.gridX - right.gridX ||
      left.layer - right.layer,
  );
}

function countKinds(tiles) {
  return tiles.reduce((counts, tile) => {
    counts[tile.kind] = (counts[tile.kind] ?? 0) + 1;
    return counts;
  }, {});
}

function assertExpectedCounts(counts) {
  for (const [kind, expected] of Object.entries(EXPECTED_COUNTS)) {
    const actual = counts[kind] ?? 0;
    if (actual !== expected) {
      throw new Error(`[starter-kit-racing] ${kind} count mismatch: expected ${expected}, received ${actual}`);
    }
  }
}

function renderModule(tiles) {
  const counts = countKinds(tiles);
  assertExpectedCounts(counts);

  return `export type TrackTile = {
  kind: 'empty' | 'forest' | 'tents' | 'corner' | 'finish' | 'straight';
  gridX: number;
  gridY: number;
  gridZ: number;
  orientationIndex: number;
  layer: number;
};

export const TRACK_TILE_COUNTS = ${JSON.stringify(counts, null, 2)} as const;

export const TRACK_TILES: TrackTile[] = ${JSON.stringify(tiles, null, 2)} as const;
`;
}

function parseCollisionShape(input, shapeId) {
  const shapePattern = new RegExp(
    `\\[sub_resource type="ConcavePolygonShape3D" id="ConcavePolygonShape3D_${shapeId}"\\][\\s\\S]*?data = PackedVector3Array\\(([^)]*)\\)`,
  );
  const match = input.match(shapePattern);
  if (!match) {
    throw new Error(`[starter-kit-racing] Collision shape ${shapeId} missing from mesh library source`);
  }

  const numbers = match[1]
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => Number.parseFloat(value));

  if (numbers.length === 0 || numbers.length % 3 !== 0) {
    throw new Error(`[starter-kit-racing] Collision shape ${shapeId} has invalid vector data`);
  }

  return numbers;
}

function renderCollisionModule(shapes) {
  return `export const COLLISION_SHAPES = {
  corner: new Float32Array(${JSON.stringify(shapes.corner)}),
  straight: new Float32Array(${JSON.stringify(shapes.straight)})
} as const;
`;
}

function main() {
  const sceneSource = readFileSync(SCENE_SOURCE_PATH, 'utf8');
  const meshLibrarySource = readFileSync(MESH_LIBRARY_SOURCE_PATH, 'utf8');
  const tiles = parseGridMapCells(sceneSource);
  const trackOutput = `${renderModule(tiles).trim()}\n`;
  const collisionOutput = `${renderCollisionModule({
    corner: parseCollisionShape(meshLibrarySource, COLLISION_SHAPE_IDS.corner),
    straight: parseCollisionShape(meshLibrarySource, COLLISION_SHAPE_IDS.straight),
  }).trim()}\n`;

  if (process.argv.includes('--check')) {
    const existingTrack = readFileSync(TRACK_OUTPUT_PATH, 'utf8');
    const existingCollision = readFileSync(COLLISION_OUTPUT_PATH, 'utf8');
    if (existingTrack !== trackOutput) {
      throw new Error('[starter-kit-racing] Track layout module is stale. Run npm run convert.');
    }
    if (existingCollision !== collisionOutput) {
      throw new Error('[starter-kit-racing] Collision shape module is stale. Run npm run convert.');
    }
    console.log('[starter-kit-racing] Track layout module is current.');
    return;
  }

  writeFileSync(TRACK_OUTPUT_PATH, trackOutput, 'utf8');
  writeFileSync(COLLISION_OUTPUT_PATH, collisionOutput, 'utf8');
  console.log(`[starter-kit-racing] Wrote ${TRACK_OUTPUT_PATH}`);
  console.log(`[starter-kit-racing] Wrote ${COLLISION_OUTPUT_PATH}`);
}

main();

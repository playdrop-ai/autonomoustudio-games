export const RACING_TRACK_ASSET_SPEC_REF = 'asset-spec:playdrop/racing-track';
export const RACING_TRACK_ASSET_SPEC_VERSION_REF = 'asset-spec:playdrop/racing-track@1.0.0';

export const TRACK_SIZE_LIMITS = {
  min: 6,
  max: 24,
} as const;

export const DEFAULT_EDITOR_TRACK_SIZE = 16;

export const TRACK_TILE_LIMITS = {
  min: 6,
  max: TRACK_SIZE_LIMITS.max * TRACK_SIZE_LIMITS.max,
} as const;

export type TrackDirection = 'north' | 'east' | 'south' | 'west';
export type TrackTileCategory = 'track' | 'decoration';
export type TrackRuntimeKind = 'empty' | 'forest' | 'tents' | 'corner' | 'finish' | 'straight';

export type TrackTileDefinition = {
  id: string;
  label: string;
  category: TrackTileCategory;
  runtimeKind: TrackRuntimeKind;
  rotationSymmetry: 1 | 2 | 4;
  driveable: boolean;
  connectorBase: TrackDirection[];
  paletteColor: string;
};

export const TRACK_TILE_DEFINITIONS = [
  {
    id: 'track.finish',
    label: 'Finish',
    category: 'track',
    runtimeKind: 'finish',
    rotationSymmetry: 2,
    driveable: true,
    connectorBase: ['north', 'south'],
    paletteColor: '#f8fafc',
  },
  {
    id: 'track.straight',
    label: 'Straight',
    category: 'track',
    runtimeKind: 'straight',
    rotationSymmetry: 2,
    driveable: true,
    connectorBase: ['north', 'south'],
    paletteColor: '#cbd5e1',
  },
  {
    id: 'track.corner',
    label: 'Corner',
    category: 'track',
    runtimeKind: 'corner',
    rotationSymmetry: 4,
    driveable: true,
    connectorBase: ['south', 'west'],
    paletteColor: '#cbd5e1',
  },
  {
    id: 'deco.empty',
    label: 'Empty',
    category: 'decoration',
    runtimeKind: 'empty',
    rotationSymmetry: 1,
    driveable: false,
    connectorBase: [],
    paletteColor: '#d6cfaf',
  },
  {
    id: 'deco.forest',
    label: 'Forest',
    category: 'decoration',
    runtimeKind: 'forest',
    rotationSymmetry: 1,
    driveable: false,
    connectorBase: [],
    paletteColor: '#14532d',
  },
  {
    id: 'deco.tents',
    label: 'Tents',
    category: 'decoration',
    runtimeKind: 'tents',
    rotationSymmetry: 4,
    driveable: false,
    connectorBase: [],
    paletteColor: '#f97316',
  },
] as const satisfies readonly TrackTileDefinition[];

export type RacingTrackTileId = (typeof TRACK_TILE_DEFINITIONS)[number]['id'];
export const RACING_TRACK_TILE_IDS = TRACK_TILE_DEFINITIONS.map((definition) => definition.id);

export type RacingTrackTile = {
  x: number;
  y: number;
  tile: RacingTrackTileId;
  rotation: number;
};

export type RacingTrackDocument = {
  size: {
    width: number;
    height: number;
  };
  tiles: RacingTrackTile[];
};

export type TrackValidationIssueCode =
  | 'size_out_of_range'
  | 'tile_count_out_of_range'
  | 'tile_coverage_incomplete'
  | 'tile_out_of_bounds'
  | 'duplicate_tile_position'
  | 'tile_id_invalid'
  | 'rotation_invalid'
  | 'track_finish_count_invalid'
  | 'track_connector_mismatch'
  | 'track_disconnected'
  | 'track_not_closed_loop'
  | 'track_spawn_unresolved'
  | 'track_loop_too_short';

export type TrackValidationIssue = {
  code: TrackValidationIssueCode;
  message: string;
  tileKey?: string;
};

export type TrackValidationResult = {
  ok: boolean;
  issues: TrackValidationIssue[];
};

export type DerivedTrackRuntimeTile = {
  kind: TrackRuntimeKind;
  gridX: number;
  gridY: number;
  gridZ: number;
  orientationIndex: number;
  layer: number;
};

export type DerivedTrackRuntime = {
  document: RacingTrackDocument;
  runtimeTiles: DerivedTrackRuntimeTile[];
  previewLoop: Array<{ gridX: number; gridZ: number }>;
  driveDirection: TrackDirection;
  spawnTile: { gridX: number; gridZ: number };
  spawnYaw: number;
  worldBounds: {
    centerX: number;
    centerZ: number;
    width: number;
    height: number;
  };
  validation: TrackValidationResult;
};

const DEFINITION_BY_ID = new Map<string, TrackTileDefinition>(
  TRACK_TILE_DEFINITIONS.map((definition) => [definition.id, definition]),
);

const ROTATION_TO_ORIENTATION_INDEX = [0, 16, 10, 22] as const;

const DIRECTION_OFFSETS: Record<TrackDirection, { dx: number; dy: number }> = {
  north: { dx: 0, dy: -1 },
  east: { dx: 1, dy: 0 },
  south: { dx: 0, dy: 1 },
  west: { dx: -1, dy: 0 },
};

const OPPOSITE_DIRECTION: Record<TrackDirection, TrackDirection> = {
  north: 'south',
  east: 'west',
  south: 'north',
  west: 'east',
};

function makeTileKey(x: number, y: number): string {
  return `${x}:${y}`;
}

function mod4(value: number): number {
  return ((value % 4) + 4) % 4;
}

function cloneTile(tile: RacingTrackTile): RacingTrackTile {
  return {
    x: tile.x,
    y: tile.y,
    tile: tile.tile,
    rotation: tile.rotation,
  };
}

export function cloneTrackDocument(document: RacingTrackDocument): RacingTrackDocument {
  return {
    size: {
      width: document.size.width,
      height: document.size.height,
    },
    tiles: document.tiles.map((tile) => cloneTile(tile)),
  };
}

export function createBlankTrackDocument(width = 16, height = 16): RacingTrackDocument {
  const tiles: RacingTrackTile[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      tiles.push({
        x,
        y,
        tile: 'deco.empty',
        rotation: 0,
      });
    }
  }
  return {
    size: {
      width,
      height,
    },
    tiles,
  };
}

export function createSquareTrackDocument(
  source: RacingTrackDocument,
  size = Math.max(DEFAULT_EDITOR_TRACK_SIZE, source.size.width, source.size.height),
): RacingTrackDocument {
  if (!Number.isInteger(size) || size < TRACK_SIZE_LIMITS.min || size > TRACK_SIZE_LIMITS.max) {
    throw new Error(
      `[starter-kit-racing] Square track size must be between ${TRACK_SIZE_LIMITS.min} and ${TRACK_SIZE_LIMITS.max}.`,
    );
  }
  const xOffset = Math.floor((size - source.size.width) / 2);
  const yOffset = Math.floor((size - source.size.height) / 2);
  if (xOffset < 0 || yOffset < 0) {
    throw new Error('[starter-kit-racing] Track is larger than the square editor bounds');
  }

  const square = createBlankTrackDocument(size, size);
  const indexByKey = new Map<string, number>(
    square.tiles.map((tile, index) => [makeTileKey(tile.x, tile.y), index]),
  );

  for (const tile of source.tiles) {
    const x = tile.x + xOffset;
    const y = tile.y + yOffset;
    if (x < 0 || y < 0 || x >= size || y >= size) {
      throw new Error(`[starter-kit-racing] Tile "${tile.tile}" at (${tile.x}, ${tile.y}) cannot fit in the square editor map`);
    }
    const index = indexByKey.get(makeTileKey(x, y));
    if (index === undefined) {
      throw new Error(`[starter-kit-racing] Unable to place tile "${tile.tile}" at (${x}, ${y}) in the square editor map`);
    }
    square.tiles[index] = {
      x,
      y,
      tile: tile.tile,
      rotation: getNormalizedTileRotation(tile.tile, tile.rotation),
    };
  }

  return square;
}

export function getTrackTileDefinition(tileId: string): TrackTileDefinition | null {
  return DEFINITION_BY_ID.get(tileId) ?? null;
}

export function normalizeTrackDocument(value: unknown): RacingTrackDocument {
  if (!value || typeof value !== 'object') {
    throw new Error('[starter-kit-racing] Track document must be an object');
  }
  const rawDocument = value as {
    size?: { width?: unknown; height?: unknown };
    tiles?: unknown;
  };
  const width = Number(rawDocument.size?.width);
  const height = Number(rawDocument.size?.height);
  if (!Number.isInteger(width) || !Number.isInteger(height)) {
    throw new Error('[starter-kit-racing] Track size must use integer width and height');
  }
  if (!Array.isArray(rawDocument.tiles)) {
    throw new Error('[starter-kit-racing] Track tiles must be an array');
  }
  const tiles = rawDocument.tiles.map((candidate, index) => {
    if (!candidate || typeof candidate !== 'object') {
      throw new Error(`[starter-kit-racing] Track tile at index ${index} must be an object`);
    }
    const rawTile = candidate as {
      x?: unknown;
      y?: unknown;
      tile?: unknown;
      rotation?: unknown;
    };
    const tileId = typeof rawTile.tile === 'string' ? rawTile.tile.trim() : '';
    if (!tileId) {
      throw new Error(`[starter-kit-racing] Track tile at index ${index} is missing a tile id`);
    }
    if (!getTrackTileDefinition(tileId)) {
      throw new Error(`[starter-kit-racing] Track tile at index ${index} uses an unknown tile id "${tileId}"`);
    }
    const x = Number(rawTile.x);
    const y = Number(rawTile.y);
    const rotation = Number(rawTile.rotation);
    if (!Number.isInteger(x) || !Number.isInteger(y)) {
      throw new Error(`[starter-kit-racing] Track tile at index ${index} must use integer coordinates`);
    }
    if (!Number.isInteger(rotation)) {
      throw new Error(`[starter-kit-racing] Track tile at index ${index} must use an integer rotation`);
    }
    return {
      x,
      y,
      tile: tileId as RacingTrackTileId,
      rotation: getNormalizedTileRotation(tileId, rotation),
    } satisfies RacingTrackTile;
  });
  return {
    size: { width, height },
    tiles,
  };
}

export function parseTrackDocumentText(text: string): RacingTrackDocument {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('[starter-kit-racing] Track JSON is required');
  }
  return normalizeTrackDocument(JSON.parse(trimmed));
}

export function getNormalizedTileRotation(tileId: string, rotation: number): number {
  const definition = getTrackTileDefinition(tileId);
  if (!definition) {
    throw new Error(`[starter-kit-racing] Unknown track tile id "${tileId}"`);
  }
  const normalized = mod4(rotation);
  if (definition.rotationSymmetry === 1) {
    return 0;
  }
  if (definition.rotationSymmetry === 2) {
    return normalized % 2;
  }
  return normalized;
}

function rotateDirection(direction: TrackDirection, rotation: number): TrackDirection {
  const normalizedRotation = mod4(rotation);
  const ordered: TrackDirection[] = ['north', 'east', 'south', 'west'];
  const currentIndex = ordered.indexOf(direction);
  return ordered[(currentIndex - normalizedRotation + ordered.length) % ordered.length]!;
}

export function getTrackTileConnectors(tile: Pick<RacingTrackTile, 'tile' | 'rotation'>): TrackDirection[] {
  const definition = getTrackTileDefinition(tile.tile);
  if (!definition || !definition.driveable) {
    return [];
  }
  const normalizedRotation = getNormalizedTileRotation(tile.tile, tile.rotation);
  return definition.connectorBase.map((direction) => rotateDirection(direction, normalizedRotation));
}

export function validateTrackDocument(document: RacingTrackDocument): TrackValidationResult {
  const issues: TrackValidationIssue[] = [];
  const width = document.size.width;
  const height = document.size.height;
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < TRACK_SIZE_LIMITS.min ||
    height < TRACK_SIZE_LIMITS.min ||
    width > TRACK_SIZE_LIMITS.max ||
    height > TRACK_SIZE_LIMITS.max
  ) {
    issues.push({
      code: 'size_out_of_range',
      message: `Track size must be between ${TRACK_SIZE_LIMITS.min}x${TRACK_SIZE_LIMITS.min} and ${TRACK_SIZE_LIMITS.max}x${TRACK_SIZE_LIMITS.max}.`,
    });
  }

  if (
    document.tiles.length < TRACK_TILE_LIMITS.min ||
    document.tiles.length > TRACK_TILE_LIMITS.max
  ) {
    issues.push({
      code: 'tile_count_out_of_range',
      message: `Track must contain between ${TRACK_TILE_LIMITS.min} and ${TRACK_TILE_LIMITS.max} placed tiles.`,
    });
  }

  const tileMap = new Map<string, RacingTrackTile>();
  const driveableTiles: RacingTrackTile[] = [];

  for (const tile of document.tiles) {
    const definition = getTrackTileDefinition(tile.tile);
    const tileKey = makeTileKey(tile.x, tile.y);
    if (!definition) {
      issues.push({
        code: 'tile_id_invalid',
        message: `Unknown tile id "${tile.tile}".`,
        tileKey,
      });
      continue;
    }
    if (
      !Number.isInteger(tile.x) ||
      !Number.isInteger(tile.y) ||
      tile.x < 0 ||
      tile.y < 0 ||
      tile.x >= width ||
      tile.y >= height
    ) {
      issues.push({
        code: 'tile_out_of_bounds',
        message: `Tile "${tile.tile}" at (${tile.x}, ${tile.y}) is outside the track bounds.`,
        tileKey,
      });
      continue;
    }
    if (tileMap.has(tileKey)) {
      issues.push({
        code: 'duplicate_tile_position',
        message: `Multiple tiles occupy (${tile.x}, ${tile.y}).`,
        tileKey,
      });
      continue;
    }
    if (!Number.isInteger(tile.rotation) || tile.rotation < 0 || tile.rotation > 3) {
      issues.push({
        code: 'rotation_invalid',
        message: `Tile "${tile.tile}" rotation must be an integer quarter-turn between 0 and 3.`,
        tileKey,
      });
      continue;
    }

    tileMap.set(tileKey, tile);
    if (definition.driveable) {
      driveableTiles.push(tile);
    }
  }

  const expectedTileCount = width * height;
  if (tileMap.size !== expectedTileCount) {
    issues.push({
      code: 'tile_coverage_incomplete',
      message: `Track must define exactly one tile for every cell in the ${width} x ${height} map.`,
    });
  }

  const finishTiles = driveableTiles.filter((tile) => tile.tile === 'track.finish');
  if (finishTiles.length !== 1) {
    issues.push({
      code: 'track_finish_count_invalid',
      message: 'Track must contain exactly one finish line tile.',
    });
  }

  if (driveableTiles.length < TRACK_TILE_LIMITS.min) {
    issues.push({
      code: 'track_loop_too_short',
      message: `Track must contain at least ${TRACK_TILE_LIMITS.min} driveable tiles.`,
    });
  }

  for (const tile of driveableTiles) {
    const tileKey = makeTileKey(tile.x, tile.y);
    const connectors = getTrackTileConnectors(tile);
    for (const direction of connectors) {
      const offset = DIRECTION_OFFSETS[direction];
      const neighbor = tileMap.get(makeTileKey(tile.x + offset.dx, tile.y + offset.dy));
      if (!neighbor) {
        issues.push({
          code: 'track_connector_mismatch',
          message: `Driveable tile at (${tile.x}, ${tile.y}) has an open ${direction} connector.`,
          tileKey,
        });
        continue;
      }
      const neighborConnectors = getTrackTileConnectors(neighbor);
      if (!neighborConnectors.includes(OPPOSITE_DIRECTION[direction])) {
        issues.push({
          code: 'track_connector_mismatch',
          message: `Driveable tiles at (${tile.x}, ${tile.y}) and (${neighbor.x}, ${neighbor.y}) do not connect cleanly.`,
          tileKey,
        });
      }
    }
  }

  if (issues.length > 0 || driveableTiles.length === 0) {
    return {
      ok: issues.length === 0,
      issues,
    };
  }

  const visited = new Set<string>();
  const stack = [driveableTiles[0]!];
  while (stack.length > 0) {
    const current = stack.pop()!;
    const currentKey = makeTileKey(current.x, current.y);
    if (visited.has(currentKey)) {
      continue;
    }
    visited.add(currentKey);
    for (const direction of getTrackTileConnectors(current)) {
      const offset = DIRECTION_OFFSETS[direction];
      const neighbor = tileMap.get(makeTileKey(current.x + offset.dx, current.y + offset.dy));
      if (neighbor && getTrackTileDefinition(neighbor.tile)?.driveable) {
        stack.push(neighbor);
      }
    }
  }

  if (visited.size !== driveableTiles.length) {
    issues.push({
      code: 'track_disconnected',
      message: 'All driveable tiles must belong to one connected loop.',
    });
  }

  for (const tile of driveableTiles) {
    const tileKey = makeTileKey(tile.x, tile.y);
    const connectors = getTrackTileConnectors(tile);
    const connectedCount = connectors.filter((direction) => {
      const offset = DIRECTION_OFFSETS[direction];
      const neighbor = tileMap.get(makeTileKey(tile.x + offset.dx, tile.y + offset.dy));
      if (!neighbor) {
        return false;
      }
      return getTrackTileConnectors(neighbor).includes(OPPOSITE_DIRECTION[direction]);
    }).length;
    if (connectedCount !== 2) {
      issues.push({
        code: 'track_not_closed_loop',
        message: `Driveable tile at (${tile.x}, ${tile.y}) must connect to exactly two neighboring road tiles.`,
        tileKey,
      });
    }
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}

function chooseLoopStartDirection(tileMap: Map<string, RacingTrackTile>, finishTile: RacingTrackTile): TrackDirection {
  const driveDirection = rotateDirection('south', getNormalizedTileRotation(finishTile.tile, finishTile.rotation));
  const offset = DIRECTION_OFFSETS[driveDirection];
  const neighbor = tileMap.get(makeTileKey(finishTile.x + offset.dx, finishTile.y + offset.dy));
  if (!neighbor || !getTrackTileConnectors(neighbor).includes(OPPOSITE_DIRECTION[driveDirection])) {
    throw new Error('[starter-kit-racing] Finish line drive direction does not connect to the track loop');
  }
  return driveDirection;
}

function deriveLoopTiles(document: RacingTrackDocument) {
  const tileMap = new Map<string, RacingTrackTile>(document.tiles.map((tile) => [makeTileKey(tile.x, tile.y), tile]));
  const finishTile = document.tiles.find((tile) => tile.tile === 'track.finish');
  if (!finishTile) {
    throw new Error('[starter-kit-racing] Track is missing a finish tile');
  }
  const driveDirection = chooseLoopStartDirection(tileMap, finishTile);

  const loop: RacingTrackTile[] = [finishTile];
  let previous = finishTile;
  let direction = driveDirection;
  let current = tileMap.get(
    makeTileKey(
      finishTile.x + DIRECTION_OFFSETS[direction].dx,
      finishTile.y + DIRECTION_OFFSETS[direction].dy,
    ),
  );
  if (!current) {
    throw new Error('[starter-kit-racing] Track loop start could not resolve a neighbor');
  }

  while (current && current !== finishTile) {
    loop.push(current);
    const connectors = getTrackTileConnectors(current);
    const nextDirection = connectors.find((candidate) => {
      const offset = DIRECTION_OFFSETS[candidate];
      return current!.x + offset.dx !== previous.x || current!.y + offset.dy !== previous.y;
    });
    if (!nextDirection) {
      throw new Error('[starter-kit-racing] Track loop could not resolve the next tile');
    }
    previous = current;
    direction = nextDirection;
    const offset = DIRECTION_OFFSETS[direction];
    current = tileMap.get(makeTileKey(current.x + offset.dx, current.y + offset.dy));
    if (!current) {
      throw new Error('[starter-kit-racing] Track loop terminated unexpectedly');
    }
    if (loop.length > document.tiles.length + 1) {
      throw new Error('[starter-kit-racing] Track loop traversal exceeded the tile count');
    }
  }

  return {
    finishTile,
    loop,
    driveDirection,
  };
}

function getWorldGridCoordinate(length: number, coordinate: number): number {
  return coordinate - Math.floor(length / 2);
}

function getTrackTileOrientationIndex(tileId: RacingTrackTileId, rotation: number): number {
  const normalizedRotation = getNormalizedTileRotation(tileId, rotation);
  return ROTATION_TO_ORIENTATION_INDEX[normalizedRotation]!;
}

function getTileWorldCenter(document: RacingTrackDocument, tile: Pick<RacingTrackTile, 'x' | 'y'>) {
  return {
    gridX: getWorldGridCoordinate(document.size.width, tile.x),
    gridZ: getWorldGridCoordinate(document.size.height, tile.y),
  };
}

function getTileWorldBounds(runtimeTiles: DerivedTrackRuntimeTile[]) {
  if (runtimeTiles.length === 0) {
    return {
      centerX: 0,
      centerZ: 0,
      width: 0,
      height: 0,
    };
  }
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (const tile of runtimeTiles) {
    minX = Math.min(minX, tile.gridX);
    maxX = Math.max(maxX, tile.gridX);
    minZ = Math.min(minZ, tile.gridZ);
    maxZ = Math.max(maxZ, tile.gridZ);
  }
  return {
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
    width: maxX - minX + 1,
    height: maxZ - minZ + 1,
  };
}

export function deriveTrackRuntime(document: RacingTrackDocument): DerivedTrackRuntime {
  const validation = validateTrackDocument(document);
  if (!validation.ok) {
    const firstIssue = validation.issues[0];
    throw new Error(`[starter-kit-racing] ${firstIssue?.code ?? 'track_invalid'}: ${firstIssue?.message ?? 'Track is invalid.'}`);
  }

  const runtimeTiles = document.tiles.map((tile) => {
    const definition = getTrackTileDefinition(tile.tile);
    if (!definition) {
      throw new Error(`[starter-kit-racing] Unknown tile "${tile.tile}"`);
    }
    const { gridX, gridZ } = getTileWorldCenter(document, tile);
    return {
      kind: definition.runtimeKind,
      gridX,
      gridY: 0,
      gridZ,
      orientationIndex: getTrackTileOrientationIndex(tile.tile, tile.rotation),
      layer: 0,
    } satisfies DerivedTrackRuntimeTile;
  });

  const { finishTile, loop, driveDirection } = deriveLoopTiles(document);
  const previewLoop = loop.map((tile) => getTileWorldCenter(document, tile));
  const spawnTile = getTileWorldCenter(document, finishTile);
  const driveOffset = DIRECTION_OFFSETS[driveDirection];
  const spawnYaw = Math.atan2(driveOffset.dx, driveOffset.dy);

  return {
    document: cloneTrackDocument(document),
    runtimeTiles,
    previewLoop,
    driveDirection,
    spawnTile,
    spawnYaw,
    worldBounds: getTileWorldBounds(runtimeTiles),
    validation,
  };
}

function drawTrackTile(
  ctx: CanvasRenderingContext2D,
  tile: RacingTrackTile,
  cellSize: number,
) {
  const definition = getTrackTileDefinition(tile.tile);
  if (!definition) {
    return;
  }

  const left = tile.x * cellSize;
  const top = tile.y * cellSize;
  const centerX = left + cellSize / 2;
  const centerY = top + cellSize / 2;
  const roadWidth = cellSize * 0.56;
  const roadInset = cellSize * 0.16;

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(getNormalizedTileRotation(tile.tile, tile.rotation) * (Math.PI / 2));
  ctx.translate(-centerX, -centerY);

  if (definition.category === 'track') {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = roadWidth;
    ctx.beginPath();
    if (tile.tile === 'track.corner') {
      ctx.moveTo(centerX, top + cellSize - roadInset);
      ctx.lineTo(centerX, centerY);
      ctx.lineTo(left + roadInset, centerY);
    } else {
      ctx.moveTo(centerX, top + roadInset);
      ctx.lineTo(centerX, top + cellSize - roadInset);
    }
    ctx.stroke();

    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = roadWidth * 0.08;
    ctx.beginPath();
    if (tile.tile === 'track.corner') {
      ctx.moveTo(centerX, top + cellSize - roadInset);
      ctx.lineTo(centerX, centerY);
      ctx.lineTo(left + roadInset, centerY);
    } else {
      ctx.moveTo(centerX, top + roadInset);
      ctx.lineTo(centerX, top + cellSize - roadInset);
    }
    ctx.stroke();

    if (tile.tile === 'track.finish') {
      const stripeWidth = roadWidth * 0.16;
      const stripeHeight = cellSize * 0.12;
      for (let row = 0; row < 2; row += 1) {
        for (let column = -1; column <= 1; column += 1) {
          ctx.fillStyle = (row + column + 3) % 2 === 0 ? '#111827' : '#f8fafc';
          ctx.fillRect(
            centerX + column * stripeWidth,
            centerY - stripeHeight + row * stripeHeight,
            stripeWidth,
            stripeHeight,
          );
        }
      }
    }

    ctx.restore();
    return;
  }

  if (tile.tile === 'deco.empty') {
    ctx.fillStyle = '#d6cfaf';
    ctx.fillRect(left + cellSize * 0.12, top + cellSize * 0.12, cellSize * 0.76, cellSize * 0.76);
    ctx.restore();
    return;
  }

  if (tile.tile === 'deco.forest') {
    ctx.fillStyle = '#14532d';
    for (const [offsetX, offsetY, radius] of [
      [0.32, 0.38, 0.18],
      [0.58, 0.34, 0.16],
      [0.5, 0.58, 0.2],
    ] as const) {
      ctx.beginPath();
      ctx.arc(left + cellSize * offsetX, top + cellSize * offsetY, cellSize * radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  if (tile.tile === 'deco.tents') {
    ctx.fillStyle = '#fb923c';
    ctx.beginPath();
    ctx.moveTo(centerX, top + cellSize * 0.2);
    ctx.lineTo(left + cellSize * 0.2, top + cellSize * 0.78);
    ctx.lineTo(left + cellSize * 0.8, top + cellSize * 0.78);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#7c2d12';
    ctx.fillRect(centerX - cellSize * 0.04, top + cellSize * 0.42, cellSize * 0.08, cellSize * 0.34);
  }

  ctx.restore();
}

export function renderTrackDocumentToCanvas(
  canvas: HTMLCanvasElement,
  document: RacingTrackDocument,
  options: { showGrid?: boolean } = {},
) {
  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('[starter-kit-racing] 2D canvas context unavailable');
  }
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#6ba856';
  context.fillRect(0, 0, canvas.width, canvas.height);

  const cellSize = Math.min(canvas.width / document.size.width, canvas.height / document.size.height);
  const trackWidth = document.size.width * cellSize;
  const trackHeight = document.size.height * cellSize;
  const offsetX = (canvas.width - trackWidth) / 2;
  const offsetY = (canvas.height - trackHeight) / 2;

  context.save();
  context.translate(offsetX, offsetY);

  if (options.showGrid) {
    context.strokeStyle = 'rgba(15, 23, 42, 0.18)';
    context.lineWidth = 1;
    for (let x = 0; x <= document.size.width; x += 1) {
      const position = x * cellSize;
      context.beginPath();
      context.moveTo(position, 0);
      context.lineTo(position, trackHeight);
      context.stroke();
    }
    for (let y = 0; y <= document.size.height; y += 1) {
      const position = y * cellSize;
      context.beginPath();
      context.moveTo(0, position);
      context.lineTo(trackWidth, position);
      context.stroke();
    }
  }

  for (const tile of document.tiles) {
    drawTrackTile(context, tile, cellSize);
  }

  context.restore();
}

export async function createTrackPreviewBlob(
  documentData: RacingTrackDocument,
  size = 1024,
): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  renderTrackDocumentToCanvas(canvas, documentData);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) {
    throw new Error('[starter-kit-racing] Failed to encode track preview PNG');
  }
  return blob;
}

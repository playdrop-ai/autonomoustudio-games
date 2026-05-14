/// <reference types="playdrop-sdk-types" />

import type { PlaydropSDK } from 'playdrop-sdk-types';
import * as THREE from 'three';

import { TRACK_TILES, type TrackTile } from '../data/track-layout';
import { GRID_STEP, START_SPHERE_POSITION } from '../runtime/constants';
import { getDirectStockTrackAsset } from '../runtime/app-assets';
import {
  RACING_TRACK_ASSET_SPEC_REF,
  cloneTrackDocument,
  deriveTrackRuntime,
  getNormalizedTileRotation,
  normalizeTrackDocument,
  type DerivedTrackRuntime,
  type RacingTrackDocument,
  type RacingTrackTileId,
  type TrackDirection,
} from './track-core';

export type LoadedTrackSourceKind = 'stock' | 'draft' | 'owned_asset' | 'public_asset';

export type MultiplayerTrackRoomConfig = {
  track: string;
  trackRevision: number;
};

export type LoadedTrackState = {
  source: LoadedTrackSourceKind;
  document: RacingTrackDocument;
  assetRef: string | null;
  assetName: string | null;
  displayName: string | null;
  description: string | null;
  multiplayerRoomConfig: MultiplayerTrackRoomConfig | null;
};

export type TrackRepository = ReturnType<typeof createTrackRepository>;

const RUNTIME_KIND_TO_TILE_ID = {
  finish: 'track.finish',
  straight: 'track.straight',
  corner: 'track.corner',
  empty: 'deco.empty',
  forest: 'deco.forest',
  tents: 'deco.tents',
} as const satisfies Record<TrackTile['kind'], RacingTrackTileId>;

const ORIENTATION_INDEX_TO_ROTATION = new Map<number, number>([
  [0, 0],
  [16, 1],
  [10, 2],
  [22, 3],
]);
const DRIVEABLE_RUNTIME_KINDS = new Set<TrackTile['kind']>(['finish', 'straight', 'corner']);
const DIRECTION_OFFSETS = [
  { name: 'north', dx: 0, dz: -1 },
  { name: 'east', dx: 1, dz: 0 },
  { name: 'south', dx: 0, dz: 1 },
  { name: 'west', dx: -1, dz: 0 },
] as const;
const CONNECTOR_PAIR_TO_ROTATION = new Map<string, number>([
  ['north,south', 0],
  ['east,west', 1],
  ['south,west', 0],
  ['north,west', 3],
  ['east,north', 2],
  ['east,south', 1],
]);

const STOCK_TRACK_DOCUMENT = buildTrackDocumentFromRuntimeTiles(TRACK_TILES);
let currentTrackRuntime: DerivedTrackRuntime = deriveTrackRuntime(cloneTrackDocument(STOCK_TRACK_DOCUMENT));

type HostedAppRoutes = {
  detailUrl: string;
};

type ParsedTrackAssetRef = {
  creatorUsername: string;
  assetName: string;
  revision: number;
};

const TRACK_ASSET_REF_PATTERN = /^asset:([^/]+)\/([^@]+)@r(\d+)$/i;

function getWorldCoordinateOffset(values: number[]) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return {
    min,
    size: max - min + 1,
  };
}

function sortConnectorNames(left: string, right: string) {
  return [left, right].sort().join(',');
}

function deriveDriveableRotation(tile: TrackTile, tileMap: Map<string, TrackTile>) {
  const connectors = DIRECTION_OFFSETS
    .filter((direction) => {
      const neighbor = tileMap.get(`${tile.gridX + direction.dx}:${tile.gridZ + direction.dz}`);
      return Boolean(neighbor && DRIVEABLE_RUNTIME_KINDS.has(neighbor.kind));
    })
    .map((direction) => direction.name);
  if (connectors.length !== 2) {
    throw new Error(
      `[starter-kit-racing] Unable to derive track connectors for ${tile.kind} at ${tile.gridX},${tile.gridZ}`,
    );
  }
  const rotation = CONNECTOR_PAIR_TO_ROTATION.get(sortConnectorNames(connectors[0]!, connectors[1]!));
  if (rotation === undefined) {
    throw new Error(
      `[starter-kit-racing] Unsupported connector pair ${connectors.join(',')} for ${tile.kind}`,
    );
  }
  return getNormalizedTileRotation(RUNTIME_KIND_TO_TILE_ID[tile.kind], rotation);
}

function deriveTileRotation(tile: TrackTile, tileMap: Map<string, TrackTile>) {
  if (DRIVEABLE_RUNTIME_KINDS.has(tile.kind)) {
    return deriveDriveableRotation(tile, tileMap);
  }
  const rawRotation = ORIENTATION_INDEX_TO_ROTATION.get(tile.orientationIndex);
  if (rawRotation === undefined) {
    throw new Error(
      `[starter-kit-racing] Unsupported track orientation index ${tile.orientationIndex}`,
    );
  }
  return getNormalizedTileRotation(RUNTIME_KIND_TO_TILE_ID[tile.kind], rawRotation);
}

function buildTrackDocumentFromRuntimeTiles(tiles: TrackTile[]): RacingTrackDocument {
  if (tiles.length === 0) {
    throw new Error('[starter-kit-racing] Track tiles are required');
  }
  const tileMap = new Map<string, TrackTile>(tiles.map((tile) => [`${tile.gridX}:${tile.gridZ}`, tile]));
  const xBounds = getWorldCoordinateOffset(tiles.map((tile) => tile.gridX));
  const zBounds = getWorldCoordinateOffset(tiles.map((tile) => tile.gridZ));
  return {
    size: {
      width: xBounds.size,
      height: zBounds.size,
    },
    tiles: tiles.map((tile) => ({
      x: tile.gridX - xBounds.min,
      y: tile.gridZ - zBounds.min,
      tile: RUNTIME_KIND_TO_TILE_ID[tile.kind],
      rotation: deriveTileRotation(tile, tileMap),
    })),
  };
}

function getHostedAppRoutes(sdk: PlaydropSDK): HostedAppRoutes {
  const routes = (sdk.app as { routes?: Partial<HostedAppRoutes> | null }).routes;
  const detailUrl = typeof routes?.detailUrl === 'string' ? routes.detailUrl.trim() : '';
  if (!detailUrl) {
    throw new Error('[starter-kit-racing] Hosted asset detail route unavailable');
  }
  return { detailUrl };
}

function getTrackApi(sdk: PlaydropSDK) {
  return sdk.assets.custom.forSpec<RacingTrackDocument>(RACING_TRACK_ASSET_SPEC_REF);
}

function parseTrackAssetRef(assetRef: string): ParsedTrackAssetRef {
  const match = TRACK_ASSET_REF_PATTERN.exec(assetRef.trim());
  if (!match) {
    throw new Error(`[starter-kit-racing] Invalid track asset ref: ${assetRef}`);
  }
  const revision = Number.parseInt(match[3] ?? '', 10);
  if (!Number.isSafeInteger(revision) || revision <= 0) {
    throw new Error(`[starter-kit-racing] Invalid track asset revision: ${assetRef}`);
  }
  return {
    creatorUsername: match[1] ?? '',
    assetName: match[2] ?? '',
    revision,
  };
}

export function createMultiplayerRoomConfig(assetRef: string): MultiplayerTrackRoomConfig {
  const parsed = parseTrackAssetRef(assetRef);
  return {
    track: `${parsed.creatorUsername}/${parsed.assetName}`,
    trackRevision: parsed.revision,
  };
}

async function loadOwnedTrackState(
  trackApi: ReturnType<typeof getTrackApi>,
  ownedTrackRef: string,
): Promise<LoadedTrackState> {
  const loaded = await trackApi.loadOwned({ assetRef: ownedTrackRef });
  const assetRef = loaded.version?.assetRef ?? ownedTrackRef;
  return {
    source: 'owned_asset',
    document: normalizeTrackDocument(loaded.json),
    assetRef,
    assetName: loaded.asset.assetName,
    displayName: loaded.asset.displayName,
    description: loaded.asset.description,
    multiplayerRoomConfig: createMultiplayerRoomConfig(assetRef),
  };
}

async function loadPublicTrackState(
  trackApi: ReturnType<typeof getTrackApi>,
  publicTrackRef: string,
): Promise<LoadedTrackState> {
  const asset = await trackApi.getByRef(publicTrackRef);
  const document = await trackApi.loadJson({ assetRef: publicTrackRef });
  return {
    source: 'public_asset',
    document: normalizeTrackDocument(document),
    assetRef: publicTrackRef,
    assetName: asset.name,
    displayName: asset.displayName ?? asset.name,
    description: asset.description ?? null,
    multiplayerRoomConfig: createMultiplayerRoomConfig(publicTrackRef),
  };
}

export function createTrackRepository(sdk: PlaydropSDK) {
  const trackApi = getTrackApi(sdk);
  return {
    trackApi,
    async loadStockTrack(): Promise<LoadedTrackState> {
      const stockTrack = getDirectStockTrackAsset(sdk);
      return await loadPublicTrackState(trackApi, stockTrack.assetRef);
    },
    async loadPublicTrack(assetRef: string): Promise<LoadedTrackState> {
      return await loadPublicTrackState(trackApi, assetRef);
    },
    async loadOwnedTrack(assetRef: string): Promise<LoadedTrackState> {
      return await loadOwnedTrackState(trackApi, assetRef);
    },
    async listPublishedTracks({
      limit,
      offset,
      sort = 'likes',
    }: {
      limit: number;
      offset: number;
      sort?: 'recent' | 'likes' | 'remixes' | 'comments';
    }) {
      return await trackApi.listPublic({ limit, offset, sort });
    },
    async listPublishedTracksForCreator(
      creatorUsername: string,
      {
        limit,
        offset,
        sort = 'recent',
      }: {
        limit: number;
        offset: number;
        sort?: 'recent' | 'likes' | 'remixes' | 'comments';
      },
    ) {
      return await trackApi.listForCreator(creatorUsername, { limit, offset, sort });
    },
    async listOwnedTracks() {
      return await trackApi.listMine();
    },
    buildAssetDetailUrl(creatorUsername: string, assetName: string) {
      const routes = getHostedAppRoutes(sdk);
      return new URL(
        `/creators/${encodeURIComponent(creatorUsername)}/assets/${encodeURIComponent(assetName)}`,
        new URL(routes.detailUrl).origin,
      ).toString();
    },
  };
}

export function createDraftTrackState(
  document: RacingTrackDocument,
  metadata: {
    displayName?: string | null;
    description?: string | null;
    assetName?: string | null;
  } = {},
): LoadedTrackState {
  return {
    source: 'draft',
    document: normalizeTrackDocument(document),
    assetRef: null,
    assetName: metadata.assetName ?? null,
    displayName: metadata.displayName ?? null,
    description: metadata.description ?? null,
    multiplayerRoomConfig: null,
  };
}

export function getCurrentTrackRuntime() {
  return currentTrackRuntime;
}

export function getCurrentTrackDocument() {
  return cloneTrackDocument(currentTrackRuntime.document);
}

export function getCurrentTrackRuntimeTiles(): TrackTile[] {
  return currentTrackRuntime.runtimeTiles.map((tile) => ({
    kind: tile.kind,
    gridX: tile.gridX,
    gridY: tile.gridY,
    gridZ: tile.gridZ,
    orientationIndex: tile.orientationIndex,
    layer: tile.layer,
  }));
}

export function getCurrentTrackWorldBounds() {
  return {
    centerX: currentTrackRuntime.worldBounds.centerX * GRID_STEP,
    centerZ: currentTrackRuntime.worldBounds.centerZ * GRID_STEP,
    width: currentTrackRuntime.worldBounds.width * GRID_STEP,
    height: currentTrackRuntime.worldBounds.height * GRID_STEP,
  };
}

export function getStockTrackDocument() {
  return cloneTrackDocument(STOCK_TRACK_DOCUMENT);
}

export function getCurrentTrackPreviewLoop() {
  return currentTrackRuntime.previewLoop;
}

export function getCurrentTrackDriveDirection(): TrackDirection {
  return currentTrackRuntime.driveDirection;
}

export function getCurrentTrackSpawnPosition() {
  return new THREE.Vector3(
    currentTrackRuntime.spawnTile.gridX * GRID_STEP,
    START_SPHERE_POSITION.y,
    currentTrackRuntime.spawnTile.gridZ * GRID_STEP,
  );
}

export function getCurrentTrackSpawnYaw() {
  return currentTrackRuntime.spawnYaw;
}

export function applyTrackDocument(document: RacingTrackDocument): DerivedTrackRuntime {
  currentTrackRuntime = deriveTrackRuntime(document);
  return currentTrackRuntime;
}

export function vectorFromTrackSpawn(position = getCurrentTrackSpawnPosition()) {
  return new THREE.Vector3(position.x, position.y, position.z);
}

import * as THREE from 'three';

import { TRACK_TILES, type TrackTile } from '../data/track-layout';
import { GODOT_ORTHO_MATRICES, GRID_HEIGHT, GRID_STEP, TRACK_KIND_TO_MODEL, TRACK_SCALE, TRACK_Y } from './constants';
import type { AssetBundle } from './shared';

export type TrackWorldBounds = {
  centerX: number;
  centerZ: number;
  width: number;
  height: number;
};

function makeTrackStackKey(gridX: number, gridZ: number) {
  return `${gridX}:${gridZ}`;
}

export function makeTileMatrix(tile: TrackTile) {
  const translation = new THREE.Vector3(
    tile.gridX * GRID_STEP,
    TRACK_Y + tile.gridY * GRID_HEIGHT,
    tile.gridZ * GRID_STEP,
  );
  const orientationMatrix = GODOT_ORTHO_MATRICES[tile.orientationIndex];
  if (!orientationMatrix) {
    throw new Error(`[starter-kit-racing] Unsupported orientation index ${tile.orientationIndex}`);
  }

  return new THREE.Matrix4()
    .copy(orientationMatrix)
    .scale(new THREE.Vector3(TRACK_SCALE, TRACK_SCALE, TRACK_SCALE))
    .setPosition(translation);
}

function getTrackWorldBounds(): TrackWorldBounds {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (const tile of TRACK_TILES) {
    const centerX = tile.gridX * GRID_STEP;
    const centerZ = tile.gridZ * GRID_STEP;
    minX = Math.min(minX, centerX - GRID_STEP / 2);
    maxX = Math.max(maxX, centerX + GRID_STEP / 2);
    minZ = Math.min(minZ, centerZ - GRID_STEP / 2);
    maxZ = Math.max(maxZ, centerZ + GRID_STEP / 2);
  }

  return {
    centerX: (minX + maxX) / 2,
    centerZ: (minZ + maxZ) / 2,
    width: maxX - minX,
    height: maxZ - minZ,
  };
}

function buildInstancedGroup(template: THREE.Object3D, matrices: THREE.Matrix4[]) {
  const group = new THREE.Group();
  template.updateMatrixWorld(true);

  template.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    const localMatrix = child.matrixWorld.clone();
    const material = child.material as THREE.Material | THREE.Material[];
    const instancedMesh = new THREE.InstancedMesh(child.geometry, material, matrices.length);
    instancedMesh.castShadow = true;
    instancedMesh.receiveShadow = true;
    instancedMesh.frustumCulled = false;
    instancedMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

    const instanceMatrix = new THREE.Matrix4();
    matrices.forEach((matrix, index) => {
      instanceMatrix.multiplyMatrices(matrix, localMatrix);
      instancedMesh.setMatrixAt(index, instanceMatrix);
    });
    instancedMesh.instanceMatrix.needsUpdate = true;
    group.add(instancedMesh);
  });

  return group;
}

export class TrackController {
  readonly group = new THREE.Group();
  readonly worldBounds = getTrackWorldBounds();

  private readonly tileLookup = new Map<string, TrackTile[]>();

  constructor(tiles: AssetBundle['tiles']) {
    const trackGroups = new Map<keyof typeof TRACK_KIND_TO_MODEL, THREE.Matrix4[]>();
    trackGroups.set('empty', []);
    trackGroups.set('forest', []);
    trackGroups.set('tents', []);
    trackGroups.set('corner', []);
    trackGroups.set('finish', []);
    trackGroups.set('straight', []);

    for (const tile of TRACK_TILES) {
      const key = TRACK_KIND_TO_MODEL[tile.kind];
      trackGroups.get(key)?.push(makeTileMatrix(tile));

      const stackKey = makeTrackStackKey(tile.gridX, tile.gridZ);
      const stack = this.tileLookup.get(stackKey);
      if (stack) {
        stack.push(tile);
      } else {
        this.tileLookup.set(stackKey, [tile]);
      }
    }

    for (const stack of this.tileLookup.values()) {
      stack.sort((left, right) => left.gridY - right.gridY || left.layer - right.layer);
    }

    for (const [kind, matrices] of trackGroups.entries()) {
      if (matrices.length === 0) {
        continue;
      }
      this.group.add(buildInstancedGroup(tiles[kind].scene, matrices));
    }
  }

  getCurrentTile(position: THREE.Vector3, isGrounded: boolean, lastGroundY: number) {
    const stack = this.tileLookup.get(makeTrackStackKey(Math.round(position.x / GRID_STEP), Math.round(position.z / GRID_STEP)));
    if (!stack || stack.length === 0) {
      return null;
    }

    const probeY = isGrounded ? lastGroundY : position.y;
    let bestTile = stack[0];
    let bestDistance = Math.abs(TRACK_Y + bestTile.gridY * GRID_HEIGHT - probeY);

    for (let index = 1; index < stack.length; index += 1) {
      const tile = stack[index];
      const distance = Math.abs(TRACK_Y + tile.gridY * GRID_HEIGHT - probeY);
      if (distance < bestDistance) {
        bestTile = tile;
        bestDistance = distance;
      }
    }

    return bestTile;
  }
}

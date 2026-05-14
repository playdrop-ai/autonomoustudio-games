/// <reference types="playdrop-sdk-types" />

import type { PlaydropSDK } from 'playdrop-sdk-types';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { resolveRacingAppAssetFile } from './app-assets';
import type { AssetBundle } from './shared';

let assetBundlePromise: Promise<AssetBundle> | null = null;

function createSequentialIndices(vertexCount: number) {
  const indices = new Uint32Array(vertexCount);
  for (let index = 0; index < vertexCount; index += 1) {
    indices[index] = index;
  }
  return indices;
}

async function loadArrayBuffer(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`[starter-kit-racing] Failed to load ${url} (${response.status})`);
  }
  return await response.arrayBuffer();
}

async function loadCollisionShape(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`[starter-kit-racing] Failed to load collision shape ${url} (${response.status})`);
  }
  const json = await response.json() as { positions?: unknown };
  if (!Array.isArray(json.positions) || json.positions.some((value) => typeof value !== 'number' || !Number.isFinite(value))) {
    throw new Error(`[starter-kit-racing] Invalid collision shape payload at ${url}`);
  }
  const positions = new Float32Array(json.positions);
  if (positions.length === 0 || positions.length % 3 !== 0) {
    throw new Error(`[starter-kit-racing] Collision shape at ${url} must contain full xyz vertices`);
  }
  return {
    positions,
    indices: createSequentialIndices(positions.length / 3),
  };
}

function createSmokeTexture(source: THREE.Texture) {
  const image = source.image;
  if (!image) {
    throw new Error('[starter-kit-racing] smoke texture missing image');
  }

  const sizedImage = image as { width?: number; height?: number };
  const width = image instanceof HTMLImageElement ? image.naturalWidth : sizedImage.width;
  const height = image instanceof HTMLImageElement ? image.naturalHeight : sizedImage.height;
  if (typeof width !== 'number' || typeof height !== 'number' || width <= 0 || height <= 0) {
    throw new Error('[starter-kit-racing] smoke texture has invalid dimensions');
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) {
    throw new Error('[starter-kit-racing] unable to create smoke texture canvas');
  }

  context.clearRect(0, 0, width, height);
  context.drawImage(image as CanvasImageSource, 0, 0, width, height);

  const imageData = context.getImageData(0, 0, width, height);
  const { data } = imageData;
  for (let index = 0; index < data.length; index += 4) {
    const alpha = Math.max(data[index], data[index + 1], data[index + 2]);
    data[index] = alpha;
    data[index + 1] = alpha;
    data[index + 2] = alpha;
    data[index + 3] = alpha;
  }
  context.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.premultiplyAlpha = true;
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

async function loadAssetsInner(sdk: PlaydropSDK): Promise<AssetBundle> {
  const loadingManager = new THREE.LoadingManager();
  const gltfLoader = new GLTFLoader(loadingManager);
  const textureLoader = new THREE.TextureLoader(loadingManager);

  const urls = {
    decorationEmpty: resolveRacingAppAssetFile(sdk, 'tile-deco-empty'),
    vehicleTruckYellow: resolveRacingAppAssetFile(sdk, 'vehicle-truck-yellow'),
    vehicleTruckRed: resolveRacingAppAssetFile(sdk, 'vehicle-truck-red'),
    vehicleTruckGreen: resolveRacingAppAssetFile(sdk, 'vehicle-truck-green'),
    vehicleTruckPurple: resolveRacingAppAssetFile(sdk, 'vehicle-truck-purple'),
    vehicleMotorcycle: resolveRacingAppAssetFile(sdk, 'vehicle-motorcycle'),
    decorationForest: resolveRacingAppAssetFile(sdk, 'tile-deco-forest'),
    decorationTents: resolveRacingAppAssetFile(sdk, 'tile-deco-tents'),
    trackCorner: resolveRacingAppAssetFile(sdk, 'tile-track-corner'),
    trackFinish: resolveRacingAppAssetFile(sdk, 'tile-track-finish'),
    trackStraight: resolveRacingAppAssetFile(sdk, 'tile-track-straight'),
    smoke: resolveRacingAppAssetFile(sdk, 'sprite-smoke'),
    audioTruckEngine: resolveRacingAppAssetFile(sdk, 'sfx-engine-truck'),
    audioMotorcycleEngine: resolveRacingAppAssetFile(sdk, 'sfx-engine-motorcycle'),
    audioSkid: resolveRacingAppAssetFile(sdk, 'sfx-skid'),
    audioImpact: resolveRacingAppAssetFile(sdk, 'sfx-impact'),
    collisionCorner: resolveRacingAppAssetFile(sdk, 'tile-track-corner', 'collision'),
    collisionFinish: resolveRacingAppAssetFile(sdk, 'tile-track-finish', 'collision'),
    collisionStraight: resolveRacingAppAssetFile(sdk, 'tile-track-straight', 'collision'),
  };

  const [
    decorationEmpty,
    vehicleTruckYellow,
    vehicleTruckRed,
    vehicleTruckGreen,
    vehicleTruckPurple,
    vehicleMotorcycle,
    decorationForest,
    decorationTents,
    trackCorner,
    trackFinish,
    trackStraight,
    smokeTextureSource,
    audioTruckEngine,
    audioMotorcycleEngine,
    audioSkid,
    audioImpact,
    collisionCorner,
    collisionFinish,
    collisionStraight,
  ] = await Promise.all([
    gltfLoader.loadAsync(urls.decorationEmpty),
    gltfLoader.loadAsync(urls.vehicleTruckYellow),
    gltfLoader.loadAsync(urls.vehicleTruckRed),
    gltfLoader.loadAsync(urls.vehicleTruckGreen),
    gltfLoader.loadAsync(urls.vehicleTruckPurple),
    gltfLoader.loadAsync(urls.vehicleMotorcycle),
    gltfLoader.loadAsync(urls.decorationForest),
    gltfLoader.loadAsync(urls.decorationTents),
    gltfLoader.loadAsync(urls.trackCorner),
    gltfLoader.loadAsync(urls.trackFinish),
    gltfLoader.loadAsync(urls.trackStraight),
    textureLoader.loadAsync(urls.smoke),
    loadArrayBuffer(urls.audioTruckEngine),
    loadArrayBuffer(urls.audioMotorcycleEngine),
    loadArrayBuffer(urls.audioSkid),
    loadArrayBuffer(urls.audioImpact),
    loadCollisionShape(urls.collisionCorner),
    loadCollisionShape(urls.collisionFinish),
    loadCollisionShape(urls.collisionStraight),
  ]);

  const smokeTexture = createSmokeTexture(smokeTextureSource);
  smokeTextureSource.dispose();

  return {
    vehicles: {
      'truck-yellow': vehicleTruckYellow,
      'truck-red': vehicleTruckRed,
      'truck-green': vehicleTruckGreen,
      'truck-purple': vehicleTruckPurple,
      motorcycle: vehicleMotorcycle,
    },
    tiles: {
      empty: decorationEmpty,
      forest: decorationForest,
      tents: decorationTents,
      corner: trackCorner,
      finish: trackFinish,
      straight: trackStraight,
    },
    smokeTexture,
    audioBuffers: {
      truckEngine: audioTruckEngine,
      motorcycleEngine: audioMotorcycleEngine,
      skid: audioSkid,
      impact: audioImpact,
    },
    collisionShapes: {
      corner: collisionCorner,
      finish: collisionFinish,
      straight: collisionStraight,
    },
  };
}

export async function loadAssets(sdk: PlaydropSDK): Promise<AssetBundle> {
  if (!assetBundlePromise) {
    assetBundlePromise = loadAssetsInner(sdk);
  }
  return await assetBundlePromise;
}

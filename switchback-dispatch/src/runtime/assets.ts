import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { MODEL_URLS } from './constants';
import type { AssetBundle } from './shared';

function loadArrayBuffer(url: string) {
  return fetch(new URL(url, window.location.href).toString()).then(async (response) => {
    if (!response.ok) {
      throw new Error(`[starter-kit-racing] Failed to load ${url} (${response.status})`);
    }
    return response.arrayBuffer();
  });
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

export async function loadAssets(): Promise<AssetBundle> {
  const loadingManager = new THREE.LoadingManager();
  const gltfLoader = new GLTFLoader(loadingManager);
  const textureLoader = new THREE.TextureLoader(loadingManager);

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
  ] = await Promise.all([
    gltfLoader.loadAsync(MODEL_URLS.decorationEmpty),
    gltfLoader.loadAsync(MODEL_URLS.vehicleTruckYellow),
    gltfLoader.loadAsync(MODEL_URLS.vehicleTruckRed),
    gltfLoader.loadAsync(MODEL_URLS.vehicleTruckGreen),
    gltfLoader.loadAsync(MODEL_URLS.vehicleTruckPurple),
    gltfLoader.loadAsync(MODEL_URLS.vehicleMotorcycle),
    gltfLoader.loadAsync(MODEL_URLS.decorationForest),
    gltfLoader.loadAsync(MODEL_URLS.decorationTents),
    gltfLoader.loadAsync(MODEL_URLS.trackCorner),
    gltfLoader.loadAsync(MODEL_URLS.trackFinish),
    gltfLoader.loadAsync(MODEL_URLS.trackStraight),
    textureLoader.loadAsync(MODEL_URLS.smoke),
    loadArrayBuffer(MODEL_URLS.audioTruckEngine),
    loadArrayBuffer(MODEL_URLS.audioMotorcycleEngine),
    loadArrayBuffer(MODEL_URLS.audioSkid),
    loadArrayBuffer(MODEL_URLS.audioImpact),
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
  };
}

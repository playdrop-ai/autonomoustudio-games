/// <reference types="playdrop-sdk-types" />

import type * as THREE from 'three';
import type { PlaydropSDK } from 'playdrop-sdk-types';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import type { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import type { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import type { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import type { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export type HostLoadingState = {
  status: 'loading' | 'ready' | 'error';
  message?: string;
  progress?: number;
};

export const PREVIEW_TRUCK_VEHICLE_IDS = [
  'truck-yellow',
  'truck-red',
  'truck-green',
  'truck-purple',
] as const;
export const PLAYER_VEHICLE_IDS = [...PREVIEW_TRUCK_VEHICLE_IDS, 'motorcycle'] as const;
export type TruckVehicleId = (typeof PREVIEW_TRUCK_VEHICLE_IDS)[number];
export type VehicleId = (typeof PLAYER_VEHICLE_IDS)[number];
export type TrackModelKind = 'empty' | 'forest' | 'tents' | 'corner' | 'finish' | 'straight';

export function vehicleIdToIndex(id: VehicleId) {
  return PLAYER_VEHICLE_IDS.indexOf(id);
}

export function vehicleIdFromIndex(index: number) {
  const normalized = Math.round(index);
  const id = PLAYER_VEHICLE_IDS[normalized];
  if (!id) {
    throw new Error(`[starter-kit-racing] invalid vehicle index ${index}`);
  }
  return id;
}

export function isTruckVehicleId(id: VehicleId): id is TruckVehicleId {
  return PREVIEW_TRUCK_VEHICLE_IDS.some((candidate) => candidate === id);
}

export const VEHICLE_DISPLAY_NAMES: Record<VehicleId, string> = {
  'truck-yellow': 'Yellow Truck',
  'truck-red': 'Red Truck',
  'truck-green': 'Green Truck',
  'truck-purple': 'Purple Truck',
  motorcycle: 'Motorcycle',
};

export type VehicleEngineProfile = 'truck' | 'motorcycle';

export function vehicleDisplayNameFromId(id: VehicleId) {
  return VEHICLE_DISPLAY_NAMES[id];
}

export type AssetBundle = {
  vehicles: Record<VehicleId, GLTF>;
  tiles: Record<TrackModelKind, GLTF>;
  smokeTexture: THREE.Texture;
  audioBuffers: Record<'truckEngine' | 'motorcycleEngine' | 'skid' | 'impact', ArrayBuffer>;
};

export type VehiclePickerOption = {
  button: HTMLButtonElement;
  preview: HTMLImageElement;
};

export type VehiclePickerOptions = Record<VehicleId, VehiclePickerOption>;

export type OverlayUiElements = {
  modeBar: HTMLElement;
  soloModeButton: HTMLButtonElement;
  multiplayerModeButton: HTMLButtonElement;
  vehiclePickerShell: HTMLElement;
  status: HTMLElement;
};

export type DebugMode = 'render' | 'physics';
export type DebugToggleButtons = Record<DebugMode, HTMLButtonElement>;

export type TouchControlsElements = {
  container: HTMLElement;
  steeringZone: HTMLElement;
  steeringKnob: HTMLElement;
  gasButton: HTMLElement;
  brakeButton: HTMLElement;
};

export type DesktopControlHintsElements = {
  container: HTMLElement;
  keyW: HTMLElement;
  keyA: HTMLElement;
  keyS: HTMLElement;
  keyD: HTMLElement;
};

export type TruckVehicleRig = {
  kind: 'truck';
  body: THREE.Object3D;
  wheelFrontLeft: THREE.Object3D;
  wheelFrontRight: THREE.Object3D;
  wheelBackLeft: THREE.Object3D;
  wheelBackRight: THREE.Object3D;
  smokeOffsets: THREE.Vector3[];
};

export type MotorcycleVehicleRig = {
  kind: 'motorcycle';
  leanRoot: THREE.Object3D;
  body: THREE.Object3D;
  fork: THREE.Object3D;
  wheelFront: THREE.Object3D;
  wheelBack: THREE.Object3D;
  smokeOffsets: THREE.Vector3[];
};

export type VehicleVisual = {
  id: VehicleId;
  root: THREE.Group;
  rig: TruckVehicleRig | MotorcycleVehicleRig;
  engineProfile: VehicleEngineProfile;
  bodyRestPosition: THREE.Vector3;
  bodyBouncePosition: THREE.Vector3;
};

export type SmokeParticle = {
  sprite: THREE.Sprite;
  age: number;
  life: number;
  active: boolean;
  velocity: THREE.Vector3;
  baseScale: number;
};

export type CameraPose = {
  focus: THREE.Vector3;
  position: THREE.Vector3;
  forward: THREE.Vector3;
};

export type CameraMode = 'follow' | 'topdown';

export type DebugGeometryStats = {
  vertexCount: number;
  triangleCount: number;
  bounds: {
    min: [number, number, number];
    max: [number, number, number];
  } | null;
};

export type PostProcessingStack = {
  composer: EffectComposer;
  renderPass: RenderPass;
  aoPass: GTAOPass;
  bloomPass: UnrealBloomPass;
  outputPass: OutputPass;
  resize: (width: number, height: number) => void;
  render: () => void;
  dispose: () => void;
};

export type ControlsSource = 'keyboard' | 'gamepad' | 'touch' | 'none';
export type OverlayNavigationSource = 'keyboard' | 'pointer' | 'gamepad';

export type ControlsSnapshot = {
  x: number;
  z: number;
  source: ControlsSource;
};

declare global {
  interface Window {
    advanceTime?: (ms: number) => void;
    render_game_to_text?: () => string;
    __starterKitRacingTestHooks?: {
      pauseLocalMultiplayerMotion: (ms: number) => void;
      resetLocalVehicle: () => void;
      setLocalVehicleTestState: (state: {
        position: [number, number, number];
        velocity: [number, number, number];
      }) => void;
      getPreviewBenchmark?: () => unknown;
    };
    __listingCapture?: {
      prepare: (sceneId: string) => Promise<void> | void;
    };
    __starterKitRacingSdkPromise__?: Promise<PlaydropSDK>;
  }
}

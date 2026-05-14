import type { CameraMode, DebugMode } from './shared';

export type StarterKitRacingFlags = {
  cameraMode?: CameraMode;
  debugMode?: DebugMode;
  listingCapture?: boolean;
  showDebugUi?: boolean;
  enableTestHooks?: boolean;
};

export type ResolvedStarterKitRacingFlags = {
  cameraMode: CameraMode;
  debugMode: DebugMode;
  listingCapture: boolean;
  showDebugUi: boolean;
  enableTestHooks: boolean;
};

function normalizeCameraMode(value: unknown): CameraMode {
  return value === 'topdown' ? 'topdown' : 'follow';
}

function normalizeDebugMode(value: unknown): DebugMode {
  return value === 'physics' ? 'physics' : 'render';
}

export function getStarterKitRacingFlags(): ResolvedStarterKitRacingFlags {
  const raw = window.__starterKitRacingFlags__ ?? {};
  return {
    cameraMode: normalizeCameraMode(raw.cameraMode),
    debugMode: normalizeDebugMode(raw.debugMode),
    listingCapture: raw.listingCapture === true,
    showDebugUi: raw.showDebugUi === true,
    enableTestHooks: raw.enableTestHooks === true,
  };
}

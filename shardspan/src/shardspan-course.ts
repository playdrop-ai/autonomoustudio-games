export type PhaseFamily = 'amber' | 'cobalt';

export type CoursePlatformDefinition = {
  name: string;
  prefabKey: 'platform' | 'platform_medium' | 'platform_grass_large_round';
  position: readonly [number, number, number];
};

export type BridgeDefinition = {
  name: string;
  phase: PhaseFamily | null;
  position: readonly [number, number, number];
  size: readonly [number, number, number];
};

export type BeaconDefinition = {
  id: string;
  label: string;
  cue: string;
  nextPhase: PhaseFamily;
  position: readonly [number, number, number];
  checkpoint: readonly [number, number, number];
};

export type FinishGateDefinition = {
  position: readonly [number, number, number];
  triggerSize: readonly [number, number, number];
};

export const SHARDSPAN_INITIAL_PHASE: PhaseFamily = 'amber';
export const SHARDSPAN_TIMER_LIMIT_SECONDS = 48;
export const SHARDSPAN_FALL_PENALTY_SECONDS = 4;

export const COURSE_PLATFORMS: readonly CoursePlatformDefinition[] = [
  {
    name: 'start-island',
    prefabKey: 'platform_grass_large_round',
    position: [0, 0, 0],
  },
  {
    name: 'beacon-1-island',
    prefabKey: 'platform_medium',
    position: [-9.5, 0.45, 0],
  },
  {
    name: 'beacon-2-island',
    prefabKey: 'platform_grass_large_round',
    position: [-9.5, 1.25, -9.5],
  },
  {
    name: 'beacon-3-island',
    prefabKey: 'platform',
    position: [-19, 2.05, -9.5],
  },
  {
    name: 'beacon-4-island',
    prefabKey: 'platform_medium',
    position: [-19, 2.9, -18.5],
  },
  {
    name: 'finish-island',
    prefabKey: 'platform_grass_large_round',
    position: [-28.5, 3.75, -18.5],
  },
];

export const COURSE_BRIDGES: readonly BridgeDefinition[] = [
  {
    name: 'start-span-1',
    phase: null,
    position: [-4.1, 0.2, 0],
    size: [3, 0.32, 1.7],
  },
  {
    name: 'start-span-2',
    phase: null,
    position: [-7.6, 0.38, 0],
    size: [3.2, 0.32, 1.7],
  },
  {
    name: 'cobalt-span-1',
    phase: 'cobalt',
    position: [-9.5, 0.68, -3.4],
    size: [1.6, 0.32, 2.4],
  },
  {
    name: 'cobalt-span-2',
    phase: 'cobalt',
    position: [-9.5, 0.95, -6.5],
    size: [1.6, 0.32, 2.4],
  },
  {
    name: 'amber-span-1',
    phase: 'amber',
    position: [-12.9, 1.48, -9.5],
    size: [2.4, 0.32, 1.6],
  },
  {
    name: 'amber-span-2',
    phase: 'amber',
    position: [-16.1, 1.78, -9.5],
    size: [2.4, 0.32, 1.6],
  },
  {
    name: 'cobalt-span-3',
    phase: 'cobalt',
    position: [-19, 2.38, -12.7],
    size: [1.6, 0.32, 2.4],
  },
  {
    name: 'cobalt-span-4',
    phase: 'cobalt',
    position: [-19, 2.68, -15.9],
    size: [1.6, 0.32, 2.4],
  },
  {
    name: 'amber-span-3',
    phase: 'amber',
    position: [-22.4, 3.18, -18.5],
    size: [2.4, 0.32, 1.6],
  },
  {
    name: 'amber-span-4',
    phase: 'amber',
    position: [-25.6, 3.48, -18.5],
    size: [2.4, 0.32, 1.6],
  },
];

export const COURSE_BEACONS: readonly BeaconDefinition[] = [
  {
    id: 'beacon-1',
    label: 'Relay I',
    cue: 'Touch to wake the cobalt span.',
    nextPhase: 'cobalt',
    position: [-9.5, 1.02, 0],
    checkpoint: [-8.8, 1.02, 0.7],
  },
  {
    id: 'beacon-2',
    label: 'Relay II',
    cue: 'Touch to wake the amber span.',
    nextPhase: 'amber',
    position: [-9.5, 1.82, -9.5],
    checkpoint: [-10.2, 1.82, -8.7],
  },
  {
    id: 'beacon-3',
    label: 'Relay III',
    cue: 'Touch to wake the cobalt span.',
    nextPhase: 'cobalt',
    position: [-19, 2.62, -9.5],
    checkpoint: [-18.2, 2.62, -10.1],
  },
  {
    id: 'beacon-4',
    label: 'Relay IV',
    cue: 'Touch to wake the amber exit.',
    nextPhase: 'amber',
    position: [-19, 3.42, -18.5],
    checkpoint: [-19.7, 3.42, -17.8],
  },
];

export const FINISH_GATE: FinishGateDefinition = {
  position: [-28.5, 4.2, -18.5],
  triggerSize: [1.6, 2.6, 1.6],
};

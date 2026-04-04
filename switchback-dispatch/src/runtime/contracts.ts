import * as THREE from 'three';

import { GRID_STEP, START_SPHERE_POSITION, TRACK_Y } from './constants';

export type MedalTier = 'gold' | 'silver' | 'bronze' | 'none';
export type ContractId = 'first-light' | 'ridge-relay' | 'last-run';

export type RouteBeacon = {
  id: string;
  label: string;
  hint: string;
  position: THREE.Vector3;
};

export type ContractDefinition = {
  id: ContractId;
  name: string;
  deliveries: RouteBeacon[];
  timeLimitSeconds: number;
  bronzeSeconds: number;
  silverSeconds: number;
  goldSeconds: number;
  summary: string;
};

export type ContractBestTimes = Partial<Record<ContractId, number>>;

function beacon(id: string, label: string, hint: string, gridX: number, gridZ: number) {
  return {
    id,
    label,
    hint,
    position: new THREE.Vector3(gridX * GRID_STEP, TRACK_Y + 0.35, gridZ * GRID_STEP),
  } satisfies RouteBeacon;
}

export const CONTRACT_START_POSITION = START_SPHERE_POSITION.clone();
export const CONTRACT_START_YAW = 0;
export const RESPAWN_TIME_PENALTY_SECONDS = 3.5;
export const BEACON_TRIGGER_RADIUS = GRID_STEP * 0.28;

const LOWER_PASS = beacon('lower-pass', 'Lower Pass', 'Stay center, then brake hard.', 0, -2);
const RIDGE_CUT = beacon('ridge-cut', 'Ridge Cut', 'Late apex across the upper straight.', -2, -3);
const PINE_BEND = beacon('pine-bend', 'Pine Bend', 'Brake early, straighten fast.', -3, -1);
const SERVICE_YARD = beacon('service-yard', 'Service Yard', 'Short left. Keep the truck loaded.', -2, 1);
const UPPER_CABIN = beacon('upper-cabin', 'Upper Cabin', 'Climb clean and commit to the exit.', -1, 2);
const FINISH_HALL = beacon('finish-hall', 'Dispatch Hall', 'Final drop. Do not touch the rail.', 0, 1);

export const CONTRACTS: ContractDefinition[] = [
  {
    id: 'first-light',
    name: 'First Light',
    deliveries: [LOWER_PASS, RIDGE_CUT, PINE_BEND, UPPER_CABIN],
    timeLimitSeconds: 92,
    bronzeSeconds: 84,
    silverSeconds: 72,
    goldSeconds: 64,
    summary: 'Open the shift with four clean drops and no wasted corners.',
  },
  {
    id: 'ridge-relay',
    name: 'Ridge Relay',
    deliveries: [LOWER_PASS, RIDGE_CUT, PINE_BEND, SERVICE_YARD, UPPER_CABIN],
    timeLimitSeconds: 108,
    bronzeSeconds: 98,
    silverSeconds: 84,
    goldSeconds: 74,
    summary: 'Carry the route farther around the loop before the clock starts biting.',
  },
  {
    id: 'last-run',
    name: 'Last Run',
    deliveries: [LOWER_PASS, RIDGE_CUT, PINE_BEND, SERVICE_YARD, UPPER_CABIN, FINISH_HALL],
    timeLimitSeconds: 124,
    bronzeSeconds: 112,
    silverSeconds: 98,
    goldSeconds: 88,
    summary: 'Finish the full mountain circuit with one final downhill drop back at dispatch.',
  },
];

export const CONTRACT_BY_ID = Object.fromEntries(
  CONTRACTS.map((contract) => [contract.id, contract]),
) as Record<ContractId, ContractDefinition>;

export function getMedalTier(contract: ContractDefinition, elapsedSeconds: number): MedalTier {
  if (elapsedSeconds <= contract.goldSeconds) {
    return 'gold';
  }
  if (elapsedSeconds <= contract.silverSeconds) {
    return 'silver';
  }
  if (elapsedSeconds <= contract.bronzeSeconds) {
    return 'bronze';
  }
  return 'none';
}

export function formatClock(totalSeconds: number) {
  const clamped = Math.max(totalSeconds, 0);
  const minutes = Math.floor(clamped / 60);
  const seconds = clamped - minutes * 60;
  return `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`;
}

export function formatDeltaSeconds(totalSeconds: number) {
  const abs = Math.abs(totalSeconds);
  const sign = totalSeconds < 0 ? '-' : '+';
  return `${sign}${abs.toFixed(2)}`;
}

export function getBestTimeStorageKey(contractId: ContractId) {
  return `switchback-dispatch.best.${contractId}`;
}

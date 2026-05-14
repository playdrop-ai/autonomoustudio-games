import * as THREE from 'three';

import { VEHICLE_MODEL_OFFSET_Y } from '../constants';

export type MotionSnapshot = {
  timestamp: number;
  spherePosition: THREE.Vector3;
  sphereVelocity: THREE.Vector3;
  quaternion: THREE.Quaternion;
  speed: number;
  steer: number;
  throttle: number;
  vehicleIndex: number;
  resetSeq: number;
};

export type LocalMotionState = Omit<MotionSnapshot, 'timestamp' | 'resetSeq'>;

const MOTION_PACKET_LENGTH = 16;
const IMPACT_ASSIST_PACKET_LENGTH = 18;

export type ImpactAssistPacket = {
  tsCollisionMs: number;
  targetUserId: number;
  sourceResetSeq: number;
  targetResetSeq: number;
  hitterPosition: THREE.Vector3;
  targetPosition: THREE.Vector3;
  contactNormal: THREE.Vector3;
  deltaV: THREE.Vector3;
  approachSpeed: number;
  contactImpulse: number;
};

function parseFloat64Payload(payload: unknown) {
  if (payload instanceof Float64Array) {
    return payload;
  }
  if (ArrayBuffer.isView(payload)) {
    return new Float64Array(payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength));
  }
  if (payload instanceof ArrayBuffer) {
    return new Float64Array(payload);
  }
  return null;
}

export function encodeMotionPacket(state: MotionSnapshot) {
  return new Float64Array([
    state.timestamp,
    state.spherePosition.x,
    state.spherePosition.y,
    state.spherePosition.z,
    state.quaternion.x,
    state.quaternion.y,
    state.quaternion.z,
    state.quaternion.w,
    state.sphereVelocity.x,
    state.sphereVelocity.y,
    state.sphereVelocity.z,
    state.speed,
    state.steer,
    state.throttle,
    state.vehicleIndex,
    state.resetSeq,
  ]);
}

export function decodeMotionPacket(payload: unknown, fallbackTimestamp: number) {
  const view = parseFloat64Payload(payload);
  if (!view || view.length < MOTION_PACKET_LENGTH) {
    return null;
  }

  return {
    timestamp: Number.isFinite(view[0]) ? view[0] : fallbackTimestamp,
    spherePosition: new THREE.Vector3(view[1], view[2], view[3]),
    quaternion: new THREE.Quaternion(view[4], view[5], view[6], view[7]).normalize(),
    sphereVelocity: new THREE.Vector3(view[8], view[9], view[10]),
    speed: Number.isFinite(view[11]) ? view[11] : 0,
    steer: Number.isFinite(view[12]) ? view[12] : 0,
    throttle: Number.isFinite(view[13]) ? view[13] : 0,
    vehicleIndex: Number.isFinite(view[14]) ? Math.round(view[14]) : 0,
    resetSeq: Number.isFinite(view[15]) ? Math.round(view[15]) : 0,
  } satisfies MotionSnapshot;
}

export function spherePositionToRenderPosition(spherePosition: THREE.Vector3, target = new THREE.Vector3()) {
  return target.copy(spherePosition).setY(spherePosition.y - VEHICLE_MODEL_OFFSET_Y);
}

export function encodeImpactAssistPacket(packet: ImpactAssistPacket) {
  return new Float64Array([
    packet.tsCollisionMs,
    packet.targetUserId,
    packet.sourceResetSeq,
    packet.targetResetSeq,
    packet.hitterPosition.x,
    packet.hitterPosition.y,
    packet.hitterPosition.z,
    packet.targetPosition.x,
    packet.targetPosition.y,
    packet.targetPosition.z,
    packet.contactNormal.x,
    packet.contactNormal.y,
    packet.contactNormal.z,
    packet.deltaV.x,
    packet.deltaV.y,
    packet.deltaV.z,
    packet.approachSpeed,
    packet.contactImpulse,
  ]);
}

export function decodeImpactAssistPacket(payload: unknown, fallbackTimestamp: number) {
  const view = parseFloat64Payload(payload);
  if (!view || view.length < IMPACT_ASSIST_PACKET_LENGTH) {
    return null;
  }

  return {
    tsCollisionMs: Number.isFinite(view[0]) ? view[0] : fallbackTimestamp,
    targetUserId: Number.isFinite(view[1]) ? Math.round(view[1]) : 0,
    sourceResetSeq: Number.isFinite(view[2]) ? Math.round(view[2]) : 0,
    targetResetSeq: Number.isFinite(view[3]) ? Math.round(view[3]) : 0,
    hitterPosition: new THREE.Vector3(view[4], view[5], view[6]),
    targetPosition: new THREE.Vector3(view[7], view[8], view[9]),
    contactNormal: new THREE.Vector3(view[10], view[11], view[12]),
    deltaV: new THREE.Vector3(view[13], view[14], view[15]),
    approachSpeed: Number.isFinite(view[16]) ? view[16] : 0,
    contactImpulse: Number.isFinite(view[17]) ? view[17] : 0,
  } satisfies ImpactAssistPacket;
}

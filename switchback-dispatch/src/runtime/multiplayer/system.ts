/// <reference types="playdrop-sdk-types" />

import type { RigidBody as RapierRigidBody } from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import type { PlaydropSDK, Room, RoomBinaryEvent, RoomMemberSnapshot } from 'playdrop-sdk-types';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';

import {
  PLAYER_VEHICLE_IDS,
  vehicleIdFromIndex,
  vehicleIdToIndex,
  type VehicleId,
} from '../shared';
import { RemoteVehicleView } from '../vehicle';
import {
  COLLISION_REPLAY_DELAY_MS,
  IMPACT_ASSIST_DELTA_V_SCALE,
  IMPACT_ASSIST_EVENT_CODE,
  IMPACT_ASSIST_MAX_DELTA_V,
  IMPACT_ASSIST_MAX_POSITION_ERROR_METERS,
  IMPACT_ASSIST_MAX_TARGET_SPEED,
  IMPACT_ASSIST_MIN_APPLIED_DELTA_V,
  IMPACT_ASSIST_MIN_APPROACH_SPEED,
  IMPACT_ASSIST_MIN_CONTACT_IMPULSE,
  IMPACT_ASSIST_MIN_LOCAL_SPEED,
  IMPACT_ASSIST_MIN_NORMAL_ALIGNMENT,
  IMPACT_ASSIST_PACKET_MAX_AGE_MS,
  IMPACT_ASSIST_PAIR_COOLDOWN_MS,
  MAX_EXTRAPOLATION_MS,
  MOTION_EVENT_CODE,
  NETWORK_SEND_INTERVAL_MS,
  REMOTE_COLLISION_GRACE_MS,
  REMOTE_RENDER_CONTACT_IMPULSE_SCALE,
  REMOTE_RENDER_CONTACT_IMPULSE_THRESHOLD,
  REMOTE_RENDER_PREDICTION_DECAY_MS,
  REMOTE_RENDER_PREDICTION_MAX_OFFSET,
  REMOTE_STALE_HOLD_MS,
} from './config';
import {
  decodeImpactAssistPacket,
  decodeMotionPacket,
  encodeImpactAssistPacket,
  encodeMotionPacket,
  spherePositionToRenderPosition,
  type ImpactAssistPacket,
  type LocalMotionState,
  type MotionSnapshot,
} from './packets';
import { pushMotionSnapshot, resolveMotionSnapshot } from './snapshots';

export type RemoteCollisionStateStatus = 'active' | 'grace' | 'hold' | 'missing';

export type RemoteCollisionState = {
  username: string;
  vehicleIndex: number;
  spherePosition: THREE.Vector3 | null;
  sphereVelocity: THREE.Vector3 | null;
  resetSeq: number;
  sampleAgeMs: number | null;
  status: RemoteCollisionStateStatus;
};

export type RemoteCollisionPresentation = {
  username: string;
  vehicleIndex: number;
  spherePosition: THREE.Vector3 | null;
  sphereVelocity: THREE.Vector3 | null;
  sampleAgeMs: number | null;
  status: RemoteCollisionStateStatus;
  colliderEnabled: boolean;
  present: boolean;
  touching: boolean;
  contactImpulse: number;
  contactNormal: THREE.Vector3 | null;
  contactPoint: THREE.Vector3 | null;
};

type ResolvedRemoteMotion = {
  snapshot: MotionSnapshot | null;
  sampleAgeMs: number | null;
  status: RemoteCollisionStateStatus;
};

export type ImpactAssistValidationResult =
  | 'invalid-payload'
  | 'stale'
  | 'target-reset-mismatch'
  | 'unknown-sender'
  | 'source-reset-mismatch'
  | 'local-position-mismatch'
  | 'sender-state-missing'
  | 'sender-position-mismatch'
  | 'invalid-normal'
  | 'normal-mismatch'
  | 'invalid-delta-v'
  | 'sender-cooldown'
  | 'no-missing-shove';

type QueuedImpactAssist = {
  senderUsername: string;
  packet: ImpactAssistPacket;
};

type ImpactAssistSendState = {
  sentThisTouch: boolean;
  cooldownUntilMs: number;
};

type ImpactAssistDebugRecord = {
  senderUsername: string;
  targetUserId: number;
  sourceResetSeq: number;
  targetResetSeq: number;
  hitterPosition: [number, number, number];
  targetPosition: [number, number, number];
  contactNormal: [number, number, number];
  deltaV: [number, number, number];
  approachSpeed: number;
  contactImpulse: number;
  ageMs?: number;
  appliedAlong?: number;
  reason?: ImpactAssistValidationResult;
};

type ValidatedImpactAssist = {
  senderUsername: string;
  packet: ImpactAssistPacket;
  ageMs: number;
  appliedAlong: number;
  assistDir: THREE.Vector3;
};

type RemoteParticipant = {
  username: string;
  userId: number | null;
  snapshots: MotionSnapshot[];
  view: RemoteVehicleView;
  label: HTMLDivElement;
  lastRenderedResetSeq: number;
  lastReceivedResetSeq: number;
  lastRenderStatus: RemoteCollisionStateStatus;
  collisionGraceUntilMs: number;
  collisionPresentation: RemoteCollisionPresentation | null;
  predictedRenderOffset: THREE.Vector3;
  predictedRenderVelocity: THREE.Vector3;
  displayedPosition: THREE.Vector3;
  baseRenderPosition: THREE.Vector3;
};

function createLabel(username: string) {
  const label = document.createElement('div');
  label.className = 'player-name-tag';
  label.textContent = username;
  label.hidden = true;
  return label;
}

function vectorToTuple(vector: THREE.Vector3) {
  return [
    Number(vector.x.toFixed(3)),
    Number(vector.y.toFixed(3)),
    Number(vector.z.toFixed(3)),
  ] as [number, number, number];
}

function clampVectorLength(vector: THREE.Vector3, maxLength: number) {
  const lengthSq = vector.lengthSq();
  if (lengthSq <= maxLength * maxLength || lengthSq === 0) {
    return vector;
  }
  return vector.multiplyScalar(maxLength / Math.sqrt(lengthSq));
}

function createImpactAssistDebugRecord(
  senderUsername: string,
  packet: ImpactAssistPacket,
  options: { ageMs?: number; appliedAlong?: number; reason?: ImpactAssistValidationResult } = {},
): ImpactAssistDebugRecord {
  return {
    senderUsername,
    targetUserId: packet.targetUserId,
    sourceResetSeq: packet.sourceResetSeq,
    targetResetSeq: packet.targetResetSeq,
    hitterPosition: vectorToTuple(packet.hitterPosition),
    targetPosition: vectorToTuple(packet.targetPosition),
    contactNormal: vectorToTuple(packet.contactNormal),
    deltaV: vectorToTuple(packet.deltaV),
    approachSpeed: Number(packet.approachSpeed.toFixed(3)),
    contactImpulse: Number(packet.contactImpulse.toFixed(3)),
    ageMs: typeof options.ageMs === 'number' ? Number(options.ageMs.toFixed(1)) : undefined,
    appliedAlong:
      typeof options.appliedAlong === 'number' ? Number(options.appliedAlong.toFixed(3)) : undefined,
    reason: options.reason,
  };
}

function createHeldSnapshot(snapshot: MotionSnapshot) {
  return {
    ...snapshot,
    spherePosition: snapshot.spherePosition.clone(),
    sphereVelocity: new THREE.Vector3(),
    quaternion: snapshot.quaternion.clone(),
    speed: 0,
    steer: 0,
    throttle: 0,
  } satisfies MotionSnapshot;
}

function participantDebugState(participant: RemoteParticipant) {
  const presentation = participant.collisionPresentation;
  return {
    username: participant.username,
    vehicleIndex: vehicleIdToIndex(participant.view.currentVehicleId),
    status: presentation?.status ?? participant.lastRenderStatus,
    position: vectorToTuple(participant.baseRenderPosition),
    displayedPosition: vectorToTuple(participant.displayedPosition),
    predictedOffsetMeters: Number(participant.predictedRenderOffset.length().toFixed(3)),
    sampleAgeMs:
      typeof presentation?.sampleAgeMs === 'number' ? Number(presentation.sampleAgeMs.toFixed(1)) : null,
    proxyPosition: presentation?.spherePosition ? vectorToTuple(presentation.spherePosition) : null,
    proxyVelocity: presentation?.sphereVelocity ? vectorToTuple(presentation.sphereVelocity) : null,
    touching: presentation?.touching ?? false,
    contactImpulse: Number((presentation?.contactImpulse ?? 0).toFixed(3)),
    contactNormal: presentation?.contactNormal ? vectorToTuple(presentation.contactNormal) : null,
    visible: participant.view.visible,
  };
}

export class MultiplayerController {
  readonly group = new THREE.Group();

  private readonly sdk: PlaydropSDK;
  private readonly vehicles: Record<VehicleId, GLTF>;
  private readonly labelLayer: HTMLElement;
  private readonly localUserId: number;
  private readonly localUsername: string;
  private readonly remoteParticipants = new Map<string, RemoteParticipant>();
  private readonly cleanup: Array<() => void> = [];
  private readonly projectedPosition = new THREE.Vector3();
  private readonly labelPosition = new THREE.Vector3();
  private readonly predictedOffsetTarget = new THREE.Vector3();
  private readonly predictedOffsetDelta = new THREE.Vector3();
  private readonly zeroVector = new THREE.Vector3();
  private readonly impactLocalPosition = new THREE.Vector3();
  private readonly impactLocalVelocity = new THREE.Vector3();
  private readonly impactTargetVelocity = new THREE.Vector3();
  private readonly impactRelativeVelocity = new THREE.Vector3();
  private readonly impactSourceToTarget = new THREE.Vector3();
  private readonly impactNormal = new THREE.Vector3();
  private readonly impactDeltaV = new THREE.Vector3();

  private room: Room | null = null;
  private joinPromise: Promise<void> | null = null;
  private lastSendAtMs = 0;
  private localResetSeq = 0;
  private lastRenderAtMs = performance.now();
  private lastCollisionReplayTargetTimeMs = 0;
  private localMotionPausedUntilMs = 0;
  private joinGeneration = 0;
  private disposed = false;
  private readonly impactSendState = new Map<string, ImpactAssistSendState>();
  private readonly pendingImpactAssists: QueuedImpactAssist[] = [];
  private readonly acceptedImpactAssistAtMsByUser = new Map<string, number>();
  private impactAssistSentCount = 0;
  private impactAssistAcceptedCount = 0;
  private impactAssistRejectedCount = 0;
  private lastImpactAssistSent: ImpactAssistDebugRecord | null = null;
  private lastImpactAssistAccepted: ImpactAssistDebugRecord | null = null;
  private lastImpactAssistRejected: ImpactAssistDebugRecord | null = null;
  private lastImpactAssistRejectedReason: ImpactAssistValidationResult | null = null;

  constructor({
    sdk,
    vehicles,
    labelLayer,
  }: {
    sdk: PlaydropSDK;
    vehicles: Record<VehicleId, GLTF>;
    labelLayer: HTMLElement;
  }) {
    if (!sdk.me.username || !sdk.me.userId) {
      throw new Error('[starter-kit-racing] multiplayer requires a logged-in user');
    }
    this.sdk = sdk;
    this.vehicles = vehicles;
    this.labelLayer = labelLayer;
    this.localUserId = sdk.me.userId;
    this.localUsername = sdk.me.username;
    this.group.name = 'multiplayer-remotes';
  }

  get debugState() {
    return Array.from(this.remoteParticipants.values())
      .map((participant) => participantDebugState(participant))
      .sort((left, right) => left.username.localeCompare(right.username));
  }

  get collisionReplayTargetTimeMs() {
    return this.lastCollisionReplayTargetTimeMs;
  }

  get impactAssistDebugState() {
    return {
      sentCount: this.impactAssistSentCount,
      acceptedCount: this.impactAssistAcceptedCount,
      rejectedCount: this.impactAssistRejectedCount,
      lastSent: this.lastImpactAssistSent,
      lastAccepted: this.lastImpactAssistAccepted,
      lastRejected: this.lastImpactAssistRejected,
      lastRejectedReason: this.lastImpactAssistRejectedReason,
    };
  }

  pauseLocalMotion(ms: number) {
    const durationMs = Number.isFinite(ms) ? Math.max(0, ms) : 0;
    this.localMotionPausedUntilMs = Math.max(
      this.localMotionPausedUntilMs,
      this.sdk.connection.serverNow() + durationMs,
    );
  }

  applyPendingImpactAssists(body: RapierRigidBody) {
    if (this.pendingImpactAssists.length === 0) {
      return;
    }

    const queued = this.pendingImpactAssists.splice(0, this.pendingImpactAssists.length);
    for (const pending of queued) {
      const validated = this.validateImpactAssist(pending, body);
      if (!validated) {
        continue;
      }

      const currentVelocity = body.linvel();
      this.impactDeltaV
        .set(currentVelocity.x, currentVelocity.y, currentVelocity.z)
        .addScaledVector(validated.assistDir, validated.appliedAlong);
      body.setLinvel(
        {
          x: this.impactDeltaV.x,
          y: this.impactDeltaV.y,
          z: this.impactDeltaV.z,
        },
        true,
      );

      const nowMs = this.sdk.connection.serverNow();
      this.acceptedImpactAssistAtMsByUser.set(validated.senderUsername, nowMs);
      this.impactAssistAcceptedCount += 1;
      this.lastImpactAssistAccepted = createImpactAssistDebugRecord(validated.senderUsername, validated.packet, {
        ageMs: validated.ageMs,
        appliedAlong: validated.appliedAlong,
      });
    }
  }

  sampleRemoteCollisionStates() {
    const targetTime = this.sdk.connection.serverNow() - COLLISION_REPLAY_DELAY_MS;
    this.lastCollisionReplayTargetTimeMs = targetTime;
    return Array.from(this.remoteParticipants.values())
      .map((participant) => this.resolveRemoteCollisionState(participant, targetTime))
      .sort((left, right) => left.username.localeCompare(right.username));
  }

  syncCollisionPresentation(presentations: RemoteCollisionPresentation[]) {
    const nextByUser = new Map(presentations.map((presentation) => [presentation.username, presentation]));
    for (const participant of this.remoteParticipants.values()) {
      participant.collisionPresentation = nextByUser.get(participant.username) ?? null;
      if (
        !participant.collisionPresentation ||
        participant.collisionPresentation.status === 'grace' ||
        participant.collisionPresentation.status === 'missing'
      ) {
        participant.predictedRenderOffset.set(0, 0, 0);
        participant.predictedRenderVelocity.set(0, 0, 0);
      }
    }
  }

  async ensureJoined(getLocalState: () => LocalMotionState) {
    if (this.disposed) {
      throw new Error('[starter-kit-racing] multiplayer controller disposed');
    }
    if (this.room) {
      return;
    }
    if (!this.joinPromise) {
      const joinGeneration = ++this.joinGeneration;
      const joinPromise = this.join(joinGeneration, getLocalState).finally(() => {
        if (this.joinPromise === joinPromise) {
          this.joinPromise = null;
        }
      });
      this.joinPromise = joinPromise;
    }
    return this.joinPromise;
  }

  noteLocalReset(getLocalState: () => LocalMotionState) {
    this.localResetSeq += 1;
    this.pendingImpactAssists.length = 0;
    for (const state of this.impactSendState.values()) {
      state.sentThisTouch = false;
      state.cooldownUntilMs = 0;
    }
    this.sendLocalMotion(getLocalState, true);
  }

  sendLocalMotion(getLocalState: () => LocalMotionState, force = false) {
    if (!this.room) {
      return;
    }

    const nowMs = this.sdk.connection.serverNow();
    if (nowMs < this.localMotionPausedUntilMs) {
      return;
    }
    if (!force && nowMs - this.lastSendAtMs < NETWORK_SEND_INTERVAL_MS) {
      return;
    }
    this.lastSendAtMs = nowMs;

    const state = getLocalState();
    const payload = encodeMotionPacket({
      timestamp: nowMs,
      spherePosition: state.spherePosition,
      sphereVelocity: state.sphereVelocity,
      quaternion: state.quaternion,
      speed: state.speed,
      steer: state.steer,
      throttle: state.throttle,
      vehicleIndex: state.vehicleIndex,
      resetSeq: this.localResetSeq,
    });

    this.room.sendBinaryEvent(MOTION_EVENT_CODE, payload).catch((error: unknown) => {
      console.warn('[starter-kit-racing] failed to send multiplayer motion', error);
    });
  }

  maybeSendImpactAssists(presentations: RemoteCollisionPresentation[], body: RapierRigidBody) {
    if (!this.room) {
      return;
    }

    const translation = body.translation();
    const linvel = body.linvel();
    this.impactLocalPosition.set(translation.x, translation.y, translation.z);
    this.impactLocalVelocity.set(linvel.x, linvel.y, linvel.z);
    const localSpeed = this.impactLocalVelocity.length();
    const nowMs = this.sdk.connection.serverNow();

    for (const presentation of presentations) {
      const sendState = this.ensureImpactSendState(presentation.username);
      const touching =
        presentation.present &&
        presentation.colliderEnabled &&
        presentation.status === 'active' &&
        presentation.touching;
      if (!touching) {
        sendState.sentThisTouch = false;
        continue;
      }

      if (sendState.sentThisTouch || nowMs < sendState.cooldownUntilMs) {
        continue;
      }

      const participant = this.remoteParticipants.get(presentation.username);
      if (
        !participant ||
        !participant.userId ||
        participant.lastReceivedResetSeq < 0 ||
        !presentation.spherePosition ||
        !presentation.sphereVelocity ||
        !presentation.contactNormal
      ) {
        continue;
      }
      if (localSpeed < IMPACT_ASSIST_MIN_LOCAL_SPEED) {
        continue;
      }

      this.impactTargetVelocity.copy(presentation.sphereVelocity);
      if (this.impactTargetVelocity.length() > IMPACT_ASSIST_MAX_TARGET_SPEED) {
        continue;
      }
      if (presentation.contactImpulse < IMPACT_ASSIST_MIN_CONTACT_IMPULSE) {
        continue;
      }

      this.impactSourceToTarget.copy(presentation.spherePosition).sub(this.impactLocalPosition);
      if (this.impactSourceToTarget.lengthSq() < 1e-4) {
        continue;
      }

      this.impactNormal.copy(presentation.contactNormal).normalize();
      if (this.impactNormal.lengthSq() === 0) {
        continue;
      }
      if (this.impactNormal.dot(this.impactSourceToTarget) < 0) {
        this.impactNormal.multiplyScalar(-1);
      }

      this.impactRelativeVelocity.copy(this.impactLocalVelocity).sub(this.impactTargetVelocity);
      const approachSpeed = Math.max(0, this.impactRelativeVelocity.dot(this.impactNormal));
      if (approachSpeed < IMPACT_ASSIST_MIN_APPROACH_SPEED) {
        continue;
      }

      this.impactDeltaV
        .copy(this.impactNormal)
        .multiplyScalar(Math.min(IMPACT_ASSIST_MAX_DELTA_V, approachSpeed * IMPACT_ASSIST_DELTA_V_SCALE));
      if (this.impactDeltaV.lengthSq() === 0) {
        continue;
      }

      const packet: ImpactAssistPacket = {
        tsCollisionMs: nowMs,
        targetUserId: participant.userId,
        sourceResetSeq: this.localResetSeq,
        targetResetSeq: participant.lastReceivedResetSeq,
        hitterPosition: this.impactLocalPosition.clone(),
        targetPosition: presentation.spherePosition.clone(),
        contactNormal: this.impactNormal.clone(),
        deltaV: this.impactDeltaV.clone(),
        approachSpeed,
        contactImpulse: presentation.contactImpulse,
      };

      sendState.sentThisTouch = true;
      sendState.cooldownUntilMs = nowMs + IMPACT_ASSIST_PAIR_COOLDOWN_MS;
      this.impactAssistSentCount += 1;
      this.lastImpactAssistSent = createImpactAssistDebugRecord(presentation.username, packet);

      this.room.sendBinaryEvent(IMPACT_ASSIST_EVENT_CODE, encodeImpactAssistPacket(packet)).catch((error: unknown) => {
        console.warn('[starter-kit-racing] failed to send impact assist', error);
      });
    }
  }

  render(camera: THREE.Camera, enabled: boolean, width: number, height: number) {
    const nowMs = performance.now();
    const dt = Math.max(1 / 240, Math.min(0.1, (nowMs - this.lastRenderAtMs) / 1000));
    this.lastRenderAtMs = nowMs;

    if (!enabled || !this.room) {
      this.hideAllParticipants();
      return;
    }

    const targetTime = this.sdk.connection.renderTime();
    for (const participant of this.remoteParticipants.values()) {
      const resolved = this.resolveParticipantMotion(participant, targetTime);
      participant.lastRenderStatus = resolved.status;
      if (!resolved.snapshot) {
        participant.view.setVisible(false);
        participant.label.hidden = true;
        participant.predictedRenderOffset.set(0, 0, 0);
        participant.predictedRenderVelocity.set(0, 0, 0);
        continue;
      }

      const snapped = participant.lastRenderedResetSeq !== resolved.snapshot.resetSeq;
      participant.lastRenderedResetSeq = resolved.snapshot.resetSeq;
      participant.view.setVehicleId(vehicleIdFromIndex(resolved.snapshot.vehicleIndex));
      participant.baseRenderPosition.copy(spherePositionToRenderPosition(resolved.snapshot.spherePosition));
      this.updatePredictedRenderOffset(participant, dt, snapped);
      participant.displayedPosition
        .copy(participant.baseRenderPosition)
        .add(participant.predictedRenderOffset);

      participant.view.applyMotion(
        {
          position: participant.displayedPosition,
          quaternion: resolved.snapshot.quaternion,
          speed: resolved.snapshot.speed,
          steer: resolved.snapshot.steer,
          throttle: resolved.snapshot.throttle,
        },
        dt,
        snapped,
      );
      this.updateLabel(participant, camera, width, height);
    }
  }

  async dispose() {
    this.disposed = true;
    this.joinGeneration += 1;
    this.joinPromise = null;
    this.localMotionPausedUntilMs = 0;
    this.pendingImpactAssists.length = 0;
    this.impactSendState.clear();
    this.acceptedImpactAssistAtMsByUser.clear();

    for (const off of this.cleanup.splice(0, this.cleanup.length)) {
      try {
        off();
      } catch (error) {
        console.warn('[starter-kit-racing] failed to remove multiplayer listener', error);
      }
    }
    this.hideAllLabels();
    for (const [username, participant] of this.remoteParticipants) {
      participant.label.remove();
      this.group.remove(participant.view.container);
      this.remoteParticipants.delete(username);
    }

    if (!this.room) {
      return;
    }

    const room = this.room;
    this.room = null;
    await room.leave().catch((error: unknown) => {
      console.warn('[starter-kit-racing] failed to leave multiplayer room', error);
    });
  }

  private async join(joinGeneration: number, getLocalState: () => LocalMotionState) {
    const room = await this.sdk.me.joinRoom();
    if (this.disposed || joinGeneration !== this.joinGeneration || this.room) {
      await room.leave().catch((error: unknown) => {
        console.warn('[starter-kit-racing] failed to discard late multiplayer room', error);
      });
      return;
    }

    this.room = room;
    this.reconcileUsers(room.users ?? []);
    this.cleanup.push(
      room.onUsersChange((users) => {
        this.reconcileUsers(users);
      }),
    );
    this.cleanup.push(
      room.onBinaryEvent(MOTION_EVENT_CODE, (event) => {
        this.handleMotionEvent(event);
      }),
    );
    this.cleanup.push(
      room.onBinaryEvent(IMPACT_ASSIST_EVENT_CODE, (event) => {
        this.handleImpactAssistEvent(event);
      }),
    );
    this.sendLocalMotion(getLocalState, true);
  }

  private handleMotionEvent(event: RoomBinaryEvent) {
    if (!event.username || event.username === this.localUsername) {
      return;
    }

    const snapshot = decodeMotionPacket(event.payload, event.ts_event ?? this.sdk.connection.serverNow());
    if (!snapshot) {
      return;
    }
    if (snapshot.vehicleIndex < 0 || snapshot.vehicleIndex >= PLAYER_VEHICLE_IDS.length) {
      console.warn(
        '[starter-kit-racing] ignoring remote packet with invalid vehicle index',
        snapshot.vehicleIndex,
      );
      return;
    }

    const participant = this.ensureParticipant(event.username);
    if (
      participant.snapshots.length === 0 ||
      participant.lastReceivedResetSeq === -1 ||
      participant.lastReceivedResetSeq !== snapshot.resetSeq
    ) {
      participant.collisionGraceUntilMs = snapshot.timestamp + REMOTE_COLLISION_GRACE_MS;
      participant.predictedRenderOffset.set(0, 0, 0);
      participant.predictedRenderVelocity.set(0, 0, 0);
    }
    participant.lastReceivedResetSeq = snapshot.resetSeq;
    pushMotionSnapshot(participant.snapshots, snapshot);
  }

  private handleImpactAssistEvent(event: RoomBinaryEvent) {
    if (!event.username || event.username === this.localUsername) {
      return;
    }

    const packet = decodeImpactAssistPacket(event.payload, event.ts_event ?? this.sdk.connection.serverNow());
    if (!packet) {
      this.recordRejectedImpactAssist(
        event.username,
        'invalid-payload',
        {
          tsCollisionMs: event.ts_event ?? this.sdk.connection.serverNow(),
          targetUserId: this.localUserId,
          sourceResetSeq: -1,
          targetResetSeq: this.localResetSeq,
          hitterPosition: new THREE.Vector3(),
          targetPosition: new THREE.Vector3(),
          contactNormal: new THREE.Vector3(),
          deltaV: new THREE.Vector3(),
          approachSpeed: 0,
          contactImpulse: 0,
        },
      );
      return;
    }
    if (packet.targetUserId !== this.localUserId) {
      return;
    }

    this.pendingImpactAssists.push({
      senderUsername: event.username,
      packet,
    });
  }

  private reconcileUsers(users: RoomMemberSnapshot[]) {
    const activeUsers = new Set<string>();
    for (const user of users) {
      if (!user?.username || user.username === this.localUsername) {
        continue;
      }
      activeUsers.add(user.username);
      this.ensureParticipant(user.username, user.userId);
    }

    for (const [username, participant] of this.remoteParticipants) {
      if (activeUsers.has(username)) {
        continue;
      }
      participant.label.remove();
      this.group.remove(participant.view.container);
      this.remoteParticipants.delete(username);
      this.impactSendState.delete(username);
      this.acceptedImpactAssistAtMsByUser.delete(username);
    }
  }

  private ensureParticipant(username: string, userId: number | null = null) {
    const existing = this.remoteParticipants.get(username);
    if (existing) {
      if (typeof userId === 'number' && Number.isFinite(userId) && userId > 0) {
        existing.userId = userId;
      }
      return existing;
    }

    const view = new RemoteVehicleView(this.vehicles);
    const label = createLabel(username);
    this.group.add(view.container);
    this.labelLayer.append(label);

    const participant: RemoteParticipant = {
      username,
      userId,
      snapshots: [],
      view,
      label,
      lastRenderedResetSeq: -1,
      lastReceivedResetSeq: -1,
      lastRenderStatus: 'missing',
      collisionGraceUntilMs: 0,
      collisionPresentation: null,
      predictedRenderOffset: new THREE.Vector3(),
      predictedRenderVelocity: new THREE.Vector3(),
      displayedPosition: new THREE.Vector3(),
      baseRenderPosition: new THREE.Vector3(),
    };
    this.remoteParticipants.set(username, participant);
    return participant;
  }

  private ensureImpactSendState(username: string) {
    const existing = this.impactSendState.get(username);
    if (existing) {
      return existing;
    }

    const created: ImpactAssistSendState = {
      sentThisTouch: false,
      cooldownUntilMs: 0,
    };
    this.impactSendState.set(username, created);
    return created;
  }

  private validateImpactAssist(
    queued: QueuedImpactAssist,
    body: RapierRigidBody,
  ): ValidatedImpactAssist | null {
    const { senderUsername, packet } = queued;
    const nowMs = this.sdk.connection.serverNow();
    const ageMs = Math.max(0, nowMs - packet.tsCollisionMs);
    if (ageMs > IMPACT_ASSIST_PACKET_MAX_AGE_MS) {
      this.recordRejectedImpactAssist(senderUsername, 'stale', packet, ageMs);
      return null;
    }
    if (this.localResetSeq !== packet.targetResetSeq) {
      this.recordRejectedImpactAssist(senderUsername, 'target-reset-mismatch', packet, ageMs);
      return null;
    }

    const participant = this.remoteParticipants.get(senderUsername);
    if (!participant) {
      this.recordRejectedImpactAssist(senderUsername, 'unknown-sender', packet, ageMs);
      return null;
    }
    if (participant.lastReceivedResetSeq !== packet.sourceResetSeq) {
      this.recordRejectedImpactAssist(senderUsername, 'source-reset-mismatch', packet, ageMs);
      return null;
    }

    const translation = body.translation();
    this.impactLocalPosition.set(translation.x, translation.y, translation.z);
    if (
      this.impactLocalPosition.distanceToSquared(packet.targetPosition) >
      IMPACT_ASSIST_MAX_POSITION_ERROR_METERS * IMPACT_ASSIST_MAX_POSITION_ERROR_METERS
    ) {
      this.recordRejectedImpactAssist(senderUsername, 'local-position-mismatch', packet, ageMs);
      return null;
    }

    const senderState = this.resolveRemoteCollisionState(
      participant,
      this.sdk.connection.serverNow() - COLLISION_REPLAY_DELAY_MS,
    );
    if (!senderState.spherePosition) {
      this.recordRejectedImpactAssist(senderUsername, 'sender-state-missing', packet, ageMs);
      return null;
    }
    if (
      senderState.spherePosition.distanceToSquared(packet.hitterPosition) >
      IMPACT_ASSIST_MAX_POSITION_ERROR_METERS * IMPACT_ASSIST_MAX_POSITION_ERROR_METERS
    ) {
      this.recordRejectedImpactAssist(senderUsername, 'sender-position-mismatch', packet, ageMs);
      return null;
    }

    this.impactNormal.copy(packet.contactNormal);
    if (!Number.isFinite(this.impactNormal.lengthSq()) || this.impactNormal.lengthSq() < 1e-6) {
      this.recordRejectedImpactAssist(senderUsername, 'invalid-normal', packet, ageMs);
      return null;
    }
    this.impactNormal.normalize();
    this.impactSourceToTarget.copy(packet.targetPosition).sub(packet.hitterPosition);
    if (this.impactSourceToTarget.lengthSq() < 1e-6) {
      this.recordRejectedImpactAssist(senderUsername, 'invalid-normal', packet, ageMs);
      return null;
    }
    this.impactSourceToTarget.normalize();
    if (this.impactNormal.dot(this.impactSourceToTarget) < IMPACT_ASSIST_MIN_NORMAL_ALIGNMENT) {
      this.recordRejectedImpactAssist(senderUsername, 'normal-mismatch', packet, ageMs);
      return null;
    }

    const deltaVMagnitude = packet.deltaV.length();
    if (
      !Number.isFinite(deltaVMagnitude) ||
      deltaVMagnitude <= 0 ||
      deltaVMagnitude > IMPACT_ASSIST_MAX_DELTA_V
    ) {
      this.recordRejectedImpactAssist(senderUsername, 'invalid-delta-v', packet, ageMs);
      return null;
    }

    const lastAcceptedAtMs = this.acceptedImpactAssistAtMsByUser.get(senderUsername) ?? 0;
    if (nowMs - lastAcceptedAtMs < IMPACT_ASSIST_PAIR_COOLDOWN_MS) {
      this.recordRejectedImpactAssist(senderUsername, 'sender-cooldown', packet, ageMs);
      return null;
    }

    const linvel = body.linvel();
    this.impactLocalVelocity.set(linvel.x, linvel.y, linvel.z);
    this.impactDeltaV.copy(packet.deltaV).normalize();
    const currentAlong = Math.max(0, this.impactLocalVelocity.dot(this.impactDeltaV));
    const appliedAlong = Math.min(deltaVMagnitude, Math.max(0, deltaVMagnitude - currentAlong));
    if (appliedAlong <= IMPACT_ASSIST_MIN_APPLIED_DELTA_V) {
      this.recordRejectedImpactAssist(senderUsername, 'no-missing-shove', packet, ageMs);
      return null;
    }

    return {
      senderUsername,
      packet,
      ageMs,
      appliedAlong,
      assistDir: this.impactDeltaV.clone(),
    };
  }

  private recordRejectedImpactAssist(
    senderUsername: string,
    reason: ImpactAssistValidationResult,
    packet: ImpactAssistPacket,
    ageMs?: number,
  ) {
    this.impactAssistRejectedCount += 1;
    this.lastImpactAssistRejectedReason = reason;
    this.lastImpactAssistRejected = createImpactAssistDebugRecord(senderUsername, packet, {
      ageMs,
      reason,
    });
  }

  private updatePredictedRenderOffset(participant: RemoteParticipant, dt: number, snapped: boolean) {
    if (snapped) {
      participant.predictedRenderOffset.set(0, 0, 0);
      participant.predictedRenderVelocity.set(0, 0, 0);
      return;
    }

    const presentation = participant.collisionPresentation;
    if (
      !presentation ||
      !presentation.present ||
      presentation.status === 'missing' ||
      presentation.status === 'grace'
    ) {
      participant.predictedRenderOffset.set(0, 0, 0);
      participant.predictedRenderVelocity.set(0, 0, 0);
      return;
    }

    this.predictedOffsetTarget.set(0, 0, 0);
    if (
      presentation.status === 'active' &&
      presentation.colliderEnabled &&
      presentation.touching &&
      presentation.contactNormal &&
      presentation.contactImpulse >= REMOTE_RENDER_CONTACT_IMPULSE_THRESHOLD
    ) {
      this.predictedOffsetTarget
        .copy(presentation.contactNormal)
        .multiplyScalar(presentation.contactImpulse * REMOTE_RENDER_CONTACT_IMPULSE_SCALE);
      clampVectorLength(this.predictedOffsetTarget, REMOTE_RENDER_PREDICTION_MAX_OFFSET);
    }

    const springStrength = this.predictedOffsetTarget.lengthSq() > 0 ? 90 : 65;
    const damping = this.predictedOffsetTarget.lengthSq() > 0 ? 20 : 28;
    this.predictedOffsetDelta
      .copy(this.predictedOffsetTarget)
      .sub(participant.predictedRenderOffset);
    participant.predictedRenderVelocity.addScaledVector(this.predictedOffsetDelta, springStrength * dt);
    participant.predictedRenderVelocity.multiplyScalar(Math.exp(-damping * dt));
    participant.predictedRenderOffset.addScaledVector(participant.predictedRenderVelocity, dt);
    clampVectorLength(participant.predictedRenderOffset, REMOTE_RENDER_PREDICTION_MAX_OFFSET);

    if (
      this.predictedOffsetTarget.lengthSq() === 0 &&
      participant.predictedRenderOffset.lengthSq() < 0.0001 &&
      participant.predictedRenderVelocity.lengthSq() < 0.0001
    ) {
      participant.predictedRenderOffset.set(0, 0, 0);
      participant.predictedRenderVelocity.set(0, 0, 0);
      return;
    }

    if (this.predictedOffsetTarget.lengthSq() === 0) {
      const decayAlpha = 1 - Math.exp(-dt / (REMOTE_RENDER_PREDICTION_DECAY_MS / 1000));
      participant.predictedRenderOffset.lerp(this.zeroVector, decayAlpha);
    }
  }

  private updateLabel(participant: RemoteParticipant, camera: THREE.Camera, width: number, height: number) {
    participant.view.getLabelWorldPosition(this.labelPosition);
    this.projectedPosition.copy(this.labelPosition).project(camera);
    const visible =
      participant.view.visible &&
      this.projectedPosition.z >= -1 &&
      this.projectedPosition.z <= 1 &&
      Math.abs(this.projectedPosition.x) <= 1 &&
      Math.abs(this.projectedPosition.y) <= 1;

    if (!visible) {
      participant.label.hidden = true;
      return;
    }

    const x = (this.projectedPosition.x * 0.5 + 0.5) * width;
    const y = (-this.projectedPosition.y * 0.5 + 0.5) * height;
    participant.label.hidden = false;
    participant.label.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -100%)`;
  }

  private hideAllLabels() {
    for (const participant of this.remoteParticipants.values()) {
      participant.label.hidden = true;
    }
  }

  private hideAllParticipants() {
    for (const participant of this.remoteParticipants.values()) {
      participant.view.setVisible(false);
      participant.predictedRenderOffset.set(0, 0, 0);
      participant.predictedRenderVelocity.set(0, 0, 0);
      participant.lastRenderStatus = 'missing';
    }
    this.hideAllLabels();
  }

  private resolveParticipantMotion(
    participant: RemoteParticipant,
    targetTime: number,
  ): ResolvedRemoteMotion {
    const latestSnapshot = participant.snapshots[participant.snapshots.length - 1] ?? null;
    if (!latestSnapshot) {
      return {
        snapshot: null,
        sampleAgeMs: null,
        status: 'missing',
      };
    }

    const latestSampleAgeMs = Math.max(0, targetTime - latestSnapshot.timestamp);
    if (latestSampleAgeMs > REMOTE_STALE_HOLD_MS) {
      return {
        snapshot: null,
        sampleAgeMs: latestSampleAgeMs,
        status: 'missing',
      };
    }

    if (latestSampleAgeMs > MAX_EXTRAPOLATION_MS) {
      return {
        snapshot: createHeldSnapshot(latestSnapshot),
        sampleAgeMs: latestSampleAgeMs,
        status: 'hold',
      };
    }

    const resolved = resolveMotionSnapshot(participant.snapshots, targetTime);
    if (!resolved) {
      return {
        snapshot: createHeldSnapshot(latestSnapshot),
        sampleAgeMs: latestSampleAgeMs,
        status: 'hold',
      };
    }

    return {
      snapshot: resolved,
      sampleAgeMs: Math.max(0, targetTime - resolved.timestamp),
      status: targetTime < participant.collisionGraceUntilMs ? 'grace' : 'active',
    };
  }

  private resolveRemoteCollisionState(
    participant: RemoteParticipant,
    targetTime: number,
  ): RemoteCollisionState {
    const resolved = this.resolveParticipantMotion(participant, targetTime);
    if (!resolved.snapshot) {
      return {
        username: participant.username,
        vehicleIndex: vehicleIdToIndex(participant.view.currentVehicleId),
        spherePosition: null,
        sphereVelocity: null,
        resetSeq: participant.lastReceivedResetSeq,
        sampleAgeMs: resolved.sampleAgeMs,
        status: resolved.status,
      };
    }

    return {
      username: participant.username,
      vehicleIndex: resolved.snapshot.vehicleIndex,
      spherePosition: resolved.snapshot.spherePosition.clone(),
      sphereVelocity: resolved.snapshot.sphereVelocity.clone(),
      resetSeq: resolved.snapshot.resetSeq,
      sampleAgeMs: resolved.sampleAgeMs,
      status: resolved.status,
    };
  }
}

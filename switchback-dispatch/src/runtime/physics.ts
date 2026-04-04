import type {
  Collider as RapierCollider,
  RigidBody as RapierRigidBody,
  World as RapierWorld,
} from '@dimforge/rapier3d-compat';
import * as THREE from 'three';

import { RAPIER } from '../vendor-runtime';
import { COLLISION_SHAPES } from '../data/collision-shapes';
import { SPHERE_RADIUS, START_SPHERE_POSITION, TRACK_Y, WORLD_UP } from './constants';
import type { DebugGeometryStats } from './shared';
import { makeTileMatrix } from './track';
import { TRACK_TILES } from '../data/track-layout';
import type {
  RemoteCollisionPresentation,
  RemoteCollisionState,
  RemoteCollisionStateStatus,
} from './multiplayer/system';

export type GroundState = {
  isGrounded: boolean;
  wasGrounded: boolean;
  groundNormal: THREE.Vector3;
  lastGroundY: number;
};

export type RemoteCollisionProxyDebugState = {
  username: string;
  vehicleIndex: number;
  position: [number, number, number] | null;
  velocity: [number, number, number] | null;
  sampleAgeMs: number | null;
  status: RemoteCollisionStateStatus;
  colliderEnabled: boolean;
  present: boolean;
  touching: boolean;
  contactImpulse: number;
  contactNormal: [number, number, number] | null;
  contactPoint: [number, number, number] | null;
};

export type VehicleColliderOptions = {
  collisionGroups?: number;
  solverGroups?: number;
};

type RemoteCollisionProxy = {
  body: RapierRigidBody;
  collider: RapierCollider;
  lastResetSeq: number;
  lastSampleAgeMs: number | null;
  lastStatus: RemoteCollisionStateStatus;
  lastVehicleIndex: number;
  wasTouching: boolean;
};

const COLLISION_GROUP_GROUND = 0b0001;
const COLLISION_GROUP_LOCAL_VEHICLE = 0b0010;
const COLLISION_GROUP_REMOTE_PROXY = 0b0100;

const GROUND_COLLISION_GROUPS = interactionGroups(
  COLLISION_GROUP_GROUND,
  COLLISION_GROUP_LOCAL_VEHICLE,
);
const LOCAL_VEHICLE_COLLISION_GROUPS = interactionGroups(
  COLLISION_GROUP_LOCAL_VEHICLE,
  COLLISION_GROUP_GROUND | COLLISION_GROUP_REMOTE_PROXY,
);
const REMOTE_PROXY_COLLISION_GROUPS = interactionGroups(
  COLLISION_GROUP_REMOTE_PROXY,
  COLLISION_GROUP_LOCAL_VEHICLE,
);
const GROUND_QUERY_GROUPS = interactionGroups(
  COLLISION_GROUP_LOCAL_VEHICLE,
  COLLISION_GROUP_GROUND,
);
const REMOTE_PROXY_SNAP_DISTANCE = 0.2;
const REMOTE_PROXY_FRICTION = 0.08;
const REMOTE_PROXY_RESTITUTION = 0;

function interactionGroups(memberships: number, filters: number) {
  return ((memberships & 0xffff) << 16) | (filters & 0xffff);
}

function vectorToTuple(vector: THREE.Vector3) {
  return [
    Number(vector.x.toFixed(3)),
    Number(vector.y.toFixed(3)),
    Number(vector.z.toFixed(3)),
  ] as [number, number, number];
}

export function createGroundState(initialGroundY = TRACK_Y): GroundState {
  return {
    isGrounded: false,
    wasGrounded: false,
    groundNormal: WORLD_UP.clone(),
    lastGroundY: initialGroundY,
  };
}

export function setVehicleBodyState(
  body: RapierRigidBody,
  position: THREE.Vector3,
  velocity = new THREE.Vector3(),
) {
  body.setTranslation(
    { x: position.x, y: position.y, z: position.z },
    true,
  );
  body.setLinvel(
    { x: velocity.x, y: velocity.y, z: velocity.z },
    true,
  );
  body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true);
}

export function createVehicleBody(
  world: RapierWorld,
  options: VehicleColliderOptions = {},
) {
  const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(START_SPHERE_POSITION.x, START_SPHERE_POSITION.y, START_SPHERE_POSITION.z)
    .setGravityScale(1.5)
    .setLinearDamping(0.1)
    .setAngularDamping(4)
    .setAdditionalMass(1000)
    .setCanSleep(false)
    .setCcdEnabled(true);

  const body = world.createRigidBody(rigidBodyDesc);
  let colliderDesc = RAPIER.ColliderDesc.ball(SPHERE_RADIUS)
    .setFriction(5)
    .setRestitution(0.05);
  if (typeof options.collisionGroups === 'number') {
    colliderDesc = colliderDesc.setCollisionGroups(options.collisionGroups);
  }
  if (typeof options.solverGroups === 'number') {
    colliderDesc = colliderDesc.setSolverGroups(options.solverGroups);
  }
  const collider = world.createCollider(colliderDesc, body);
  return { body, collider };
}

export function sampleGroundForBody(
  world: RapierWorld,
  body: RapierRigidBody,
  groundState: GroundState,
  options: { maxDistance?: number; queryGroups?: number } = {},
) {
  groundState.wasGrounded = groundState.isGrounded;

  const translation = body.translation();
  const ray = new RAPIER.Ray(
    { x: translation.x, y: translation.y, z: translation.z },
    { x: 0, y: -1, z: 0 },
  );
  const hit = world.castRayAndGetNormal(
    ray,
    options.maxDistance ?? 0.7,
    true,
    undefined,
    options.queryGroups,
    undefined,
    body,
  );
  groundState.isGrounded = hit !== null;
  if (hit) {
    groundState.groundNormal.set(hit.normal.x, hit.normal.y, hit.normal.z).normalize();
    groundState.lastGroundY = translation.y - hit.toi;
  }

  return groundState;
}

type ProxyContactState = {
  touching: boolean;
  contactImpulse: number;
  contactNormal: THREE.Vector3 | null;
  contactPoint: THREE.Vector3 | null;
};

type TrackCollisionGeometry = {
  positions: number[];
  indices: number[];
};

export type TrackCollisionGeometryData = {
  positions: number[];
  indices: number[];
  debug: Record<'corner' | 'finish' | 'straight', TrackCollisionGeometry>;
  stats: Record<'corner' | 'finish' | 'straight', DebugGeometryStats>;
};

function appendBakedGeometry(
  template: { positions: Float32Array; indices: Uint32Array },
  matrix: THREE.Matrix4,
  positions: number[],
  indices: number[],
) {
  const vertex = new THREE.Vector3();
  const vertexOffset = positions.length / 3;

  for (let index = 0; index < template.positions.length; index += 3) {
    vertex
      .set(template.positions[index], template.positions[index + 1], template.positions[index + 2])
      .applyMatrix4(matrix);
    positions.push(vertex.x, vertex.y, vertex.z);
  }

  for (let index = 0; index < template.indices.length; index += 1) {
    indices.push(vertexOffset + template.indices[index]);
  }
}

function createIndexedGeometry(positions: number[], indices: number[]) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createSequentialIndices(vertexCount: number) {
  const indices = new Uint32Array(vertexCount);
  for (let index = 0; index < vertexCount; index += 1) {
    indices[index] = index;
  }
  return indices;
}

function summarizeGeometryData(positions: number[], indices: number[]): DebugGeometryStats {
  if (positions.length === 0) {
    return {
      vertexCount: 0,
      triangleCount: 0,
      bounds: null,
    };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < positions.length; index += 3) {
    const x = positions[index];
    const y = positions[index + 1];
    const z = positions[index + 2];
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    minZ = Math.min(minZ, z);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
    maxZ = Math.max(maxZ, z);
  }

  return {
    vertexCount: positions.length / 3,
    triangleCount: indices.length / 3,
    bounds: {
      min: [Number(minX.toFixed(3)), Number(minY.toFixed(3)), Number(minZ.toFixed(3))],
      max: [Number(maxX.toFixed(3)), Number(maxY.toFixed(3)), Number(maxZ.toFixed(3))],
    },
  };
}

function createDebugCollisionMesh(
  geometryData: { positions: number[]; indices: number[] },
  color: number,
  name: string,
) {
  const geometry = createIndexedGeometry(geometryData.positions, geometryData.indices);
  const fill = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
      toneMapped: false,
    }),
  );
  fill.renderOrder = 2;
  fill.frustumCulled = false;

  const edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geometry, 1),
    new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  edges.renderOrder = 3;
  edges.frustumCulled = false;

  const group = new THREE.Group();
  group.name = name;
  group.add(fill, edges);
  return group;
}

export function createTrackCollisionGeometryData(): TrackCollisionGeometryData {
  const cornerTemplate = {
    positions: COLLISION_SHAPES.corner,
    indices: createSequentialIndices(COLLISION_SHAPES.corner.length / 3),
  };
  const straightTemplate = {
    positions: COLLISION_SHAPES.straight,
    indices: createSequentialIndices(COLLISION_SHAPES.straight.length / 3),
  };

  const positions: number[] = [];
  const indices: number[] = [];
  const debug = {
    corner: { positions: [] as number[], indices: [] as number[] },
    finish: { positions: [] as number[], indices: [] as number[] },
    straight: { positions: [] as number[], indices: [] as number[] },
  };

  for (const tile of TRACK_TILES) {
    if (tile.kind !== 'corner' && tile.kind !== 'straight' && tile.kind !== 'finish') {
      continue;
    }

    const template = tile.kind === 'corner' ? cornerTemplate : straightTemplate;
    const tileMatrix = makeTileMatrix(tile);
    appendBakedGeometry(template, tileMatrix, positions, indices);
    appendBakedGeometry(template, tileMatrix, debug[tile.kind].positions, debug[tile.kind].indices);
  }

  return {
    positions,
    indices,
    debug,
    stats: {
      corner: summarizeGeometryData(debug.corner.positions, debug.corner.indices),
      finish: summarizeGeometryData(debug.finish.positions, debug.finish.indices),
      straight: summarizeGeometryData(debug.straight.positions, debug.straight.indices),
    },
  };
}

export class PhysicsController {
  readonly world: RapierWorld;
  readonly sphereBody: RapierRigidBody;
  readonly sphereCollider: RapierCollider;
  readonly debugGroup = new THREE.Group();
  readonly debugStats: Record<'corner' | 'finish' | 'straight', DebugGeometryStats> = {
    corner: { vertexCount: 0, triangleCount: 0, bounds: null },
    finish: { vertexCount: 0, triangleCount: 0, bounds: null },
    straight: { vertexCount: 0, triangleCount: 0, bounds: null },
  };

  private readonly groundState: GroundState = createGroundState();
  private readonly remoteCollisionProxies = new Map<string, RemoteCollisionProxy>();
  private readonly environmentColliders: RapierCollider[] = [];
  private remoteCollisionProxyDebugState: RemoteCollisionProxyDebugState[] = [];
  private remoteCollisionProxyPresentationState: RemoteCollisionPresentation[] = [];
  private environmentTouching = false;
  private pendingLocalImpactImpulse: number | null = null;

  constructor() {
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.world.timestep = 1 / 60;
    const vehicle = createVehicleBody(this.world, {
      collisionGroups: LOCAL_VEHICLE_COLLISION_GROUPS,
      solverGroups: LOCAL_VEHICLE_COLLISION_GROUPS,
    });
    this.sphereBody = vehicle.body;
    this.sphereCollider = vehicle.collider;

    this.buildStaticColliders();
    this.buildCatchPlane();
  }

  getGroundState() {
    return this.groundState;
  }

  get remoteProxyDebugState() {
    return this.remoteCollisionProxyDebugState;
  }

  get remoteProxyPresentationState() {
    return this.remoteCollisionProxyPresentationState;
  }

  resetGroundState() {
    this.groundState.isGrounded = false;
    this.groundState.wasGrounded = false;
    this.groundState.groundNormal.copy(WORLD_UP);
    this.groundState.lastGroundY = TRACK_Y;
  }

  resetVehicleBody() {
    setVehicleBodyState(this.sphereBody, START_SPHERE_POSITION, new THREE.Vector3());
    this.resetLocalImpactTracking();
  }

  setVehicleBodyState(position: THREE.Vector3, velocity: THREE.Vector3) {
    setVehicleBodyState(this.sphereBody, position, velocity);
    this.resetLocalImpactTracking();
  }

  sampleGround() {
    return sampleGroundForBody(this.world, this.sphereBody, this.groundState, {
      maxDistance: 0.7,
      queryGroups: GROUND_QUERY_GROUPS,
    });
  }

  syncRemoteCollisionProxies(states: RemoteCollisionState[]) {
    const activeUsernames = new Set<string>();
    const debugStates: RemoteCollisionProxyDebugState[] = [];
    const presentationStates: RemoteCollisionPresentation[] = [];

    for (const state of states) {
      activeUsernames.add(state.username);

      if (!state.spherePosition) {
        this.removeRemoteCollisionProxy(state.username);
        debugStates.push(this.createRemoteProxyDebugState(state, false, false, false, 0, null, null));
        presentationStates.push(this.createRemoteProxyPresentationState(state, false, false, false, 0, null, null));
        continue;
      }

      if (state.status === 'missing') {
        this.removeRemoteCollisionProxy(state.username);
        debugStates.push(this.createRemoteProxyDebugState(state, false, false, false, 0, null, null));
        presentationStates.push(this.createRemoteProxyPresentationState(state, false, false, false, 0, null, null));
        continue;
      }

      const proxy = this.ensureRemoteCollisionProxy(state.username, state.spherePosition);
      const translation = proxy.body.translation();
      const drift =
        (translation.x - state.spherePosition.x) * (translation.x - state.spherePosition.x) +
        (translation.y - state.spherePosition.y) * (translation.y - state.spherePosition.y) +
        (translation.z - state.spherePosition.z) * (translation.z - state.spherePosition.z);
      const snapped =
        proxy.lastResetSeq !== state.resetSeq ||
        proxy.lastStatus !== state.status ||
        drift > REMOTE_PROXY_SNAP_DISTANCE * REMOTE_PROXY_SNAP_DISTANCE;
      if (snapped) {
        proxy.body.setTranslation(state.spherePosition, false);
      }
      proxy.body.setLinvel(
        state.sphereVelocity ?? { x: 0, y: 0, z: 0 },
        false,
      );
      proxy.lastResetSeq = state.resetSeq;
      proxy.lastSampleAgeMs = state.sampleAgeMs;
      proxy.lastStatus = state.status;
      proxy.lastVehicleIndex = state.vehicleIndex;

      const colliderEnabled = state.status === 'active' || state.status === 'hold';
      proxy.collider.setEnabled(colliderEnabled);
      if (!colliderEnabled) {
        proxy.wasTouching = false;
      }
      debugStates.push(this.createRemoteProxyDebugState(state, true, colliderEnabled, false, 0, null, null));
      presentationStates.push(this.createRemoteProxyPresentationState(state, true, colliderEnabled, false, 0, null, null));
    }

    for (const username of Array.from(this.remoteCollisionProxies.keys())) {
      if (!activeUsernames.has(username)) {
        this.removeRemoteCollisionProxy(username);
      }
    }

    this.remoteCollisionProxyDebugState = debugStates.sort((left, right) =>
      left.username.localeCompare(right.username),
    );
    this.remoteCollisionProxyPresentationState = presentationStates.sort((left, right) =>
      left.username.localeCompare(right.username),
    );
  }

  step() {
    this.world.step();
    this.refreshEnvironmentImpactContact();
    this.refreshRemoteCollisionProxyTouches();
  }

  consumeLocalImpactImpulse() {
    const impactImpulse = this.pendingLocalImpactImpulse;
    this.pendingLocalImpactImpulse = null;
    return impactImpulse;
  }

  private buildStaticColliders() {
    const geometryData = createTrackCollisionGeometryData();

    const collider = this.world.createCollider(
      RAPIER.ColliderDesc.trimesh(
        new Float32Array(geometryData.positions),
        new Uint32Array(geometryData.indices),
      )
        .setFriction(0)
        .setRestitution(0.1)
        .setCollisionGroups(GROUND_COLLISION_GROUPS)
        .setSolverGroups(GROUND_COLLISION_GROUPS),
    );
    this.environmentColliders.push(collider);

    this.debugStats.corner = geometryData.stats.corner;
    this.debugStats.finish = geometryData.stats.finish;
    this.debugStats.straight = geometryData.stats.straight;

    this.debugGroup.add(
      createDebugCollisionMesh(geometryData.debug.corner, 0xf97316, 'debug-collider-corner'),
      createDebugCollisionMesh(geometryData.debug.straight, 0x22d3ee, 'debug-collider-straight'),
      createDebugCollisionMesh(geometryData.debug.finish, 0x4ade80, 'debug-collider-finish'),
    );
  }

  private buildCatchPlane() {
    const catchPlane = this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(30, 0.02, 30)
        .setTranslation(0, -0.02, 0)
        .setFriction(0.1)
        .setCollisionGroups(GROUND_COLLISION_GROUPS)
        .setSolverGroups(GROUND_COLLISION_GROUPS),
    );
    catchPlane.setRestitution(0.02);
    this.environmentColliders.push(catchPlane);

    const debugCatchPlaneMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60, 12, 12),
      new THREE.MeshBasicMaterial({
        color: 0xf472b6,
        transparent: true,
        opacity: 0.44,
        wireframe: true,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    debugCatchPlaneMesh.rotation.x = -Math.PI / 2;
    debugCatchPlaneMesh.position.set(0, 0.003, 0);
    debugCatchPlaneMesh.renderOrder = 1;
    this.debugGroup.add(debugCatchPlaneMesh);
  }

  private ensureRemoteCollisionProxy(username: string, position: THREE.Vector3) {
    const existing = this.remoteCollisionProxies.get(username);
    if (existing) {
      return existing;
    }

    const body = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.kinematicVelocityBased().setTranslation(position.x, position.y, position.z),
    );
    const collider = this.world.createCollider(
      RAPIER.ColliderDesc.ball(SPHERE_RADIUS)
        .setFriction(REMOTE_PROXY_FRICTION)
        .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Multiply)
        .setRestitution(REMOTE_PROXY_RESTITUTION)
        .setRestitutionCombineRule(RAPIER.CoefficientCombineRule.Min)
        .setCollisionGroups(REMOTE_PROXY_COLLISION_GROUPS)
        .setSolverGroups(REMOTE_PROXY_COLLISION_GROUPS),
      body,
    );
    body.setTranslation(position, false);
    body.setLinvel({ x: 0, y: 0, z: 0 }, false);

    const proxy: RemoteCollisionProxy = {
      body,
      collider,
      lastResetSeq: -1,
      lastSampleAgeMs: null,
      lastStatus: 'missing',
      lastVehicleIndex: 0,
      wasTouching: false,
    };
    this.remoteCollisionProxies.set(username, proxy);
    return proxy;
  }

  private removeRemoteCollisionProxy(username: string) {
    const proxy = this.remoteCollisionProxies.get(username);
    if (!proxy) {
      return;
    }
    this.world.removeRigidBody(proxy.body);
    this.remoteCollisionProxies.delete(username);
  }

  private createRemoteProxyDebugState(
    state: RemoteCollisionState,
    present: boolean,
    colliderEnabled: boolean,
    touching: boolean,
    contactImpulse: number,
    contactNormal: THREE.Vector3 | null,
    contactPoint: THREE.Vector3 | null,
  ): RemoteCollisionProxyDebugState {
    return {
      username: state.username,
      vehicleIndex: state.vehicleIndex,
      position: state.spherePosition
        ? vectorToTuple(state.spherePosition)
        : null,
      velocity: state.sphereVelocity
        ? vectorToTuple(state.sphereVelocity)
        : null,
      sampleAgeMs:
        typeof state.sampleAgeMs === 'number' ? Number(state.sampleAgeMs.toFixed(1)) : null,
      status: state.status,
      colliderEnabled,
      present,
      touching,
      contactImpulse: Number(contactImpulse.toFixed(3)),
      contactNormal: contactNormal ? vectorToTuple(contactNormal) : null,
      contactPoint: contactPoint ? vectorToTuple(contactPoint) : null,
    };
  }

  private createRemoteProxyPresentationState(
    state: RemoteCollisionState,
    present: boolean,
    colliderEnabled: boolean,
    touching: boolean,
    contactImpulse: number,
    contactNormal: THREE.Vector3 | null,
    contactPoint: THREE.Vector3 | null,
  ): RemoteCollisionPresentation {
    return {
      username: state.username,
      vehicleIndex: state.vehicleIndex,
      spherePosition: state.spherePosition?.clone() ?? null,
      sphereVelocity: state.sphereVelocity?.clone() ?? null,
      sampleAgeMs: state.sampleAgeMs,
      status: state.status,
      colliderEnabled,
      present,
      touching,
      contactImpulse,
      contactNormal: contactNormal?.clone() ?? null,
      contactPoint: contactPoint?.clone() ?? null,
    };
  }

  private refreshRemoteCollisionProxyTouches() {
    if (this.remoteCollisionProxyDebugState.length === 0 && this.remoteCollisionProxyPresentationState.length === 0) {
      return;
    }

    this.remoteCollisionProxyDebugState = this.remoteCollisionProxyDebugState.map((state) => {
      const proxy = this.remoteCollisionProxies.get(state.username);
      if (!proxy || !state.present || !state.colliderEnabled) {
        if (proxy) {
          proxy.wasTouching = false;
        }
        return {
          ...state,
          touching: false,
          velocity: null,
          contactImpulse: 0,
          contactNormal: null,
          contactPoint: null,
        };
      }

      const contact = this.sampleProxyContact(proxy);
      if (contact.touching && !proxy.wasTouching) {
        this.queueLocalImpact(contact.contactImpulse);
      }
      proxy.wasTouching = contact.touching;
      const translation = proxy.body.translation();
      const linvel = proxy.body.linvel();

      return {
        ...state,
        position: vectorToTuple(new THREE.Vector3(translation.x, translation.y, translation.z)),
        velocity: vectorToTuple(new THREE.Vector3(linvel.x, linvel.y, linvel.z)),
        sampleAgeMs:
          typeof proxy.lastSampleAgeMs === 'number' ? Number(proxy.lastSampleAgeMs.toFixed(1)) : null,
        touching: contact.touching,
        contactImpulse: Number(contact.contactImpulse.toFixed(3)),
        contactNormal: contact.contactNormal ? vectorToTuple(contact.contactNormal) : null,
        contactPoint: contact.contactPoint ? vectorToTuple(contact.contactPoint) : null,
      };
    });

    this.remoteCollisionProxyPresentationState = this.remoteCollisionProxyPresentationState.map((state) => {
      const proxy = this.remoteCollisionProxies.get(state.username);
      if (!proxy || !state.present || !state.colliderEnabled) {
        return {
          ...state,
          touching: false,
          sphereVelocity: null,
          contactImpulse: 0,
          contactNormal: null,
          contactPoint: null,
        };
      }

      const contact = this.sampleProxyContact(proxy);
      const translation = proxy.body.translation();
      const linvel = proxy.body.linvel();

      return {
        ...state,
        spherePosition: new THREE.Vector3(translation.x, translation.y, translation.z),
        sphereVelocity: new THREE.Vector3(linvel.x, linvel.y, linvel.z),
        sampleAgeMs: proxy.lastSampleAgeMs,
        touching: contact.touching,
        contactImpulse: contact.contactImpulse,
        contactNormal: contact.contactNormal,
        contactPoint: contact.contactPoint,
      };
    });
  }

  private refreshEnvironmentImpactContact() {
    let touching = false;
    let strongestImpulse = 0;

    for (const collider of this.environmentColliders) {
      let colliderImpulse = 0;
      this.world.contactPair(this.sphereCollider, collider, (manifold) => {
        if (manifold.numContacts() === 0) {
          return;
        }
        touching = true;
        for (let index = 0; index < manifold.numContacts(); index += 1) {
          colliderImpulse += manifold.contactImpulse(index);
        }
      });
      strongestImpulse = Math.max(strongestImpulse, colliderImpulse);
    }

    if (touching && !this.environmentTouching) {
      this.queueLocalImpact(strongestImpulse);
    }
    this.environmentTouching = touching;
  }

  private sampleProxyContact(proxy: RemoteCollisionProxy): ProxyContactState {
    let touching = false;
    let contactImpulse = 0;
    const normalAccumulator = new THREE.Vector3();
    let contactPoint: THREE.Vector3 | null = null;

    this.world.contactPair(this.sphereCollider, proxy.collider, (manifold, flipped) => {
      if (manifold.numContacts() === 0) {
        return;
      }

      touching = true;

      let manifoldImpulse = 0;
      for (let index = 0; index < manifold.numContacts(); index += 1) {
        manifoldImpulse += manifold.contactImpulse(index);
      }
      contactImpulse += manifoldImpulse;

      const manifoldNormal = manifold.normal();
      const worldNormal = new THREE.Vector3(manifoldNormal.x, manifoldNormal.y, manifoldNormal.z);
      if (flipped) {
        worldNormal.multiplyScalar(-1);
      }
      normalAccumulator.addScaledVector(worldNormal, Math.max(1, manifoldImpulse));

      if (!contactPoint && manifold.numSolverContacts() > 0) {
        const solverPoint = manifold.solverContactPoint(0);
        contactPoint = new THREE.Vector3(solverPoint.x, solverPoint.y, solverPoint.z);
      }
    });

    const contactNormal =
      touching && normalAccumulator.lengthSq() > 0 ? normalAccumulator.normalize() : null;
    return {
      touching,
      contactImpulse,
      contactNormal,
      contactPoint,
    };
  }

  private queueLocalImpact(contactImpulse: number) {
    if (!Number.isFinite(contactImpulse) || contactImpulse <= 0) {
      return;
    }
    this.pendingLocalImpactImpulse = Math.max(this.pendingLocalImpactImpulse ?? 0, contactImpulse);
  }

  private resetLocalImpactTracking() {
    this.environmentTouching = false;
    this.pendingLocalImpactImpulse = null;
    for (const proxy of this.remoteCollisionProxies.values()) {
      proxy.wasTouching = false;
    }
  }
}

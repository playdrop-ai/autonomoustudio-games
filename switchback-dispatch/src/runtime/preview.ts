import type {
  RigidBody as RapierRigidBody,
  World as RapierWorld,
} from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';

import { RAPIER } from '../vendor-runtime';
import {
  DRIFT_THRESHOLD,
  FIXED_DT,
  GRID_STEP,
  START_SPHERE_POSITION,
  WORLD_UP,
} from './constants';
import {
  createGroundState,
  createTrackCollisionGeometryData,
  createVehicleBody,
  sampleGroundForBody,
  setVehicleBodyState as setPreviewVehicleBodyState,
  type GroundState,
} from './physics';
import { SmokeSystem } from './particles';
import type { ControlsSnapshot, TruckVehicleId, VehicleId } from './shared';
import { PREVIEW_TRUCK_VEHICLE_IDS } from './shared';
import { clamp, lerp } from './utils';
import { VehicleController, type VehicleAudioSink } from './vehicle';

type PreviewGridTile = {
  gridX: number;
  gridZ: number;
};

type PreviewGridVector = {
  x: number;
  z: number;
};

type PreviewPathSample = {
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
  targetSpeed: number;
  turnBias: number;
};

type CpuInputState = {
  forward: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
};

type PreviewCar = {
  vehicleId: TruckVehicleId;
  body: RapierRigidBody;
  vehicle: VehicleController;
  groundState: GroundState;
  wrappedIndex: number;
  progressSamples: number;
  laneBias: number;
  aggression: number;
  variationPhase: number;
  overtakeSide: number;
  currentInput: CpuInputState;
  lastPosition: THREE.Vector3;
  stationaryTimer: number;
  offRouteTimer: number;
  lapCount: number;
  lapStartTimeSeconds: number;
  lastLapMs: number | null;
  bestLapMs: number | null;
  recoveryCount: number;
  currentTargetSpeed: number;
  currentCenterOffset: number;
  peakDriftIntensity: number;
  smokeFrames: number;
};

export type PreviewCarDebugState = {
  vehicleId: TruckVehicleId;
  lapCount: number;
  progressSamples: number;
  lastLapMs: number | null;
  bestLapMs: number | null;
  recoveryCount: number;
  linearSpeed: number;
  currentTargetSpeed: number;
  centerOffset: number;
  peakDriftIntensity: number;
  smokeFrames: number;
  input: CpuInputState;
};

export type PreviewBenchmarkState = {
  ready: boolean;
  passes: boolean;
  benchmarkTargetLapMs: number;
  minAllowedLapMs: number;
  maxAllowedLapMs: number;
  maxAllowedRecoveries: number;
  maxCompetitiveGapMs: number;
  minRequiredSmokeFrames: number;
  bestLapMs: number | null;
  slowestLapMs: number | null;
  recoveryCeiling: number | null;
  smokeFloor: number | null;
  cars: PreviewCarDebugState[];
};

type PreviewPath = {
  samples: PreviewPathSample[];
};

const PREVIEW_CAMERA_FOV = 46;
const PREVIEW_CAMERA_NEAR = 0.1;
const PREVIEW_CAMERA_FAR = 120;
const PREVIEW_SAMPLE_COUNT = 128;
const PREVIEW_LOOKAHEAD_MIN = 7;
const PREVIEW_LOOKAHEAD_MAX = 15;
const PREVIEW_LANE_LIMIT = 0.24;
const PREVIEW_CORNER_RADIUS = GRID_STEP * 0.39;
const PREVIEW_STRAIGHT_POINT_COUNT = 5;
const PREVIEW_CORNER_POINT_COUNT = 9;
const PREVIEW_RECOVERY_ROUTE_DISTANCE = 3.65;
const PREVIEW_RECOVERY_STATIONARY_SECONDS = 1.6;
const PREVIEW_RECOVERY_OFF_ROUTE_SECONDS = 1.4;
const PREVIEW_BENCHMARK_TARGET_LAP_MS = 15000;
const PREVIEW_BENCHMARK_MIN_LAP_MS = 14000;
const PREVIEW_BENCHMARK_MAX_LAP_MS = 16200;
const PREVIEW_BENCHMARK_MAX_RECOVERIES = 2;
const PREVIEW_BENCHMARK_MAX_GAP_MS = 2200;
const PREVIEW_BENCHMARK_MIN_SMOKE_FRAMES = 8;
const PREVIEW_WORLD_SPEED_MIN = 5.2;
const PREVIEW_WORLD_SPEED_MAX = 11.8;
const PREVIEW_STEER_ENGAGE_THRESHOLD = 0.14;
const PREVIEW_STEER_RELEASE_THRESHOLD = 0.06;
const PREVIEW_BRAKE_ENGAGE_THRESHOLD = 0.74;
const PREVIEW_BRAKE_RELEASE_THRESHOLD = 0.44;
const PREVIEW_BRAKE_MIN_SPEED = 6;
const PREVIEW_COAST_MIN_SPEED = 6.2;
const PREVIEW_TARGET_MIN_FORWARD = 0.55;
const PREVIEW_SPAWN_INDICES = [0, 2, 4, 6] as const;
const PREVIEW_TILE_LOOP: readonly PreviewGridTile[] = [
  { gridX: 0, gridZ: 0 },
  { gridX: 0, gridZ: 1 },
  { gridX: 0, gridZ: 2 },
  { gridX: -1, gridZ: 2 },
  { gridX: -2, gridZ: 2 },
  { gridX: -2, gridZ: 1 },
  { gridX: -2, gridZ: 0 },
  { gridX: -2, gridZ: -1 },
  { gridX: -3, gridZ: -1 },
  { gridX: -3, gridZ: -2 },
  { gridX: -3, gridZ: -3 },
  { gridX: -2, gridZ: -3 },
  { gridX: -1, gridZ: -3 },
  { gridX: 0, gridZ: -3 },
  { gridX: 0, gridZ: -2 },
  { gridX: 0, gridZ: -1 },
] as const;
const SILENT_AUDIO: VehicleAudioSink = {
  update() {},
  playImpact() {},
};

function createCpuInputState(): CpuInputState {
  return {
    forward: false,
    brake: false,
    left: false,
    right: false,
  };
}

function wrapPathIndex(index: number, length: number) {
  return ((index % length) + length) % length;
}

function wrapDelta(delta: number, length: number) {
  if (delta > length / 2) {
    return delta - length;
  }
  if (delta < -length / 2) {
    return delta + length;
  }
  return delta;
}

function yawFromForward(forward: THREE.Vector3) {
  return Math.atan2(forward.x, forward.z);
}

function clearSmoke(smokeSystem: SmokeSystem) {
  for (const particle of smokeSystem.particles) {
    particle.active = false;
    particle.age = 0;
    particle.sprite.visible = false;
    particle.sprite.material.opacity = 0;
  }
}

function vectorsEqual(left: PreviewGridVector, right: PreviewGridVector) {
  return left.x === right.x && left.z === right.z;
}

function makeDirection(from: PreviewGridTile, to: PreviewGridTile): PreviewGridVector {
  return {
    x: clamp(to.gridX - from.gridX, -1, 1),
    z: clamp(to.gridZ - from.gridZ, -1, 1),
  };
}

function makeWorldPoint(tile: PreviewGridTile) {
  return new THREE.Vector3(
    tile.gridX * GRID_STEP,
    START_SPHERE_POSITION.y,
    tile.gridZ * GRID_STEP,
  );
}

function addScaledGridVector(
  target: THREE.Vector3,
  direction: PreviewGridVector,
  scalar: number,
) {
  return target.addScaledVector(new THREE.Vector3(direction.x, 0, direction.z), scalar);
}

function createLinePoints(start: THREE.Vector3, end: THREE.Vector3, pointCount: number) {
  const points: THREE.Vector3[] = [];
  for (let index = 0; index < pointCount; index += 1) {
    const alpha = pointCount === 1 ? 1 : index / (pointCount - 1);
    points.push(start.clone().lerp(end, alpha));
  }
  return points;
}

function createCornerPoints(
  center: THREE.Vector3,
  entryDirection: PreviewGridVector,
  exitDirection: PreviewGridVector,
  radius: number,
  pointCount: number,
) {
  const cornerCenter = center.clone();
  addScaledGridVector(cornerCenter, exitDirection, GRID_STEP * 0.5);
  addScaledGridVector(cornerCenter, { x: -entryDirection.x, z: -entryDirection.z }, GRID_STEP * 0.5);

  const startAngle = Math.atan2(-exitDirection.z, -exitDirection.x);
  let endAngle = Math.atan2(entryDirection.z, entryDirection.x);
  const turnSign = entryDirection.x * exitDirection.z - entryDirection.z * exitDirection.x;
  if (turnSign > 0 && endAngle < startAngle) {
    endAngle += Math.PI * 2;
  }
  if (turnSign < 0 && endAngle > startAngle) {
    endAngle -= Math.PI * 2;
  }

  const points: THREE.Vector3[] = [];
  for (let index = 0; index < pointCount; index += 1) {
    const alpha = pointCount === 1 ? 1 : index / (pointCount - 1);
    const angle = lerp(startAngle, endAngle, alpha);
    points.push(
      cornerCenter.clone().add(
        new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius),
      ),
    );
  }
  return points;
}

function resampleClosedPath(points: THREE.Vector3[], sampleCount: number) {
  const deduped = points.filter((point, index) => {
    const previous = points[index - 1];
    return !previous || previous.distanceToSquared(point) > 1e-6;
  });
  if (deduped.length < 3) {
    throw new Error('[starter-kit-racing] preview path requires at least three unique points');
  }

  const cumulative = [0];
  let totalLength = 0;
  for (let index = 0; index < deduped.length; index += 1) {
    const current = deduped[index];
    const next = deduped[(index + 1) % deduped.length];
    totalLength += current.distanceTo(next);
    cumulative.push(totalLength);
  }

  const samples: THREE.Vector3[] = [];
  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
    const targetDistance = (totalLength * sampleIndex) / sampleCount;
    let segmentIndex = 0;
    while (segmentIndex < deduped.length && cumulative[segmentIndex + 1] < targetDistance) {
      segmentIndex += 1;
    }

    const segmentStart = deduped[segmentIndex];
    const segmentEnd = deduped[(segmentIndex + 1) % deduped.length];
    const segmentDistance = cumulative[segmentIndex + 1] - cumulative[segmentIndex];
    const alpha =
      segmentDistance <= 1e-6
        ? 0
        : (targetDistance - cumulative[segmentIndex]) / segmentDistance;
    samples.push(segmentStart.clone().lerp(segmentEnd, alpha).setY(START_SPHERE_POSITION.y));
  }

  return samples;
}

function createPreviewPath(): PreviewPath {
  const rawPoints: THREE.Vector3[] = [];

  function getCornerEntryPoint(index: number) {
    const previous = PREVIEW_TILE_LOOP[wrapPathIndex(index - 1, PREVIEW_TILE_LOOP.length)];
    const current = PREVIEW_TILE_LOOP[index];
    const next = PREVIEW_TILE_LOOP[wrapPathIndex(index + 1, PREVIEW_TILE_LOOP.length)];
    const center = makeWorldPoint(current);
    const entryDirection = makeDirection(previous, current);
    const exitDirection = makeDirection(current, next);
    const point = center.clone();
    addScaledGridVector(point, { x: -entryDirection.x, z: -entryDirection.z }, GRID_STEP * 0.5);
    addScaledGridVector(point, exitDirection, GRID_STEP * 0.5 - PREVIEW_CORNER_RADIUS);
    return point;
  }

  function getCornerExitPoint(index: number) {
    const previous = PREVIEW_TILE_LOOP[wrapPathIndex(index - 1, PREVIEW_TILE_LOOP.length)];
    const current = PREVIEW_TILE_LOOP[index];
    const next = PREVIEW_TILE_LOOP[wrapPathIndex(index + 1, PREVIEW_TILE_LOOP.length)];
    const center = makeWorldPoint(current);
    const entryDirection = makeDirection(previous, current);
    const exitDirection = makeDirection(current, next);
    const point = center.clone();
    addScaledGridVector(point, exitDirection, GRID_STEP * 0.5);
    addScaledGridVector(point, { x: -entryDirection.x, z: -entryDirection.z }, GRID_STEP * 0.5 - PREVIEW_CORNER_RADIUS);
    return point;
  }

  function getBoundaryPoint(index: number) {
    const currentIndex = wrapPathIndex(index, PREVIEW_TILE_LOOP.length);
    const nextIndex = wrapPathIndex(index + 1, PREVIEW_TILE_LOOP.length);
    const current = PREVIEW_TILE_LOOP[currentIndex];
    const next = PREVIEW_TILE_LOOP[nextIndex];
    const currentPrevious = PREVIEW_TILE_LOOP[wrapPathIndex(currentIndex - 1, PREVIEW_TILE_LOOP.length)];
    const nextNext = PREVIEW_TILE_LOOP[wrapPathIndex(nextIndex + 1, PREVIEW_TILE_LOOP.length)];
    const currentIn = makeDirection(currentPrevious, current);
    const currentOut = makeDirection(current, next);
    const nextIn = currentOut;
    const nextOut = makeDirection(next, nextNext);

    if (!vectorsEqual(currentIn, currentOut)) {
      return getCornerExitPoint(currentIndex);
    }
    if (!vectorsEqual(nextIn, nextOut)) {
      return getCornerEntryPoint(nextIndex);
    }

    return makeWorldPoint(current).lerp(makeWorldPoint(next), 0.5);
  }

  for (let index = 0; index < PREVIEW_TILE_LOOP.length; index += 1) {
    const previous = PREVIEW_TILE_LOOP[wrapPathIndex(index - 1, PREVIEW_TILE_LOOP.length)];
    const current = PREVIEW_TILE_LOOP[index];
    const next = PREVIEW_TILE_LOOP[wrapPathIndex(index + 1, PREVIEW_TILE_LOOP.length)];
    const entryDirection = makeDirection(previous, current);
    const exitDirection = makeDirection(current, next);
    const entryPoint = getBoundaryPoint(index - 1);
    const exitPoint = getBoundaryPoint(index);
    const tilePoints = vectorsEqual(entryDirection, exitDirection)
      ? createLinePoints(entryPoint, exitPoint, PREVIEW_STRAIGHT_POINT_COUNT)
      : createCornerPoints(
          makeWorldPoint(current),
          entryDirection,
          exitDirection,
          PREVIEW_CORNER_RADIUS,
          PREVIEW_CORNER_POINT_COUNT,
        );

    if (rawPoints.length > 0) {
      tilePoints.shift();
    }
    rawPoints.push(...tilePoints);
  }

  const points = resampleClosedPath(rawPoints, PREVIEW_SAMPLE_COUNT);
  const tangents = points.map((_, index) => {
    const previous = points[wrapPathIndex(index - 1, points.length)];
    const next = points[wrapPathIndex(index + 1, points.length)];
    return next.clone().sub(previous).normalize();
  });

  const samples = points.map((point, index) => {
    const tangent = tangents[index];
    const right = new THREE.Vector3().crossVectors(WORLD_UP, tangent).normalize();
    const previousTangent = tangents[wrapPathIndex(index - 3, tangents.length)];
    const nextTangent = tangents[wrapPathIndex(index + 3, tangents.length)];
    const curvature = Math.acos(clamp(previousTangent.dot(nextTangent), -1, 1));
    const turnBias = clamp(
      (previousTangent.x * nextTangent.z - previousTangent.z * nextTangent.x) * 3.4,
      -1,
      1,
    );
    const targetSpeed = clamp(0.98 - curvature * 0.98, 0.56, 0.94);

    return {
      position: point,
      tangent,
      right,
      targetSpeed,
      turnBias,
    };
  });

  return { samples };
}

export class PreviewRaceController {
  readonly group = new THREE.Group();
  readonly camera = new THREE.PerspectiveCamera(
    PREVIEW_CAMERA_FOV,
    1,
    PREVIEW_CAMERA_NEAR,
    PREVIEW_CAMERA_FAR,
  );

  private readonly world: RapierWorld;
  private readonly smokeSystem: SmokeSystem;
  private readonly cars: PreviewCar[];
  private readonly path = createPreviewPath();
  private readonly cameraFocus = new THREE.Vector3();
  private readonly cameraTarget = new THREE.Vector3();
  private readonly raceFocus = new THREE.Vector3();
  private readonly raceForward = new THREE.Vector3(0, 0, 1);
  private readonly lookTarget = new THREE.Vector3();
  private readonly orbitRight = new THREE.Vector3();
  private readonly headingForward = new THREE.Vector3();
  private readonly targetPoint = new THREE.Vector3();
  private readonly localTarget = new THREE.Vector3();
  private readonly relativeOffset = new THREE.Vector3();
  private readonly tempVector = new THREE.Vector3();
  private readonly tempVectorB = new THREE.Vector3();
  private readonly inverseOrientation = new THREE.Quaternion();
  private active = false;
  private elapsedSeconds = 0;

  constructor(vehicles: Record<VehicleId, GLTF>, smokeTexture: THREE.Texture) {
    this.world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
    this.world.timestep = FIXED_DT;
    this.smokeSystem = new SmokeSystem(smokeTexture);
    this.group.add(this.smokeSystem.group);
    this.camera.position.set(-8, 10, -2);
    this.buildTrack();
    this.cars = PREVIEW_TRUCK_VEHICLE_IDS.map((vehicleId, index) => {
      const vehicle = new VehicleController(vehicles);
      vehicle.setVehicleId(vehicleId);
      const { body } = createVehicleBody(this.world);
      const car: PreviewCar = {
        vehicleId,
        body,
        vehicle,
        groundState: createGroundState(),
        wrappedIndex: PREVIEW_SPAWN_INDICES[index] ?? 0,
        progressSamples: 0,
        laneBias: [-0.05, 0.04, -0.015, 0.015][index] ?? 0,
        aggression: [1.08, 1.1, 1.12, 1.14][index] ?? 1,
        variationPhase: index * 1.57,
        overtakeSide: index % 2 === 0 ? -1 : 1,
        currentInput: createCpuInputState(),
        lastPosition: new THREE.Vector3(),
        stationaryTimer: 0,
        offRouteTimer: 0,
        lapCount: 0,
        lapStartTimeSeconds: 0,
        lastLapMs: null,
        bestLapMs: null,
        recoveryCount: 0,
        currentTargetSpeed: 0,
        currentCenterOffset: 0,
        peakDriftIntensity: 0,
        smokeFrames: 0,
      };
      this.group.add(vehicle.container);
      this.resetCar(car, car.wrappedIndex, false);
      return car;
    });
    this.syncCamera(true);
  }

  get focus() {
    return this.cameraFocus;
  }

  get benchmarkState(): PreviewBenchmarkState {
    const carStates = this.cars.map((car) => ({
      vehicleId: car.vehicleId,
      lapCount: car.lapCount,
      progressSamples: car.progressSamples,
      lastLapMs: car.lastLapMs ? Math.round(car.lastLapMs) : null,
      bestLapMs: car.bestLapMs ? Math.round(car.bestLapMs) : null,
      recoveryCount: car.recoveryCount,
      linearSpeed: Number(Math.abs(car.vehicle.telemetry.linearSpeed).toFixed(3)),
      currentTargetSpeed: Number(car.currentTargetSpeed.toFixed(3)),
      centerOffset: Number(car.currentCenterOffset.toFixed(3)),
      peakDriftIntensity: Number(car.peakDriftIntensity.toFixed(3)),
      smokeFrames: car.smokeFrames,
      input: { ...car.currentInput },
    }));
    const completedCars = this.cars.filter((car) => typeof car.bestLapMs === 'number');
    const bestLapMs =
      completedCars.length > 0
        ? Math.min(...completedCars.map((car) => car.bestLapMs ?? Number.POSITIVE_INFINITY))
        : null;
    const slowestLapMs =
      completedCars.length > 0
        ? Math.max(...completedCars.map((car) => car.bestLapMs ?? 0))
        : null;
    const recoveryCeiling =
      this.cars.length > 0 ? Math.max(...this.cars.map((car) => car.recoveryCount)) : null;
    const smokeFloor =
      this.cars.length > 0 ? Math.min(...this.cars.map((car) => car.smokeFrames)) : null;
    const ready = completedCars.length === this.cars.length;
    const passes =
      ready &&
      bestLapMs !== null &&
      slowestLapMs !== null &&
      recoveryCeiling !== null &&
      smokeFloor !== null &&
      bestLapMs >= PREVIEW_BENCHMARK_MIN_LAP_MS &&
      slowestLapMs <= PREVIEW_BENCHMARK_MAX_LAP_MS &&
      slowestLapMs - bestLapMs <= PREVIEW_BENCHMARK_MAX_GAP_MS &&
      recoveryCeiling <= PREVIEW_BENCHMARK_MAX_RECOVERIES &&
      smokeFloor >= PREVIEW_BENCHMARK_MIN_SMOKE_FRAMES;

    return {
      ready,
      passes,
      benchmarkTargetLapMs: PREVIEW_BENCHMARK_TARGET_LAP_MS,
      minAllowedLapMs: PREVIEW_BENCHMARK_MIN_LAP_MS,
      maxAllowedLapMs: PREVIEW_BENCHMARK_MAX_LAP_MS,
      maxAllowedRecoveries: PREVIEW_BENCHMARK_MAX_RECOVERIES,
      maxCompetitiveGapMs: PREVIEW_BENCHMARK_MAX_GAP_MS,
      minRequiredSmokeFrames: PREVIEW_BENCHMARK_MIN_SMOKE_FRAMES,
      bestLapMs: bestLapMs ? Math.round(bestLapMs) : null,
      slowestLapMs: slowestLapMs ? Math.round(slowestLapMs) : null,
      recoveryCeiling,
      smokeFloor,
      cars: carStates,
    };
  }

  updateProjection(width: number, height: number) {
    this.camera.aspect = width / Math.max(height, 1);
    this.camera.updateProjectionMatrix();
  }

  start() {
    this.active = true;
    this.elapsedSeconds = 0;
    clearSmoke(this.smokeSystem);
    this.cars.forEach((car, index) => {
      this.resetCar(car, PREVIEW_SPAWN_INDICES[index] ?? 0, false);
    });
    this.syncCamera(true);
  }

  stop() {
    this.active = false;
    clearSmoke(this.smokeSystem);
  }

  step(dt: number) {
    if (!this.active) {
      return;
    }

    this.elapsedSeconds += dt;

    for (const car of this.cars) {
      car.groundState = sampleGroundForBody(this.world, car.body, car.groundState);
      const controls = this.computeAiControls(car);
      car.vehicle.applyControls(car.body, controls, car.groundState, dt);
    }

    this.world.step();

    for (const car of this.cars) {
      car.groundState = sampleGroundForBody(this.world, car.body, car.groundState);
      car.vehicle.sync(car.body, car.groundState, dt, this.smokeSystem, SILENT_AUDIO);
      car.peakDriftIntensity = Math.max(car.peakDriftIntensity, car.vehicle.currentDriftIntensity);
      if (car.vehicle.currentDriftIntensity > DRIFT_THRESHOLD) {
        car.smokeFrames += 1;
      }
      this.updateRecoveryState(car, dt);
    }

    this.smokeSystem.update(dt);
    this.syncCamera(false);
  }

  private buildTrack() {
    const geometryData = createTrackCollisionGeometryData();
    this.world.createCollider(
      RAPIER.ColliderDesc.trimesh(
        new Float32Array(geometryData.positions),
        new Uint32Array(geometryData.indices),
      )
        .setFriction(0)
        .setRestitution(0.08),
    );
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(50, 0.02, 50)
        .setTranslation(0, -0.02, 0)
        .setFriction(0.08)
        .setRestitution(0.02),
    );
  }

  private resetCar(car: PreviewCar, wrappedIndex: number, countRecovery: boolean) {
    const sample = this.path.samples[wrappedIndex];
    const point = sample.position.clone().addScaledVector(
      sample.right,
      car.laneBias * PREVIEW_LANE_LIMIT,
    );
    const velocity = sample.tangent
      .clone()
      .multiplyScalar(this.computeSpawnSpeed(car, sample.targetSpeed));
    const yaw = yawFromForward(sample.tangent);

    car.vehicle.resetState();
    car.vehicle.setPose(point, yaw, velocity);
    setPreviewVehicleBodyState(car.body, point, velocity);
    car.groundState = createGroundState();
    sampleGroundForBody(this.world, car.body, car.groundState);
    car.vehicle.sync(car.body, car.groundState, FIXED_DT, this.smokeSystem, SILENT_AUDIO);

    car.wrappedIndex = wrappedIndex;
    car.lastPosition.copy(point);
    car.currentInput.forward = false;
    car.currentInput.brake = false;
    car.currentInput.left = false;
    car.currentInput.right = false;
    car.stationaryTimer = 0;
    car.offRouteTimer = 0;
    car.currentTargetSpeed = this.computeSpawnSpeed(car, sample.targetSpeed);
    car.currentCenterOffset = 0;
    if (countRecovery) {
      car.recoveryCount += 1;
      return;
    }

    car.progressSamples = 0;
    car.lapCount = 0;
    car.lapStartTimeSeconds = 0;
    car.lastLapMs = null;
    car.bestLapMs = null;
    car.recoveryCount = 0;
    car.peakDriftIntensity = 0;
    car.smokeFrames = 0;
  }

  private computeSpawnSpeed(car: PreviewCar, targetSpeedScale: number) {
    return clamp(
      lerp(PREVIEW_WORLD_SPEED_MIN + 0.35, PREVIEW_WORLD_SPEED_MAX - 0.55, targetSpeedScale) +
        (car.aggression - 1) * 0.8,
      PREVIEW_WORLD_SPEED_MIN,
      PREVIEW_WORLD_SPEED_MAX,
    );
  }

  private applyDiscreteTurnInput(car: PreviewCar, steerDemand: number) {
    const turnLeft =
      steerDemand < -PREVIEW_STEER_ENGAGE_THRESHOLD ||
      (car.currentInput.left && steerDemand < -PREVIEW_STEER_RELEASE_THRESHOLD);
    const turnRight =
      steerDemand > PREVIEW_STEER_ENGAGE_THRESHOLD ||
      (car.currentInput.right && steerDemand > PREVIEW_STEER_RELEASE_THRESHOLD);

    car.currentInput.left = turnLeft && !turnRight;
    car.currentInput.right = turnRight && !turnLeft;
  }

  private applyDiscreteDriveInput(
    car: PreviewCar,
    brakeDemand: number,
    shouldCoast: boolean,
    forceForwardRecovery: boolean,
  ) {
    const brake =
      !forceForwardRecovery &&
      (brakeDemand > PREVIEW_BRAKE_ENGAGE_THRESHOLD ||
        (car.currentInput.brake && brakeDemand > PREVIEW_BRAKE_RELEASE_THRESHOLD));
    const forward = forceForwardRecovery || (!brake && !shouldCoast);

    car.currentInput.forward = forward;
    car.currentInput.brake = brake;
  }

  private createControlsSnapshot(car: PreviewCar): ControlsSnapshot {
    return {
      x: Number(car.currentInput.left) - Number(car.currentInput.right),
      z: Number(car.currentInput.forward) - Number(car.currentInput.brake),
      source: 'none',
    };
  }

  private findDrivingSampleIndex(car: PreviewCar) {
    const position = car.vehicle.telemetry.spherePosition;
    let bestIndex = wrapPathIndex(car.wrappedIndex - 1, this.path.samples.length);
    let bestDistanceSq = Number.POSITIVE_INFINITY;

    for (let offset = -6; offset <= 12; offset += 1) {
      const sampleIndex = wrapPathIndex(car.wrappedIndex + offset, this.path.samples.length);
      const distanceSq = position.distanceToSquared(this.path.samples[sampleIndex].position);
      if (distanceSq < bestDistanceSq) {
        bestDistanceSq = distanceSq;
        bestIndex = sampleIndex;
      }
    }

    return bestIndex;
  }

  private computeAiControls(car: PreviewCar): ControlsSnapshot {
    const position = car.vehicle.telemetry.spherePosition;
    const sphereVelocity = car.vehicle.telemetry.sphereVelocity;
    this.advanceWaypointProgress(car);
    const baseIndex = this.findDrivingSampleIndex(car);
    const currentSample = this.path.samples[baseIndex];
    const currentProgress = car.lapCount * this.path.samples.length + car.progressSamples;

    let desiredLane = clamp(
      car.laneBias * 0.16 - currentSample.turnBias * 0.08,
      -PREVIEW_LANE_LIMIT,
      PREVIEW_LANE_LIMIT,
    );
    let trafficSlowdown = 0;

    const leaderProgress = Math.max(
      ...this.cars.map((entry) => entry.lapCount * this.path.samples.length + entry.progressSamples),
    );

    for (const other of this.cars) {
      if (other === car) {
        continue;
      }

      this.relativeOffset.subVectors(other.vehicle.telemetry.spherePosition, position);
      const forwardDistance = this.relativeOffset.dot(currentSample.tangent);
      const lateralDistance = this.relativeOffset.dot(currentSample.right);
      const planarDistanceSq = this.relativeOffset.lengthSq();
      const otherProgress = other.lapCount * this.path.samples.length + other.progressSamples;
      const progressGap = otherProgress - currentProgress;

      if (progressGap > 0 && forwardDistance > 0.55 && forwardDistance < 3.2) {
        if (Math.abs(lateralDistance - desiredLane) < 0.42) {
          trafficSlowdown = Math.max(trafficSlowdown, (3.2 - forwardDistance) / 5.6);
        }
      }

      if (planarDistanceSq > 0.001 && planarDistanceSq < 1.1 * 1.1) {
        desiredLane -= clamp(lateralDistance, -1, 1) * 0.015;
      }
    }

    desiredLane = clamp(desiredLane, -PREVIEW_LANE_LIMIT, PREVIEW_LANE_LIMIT);

    const centerOffset = this.tempVector
      .subVectors(position, currentSample.position)
      .dot(currentSample.right);
    car.currentCenterOffset = centerOffset;
    this.headingForward.set(0, 0, 1).applyQuaternion(car.vehicle.orientation).normalize();
    const horizontalSpeed = this.tempVectorB.set(sphereVelocity.x, 0, sphereVelocity.z).length();
    const velocityDirection =
      horizontalSpeed > 0.25
        ? this.tempVectorB.set(sphereVelocity.x, 0, sphereVelocity.z).normalize()
        : this.headingForward;
    const velocityForwardness = clamp(velocityDirection.dot(this.headingForward), -1, 1);
    const speedRatio = clamp((horizontalSpeed - 2.8) / 6.4, 0, 1);
    const turnCompression = Math.round((1 - currentSample.targetSpeed) * 5);
    const lookaheadSteps =
      PREVIEW_LOOKAHEAD_MIN +
      Math.round(speedRatio * (PREVIEW_LOOKAHEAD_MAX - PREVIEW_LOOKAHEAD_MIN)) -
      turnCompression;
    const correctiveLane = clamp(
      desiredLane - centerOffset * 0.22,
      -PREVIEW_LANE_LIMIT,
      PREVIEW_LANE_LIMIT,
    );
    let targetIndex = wrapPathIndex(
      car.wrappedIndex + clamp(lookaheadSteps, PREVIEW_LOOKAHEAD_MIN - 2, PREVIEW_LOOKAHEAD_MAX),
      this.path.samples.length,
    );
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const targetSample = this.path.samples[targetIndex];
      this.targetPoint
        .copy(targetSample.position)
        .addScaledVector(targetSample.right, correctiveLane);
      this.localTarget
        .subVectors(this.targetPoint, position)
        .applyQuaternion(this.inverseOrientation.copy(car.vehicle.orientation).invert());
      if (this.localTarget.z >= PREVIEW_TARGET_MIN_FORWARD) {
        break;
      }
      targetIndex = wrapPathIndex(targetIndex + 2, this.path.samples.length);
    }

    const targetDistanceForward = Math.max(Math.abs(this.localTarget.z), 1.35);
    const laneError = centerOffset - correctiveLane;
    const routeRisk = Math.max(Math.abs(centerOffset) - 0.92, 0);
    const purePursuit = clamp(this.localTarget.x / targetDistanceForward, -1, 1);
    const laneCorrection = clamp(laneError / 1.2, -0.65, 0.65);
    const wallPressure = clamp((Math.abs(centerOffset) - 0.8) / 0.42, 0, 1);
    const wallAvoidance =
      wallPressure > 0 ? -Math.sign(centerOffset) * (0.55 + wallPressure * 1.15) : 0;
    const steerDemand = clamp(
      purePursuit * 1.95 +
        laneCorrection * 0.72 +
        wallAvoidance,
      -1,
      1,
    );
    this.applyDiscreteTurnInput(car, steerDemand);

    const leaderGap = clamp((leaderProgress - currentProgress) / this.path.samples.length, 0, 1);
    const targetSpeed =
      this.computeTargetSpeed(car, baseIndex, trafficSlowdown) + leaderGap * 0.35;
    car.currentTargetSpeed = targetSpeed;
    const overspeed = horizontalSpeed - targetSpeed;
    const turnSeverity = clamp(Math.abs(purePursuit) * 1.35 + Math.abs(laneCorrection) * 0.4, 0, 1);
    const brakeDemand = Math.max(
      clamp((overspeed - 0.7) / 2.4, 0, 1),
      clamp((turnSeverity - 0.74) / 0.2, 0, 1) * clamp((horizontalSpeed - 5.2) / 1.8, 0, 1),
      clamp((routeRisk - 0.2) / 0.4, 0, 1),
    );
    const forceForwardRecovery =
      velocityForwardness < 0.05 ||
      this.localTarget.z < PREVIEW_TARGET_MIN_FORWARD ||
      (car.currentInput.brake && horizontalSpeed < PREVIEW_BRAKE_MIN_SPEED);
    const shouldCoast =
      !forceForwardRecovery &&
      brakeDemand < PREVIEW_BRAKE_RELEASE_THRESHOLD &&
      horizontalSpeed > PREVIEW_COAST_MIN_SPEED &&
      (horizontalSpeed > targetSpeed * 1.02 ||
        (turnSeverity > 0.58 && horizontalSpeed > targetSpeed * 0.94));
    this.applyDiscreteDriveInput(car, brakeDemand, shouldCoast, forceForwardRecovery);
    return this.createControlsSnapshot(car);
  }

  private computeTargetSpeed(car: PreviewCar, nearestIndex: number, trafficSlowdown: number) {
    let futureMinSpeed = 1;
    for (let offset = 0; offset <= 14; offset += 1) {
      const sample = this.path.samples[wrapPathIndex(nearestIndex + offset, this.path.samples.length)];
      futureMinSpeed = Math.min(futureMinSpeed, sample.targetSpeed);
    }

    const aggressionBoost = (car.aggression - 1) * 2.2;
    const throttleWave = Math.sin(this.elapsedSeconds * 0.42 + car.variationPhase) * 0.2;
    return clamp(
      lerp(PREVIEW_WORLD_SPEED_MIN, PREVIEW_WORLD_SPEED_MAX, futureMinSpeed) +
        aggressionBoost +
        throttleWave -
        trafficSlowdown * 0.35,
      PREVIEW_WORLD_SPEED_MIN,
      PREVIEW_WORLD_SPEED_MAX + 0.9,
    );
  }

  private advanceWaypointProgress(car: PreviewCar) {
    const maxAdvancePerStep = 6;
    for (let advance = 0; advance < maxAdvancePerStep; advance += 1) {
      const targetSample = this.path.samples[car.wrappedIndex];
      const toCar = this.tempVector.subVectors(car.vehicle.telemetry.spherePosition, targetSample.position);
      const passedTarget =
        toCar.dot(targetSample.tangent) > 0 || toCar.lengthSq() <= 0.9 * 0.9;
      if (!passedTarget) {
        break;
      }

      car.wrappedIndex = wrapPathIndex(car.wrappedIndex + 1, this.path.samples.length);
      car.progressSamples += 1;

      if (car.progressSamples < this.path.samples.length) {
        continue;
      }

      car.progressSamples -= this.path.samples.length;
      car.lapCount += 1;
      const lapMs = (this.elapsedSeconds - car.lapStartTimeSeconds) * 1000;
      car.lastLapMs = lapMs;
      car.bestLapMs = car.bestLapMs === null ? lapMs : Math.min(car.bestLapMs, lapMs);
      car.lapStartTimeSeconds = this.elapsedSeconds;
    }
  }

  private updateRecoveryState(car: PreviewCar, dt: number) {
    const position = car.vehicle.telemetry.spherePosition;
    let routeDistance = Number.POSITIVE_INFINITY;
    for (let offset = -2; offset <= 2; offset += 1) {
      const sampleIndex = wrapPathIndex(car.wrappedIndex + offset, this.path.samples.length);
      routeDistance = Math.min(routeDistance, position.distanceTo(this.path.samples[sampleIndex].position));
    }
    const movedDistance = position.distanceTo(car.lastPosition);
    const speed = car.vehicle.telemetry.sphereVelocity.length();

    car.offRouteTimer =
      routeDistance > PREVIEW_RECOVERY_ROUTE_DISTANCE ? car.offRouteTimer + dt : 0;
    car.stationaryTimer =
      movedDistance < 0.02 && speed < 0.18 ? car.stationaryTimer + dt : 0;
    car.lastPosition.copy(position);

    if (
      car.offRouteTimer > PREVIEW_RECOVERY_OFF_ROUTE_SECONDS ||
      car.stationaryTimer > PREVIEW_RECOVERY_STATIONARY_SECONDS
    ) {
      this.resetCar(car, wrapPathIndex(car.wrappedIndex + 2, this.path.samples.length), true);
    }
  }

  private syncCamera(immediate: boolean) {
    const rankedCars = [...this.cars].sort((left, right) => {
      const leftProgress = left.lapCount * this.path.samples.length + left.progressSamples;
      const rightProgress = right.lapCount * this.path.samples.length + right.progressSamples;
      return rightProgress - leftProgress;
    });
    const leader = rankedCars[0] ?? this.cars[0];
    const chaser = rankedCars[1] ?? leader;
    const support = rankedCars[2] ?? chaser;
    const leaderPosition = leader.vehicle.telemetry.spherePosition;
    const chaserPosition = chaser.vehicle.telemetry.spherePosition;
    const supportPosition = support.vehicle.telemetry.spherePosition;

    this.raceFocus
      .copy(leaderPosition)
      .multiplyScalar(0.46)
      .addScaledVector(chaserPosition, 0.34)
      .addScaledVector(supportPosition, 0.2);
    this.raceForward
      .set(0, 0, 0)
      .addScaledVector(this.headingForward.set(0, 0, 1).applyQuaternion(leader.vehicle.orientation), 0.5)
      .addScaledVector(this.tempVector.set(0, 0, 1).applyQuaternion(chaser.vehicle.orientation), 0.32)
      .addScaledVector(this.tempVectorB.set(0, 0, 1).applyQuaternion(support.vehicle.orientation), 0.18)
      .normalize();
    if (this.raceForward.lengthSq() < 1e-6) {
      this.raceForward.set(0, 0, 1);
    }

    const orbitPhase = this.elapsedSeconds * 0.045;
    const sway = Math.sin(orbitPhase - 0.9);
    const drift = Math.cos(orbitPhase * 0.52 + 0.35);
    const right = this.orbitRight.crossVectors(WORLD_UP, this.raceForward).normalize();

    this.lookTarget
      .copy(this.raceFocus)
      .addScaledVector(this.raceForward, 1.9)
      .addScaledVector(WORLD_UP, 0.95);
    this.cameraTarget
      .copy(this.raceFocus)
      .addScaledVector(this.raceForward, -4.8 + drift * 0.28)
      .addScaledVector(right, -7.1 + sway * 0.85)
      .addScaledVector(WORLD_UP, 10.6 + drift * 0.24);

    if (immediate) {
      this.cameraFocus.copy(this.lookTarget);
      this.camera.position.copy(this.cameraTarget);
    } else {
      const focusLerp = 1 - Math.exp(-FIXED_DT * 1.15);
      const positionLerp = 1 - Math.exp(-FIXED_DT * 0.72);
      this.cameraFocus.lerp(this.lookTarget, focusLerp);
      this.camera.position.lerp(this.cameraTarget, positionLerp);
    }

    this.camera.lookAt(this.cameraFocus);
    this.camera.updateMatrixWorld();
  }

}

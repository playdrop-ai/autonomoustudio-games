/// <reference types="playdrop-sdk-types" />

import type * as ThreeType from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type {
  World as RapierWorld,
  RigidBody as RapierRigidBody,
  RigidBodyDesc as RapierRigidBodyDesc,
  Collider as RapierCollider,
  ColliderDesc as RapierColliderDesc,
  KinematicCharacterController as RapierCharacterController,
  Rotation as RapierRotation,
  Vector as RapierVector,
} from '@dimforge/rapier3d-compat';

import {
  THREE,
  GLTFLoader,
  RAPIER,
  nipplejs,
  type JoystickManager,
} from './vendor-runtime';
import {
  detectRuntimeDeviceFlags,
  resolveQualityProfile,
  type QualityProfile,
  type QualityProfileName,
  type RuntimeDeviceInfo,
} from '../perf-shared/quality';
import {
  createBenchmarkPayload,
  formatBenchmarkErrorTitle,
  formatBenchmarkTitle,
} from '../perf-shared/benchmark';
import {
  createPerfHud,
  createPerfSubsystemTimer,
  createPerfTracker,
  type PerfSampleSource,
} from '../perf-shared/perf';
import { createWebAudioBus, type AudioBusEvent } from '../perf-shared/audio-bus';
import {
  applyGamepadDeadzone,
  getActiveGamepad,
  readGamepadAxis,
  readGamepadButtonPressed,
  readGamepadButtonValue,
} from '../perf-shared/gamepad';
import { LEVEL_INSTANCES } from './data/level-layout';
import {
  COURSE_BEACONS,
  COURSE_BRIDGES,
  COURSE_PLATFORMS,
  FINISH_GATE,
  SHARDSPAN_FALL_PENALTY_SECONDS,
  SHARDSPAN_INITIAL_PHASE,
  SHARDSPAN_TIMER_LIMIT_SECONDS,
  type PhaseFamily,
} from './shardspan-course';
import {
  PREFABS,
  type Transform12,
  type PrefabDefinition,
  type BoxShapeDefinition,
  type SphereShapeDefinition,
  type ConcaveColliderDefinition,
  type TriggerDefinition,
} from './data/prefab-registry';
import { CONCAVE_COLLISION_SHAPES } from './data/collision-shapes';
import { GAME_CONFIG, type CapsuleColliderDefinition } from './data/game-config';
import { STATIC_RENDER_GROUPS } from './data/render-manifest';
import { STATIC_PHYSICS_BODIES } from './data/physics-manifest';

type HostLoadingState = {
  status: 'loading' | 'ready' | 'error';
  message?: string;
  progress?: number;
};

type PlaydropGlobal = {
  host?: {
    setLoadingState?: (state: HostLoadingState) => void;
  };
};

type StarterKitSdk = PlaydropGlobal & {
  device?: RuntimeDeviceInfo | null;
};

type HarnessRuntimeConfig = {
  perfUiEnabled?: boolean;
  benchmarkEnabled?: boolean;
  qualityProfile?: QualityProfileName;
};

type GameRenderer = {
  domElement: HTMLCanvasElement;
  outputColorSpace: unknown;
  toneMapping: number;
  toneMappingExposure: number;
  shadowMap: {
    enabled: boolean;
    type: number;
  };
  info: {
    autoReset: boolean;
    reset: () => void;
    render: {
      calls: number;
      triangles: number;
    };
  };
  setPixelRatio: (value: number) => void;
  getPixelRatio: () => number;
  setSize: (width: number, height: number, updateStyle?: boolean) => void;
  render: (scene: ThreeType.Scene, camera: ThreeType.Camera) => void;
};

type GameMode = 'overlay' | 'playing';
type OverlayState = 'start' | 'success' | 'fail';
type DebugView = 'render' | 'physics';
type CameraMode = 'follow' | 'topdown';
type InputMode = 'keyboard' | 'gamepad' | 'touch';
type GroundedReason =
  | 'airborne'
  | 'computed-grounded'
  | 'corrected-downward-motion'
  | 'ground-snap'
  | 'raycast-ground'
  | 'respawned';

type LandingEvent = {
  frame: number;
  impactSpeed: number;
};

type TriggerRole = 'beacon' | 'finish-gate' | 'falling-platform' | 'brick-bottom' | 'coin-collect';

type TriggerEvent = {
  frame: number;
  role: TriggerRole;
  name: string;
};

type FrameInput = {
  moveX: number;
  moveZ: number;
  lookX: number;
  lookY: number;
  zoom: number;
  jumpPressed: boolean;
  inputMode: InputMode;
};

type GhostFrameInput = {
  moveX: number;
  moveZ: number;
  lookX: number;
  lookY: number;
  zoom: number;
  jumpDown: boolean;
};

type GhostScriptStep = {
  label: string;
  frames: number;
  input: GhostFrameInput;
  onStart?: () => void;
};

type GhostScript = {
  name: string;
  steps: readonly GhostScriptStep[];
};

type GhostRunState = {
  name: string;
  active: boolean;
  completed: boolean;
  currentStepIndex: number;
  frameInStep: number;
  currentInput: GhostFrameInput;
  steps: readonly GhostScriptStep[];
};

type LoadedModelAsset = {
  scene: ThreeType.Object3D;
  animations: ThreeType.AnimationClip[];
};

type ColliderHandleGroup = {
  body: RapierRigidBody;
  colliders: RapierCollider[];
};

type GroundProbeResult = {
  grounded: boolean;
  hoverDistance: number;
};

type TriggerShapeBase = {
  role: TriggerRole;
  matrix: ThreeType.Matrix4;
};

type BoxTriggerShape = BoxShapeDefinition & TriggerShapeBase;

type SphereTriggerShape = SphereShapeDefinition & TriggerShapeBase;

type TriggerShape = BoxTriggerShape | SphereTriggerShape;

type CoursePlatformState = {
  root: ThreeType.Group;
  debugRoot: ThreeType.Group;
  colliderGroup: ColliderHandleGroup;
};

type PhaseBridgeState = {
  name: string;
  phase: PhaseFamily | null;
  root: ThreeType.Group;
  mesh: ThreeType.Mesh;
  colliderGroup: ColliderHandleGroup;
  active: boolean;
  baseY: number;
  bobPhase: number;
};

type BeaconState = {
  id: string;
  label: string;
  cue: string;
  nextPhase: PhaseFamily;
  root: ThreeType.Group;
  trigger: SphereTriggerShape;
  base: ThreeType.Mesh;
  crystal: ThreeType.Mesh;
  beam: ThreeType.Mesh;
  ring: ThreeType.Mesh;
  collected: boolean;
  checkpoint: ThreeType.Vector3;
  pulse: number;
  bobPhase: number;
};

type FinishGateState = {
  root: ThreeType.Group;
  trigger: BoxTriggerShape;
  arch: ThreeType.Mesh;
  beam: ThreeType.Mesh;
  pulse: number;
};

type CloudState = {
  root: ThreeType.Group;
  basePosition: ThreeType.Vector3;
  floatAmplitude: number;
  floatSpeed: number;
  phase: number;
};

type BrickState = {
  name: string;
  root: ThreeType.Group;
  visual: ThreeType.Object3D;
  debugRoot: ThreeType.Group;
  colliderGroup: ColliderHandleGroup;
  trigger: BoxTriggerShape;
  broken: boolean;
};

type FallingPlatformState = {
  name: string;
  root: ThreeType.Group;
  debugRoot: ThreeType.Group;
  colliderGroup: ColliderHandleGroup;
  trigger: BoxTriggerShape;
  state: 'idle' | 'falling' | 'gone';
  fallVelocity: number;
  spawnPosition: ThreeType.Vector3;
  spawnRotation: ThreeType.Quaternion;
};

type CharacterAnimationName = 'idle' | 'walk' | 'jump';

type PlayerState = {
  root: ThreeType.Group;
  model: ThreeType.Object3D;
  shadow: ThreeType.Mesh;
  debugMesh: ThreeType.Mesh;
  mixer: ThreeType.AnimationMixer;
  actions: Record<CharacterAnimationName, ThreeType.AnimationAction>;
  currentAnimation: CharacterAnimationName;
  colliderGroup: ColliderHandleGroup;
  colliderOffset: ThreeType.Vector3;
  capsuleHalfHeight: number;
  capsuleRadius: number;
  horizontalVelocity: ThreeType.Vector3;
  verticalVelocity: number;
  rotationDirection: number;
  grounded: boolean;
  previouslyGrounded: boolean;
  jumpSingleAvailable: boolean;
  jumpDoubleAvailable: boolean;
  beaconsCleared: number;
  resetCount: number;
  recentReset: boolean;
};

type ParticleConfig = {
  position: ThreeType.Vector3;
  velocity: ThreeType.Vector3;
  color: number;
  size: number;
  life: number;
  gravity: number;
};

type Particle = {
  sprite: ThreeType.Sprite;
  material: ThreeType.SpriteMaterial;
  velocity: ThreeType.Vector3;
  life: number;
  age: number;
  sizeStart: number;
  gravity: number;
  active: boolean;
};

type PerfTrackerHandle = ReturnType<typeof createPerfTracker>;
type PerfSubsystemTimerHandle = ReturnType<typeof createPerfSubsystemTimer>;
type PerfHudHandle = ReturnType<typeof createPerfHud>;
type StaticColliderDefinition = ConcaveColliderDefinition | BoxShapeDefinition | SphereShapeDefinition;
type RenderPerfStats = {
  drawCalls: number;
  triangles: number;
};

type CameraSnapshot = {
  rigPosition: ThreeType.Vector3;
  targetEulerDegrees: ThreeType.Vector3;
  visibleEulerDegrees: ThreeType.Vector3;
  localCameraPosition: ThreeType.Vector3;
  worldPosition: ThreeType.Vector3;
  worldQuaternion: ThreeType.Quaternion;
  worldMatrix: ThreeType.Matrix4;
  forward: ThreeType.Vector3;
  up: ThreeType.Vector3;
};

type CameraDeltaDiagnostics = {
  positionDistance: number;
  yawDegrees: number;
  pitchDegrees: number;
  rollDegrees: number;
  forwardDegrees: number;
  upDegrees: number;
  matrixMaxElementDelta: number;
};

type CameraSourceMatch = {
  matched: boolean;
  maxElementDelta: number;
};

type OrientationSample = {
  name: string;
  object: ThreeType.Object3D;
};

type DesktopControlHintKey = 'w' | 'a' | 's' | 'd' | 'space';

declare global {
  interface Window {
    advanceTime?: (ms: number) => void;
    render_game_to_text?: () => string;
    __listingCapture?: {
      prepare: (sceneId: string) => void;
    };
    __starterKitDebug?: {
      runGhost: (name?: string) => void;
      stopGhost: () => void;
      stepFrames: (count: number) => void;
      setDebugView: (mode: DebugView) => void;
      setCameraMode: (mode: CameraMode) => void;
      setPaused: (paused: boolean) => void;
      snapshot: () => unknown;
    };
    __starterKit3dPlatformerSdkPromise__?: Promise<StarterKitSdk>;
    __starterKit3dPlatformerSdk__?: StarterKitSdk;
    __starterKit3dPlatformerHarnessConfig__?: HarnessRuntimeConfig;
  }
}

const CANVAS_ID = 'game-canvas';
const OVERLAY_ID = 'overlay';
const OVERLAY_EYEBROW_ID = 'overlay-eyebrow';
const OVERLAY_TITLE_ID = 'overlay-title';
const OVERLAY_SUMMARY_ID = 'overlay-summary';
const OVERLAY_STATS_ID = 'overlay-stats';
const START_BUTTON_ID = 'start-button';
const SECONDARY_BUTTON_ID = 'secondary-button';
const TIMER_VALUE_ID = 'timer-value';
const TIMER_FILL_ID = 'timer-fill';
const PROGRESS_VALUE_ID = 'progress-value';
const PHASE_VALUE_ID = 'phase-value';
const NEXT_OBJECTIVE_ID = 'next-objective';
const TOUCH_CONTROLS_ID = 'touch-controls';
const TOUCH_JOYSTICK_ZONE_ID = 'touch-joystick-zone';
const JUMP_BUTTON_ID = 'jump-button';
const DESKTOP_CONTROL_HINTS_ID = 'desktop-control-hints';
const DESKTOP_KEY_W_ID = 'desktop-key-w';
const DESKTOP_KEY_A_ID = 'desktop-key-a';
const DESKTOP_KEY_S_ID = 'desktop-key-s';
const DESKTOP_KEY_D_ID = 'desktop-key-d';
const DESKTOP_KEY_SPACE_ID = 'desktop-key-space';
const DEBUG_PANEL_ID = 'debug-panel';
const RENDER_MODE_BUTTON_ID = 'render-mode-button';
const PHYSICS_MODE_BUTTON_ID = 'physics-mode-button';
const FOLLOW_CAMERA_BUTTON_ID = 'follow-camera-button';
const TOPDOWN_CAMERA_BUTTON_ID = 'topdown-camera-button';
const GHOST_START_BUTTON_ID = 'ghost-start-button';
const GHOST_STOP_BUTTON_ID = 'ghost-stop-button';
const GHOST_RESET_BUTTON_ID = 'ghost-reset-button';
const PAUSE_BUTTON_ID = 'pause-button';
const STEP_FRAME_BUTTON_ID = 'step-frame-button';
const STEP_TEN_FRAMES_BUTTON_ID = 'step-ten-frames-button';
const AXES_TOGGLE_BUTTON_ID = 'axes-toggle-button';
const TRIGGERS_TOGGLE_BUTTON_ID = 'triggers-toggle-button';
const CAMERA_GIZMO_TOGGLE_BUTTON_ID = 'camera-gizmo-toggle-button';
const DEBUG_STATUS_ID = 'debug-status';

const FIXED_DT = 1 / 60;
const FIXED_DT_MS = 1000 / 60;
const TOUCH_LOOK_SENSITIVITY = 0.14;
const KEYBOARD_LOOK_SPEED = 1;
const GAMEPAD_LOOK_SPEED = 1.25;
const GAMEPAD_DEADZONE = 0.14;
const TOUCH_DEADZONE = 0.18;
const WORLD_UP = new THREE.Vector3(0, 1, 0);
const IDENTITY_QUATERNION = new THREE.Quaternion();
const ONE_VECTOR = new THREE.Vector3(1, 1, 1);
const PLAYER_SHADOW_Y = -0.42;
const PLAYER_DEBUG_COLOR = 0xf8d84b;
const PHASE_AMBER_COLOR = 0xf0b43f;
const PHASE_COBALT_COLOR = 0x59a6ff;
const RELAY_CLEAR_COLOR = 0xf8fafc;
const PHYSICS_BACKGROUND = new THREE.Color(0x0b1220);
const RENDER_BACKGROUND = new THREE.Color(
  GAME_CONFIG.environment.backgroundColor[0],
  GAME_CONFIG.environment.backgroundColor[1],
  GAME_CONFIG.environment.backgroundColor[2],
);
const TOPDOWN_CAMERA_HEIGHT = 36;
const TOPDOWN_CAMERA_TILT = 0.0001;
const FALL_PLATFORM_DROP_SPEED = 15;
const GROUND_RAYCAST_MARGIN = 0.12;
const GROUND_MIN_NORMAL_Y = 0.45;
const WORLD_TILT_THRESHOLD_DEGREES = 1;
const CAMERA_TILT_THRESHOLD_DEGREES = 0.5;
const CAMERA_SOURCE_MATCH_THRESHOLD = 0.0005;
const ORIENTATION_SAMPLE_LIMIT = 4;
const PLAYER_AXES_SIZE = 1.1;
const WORLD_AXES_SIZE = 1.4;
const CAMERA_RIG_AXES_SIZE = 1.2;
const PLATFORM_AXES_SIZE = 0.8;
const CAMERA_GIZMO_LENGTH = 2.2;
const DEFAULT_CAMERA_PITCH_DEGREES = -28;
const DEFAULT_CAMERA_YAW_DEGREES = 90;
const DEFAULT_CAMERA_ZOOM = 12.5;
const BEST_TIME_STORAGE_KEY = 'autonomoustudio:shardspan:best-time-seconds';
const PERF_SUBSYSTEM_NAMES = [
  'fixedUpdate',
  'physicsStep',
  'audio',
  'bridgeUpdate',
  'triggerUpdate',
  'fallingPlatformUpdate',
  'effectsUpdate',
  'render',
] as const;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function lerp(current: number, target: number, amount: number): number {
  return current + (target - current) * amount;
}

function lerpAngleRadians(current: number, target: number, amount: number): number {
  return current + Math.atan2(Math.sin(target - current), Math.cos(target - current)) * amount;
}

function getCapsuleCylinderHeight(shape: CapsuleColliderDefinition): number {
  return Math.max(0, shape.height - shape.radius * 2);
}

function getCapsuleHalfHeight(shape: CapsuleColliderDefinition): number {
  return getCapsuleCylinderHeight(shape) * 0.5;
}

function hashString(input: string): number {
  let hash = 0;
  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function godotTransformToMatrix(transform: Transform12): ThreeType.Matrix4 {
  const [xx, xy, xz, yx, yy, yz, zx, zy, zz, tx, ty, tz] = transform;
  return new THREE.Matrix4().set(
    xx,
    xy,
    xz,
    tx,
    yx,
    yy,
    yz,
    ty,
    zx,
    zy,
    zz,
    tz,
    0,
    0,
    0,
    1,
  );
}

function applyTransform(object: ThreeType.Object3D, transform: Transform12): void {
  const matrix = godotTransformToMatrix(transform);
  matrix.decompose(object.position, object.quaternion, object.scale);
  object.updateMatrix();
  object.updateMatrixWorld(true);
}

function matrixToRapierVector(matrix: ThreeType.Matrix4): RapierVector {
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  matrix.decompose(position, quaternion, scale);
  return new RAPIER.Vector3(position.x, position.y, position.z);
}

function matrixToRapierRotation(matrix: ThreeType.Matrix4): RapierRotation {
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  matrix.decompose(position, quaternion, scale);
  return new RAPIER.Quaternion(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
}

function matrixToPositionQuaternion(matrix: ThreeType.Matrix4): {
  position: ThreeType.Vector3;
  quaternion: ThreeType.Quaternion;
} {
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  matrix.decompose(position, quaternion, scale);
  return { position, quaternion };
}

function combineTransforms(root: Transform12, local: Transform12): ThreeType.Matrix4 {
  return godotTransformToMatrix(root).multiply(godotTransformToMatrix(local));
}

function resolveAssetPath(resPath: string): string {
  if (resPath.startsWith('res://models/')) {
    return `./assets/models/${resPath.slice('res://models/'.length)}`;
  }
  if (resPath.startsWith('res://sprites/')) {
    return `./assets/sprites/${resPath.slice('res://sprites/'.length)}`;
  }
  if (resPath.startsWith('res://sounds/')) {
    return `./assets/audio/${resPath.slice('res://sounds/'.length)}`;
  }
  if (resPath.startsWith('res://fonts/')) {
    return `./assets/fonts/${resPath.slice('res://fonts/'.length)}`;
  }
  throw new Error(`[starter-kit-3d-platformer] Unsupported asset path ${resPath}`);
}

function findObjectByPath(root: ThreeType.Object3D, objectPath: string): ThreeType.Object3D | null {
  const segments = objectPath.split('/').filter(Boolean);
  let current: ThreeType.Object3D | null = root;

  for (const segment of segments) {
    current = current?.children.find((child) => child.name === segment) ?? null;
    if (!current) {
      return null;
    }
  }

  return current;
}

function collectNodePaths(root: ThreeType.Object3D, prefix = '', output: string[] = []): string[] {
  const currentPath = `${prefix}/${root.name || '<unnamed>'}`;
  output.push(currentPath);
  for (const child of root.children) {
    collectNodePaths(child, currentPath, output);
  }
  return output;
}

function setShadowProperties(
  object: ThreeType.Object3D,
  options: { castShadow?: boolean; receiveShadow?: boolean } = {},
): void {
  const castShadow = options.castShadow ?? true;
  const receiveShadow = options.receiveShadow ?? true;
  object.traverse((child) => {
    const mesh = child as ThreeType.Mesh;
    if ('isMesh' in mesh && mesh.isMesh) {
      mesh.castShadow = castShadow;
      mesh.receiveShadow = receiveShadow;
      if (Array.isArray(mesh.material)) {
        for (const material of mesh.material) {
          material.transparent = material.transparent || material.opacity < 1;
          material.needsUpdate = true;
        }
      } else if (mesh.material) {
        mesh.material.transparent = mesh.material.transparent || mesh.material.opacity < 1;
        mesh.material.needsUpdate = true;
      }
    }
  });
}

function fillTriggerWorldMatrix(
  target: ThreeType.Matrix4,
  trigger: TriggerShape,
  root: ThreeType.Object3D,
): ThreeType.Matrix4 {
  return target.multiplyMatrices(root.matrixWorld, trigger.matrix);
}

function capsuleIntersectsSphere(
  capsuleStart: ThreeType.Vector3,
  capsuleEnd: ThreeType.Vector3,
  capsuleRadius: number,
  sphereCenter: ThreeType.Vector3,
  sphereRadius: number,
): boolean {
  const segmentX = capsuleEnd.x - capsuleStart.x;
  const segmentY = capsuleEnd.y - capsuleStart.y;
  const segmentZ = capsuleEnd.z - capsuleStart.z;
  const lengthSq = segmentX * segmentX + segmentY * segmentY + segmentZ * segmentZ;
  const sphereOffsetX = sphereCenter.x - capsuleStart.x;
  const sphereOffsetY = sphereCenter.y - capsuleStart.y;
  const sphereOffsetZ = sphereCenter.z - capsuleStart.z;
  const t =
    lengthSq === 0
      ? 0
      : clamp(
          (sphereOffsetX * segmentX + sphereOffsetY * segmentY + sphereOffsetZ * segmentZ) / lengthSq,
          0,
          1,
        );
  const closestX = capsuleStart.x + segmentX * t;
  const closestY = capsuleStart.y + segmentY * t;
  const closestZ = capsuleStart.z + segmentZ * t;
  const deltaX = sphereCenter.x - closestX;
  const deltaY = sphereCenter.y - closestY;
  const deltaZ = sphereCenter.z - closestZ;
  const radius = capsuleRadius + sphereRadius;
  return deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ <= radius * radius;
}

function shortestAngleDegrees(current: number, target: number): number {
  return THREE.MathUtils.radToDeg(
    Math.atan2(
      Math.sin(THREE.MathUtils.degToRad(target - current)),
      Math.cos(THREE.MathUtils.degToRad(target - current)),
    ),
  );
}

function quaternionToEulerDegrees(quaternion: ThreeType.Quaternion): ThreeType.Vector3 {
  const euler = new THREE.Euler().setFromQuaternion(quaternion, 'YXZ');
  return new THREE.Vector3(
    THREE.MathUtils.radToDeg(euler.x),
    THREE.MathUtils.radToDeg(euler.y),
    THREE.MathUtils.radToDeg(euler.z),
  );
}

function eulerDegreesToQuaternion(eulerDegrees: ThreeType.Vector3): ThreeType.Quaternion {
  return new THREE.Quaternion().setFromEuler(
    new THREE.Euler(
      THREE.MathUtils.degToRad(eulerDegrees.x),
      THREE.MathUtils.degToRad(eulerDegrees.y),
      THREE.MathUtils.degToRad(eulerDegrees.z),
      'YXZ',
    ),
  );
}

function createCameraSnapshot(): CameraSnapshot {
  return {
    rigPosition: new THREE.Vector3(),
    targetEulerDegrees: new THREE.Vector3(),
    visibleEulerDegrees: new THREE.Vector3(),
    localCameraPosition: new THREE.Vector3(),
    worldPosition: new THREE.Vector3(),
    worldQuaternion: new THREE.Quaternion(),
    worldMatrix: new THREE.Matrix4(),
    forward: new THREE.Vector3(0, 0, -1),
    up: new THREE.Vector3(0, 1, 0),
  };
}

function createGhostFrameInput(overrides: Partial<GhostFrameInput> = {}): GhostFrameInput {
  return {
    moveX: 0,
    moveZ: 0,
    lookX: 0,
    lookY: 0,
    zoom: 0,
    jumpDown: false,
    ...overrides,
  };
}

function vectorToRecord(vector: ThreeType.Vector3, digits = 3): { x: number; y: number; z: number } {
  return {
    x: Number(vector.x.toFixed(digits)),
    y: Number(vector.y.toFixed(digits)),
    z: Number(vector.z.toFixed(digits)),
  };
}

function angleBetweenVectorsDegrees(a: ThreeType.Vector3, b: ThreeType.Vector3): number {
  return THREE.MathUtils.radToDeg(a.angleTo(b));
}

function maxMatrixElementDelta(a: ThreeType.Matrix4, b: ThreeType.Matrix4): number {
  let maxDelta = 0;
  for (let index = 0; index < a.elements.length; index += 1) {
    maxDelta = Math.max(maxDelta, Math.abs(a.elements[index]! - b.elements[index]!));
  }
  return maxDelta;
}

class SpriteParticleSystem {
  readonly root: ThreeType.Group;
  private readonly particles: Particle[];

  constructor(texture: ThreeType.Texture, poolSize: number) {
    this.root = new THREE.Group();
    this.particles = [];

    for (let index = 0; index < poolSize; index += 1) {
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        opacity: 0,
      });
      const sprite = new THREE.Sprite(material);
      sprite.visible = false;
      this.root.add(sprite);
      this.particles.push({
        sprite,
        material,
        velocity: new THREE.Vector3(),
        life: 0,
        age: 0,
        sizeStart: 0,
        gravity: 0,
        active: false,
      });
    }
  }

  clear(): void {
    for (const particle of this.particles) {
      particle.active = false;
      particle.sprite.visible = false;
      particle.material.opacity = 0;
    }
  }

  emit(config: ParticleConfig): void {
    const particle = this.particles.find((entry) => !entry.active) ?? this.particles[0];
    particle.active = true;
    particle.age = 0;
    particle.life = config.life;
    particle.sizeStart = config.size;
    particle.gravity = config.gravity;
    particle.velocity.copy(config.velocity);
    particle.sprite.position.copy(config.position);
    particle.sprite.scale.setScalar(config.size);
    particle.material.color.setHex(config.color);
    particle.material.opacity = 1;
    particle.sprite.visible = true;
  }

  update(delta: number): void {
    for (const particle of this.particles) {
      if (!particle.active) {
        continue;
      }

      particle.age += delta;
      if (particle.age >= particle.life) {
        particle.active = false;
        particle.sprite.visible = false;
        particle.material.opacity = 0;
        continue;
      }

      particle.velocity.y += particle.gravity * delta;
      particle.sprite.position.addScaledVector(particle.velocity, delta);

      const t = particle.age / particle.life;
      particle.material.opacity = 1 - t;
      const scale = lerp(particle.sizeStart, particle.sizeStart * 0.3, t);
      particle.sprite.scale.setScalar(scale);
    }
  }
}

class PlatformerApp {
  private readonly host: PlaydropGlobal;
  private readonly canvas: HTMLCanvasElement;
  private readonly overlay: HTMLElement;
  private readonly overlayEyebrow: HTMLElement;
  private readonly overlayTitle: HTMLElement;
  private readonly overlaySummary: HTMLElement;
  private readonly overlayStats: HTMLElement;
  private readonly startButton: HTMLButtonElement;
  private readonly secondaryButton: HTMLButtonElement;
  private readonly timerValueLabel: HTMLElement;
  private readonly timerFill: HTMLElement;
  private readonly progressValueLabel: HTMLElement;
  private readonly phaseValueLabel: HTMLElement;
  private readonly nextObjectiveLabel: HTMLElement;
  private readonly touchControls: HTMLElement;
  private readonly joystickZone: HTMLElement;
  private readonly jumpButton: HTMLButtonElement;
  private readonly desktopControlHints: HTMLElement;
  private readonly desktopKeyHints: Record<DesktopControlHintKey, HTMLElement>;
  private readonly debugPanel: HTMLElement;
  private readonly renderModeButton: HTMLButtonElement;
  private readonly physicsModeButton: HTMLButtonElement;
  private readonly followCameraButton: HTMLButtonElement;
  private readonly topdownCameraButton: HTMLButtonElement;
  private readonly ghostStartButton: HTMLButtonElement;
  private readonly ghostStopButton: HTMLButtonElement;
  private readonly ghostResetButton: HTMLButtonElement;
  private readonly pauseButton: HTMLButtonElement;
  private readonly stepFrameButton: HTMLButtonElement;
  private readonly stepTenFramesButton: HTMLButtonElement;
  private readonly axesToggleButton: HTMLButtonElement;
  private readonly triggersToggleButton: HTMLButtonElement;
  private readonly cameraGizmoToggleButton: HTMLButtonElement;
  private readonly debugStatus: HTMLElement;
  private readonly isTouchDevice: boolean;
  private readonly qualityProfile: QualityProfile;
  private readonly benchmarkEnabled: boolean;
  private readonly perfTracker: PerfTrackerHandle;
  private readonly perfSubsystemTimer: PerfSubsystemTimerHandle;
  private readonly perfHud: PerfHudHandle;
  private readonly initialGhostRunName: string | null;
  private readonly keyboardKeys = new Set<string>();
  private readonly audio: ReturnType<typeof createWebAudioBus>;
  private readonly modelCache = new Map<string, Promise<LoadedModelAsset>>();
  private readonly textureCache = new Map<string, Promise<ThreeType.Texture>>();
  private readonly resizeObserver = () => this.handleResize();
  private readonly orientationSamples: OrientationSample[] = [];
  private readonly triggerDebugObjects: ThreeType.Object3D[] = [];
  private readonly axesDebugObjects: ThreeType.Object3D[] = [];
  private readonly sourceCameraMatrix = combineTransforms(
    GAME_CONFIG.viewTransform,
    GAME_CONFIG.cameraLocalTransform,
  );
  private readonly cameraOracle = createCameraSnapshot();
  private readonly runtimeCameraSnapshot = createCameraSnapshot();
  private readonly cameraOracleDelta: CameraDeltaDiagnostics = {
    positionDistance: 0,
    yawDegrees: 0,
    pitchDegrees: 0,
    rollDegrees: 0,
    forwardDegrees: 0,
    upDegrees: 0,
    matrixMaxElementDelta: 0,
  };

  private renderer: GameRenderer;
  private scene: ThreeType.Scene;
  private camera: ThreeType.PerspectiveCamera;
  private readonly runtimeCameraHelper: ThreeType.CameraHelper;
  private readonly cameraGizmoRoot: ThreeType.Group;
  private readonly runtimeCameraForwardArrow: ThreeType.ArrowHelper;
  private readonly runtimeCameraUpArrow: ThreeType.ArrowHelper;
  private readonly oracleCameraForwardArrow: ThreeType.ArrowHelper;
  private readonly oracleCameraUpArrow: ThreeType.ArrowHelper;
  private readonly worldAxesHelper: ThreeType.AxesHelper;
  private playerAxesHelper: ThreeType.AxesHelper | null = null;
  private cameraRigAxesHelper: ThreeType.AxesHelper | null = null;
  private world: RapierWorld;
  private characterController: RapierCharacterController;
  private staticRoot: ThreeType.Group;
  private renderRoot: ThreeType.Group;
  private debugRoot: ThreeType.Group;
  private particleSystem: SpriteParticleSystem | null = null;
  private player: PlayerState | null = null;
  private lastFrameTime = 0;
  private accumulatorMs = 0;
  private animationFrame = 0;
  private simulationFrame = 0;
  private mode: GameMode = 'overlay';
  private debugUiEnabled = false;
  private debugView: DebugView;
  private cameraMode: CameraMode;
  private activeInputMode: InputMode = 'keyboard';
  private footstepUrl = resolveAssetPath('res://sounds/walking.ogg');
  private jumpUrl = resolveAssetPath('res://sounds/jump.ogg');
  private landUrl = resolveAssetPath('res://sounds/land.ogg');
  private coinUrl = resolveAssetPath('res://sounds/coin.ogg');
  private breakUrl = resolveAssetPath('res://sounds/break.ogg');
  private fallUrl = resolveAssetPath('res://sounds/fall.ogg');
  private cameraFocus = new THREE.Vector3();
  private cameraTargetEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  private cameraCurrentEuler = new THREE.Euler(0, 0, 0, 'YXZ');
  private cameraZoomTarget: number = GAME_CONFIG.cameraController.defaultZoom;
  private cameraZoomCurrent: number = GAME_CONFIG.cameraController.defaultZoom;
  private cameraOracleZoomTarget: number = GAME_CONFIG.cameraController.defaultZoom;
  private cameraSourceMatch: CameraSourceMatch = {
    matched: false,
    maxElementDelta: Number.POSITIVE_INFINITY,
  };
  private keyboardLookX = 0;
  private keyboardLookY = 0;
  private touchLookDelta = new THREE.Vector2();
  private touchMove = new THREE.Vector2();
  private jumpTouchQueued = false;
  private zoomTouchDirection = 0;
  private activeLookPointerId: number | null = null;
  private activeLookPosition = new THREE.Vector2();
  private joystickManager: JoystickManager | null = null;
  private previousJumpDown = false;
  private worldCenter = new THREE.Vector3();
  private touchHudInitialized = false;
  private simulationPaused = false;
  private perfDebugEnabled = false;
  private showAxes = false;
  private showTriggers = false;
  private showCameraGizmo = false;
  private groundedReason: GroundedReason = 'airborne';
  private lastLandingEvent: LandingEvent | null = null;
  private lastTriggerHit: TriggerEvent | null = null;
  private ghostRun: GhostRunState | null = null;
  private lastPerfHudSampleFrame = -1;
  private benchmarkReported = false;
  private readonly coursePlatforms: CoursePlatformState[] = [];
  private readonly phaseBridges: PhaseBridgeState[] = [];
  private readonly beacons: BeaconState[] = [];
  private readonly clouds: CloudState[] = [];
  private readonly bricks: BrickState[] = [];
  private readonly fallingPlatforms: FallingPlatformState[] = [];
  private finishGate: FinishGateState | null = null;
  private overlayState: OverlayState = 'start';
  private currentPhase: PhaseFamily = SHARDSPAN_INITIAL_PHASE;
  private runStarted = false;
  private timerRemainingSeconds = SHARDSPAN_TIMER_LIMIT_SECONDS;
  private elapsedSeconds = 0;
  private deathCount = 0;
  private bestTimeSeconds: number | null = null;
  private checkpointPosition = new THREE.Vector3(
    GAME_CONFIG.playerSpawnTransform[9],
    GAME_CONFIG.playerSpawnTransform[10],
    GAME_CONFIG.playerSpawnTransform[11],
  );
  private readonly scratchVectorA = new THREE.Vector3();
  private readonly scratchVectorB = new THREE.Vector3();
  private readonly scratchVectorC = new THREE.Vector3();
  private readonly scratchVectorD = new THREE.Vector3();
  private readonly scratchVectorE = new THREE.Vector3();
  private readonly scratchVectorF = new THREE.Vector3();
  private readonly scratchVectorG = new THREE.Vector3();
  private readonly scratchQuaternion = new THREE.Quaternion();
  private readonly scratchMatrix = new THREE.Matrix4();
  private readonly scratchMatrixB = new THREE.Matrix4();
  private renderBackground: ThreeType.Color | ThreeType.Texture | null = RENDER_BACKGROUND;

  constructor(host: PlaydropGlobal, sdk: StarterKitSdk, runtimeConfig: HarnessRuntimeConfig | null) {
    this.host = host;

    const canvas = document.getElementById(CANVAS_ID);
    const overlay = document.getElementById(OVERLAY_ID);
    const overlayEyebrow = document.getElementById(OVERLAY_EYEBROW_ID);
    const overlayTitle = document.getElementById(OVERLAY_TITLE_ID);
    const overlaySummary = document.getElementById(OVERLAY_SUMMARY_ID);
    const overlayStats = document.getElementById(OVERLAY_STATS_ID);
    const startButton = document.getElementById(START_BUTTON_ID);
    const secondaryButton = document.getElementById(SECONDARY_BUTTON_ID);
    const timerValue = document.getElementById(TIMER_VALUE_ID);
    const timerFill = document.getElementById(TIMER_FILL_ID);
    const progressValue = document.getElementById(PROGRESS_VALUE_ID);
    const phaseValue = document.getElementById(PHASE_VALUE_ID);
    const nextObjective = document.getElementById(NEXT_OBJECTIVE_ID);
    const touchControls = document.getElementById(TOUCH_CONTROLS_ID);
    const joystickZone = document.getElementById(TOUCH_JOYSTICK_ZONE_ID);
    const jumpButton = document.getElementById(JUMP_BUTTON_ID);
    const desktopControlHints = document.getElementById(DESKTOP_CONTROL_HINTS_ID);
    const desktopKeyW = document.getElementById(DESKTOP_KEY_W_ID);
    const desktopKeyA = document.getElementById(DESKTOP_KEY_A_ID);
    const desktopKeyS = document.getElementById(DESKTOP_KEY_S_ID);
    const desktopKeyD = document.getElementById(DESKTOP_KEY_D_ID);
    const desktopKeySpace = document.getElementById(DESKTOP_KEY_SPACE_ID);
    const debugPanel = document.getElementById(DEBUG_PANEL_ID);
    const renderModeButton = document.getElementById(RENDER_MODE_BUTTON_ID);
    const physicsModeButton = document.getElementById(PHYSICS_MODE_BUTTON_ID);
    const followCameraButton = document.getElementById(FOLLOW_CAMERA_BUTTON_ID);
    const topdownCameraButton = document.getElementById(TOPDOWN_CAMERA_BUTTON_ID);
    const ghostStartButton = document.getElementById(GHOST_START_BUTTON_ID);
    const ghostStopButton = document.getElementById(GHOST_STOP_BUTTON_ID);
    const ghostResetButton = document.getElementById(GHOST_RESET_BUTTON_ID);
    const pauseButton = document.getElementById(PAUSE_BUTTON_ID);
    const stepFrameButton = document.getElementById(STEP_FRAME_BUTTON_ID);
    const stepTenFramesButton = document.getElementById(STEP_TEN_FRAMES_BUTTON_ID);
    const axesToggleButton = document.getElementById(AXES_TOGGLE_BUTTON_ID);
    const triggersToggleButton = document.getElementById(TRIGGERS_TOGGLE_BUTTON_ID);
    const cameraGizmoToggleButton = document.getElementById(CAMERA_GIZMO_TOGGLE_BUTTON_ID);
    const debugStatus = document.getElementById(DEBUG_STATUS_ID);

    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error('[starter-kit-3d-platformer] #game-canvas missing');
    }
    if (!(overlay instanceof HTMLElement)) {
      throw new Error('[starter-kit-3d-platformer] #overlay missing');
    }
    if (!(overlayEyebrow instanceof HTMLElement)) {
      throw new Error('[starter-kit-3d-platformer] #overlay-eyebrow missing');
    }
    if (!(overlayTitle instanceof HTMLElement)) {
      throw new Error('[starter-kit-3d-platformer] #overlay-title missing');
    }
    if (!(overlaySummary instanceof HTMLElement)) {
      throw new Error('[starter-kit-3d-platformer] #overlay-summary missing');
    }
    if (!(overlayStats instanceof HTMLElement)) {
      throw new Error('[starter-kit-3d-platformer] #overlay-stats missing');
    }
    if (!(startButton instanceof HTMLButtonElement)) {
      throw new Error('[starter-kit-3d-platformer] #start-button missing');
    }
    if (!(secondaryButton instanceof HTMLButtonElement)) {
      throw new Error('[starter-kit-3d-platformer] #secondary-button missing');
    }
    if (!(timerValue instanceof HTMLElement)) {
      throw new Error('[starter-kit-3d-platformer] #timer-value missing');
    }
    if (!(timerFill instanceof HTMLElement)) {
      throw new Error('[starter-kit-3d-platformer] #timer-fill missing');
    }
    if (!(progressValue instanceof HTMLElement)) {
      throw new Error('[starter-kit-3d-platformer] #progress-value missing');
    }
    if (!(phaseValue instanceof HTMLElement)) {
      throw new Error('[starter-kit-3d-platformer] #phase-value missing');
    }
    if (!(nextObjective instanceof HTMLElement)) {
      throw new Error('[starter-kit-3d-platformer] #next-objective missing');
    }
    if (!(touchControls instanceof HTMLElement)) {
      throw new Error('[starter-kit-3d-platformer] #touch-controls missing');
    }
    if (!(joystickZone instanceof HTMLElement)) {
      throw new Error('[starter-kit-3d-platformer] #touch-joystick-zone missing');
    }
    if (!(jumpButton instanceof HTMLButtonElement)) {
      throw new Error('[starter-kit-3d-platformer] #jump-button missing');
    }
    if (!(desktopControlHints instanceof HTMLElement)) {
      throw new Error('[starter-kit-3d-platformer] #desktop-control-hints missing');
    }
    if (!(desktopKeyW instanceof HTMLElement)) {
      throw new Error('[starter-kit-3d-platformer] #desktop-key-w missing');
    }
    if (!(desktopKeyA instanceof HTMLElement)) {
      throw new Error('[starter-kit-3d-platformer] #desktop-key-a missing');
    }
    if (!(desktopKeyS instanceof HTMLElement)) {
      throw new Error('[starter-kit-3d-platformer] #desktop-key-s missing');
    }
    if (!(desktopKeyD instanceof HTMLElement)) {
      throw new Error('[starter-kit-3d-platformer] #desktop-key-d missing');
    }
    if (!(desktopKeySpace instanceof HTMLElement)) {
      throw new Error('[starter-kit-3d-platformer] #desktop-key-space missing');
    }
    if (!(debugPanel instanceof HTMLElement)) {
      throw new Error('[starter-kit-3d-platformer] #debug-panel missing');
    }
    if (!(renderModeButton instanceof HTMLButtonElement)) {
      throw new Error('[starter-kit-3d-platformer] #render-mode-button missing');
    }
    if (!(physicsModeButton instanceof HTMLButtonElement)) {
      throw new Error('[starter-kit-3d-platformer] #physics-mode-button missing');
    }
    if (!(followCameraButton instanceof HTMLButtonElement)) {
      throw new Error('[starter-kit-3d-platformer] #follow-camera-button missing');
    }
    if (!(topdownCameraButton instanceof HTMLButtonElement)) {
      throw new Error('[starter-kit-3d-platformer] #topdown-camera-button missing');
    }
    if (!(ghostStartButton instanceof HTMLButtonElement)) {
      throw new Error('[starter-kit-3d-platformer] #ghost-start-button missing');
    }
    if (!(ghostStopButton instanceof HTMLButtonElement)) {
      throw new Error('[starter-kit-3d-platformer] #ghost-stop-button missing');
    }
    if (!(ghostResetButton instanceof HTMLButtonElement)) {
      throw new Error('[starter-kit-3d-platformer] #ghost-reset-button missing');
    }
    if (!(pauseButton instanceof HTMLButtonElement)) {
      throw new Error('[starter-kit-3d-platformer] #pause-button missing');
    }
    if (!(stepFrameButton instanceof HTMLButtonElement)) {
      throw new Error('[starter-kit-3d-platformer] #step-frame-button missing');
    }
    if (!(stepTenFramesButton instanceof HTMLButtonElement)) {
      throw new Error('[starter-kit-3d-platformer] #step-ten-frames-button missing');
    }
    if (!(axesToggleButton instanceof HTMLButtonElement)) {
      throw new Error('[starter-kit-3d-platformer] #axes-toggle-button missing');
    }
    if (!(triggersToggleButton instanceof HTMLButtonElement)) {
      throw new Error('[starter-kit-3d-platformer] #triggers-toggle-button missing');
    }
    if (!(cameraGizmoToggleButton instanceof HTMLButtonElement)) {
      throw new Error('[starter-kit-3d-platformer] #camera-gizmo-toggle-button missing');
    }
    if (!(debugStatus instanceof HTMLElement)) {
      throw new Error('[starter-kit-3d-platformer] #debug-status missing');
    }

    this.canvas = canvas;
    this.overlay = overlay;
    this.overlayEyebrow = overlayEyebrow;
    this.overlayTitle = overlayTitle;
    this.overlaySummary = overlaySummary;
    this.overlayStats = overlayStats;
    this.startButton = startButton;
    this.secondaryButton = secondaryButton;
    this.timerValueLabel = timerValue;
    this.timerFill = timerFill;
    this.progressValueLabel = progressValue;
    this.phaseValueLabel = phaseValue;
    this.nextObjectiveLabel = nextObjective;
    this.touchControls = touchControls;
    this.joystickZone = joystickZone;
    this.jumpButton = jumpButton;
    this.desktopControlHints = desktopControlHints;
    this.desktopKeyHints = {
      w: desktopKeyW,
      a: desktopKeyA,
      s: desktopKeyS,
      d: desktopKeyD,
      space: desktopKeySpace,
    };
    this.debugPanel = debugPanel;
    this.renderModeButton = renderModeButton;
    this.physicsModeButton = physicsModeButton;
    this.followCameraButton = followCameraButton;
    this.topdownCameraButton = topdownCameraButton;
    this.ghostStartButton = ghostStartButton;
    this.ghostStopButton = ghostStopButton;
    this.ghostResetButton = ghostResetButton;
    this.pauseButton = pauseButton;
    this.stepFrameButton = stepFrameButton;
    this.stepTenFramesButton = stepTenFramesButton;
    this.axesToggleButton = axesToggleButton;
    this.triggersToggleButton = triggersToggleButton;
    this.cameraGizmoToggleButton = cameraGizmoToggleButton;
    this.debugStatus = debugStatus;
    const runtimeDevice = detectRuntimeDeviceFlags(sdk.device);
    this.isTouchDevice = runtimeDevice.isMobile || runtimeDevice.hasTouchInput;
    const searchParams = new URLSearchParams(window.location.search);
    this.qualityProfile = resolveQualityProfile(sdk.device, {
      perfUiEnabled: runtimeConfig?.perfUiEnabled === true,
      profileName: runtimeConfig?.qualityProfile ?? null,
    });
    this.benchmarkEnabled = runtimeConfig?.benchmarkEnabled === true;
    this.perfTracker = createPerfTracker(this.qualityProfile.name);
    this.perfSubsystemTimer = createPerfSubsystemTimer(PERF_SUBSYSTEM_NAMES);
    this.perfHud = createPerfHud('Shardspan');
    this.perfDebugEnabled = runtimeConfig?.perfUiEnabled === true;
    this.audio = createWebAudioBus({
      onEvent: (event) => this.handleAudioPerfEvent(event),
    });
    this.initialGhostRunName = searchParams.get('ghostRun');
    this.bestTimeSeconds = this.loadBestTimeSeconds();
    this.debugUiEnabled =
      searchParams.get('debugUi') === '1' ||
      searchParams.has('debug') ||
      searchParams.has('camera');
    this.debugView = searchParams.get('debug') === 'physics' ? 'physics' : 'render';
    this.cameraMode = searchParams.get('camera') === 'topdown' ? 'topdown' : 'follow';
    this.showAxes = this.debugUiEnabled;
    this.showTriggers = this.debugUiEnabled;
    this.showCameraGizmo = this.debugUiEnabled;

    this.scene = new THREE.Scene();
    this.scene.background = RENDER_BACKGROUND;
    this.camera = new THREE.PerspectiveCamera(
      GAME_CONFIG.cameraFov,
      Math.max(1, window.innerWidth) / Math.max(1, window.innerHeight),
      0.1,
      200,
    );
    this.renderer = this.createRenderer();
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.CineonToneMapping;
    this.renderer.toneMappingExposure = GAME_CONFIG.environment.toneMappingExposure;
    this.renderer.shadowMap.enabled = this.qualityProfile.shadowMapSize > 0;
    this.renderer.shadowMap.type =
      this.qualityProfile.shadowProfile === 'soft' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
    this.renderer.info.autoReset = false;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.qualityProfile.pixelRatioCap));

    this.world = new RAPIER.World(new RAPIER.Vector3(0, 0, 0));
    this.characterController = this.world.createCharacterController(0.02);
    this.characterController.setSlideEnabled(true);
    this.characterController.enableAutostep(0.45, 0.2, true);
    this.characterController.enableSnapToGround(0.12);
    this.characterController.setMaxSlopeClimbAngle(Math.PI * 0.45);
    this.characterController.setMinSlopeSlideAngle(Math.PI * 0.48);

    this.staticRoot = new THREE.Group();
    this.renderRoot = new THREE.Group();
    this.debugRoot = new THREE.Group();
    this.scene.add(this.renderRoot, this.debugRoot);
    this.renderRoot.add(this.staticRoot);

    this.runtimeCameraHelper = new THREE.CameraHelper(this.camera);
    this.cameraGizmoRoot = new THREE.Group();
    this.runtimeCameraForwardArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(),
      CAMERA_GIZMO_LENGTH,
      0x52b6ff,
    );
    this.runtimeCameraUpArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(),
      CAMERA_GIZMO_LENGTH * 0.6,
      0x34d399,
    );
    this.oracleCameraForwardArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 0, -1),
      new THREE.Vector3(),
      CAMERA_GIZMO_LENGTH,
      0xf59e0b,
    );
    this.oracleCameraUpArrow = new THREE.ArrowHelper(
      new THREE.Vector3(0, 1, 0),
      new THREE.Vector3(),
      CAMERA_GIZMO_LENGTH * 0.6,
      0xf97316,
    );
    this.cameraGizmoRoot.add(
      this.runtimeCameraHelper,
      this.runtimeCameraForwardArrow,
      this.runtimeCameraUpArrow,
      this.oracleCameraForwardArrow,
      this.oracleCameraUpArrow,
    );
    this.debugRoot.add(this.cameraGizmoRoot);

    this.worldAxesHelper = new THREE.AxesHelper(WORLD_AXES_SIZE);
    this.worldAxesHelper.position.set(0, 0, 0);
    this.debugRoot.add(this.worldAxesHelper);
    this.axesDebugObjects.push(this.worldAxesHelper);
    document.body.append(this.perfHud.root);

    this.applyInitialUiState();
  }

  async init(): Promise<void> {
    this.host.host?.setLoadingState?.({
      status: 'loading',
      message: 'Loading Shardspan...',
      progress: 0.12,
    });

    await this.initializeRenderer();
    await this.loadEnvironment();
    this.host.host?.setLoadingState?.({
      status: 'loading',
      message: 'Loading models and textures...',
      progress: 0.34,
    });

    const particleTexture = await this.loadTexture('res://sprites/particle.png');
    this.particleSystem = new SpriteParticleSystem(particleTexture, 160);
    this.scene.add(this.particleSystem.root);

    await this.buildWorld();
    this.host.host?.setLoadingState?.({
      status: 'loading',
      message: 'Spawning player...',
      progress: 0.72,
    });

    await this.buildPlayer();
    this.host.host?.setLoadingState?.({
      status: 'loading',
      message: 'Preloading audio...',
      progress: 0.84,
    });
    await this.preloadAudioAssets();
    this.setupInput();
    this.setupUi();
    this.handleResize();
    this.resetLevel();
    this.showOverlay('start');
    this.updateHud();
    this.render();
    this.installDeterministicHooks();
    this.perfTracker.reset();
    if (this.initialGhostRunName) {
      this.runGhost(this.initialGhostRunName);
    }
    this.animationFrame = window.requestAnimationFrame(this.handleFrame);
    this.host.host?.setLoadingState?.({ status: 'ready' });
  }

  private handleAudioPerfEvent(event: AudioBusEvent): void {
    const detailParts: string[] = [event.type];
    if (event.url) {
      detailParts.push(event.url.split('/').pop() ?? event.url);
    }
    if (event.detail) {
      detailParts.push(event.detail);
    }
    this.perfTracker.markEvent(
      'audio',
      detailParts.join(' | '),
      event.durationMs,
      this.simulationFrame,
    );
    if (this.perfDebugEnabled) {
      this.perfSubsystemTimer.add('audio', event.durationMs);
    }
  }

  private markPerfEvent(name: string, detail: string | null = null, durationMs: number | null = null): void {
    this.perfTracker.markEvent(name, detail, durationMs, this.simulationFrame);
  }

  private async preloadAudioAssets(): Promise<void> {
    await this.audio.preload([
      this.footstepUrl,
      this.jumpUrl,
      this.landUrl,
      this.coinUrl,
      this.breakUrl,
      this.fallUrl,
    ]);
  }

  private createRenderer(): GameRenderer {
    return new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: this.qualityProfile.antialias,
      powerPreference: 'high-performance' as const,
      alpha: false,
    });
  }

  private async initializeRenderer(): Promise<void> {
    return Promise.resolve();
  }

  private loadBestTimeSeconds(): number | null {
    try {
      const rawValue = window.localStorage.getItem(BEST_TIME_STORAGE_KEY);
      if (!rawValue) {
        return null;
      }
      const parsed = Number(rawValue);
      return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    } catch {
      return null;
    }
  }

  private saveBestTimeSeconds(value: number): void {
    this.bestTimeSeconds = value;
    try {
      window.localStorage.setItem(BEST_TIME_STORAGE_KEY, String(value));
    } catch {
      // Ignore storage failures and keep the in-memory best.
    }
  }

  private formatSeconds(value: number | null): string {
    if (value === null || !Number.isFinite(value)) {
      return 'No clean run yet';
    }
    const minutes = Math.floor(value / 60);
    const seconds = value - minutes * 60;
    return `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`;
  }

  private applyInitialUiState(): void {
    document.body.classList.toggle('touch-device', this.isTouchDevice);
    document.querySelectorAll<HTMLElement>('.mobile-only').forEach((element) => {
      element.hidden = !this.isTouchDevice;
    });
    document.querySelectorAll<HTMLElement>('.desktop-only').forEach((element) => {
      element.hidden = this.isTouchDevice;
    });
    this.touchControls.hidden = true;
    this.syncDebugUiVisibility();
    this.updateDesktopControlHintVisibility();
    this.syncDesktopControlHints();
    this.syncDebugButtons();
    this.updateDebugStatus();
    this.overlay.hidden = false;
  }

  private showOverlay(state: OverlayState): void {
    this.overlayState = state;
    this.overlay.hidden = false;
    this.mode = 'overlay';
    const stats: string[] = [];
    const bestLine = `Best clean run: ${this.formatSeconds(this.bestTimeSeconds)}`;

    if (state === 'start') {
      this.overlayEyebrow.textContent = 'Desktop Relay';
      this.overlayTitle.textContent = 'Shardspan';
      this.overlaySummary.textContent =
        'Touch the relays in order. Each relay flips which bridge color is solid. Falling rewinds you to the last cleared relay and burns 4 seconds.';
      stats.push(bestLine);
      stats.push(`Route: ${COURSE_BEACONS.length} relays, then the amber exit gate.`);
      stats.push('Timer stays paused until your first move or jump.');
      this.startButton.textContent = 'Start Relay';
      this.secondaryButton.hidden = true;
      this.secondaryButton.textContent = 'Back to Briefing';
    } else {
      const won = state === 'success';
      const elapsed = this.formatSeconds(this.elapsedSeconds);
      this.overlayEyebrow.textContent = won ? 'Relay Cleared' : 'Dusk Took The Span';
      this.overlayTitle.textContent = won ? 'Exit Gate Secured' : 'Run Lost';
      this.overlaySummary.textContent = won
        ? 'The shard relay held long enough to cross. Tighten the route and shave the clock on the next run.'
        : 'You ran out of dusk or fell one bridge too many. Retry immediately and keep the next relay in view.';
      stats.push(`Run time: ${elapsed}`);
      stats.push(`Deaths: ${this.deathCount}`);
      stats.push(`Beacons cleared: ${this.player?.beaconsCleared ?? 0}/${COURSE_BEACONS.length}`);
      stats.push(bestLine);
      this.startButton.textContent = 'Retry Relay';
      this.secondaryButton.hidden = false;
      this.secondaryButton.textContent = 'Back to Briefing';
    }

    this.overlayStats.innerHTML = stats.map((entry) => `<li>${entry}</li>`).join('');
    this.updateDesktopControlHintVisibility();
  }

  private beginRun(): void {
    this.resetLevel();
    this.overlay.hidden = true;
    this.mode = 'playing';
    this.updateDesktopControlHintVisibility();
    this.render();
  }

  private syncDebugUiVisibility(): void {
    this.debugPanel.hidden = !this.debugUiEnabled;
    this.perfHud.setVisible(this.qualityProfile.perfUiEnabled || this.debugUiEnabled);
  }

  private toggleDebugUi(): void {
    this.debugUiEnabled = !this.debugUiEnabled;
    if (!this.debugUiEnabled && this.debugView === 'physics') {
      this.debugView = 'render';
    }
    this.syncDebugUiVisibility();
    if (this.qualityProfile.perfUiEnabled || this.debugUiEnabled) {
      this.perfHud.update(this.perfTracker.snapshot());
    }
    this.syncDebugButtons();
    this.updateDebugStatus();
    this.render();
  }

  private startGame(): void {
    this.beginRun();
  }

  private updateDesktopControlHintVisibility(): void {
    this.desktopControlHints.hidden = this.isTouchDevice || this.mode !== 'playing';
  }

  private syncDesktopControlHints(): void {
    this.desktopKeyHints.w.dataset.pressed = String(this.keyboardKeys.has('w'));
    this.desktopKeyHints.a.dataset.pressed = String(this.keyboardKeys.has('a'));
    this.desktopKeyHints.s.dataset.pressed = String(this.keyboardKeys.has('s'));
    this.desktopKeyHints.d.dataset.pressed = String(this.keyboardKeys.has('d'));
    this.desktopKeyHints.space.dataset.pressed = String(this.keyboardKeys.has(' '));
  }

  private buildDesktopControlHintSummary(): Record<string, unknown> {
    return {
      visible: !this.desktopControlHints.hidden,
      pressed: {
        w: this.desktopKeyHints.w.dataset.pressed === 'true',
        a: this.desktopKeyHints.a.dataset.pressed === 'true',
        s: this.desktopKeyHints.s.dataset.pressed === 'true',
        d: this.desktopKeyHints.d.dataset.pressed === 'true',
        space: this.desktopKeyHints.space.dataset.pressed === 'true',
      },
    };
  }

  private normalizeKeyboardKey(event: KeyboardEvent): string {
    if (event.code === 'Space' || event.key === 'Spacebar') {
      return ' ';
    }
    return event.key.toLowerCase();
  }

  private isHandledKeyboardControlKey(key: string): boolean {
    return (
      key === 'w' ||
      key === 'a' ||
      key === 's' ||
      key === 'd' ||
      key === ' ' ||
      key === 'arrowup' ||
      key === 'arrowdown' ||
      key === 'arrowleft' ||
      key === 'arrowright'
    );
  }

  private setDebugView(mode: DebugView): void {
    this.debugView = mode;
    this.syncDebugButtons();
    this.render();
  }

  private setCameraMode(mode: CameraMode): void {
    this.cameraMode = mode;
    this.syncDebugButtons();
    this.render();
  }

  private setPaused(paused: boolean): void {
    this.simulationPaused = paused;
    this.syncDebugButtons();
    this.render();
  }

  private toggleAxes(): void {
    this.showAxes = !this.showAxes;
    this.syncDebugButtons();
    this.render();
  }

  private toggleTriggers(): void {
    this.showTriggers = !this.showTriggers;
    this.syncDebugButtons();
    this.render();
  }

  private toggleCameraGizmo(): void {
    this.showCameraGizmo = !this.showCameraGizmo;
    this.syncDebugButtons();
    this.render();
  }

  private async loadEnvironment(): Promise<void> {
    const background = new THREE.Color(0x203867);
    this.renderBackground = background;
    this.scene.background = background;
    this.scene.fog = new THREE.FogExp2(0x203867, 0.018);

    const ambientLight = new THREE.HemisphereLight(0x6d8ed0, 0x1b1724, 1.1);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffd39c, 1.45);
    directionalLight.position.set(12, 18, 8);
    directionalLight.target.position.set(0, 0, 0);
    directionalLight.castShadow = this.qualityProfile.shadowMapSize > 0;
    if (directionalLight.castShadow) {
      directionalLight.shadow.bias = -0.0002;
      directionalLight.shadow.mapSize.set(this.qualityProfile.shadowMapSize, this.qualityProfile.shadowMapSize);
      directionalLight.shadow.camera.near = 0.1;
      directionalLight.shadow.camera.far = 70;
      directionalLight.shadow.camera.left = -26;
      directionalLight.shadow.camera.right = 26;
      directionalLight.shadow.camera.top = 26;
      directionalLight.shadow.camera.bottom = -26;
    }
    const rimLight = new THREE.DirectionalLight(0x5da8ff, 0.42);
    rimLight.position.set(-10, 12, -16);
    this.scene.add(directionalLight, directionalLight.target, rimLight);
  }

  private async loadTexture(resPath: string): Promise<ThreeType.Texture> {
    const cacheKey = resolveAssetPath(resPath);
    let promise = this.textureCache.get(cacheKey);
    if (!promise) {
      const loader = new THREE.TextureLoader();
      promise = loader.loadAsync(cacheKey).then((texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        return texture;
      });
      this.textureCache.set(cacheKey, promise);
    }
    return promise;
  }

  private async loadModel(resPath: string): Promise<LoadedModelAsset> {
    const cacheKey = resolveAssetPath(resPath);
    let promise = this.modelCache.get(cacheKey);
    if (!promise) {
      const loader = new GLTFLoader();
      promise = loader.loadAsync(cacheKey).then((gltf: GLTF) => ({
        scene: gltf.scene,
        animations: gltf.animations,
      }));
      this.modelCache.set(cacheKey, promise);
    }
    return promise;
  }

  private async instantiateModel(resPath: string): Promise<ThreeType.Object3D> {
    const asset = await this.loadModel(resPath);
    const cloned = asset.scene.clone(true);
    setShadowProperties(cloned);
    return cloned;
  }

  private shouldDisableDecorativeShadows(prefabKey: string, modelPath: string): boolean {
    if (prefabKey === 'cloud' || prefabKey === 'coin' || prefabKey === 'flag') {
      return true;
    }
    return !this.qualityProfile.decorativeShadowsEnabled && /grass/i.test(modelPath);
  }

  private async buildWorld(): Promise<void> {
    const worldBounds = new THREE.Box3();

    for (const instance of LEVEL_INSTANCES) {
      if (instance.prefabKey === 'cloud') {
        if (!this.qualityProfile.cloudsEnabled) {
          continue;
        }
        const prefab = PREFABS.cloud;
        const cloud = await this.buildCloud(instance.transform, prefab, instance.name);
        this.clouds.push(cloud);
      }
    }

    for (const definition of COURSE_PLATFORMS) {
      const platform = await this.buildCoursePlatform(definition.prefabKey, definition.position, definition.name);
      this.coursePlatforms.push(platform);
      worldBounds.expandByPoint(platform.root.position);
    }

    for (const definition of COURSE_BRIDGES) {
      const bridge = this.buildPhaseBridge(definition.name, definition.phase, definition.position, definition.size);
      this.phaseBridges.push(bridge);
      worldBounds.expandByPoint(bridge.root.position);
    }

    for (const definition of COURSE_BEACONS) {
      const beacon = this.buildBeacon(definition);
      this.beacons.push(beacon);
      worldBounds.expandByPoint(beacon.root.position);
    }

    this.finishGate = this.buildFinishGate(FINISH_GATE.position, FINISH_GATE.triggerSize);
    worldBounds.expandByPoint(this.finishGate.root.position);
    this.setPhase(SHARDSPAN_INITIAL_PHASE);

    if (worldBounds.isEmpty()) {
      this.worldCenter.set(0, 0, 0);
    } else {
      worldBounds.getCenter(this.worldCenter);
    }
  }

  private async buildStaticRenderGroup(group: (typeof STATIC_RENDER_GROUPS)[number]): Promise<void> {
    if (group.transforms.length === 0) {
      return;
    }

    const template = await this.instantiateModel(group.modelPath);
    template.updateMatrixWorld(true);
    const meshEntries: Array<{
      instanceMesh: ThreeType.InstancedMesh;
      localMatrix: ThreeType.Matrix4;
    }> = [];

    template.traverse((child) => {
      const mesh = child as ThreeType.Mesh;
      if (!('isMesh' in mesh) || !mesh.isMesh) {
        return;
      }
      const instanceMesh = new THREE.InstancedMesh(mesh.geometry, mesh.material, group.transforms.length);
      if (group.decorative && !this.qualityProfile.decorativeShadowsEnabled) {
        instanceMesh.castShadow = false;
        instanceMesh.receiveShadow = false;
      } else {
        instanceMesh.castShadow = true;
        instanceMesh.receiveShadow = true;
      }
      instanceMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
      instanceMesh.frustumCulled = false;
      this.staticRoot.add(instanceMesh);
      meshEntries.push({
        instanceMesh,
        localMatrix: mesh.matrixWorld.clone(),
      });
    });

    const worldMatrix = new THREE.Matrix4();
    const instanceMatrix = new THREE.Matrix4();
    for (let index = 0; index < group.transforms.length; index += 1) {
      worldMatrix.copy(godotTransformToMatrix(group.transforms[index] as Transform12));
      for (const entry of meshEntries) {
        instanceMatrix.multiplyMatrices(worldMatrix, entry.localMatrix);
        entry.instanceMesh.setMatrixAt(index, instanceMatrix);
      }
    }

    for (const entry of meshEntries) {
      entry.instanceMesh.instanceMatrix.needsUpdate = true;
      entry.instanceMesh.computeBoundingSphere();
    }
  }

  private async attachPrefabVisuals(
    parent: ThreeType.Object3D,
    prefab: PrefabDefinition,
  ): Promise<void> {
    for (const visual of prefab.visuals) {
      const model = await this.instantiateModel(visual.modelPath);
      if (this.shouldDisableDecorativeShadows(prefab.key, visual.modelPath)) {
        setShadowProperties(model, { castShadow: false, receiveShadow: false });
      }
      applyTransform(model, visual.transform);
      if (prefab.key === 'cloud') {
        model.traverse((child) => {
          const mesh = child as ThreeType.Mesh;
          if ('isMesh' in mesh && mesh.isMesh) {
            mesh.castShadow = false;
            mesh.receiveShadow = false;
            if (!Array.isArray(mesh.material) && mesh.material) {
              mesh.material.transparent = true;
              mesh.material.opacity = 0.95;
              mesh.material.depthWrite = false;
              mesh.material.needsUpdate = true;
            }
          }
        });
      }
      parent.add(model);
    }
  }

  private createStaticPhysicsBody(
    rootTransform: Transform12,
    colliders: readonly StaticColliderDefinition[],
  ): void {
    if (colliders.length === 0) {
      return;
    }

    const bodyDesc = (RAPIER.RigidBodyDesc as typeof RapierRigidBodyDesc).fixed();
    const rootMatrix = godotTransformToMatrix(rootTransform);
    const bodyPose = matrixToPositionQuaternion(rootMatrix);
    bodyDesc.setTranslation(bodyPose.position.x, bodyPose.position.y, bodyPose.position.z);
    bodyDesc.setRotation(
      new RAPIER.Quaternion(
        bodyPose.quaternion.x,
        bodyPose.quaternion.y,
        bodyPose.quaternion.z,
        bodyPose.quaternion.w,
      ),
    );
    const body = this.world.createRigidBody(bodyDesc);

    for (const collider of colliders) {
      const desc = this.createColliderDesc(collider);
      const localPose = matrixToPositionQuaternion(godotTransformToMatrix(collider.transform));
      desc.setTranslation(localPose.position.x, localPose.position.y, localPose.position.z);
      desc.setRotation(
        new RAPIER.Quaternion(
          localPose.quaternion.x,
          localPose.quaternion.y,
          localPose.quaternion.z,
          localPose.quaternion.w,
        ),
      );
      desc.setFriction(1);
      this.world.createCollider(desc, body);
    }
  }

  private createColliderDesc(collider: StaticColliderDefinition): RapierColliderDesc {
    if (collider.category === 'concave') {
      const vertices =
        CONCAVE_COLLISION_SHAPES[collider.shapeId as keyof typeof CONCAVE_COLLISION_SHAPES];
      const indices = new Uint32Array(vertices.length / 3);
      for (let index = 0; index < indices.length; index += 1) {
        indices[index] = index;
      }
      return (RAPIER.ColliderDesc as typeof RapierColliderDesc).trimesh(vertices, indices);
    }

    if (collider.category === 'box') {
      return (RAPIER.ColliderDesc as typeof RapierColliderDesc).cuboid(
        collider.size[0] * 0.5,
        collider.size[1] * 0.5,
        collider.size[2] * 0.5,
      );
    }

    return (RAPIER.ColliderDesc as typeof RapierColliderDesc).ball(collider.radius);
  }

  private buildStaticPhysicsDebugRoot(
    rootTransform: Transform12,
    colliders: readonly StaticColliderDefinition[],
    name: string,
  ): ThreeType.Group {
    const root = new THREE.Group();
    root.name = name;
    applyTransform(root, rootTransform);

    for (const collider of colliders) {
      root.add(this.buildColliderDebugMesh(collider, 0x65d6ff));
    }

    return root;
  }

  private createTranslationTransform(position: readonly [number, number, number]): Transform12 {
    return [1, 0, 0, 0, 1, 0, 0, 0, 1, position[0], position[1], position[2]];
  }

  private async buildCoursePlatform(
    prefabKey: 'platform' | 'platform_medium' | 'platform_grass_large_round',
    position: readonly [number, number, number],
    name: string,
  ): Promise<CoursePlatformState> {
    const transform = this.createTranslationTransform(position);
    const prefab = PREFABS[prefabKey];
    const root = new THREE.Group();
    applyTransform(root, transform);
    this.renderRoot.add(root);
    await this.attachPrefabVisuals(root, prefab);
    const colliderGroup = this.createColliderGroup(transform, prefab, 'fixed');
    const debugRoot = this.buildDebugRoot(transform, prefab, `${name}-debug`);
    this.debugRoot.add(debugRoot);
    if (this.orientationSamples.length < ORIENTATION_SAMPLE_LIMIT) {
      this.registerOrientationSample(name, debugRoot, PLATFORM_AXES_SIZE);
    }
    return {
      root,
      debugRoot,
      colliderGroup,
    };
  }

  private createFixedBoxCollider(
    position: readonly [number, number, number],
    size: readonly [number, number, number],
  ): ColliderHandleGroup {
    const bodyDesc = (RAPIER.RigidBodyDesc as typeof RapierRigidBodyDesc).fixed();
    bodyDesc.setTranslation(position[0], position[1], position[2]);
    const body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = (RAPIER.ColliderDesc as typeof RapierColliderDesc).cuboid(
      size[0] * 0.5,
      size[1] * 0.5,
      size[2] * 0.5,
    );
    colliderDesc.setFriction(1);
    const collider = this.world.createCollider(colliderDesc, body);
    return {
      body,
      colliders: [collider],
    };
  }

  private buildPhaseBridge(
    name: string,
    phase: PhaseFamily | null,
    position: readonly [number, number, number],
    size: readonly [number, number, number],
  ): PhaseBridgeState {
    const root = new THREE.Group();
    root.position.set(position[0], position[1], position[2]);
    this.renderRoot.add(root);

    const color = phase === 'cobalt' ? PHASE_COBALT_COLOR : PHASE_AMBER_COLOR;
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.35,
      metalness: 0.08,
      transparent: true,
      opacity: 1,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.65,
    });
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(size[0], size[1], size[2])),
      new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.7,
      }),
    );
    root.add(edge);

    return {
      name,
      phase,
      root,
      mesh,
      colliderGroup: this.createFixedBoxCollider(position, size),
      active: phase === null || phase === this.currentPhase,
      baseY: position[1],
      bobPhase: (hashString(name) % 360) * (Math.PI / 180),
    };
  }

  private createSphereTriggerFromRadius(radius: number, role: 'beacon'): SphereTriggerShape {
    const transform = this.createTranslationTransform([0, 1.05, 0]);
    return {
      category: 'sphere',
      radius,
      role,
      transform,
      matrix: godotTransformToMatrix(transform),
    };
  }

  private createBoxTriggerFromSize(
    size: readonly [number, number, number],
    role: 'finish-gate',
  ): BoxTriggerShape {
    const transform = this.createTranslationTransform([0, size[1] * 0.5, 0]);
    return {
      category: 'box',
      size: [...size],
      role,
      transform,
      matrix: godotTransformToMatrix(transform),
    };
  }

  private buildBeacon(definition: (typeof COURSE_BEACONS)[number]): BeaconState {
    const root = new THREE.Group();
    root.position.set(definition.position[0], definition.position[1], definition.position[2]);
    this.renderRoot.add(root);

    const nextColor = definition.nextPhase === 'cobalt' ? PHASE_COBALT_COLOR : PHASE_AMBER_COLOR;
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.62, 0.9, 6),
      new THREE.MeshStandardMaterial({
        color: 0x2a3558,
        roughness: 0.6,
        metalness: 0.12,
      }),
    );
    base.position.y = 0.45;
    base.castShadow = true;
    base.receiveShadow = true;

    const crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.42, 0),
      new THREE.MeshStandardMaterial({
        color: nextColor,
        emissive: new THREE.Color(nextColor),
        emissiveIntensity: 1.3,
        roughness: 0.15,
        metalness: 0.3,
      }),
    );
    crystal.position.y = 1.18;
    crystal.castShadow = true;

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.28, 6.4, 14, 1, true),
      new THREE.MeshBasicMaterial({
        color: nextColor,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
      }),
    );
    beam.position.y = 3.2;

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.82, 0.06, 10, 24),
      new THREE.MeshBasicMaterial({
        color: nextColor,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.08;

    root.add(base, crystal, beam, ring);

    return {
      id: definition.id,
      label: definition.label,
      cue: definition.cue,
      nextPhase: definition.nextPhase,
      root,
      trigger: this.createSphereTriggerFromRadius(0.88, 'beacon'),
      base,
      crystal,
      beam,
      ring,
      collected: false,
      checkpoint: new THREE.Vector3(
        definition.checkpoint[0],
        definition.checkpoint[1],
        definition.checkpoint[2],
      ),
      pulse: 0,
      bobPhase: (hashString(definition.id) % 360) * (Math.PI / 180),
    };
  }

  private buildFinishGate(
    position: readonly [number, number, number],
    size: readonly [number, number, number],
  ): FinishGateState {
    const root = new THREE.Group();
    root.position.set(position[0], position[1], position[2]);
    this.renderRoot.add(root);

    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(0.92, 0.14, 12, 32),
      new THREE.MeshStandardMaterial({
        color: 0xf0efe7,
        emissive: new THREE.Color(PHASE_AMBER_COLOR),
        emissiveIntensity: 0.85,
        roughness: 0.2,
        metalness: 0.18,
      }),
    );
    arch.position.y = 1.35;

    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.42, 2.8, 16, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffdc88,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
      }),
    );
    beam.position.y = 1.35;

    root.add(arch, beam);

    return {
      root,
      trigger: this.createBoxTriggerFromSize(size, 'finish-gate'),
      arch,
      beam,
      pulse: 0,
    };
  }

  private async buildCloud(
    transform: Transform12,
    prefab: PrefabDefinition,
    name: string,
  ): Promise<CloudState> {
    const root = new THREE.Group();
    applyTransform(root, transform);
    this.renderRoot.add(root);
    await this.attachPrefabVisuals(root, prefab);

    const random = createRandom(hashString(name));
    return {
      root,
      basePosition: root.position.clone(),
      floatAmplitude: lerp(0.08, 0.38, random()),
      floatSpeed: lerp(0.3, 1.2, random()),
      phase: random() * Math.PI * 2,
    };
  }

  private async buildBrick(
    transform: Transform12,
    prefab: PrefabDefinition,
    name: string,
  ): Promise<BrickState> {
    const root = new THREE.Group();
    applyTransform(root, transform);
    this.renderRoot.add(root);
    await this.attachPrefabVisuals(root, prefab);

    const colliderGroup = this.createColliderGroup(transform, prefab, 'fixed');
    const trigger = this.createBoxTrigger(prefab, 'brick-bottom');
    const debugRoot = this.buildDebugRoot(transform, prefab, `${name}-debug`);
    this.debugRoot.add(debugRoot);
    if (this.orientationSamples.length < ORIENTATION_SAMPLE_LIMIT) {
      this.registerOrientationSample(name, debugRoot, PLATFORM_AXES_SIZE);
    }

    return {
      name,
      root,
      visual: root.children[0]!,
      debugRoot,
      colliderGroup,
      trigger,
      broken: false,
    };
  }

  private async buildFallingPlatform(
    transform: Transform12,
    prefab: PrefabDefinition,
    name: string,
  ): Promise<FallingPlatformState> {
    const root = new THREE.Group();
    applyTransform(root, transform);
    this.renderRoot.add(root);
    await this.attachPrefabVisuals(root, prefab);

    const colliderGroup = this.createColliderGroup(transform, prefab, 'kinematic');
    const trigger = this.createBoxTrigger(prefab, 'falling-platform');
    const debugRoot = this.buildDebugRoot(transform, prefab, `${name}-debug`);
    this.debugRoot.add(debugRoot);
    if (this.orientationSamples.length < ORIENTATION_SAMPLE_LIMIT) {
      this.registerOrientationSample(name, debugRoot, PLATFORM_AXES_SIZE);
    }

    return {
      name,
      root,
      debugRoot,
      colliderGroup,
      trigger,
      state: 'idle',
      fallVelocity: 0,
      spawnPosition: root.position.clone(),
      spawnRotation: root.quaternion.clone(),
    };
  }

  private createColliderGroup(
    rootTransform: Transform12,
    prefab: PrefabDefinition,
    bodyType: 'fixed' | 'kinematic',
  ): ColliderHandleGroup {
    const rootMatrix = godotTransformToMatrix(rootTransform);
    const rootPose = matrixToPositionQuaternion(rootMatrix);
    const bodyDesc =
      bodyType === 'fixed'
        ? (RAPIER.RigidBodyDesc as typeof RapierRigidBodyDesc).fixed()
        : (RAPIER.RigidBodyDesc as typeof RapierRigidBodyDesc).kinematicPositionBased();
    bodyDesc.setTranslation(rootPose.position.x, rootPose.position.y, rootPose.position.z);
    bodyDesc.setRotation(
      new RAPIER.Quaternion(
        rootPose.quaternion.x,
        rootPose.quaternion.y,
        rootPose.quaternion.z,
        rootPose.quaternion.w,
      ),
    );
    const body = this.world.createRigidBody(bodyDesc);
    const colliders: RapierCollider[] = [];

    for (const collider of prefab.colliders) {
      const desc = this.createColliderDesc(collider);
      const localPose = matrixToPositionQuaternion(godotTransformToMatrix(collider.transform));
      desc.setTranslation(localPose.position.x, localPose.position.y, localPose.position.z);
      desc.setRotation(
        new RAPIER.Quaternion(
          localPose.quaternion.x,
          localPose.quaternion.y,
          localPose.quaternion.z,
          localPose.quaternion.w,
        ),
      );
      desc.setFriction(1);
      colliders.push(this.world.createCollider(desc, body));
    }

    return { body, colliders };
  }

  private createBoxTrigger(
    prefab: PrefabDefinition,
    role: 'falling-platform' | 'brick-bottom',
  ): BoxTriggerShape {
    const trigger = prefab.triggers.find((entry) => entry.role === role);
    if (!trigger) {
      throw new Error(`[starter-kit-3d-platformer] Missing ${role} trigger in prefab ${prefab.key}`);
    }
    if (trigger.category !== 'box') {
      throw new Error(
        `[starter-kit-3d-platformer] Expected box trigger for ${role} in prefab ${prefab.key}`,
      );
    }
    return {
      ...trigger,
      matrix: godotTransformToMatrix(trigger.transform),
    };
  }

  private createSphereTrigger(prefab: PrefabDefinition, role: 'coin-collect'): SphereTriggerShape {
    const trigger = prefab.triggers.find((entry) => entry.role === role);
    if (!trigger) {
      throw new Error(`[starter-kit-3d-platformer] Missing ${role} trigger in prefab ${prefab.key}`);
    }
    if (trigger.category !== 'sphere') {
      throw new Error(
        `[starter-kit-3d-platformer] Expected sphere trigger for ${role} in prefab ${prefab.key}`,
      );
    }
    return {
      ...trigger,
      matrix: godotTransformToMatrix(trigger.transform),
    };
  }

  private buildDebugRoot(
    rootTransform: Transform12,
    prefab: PrefabDefinition,
    name: string,
  ): ThreeType.Group {
    const root = new THREE.Group();
    root.name = name;
    applyTransform(root, rootTransform);

    for (const collider of prefab.colliders) {
      root.add(this.buildColliderDebugMesh(collider, 0x65d6ff));
    }

    for (const trigger of prefab.triggers) {
      const triggerMesh = this.buildTriggerDebugMesh(trigger);
      this.triggerDebugObjects.push(triggerMesh);
      root.add(triggerMesh);
    }

    return root;
  }

  private buildColliderDebugMesh(
    collider: ConcaveColliderDefinition | BoxShapeDefinition | SphereShapeDefinition,
    color: number,
  ): ThreeType.Object3D {
    const material = new THREE.LineBasicMaterial({ color });
    const root = new THREE.Group();
    applyTransform(root, collider.transform);

    if (collider.category === 'concave') {
      const vertices =
        CONCAVE_COLLISION_SHAPES[collider.shapeId as keyof typeof CONCAVE_COLLISION_SHAPES];
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      const wireframe = new THREE.LineSegments(new THREE.WireframeGeometry(geometry), material);
      root.add(wireframe);
      return root;
    }

    if (collider.category === 'box') {
      const geometry = new THREE.BoxGeometry(
        collider.size[0],
        collider.size[1],
        collider.size[2],
      );
      const wireframe = new THREE.LineSegments(new THREE.WireframeGeometry(geometry), material);
      root.add(wireframe);
      return root;
    }

    const geometry = new THREE.SphereGeometry(collider.radius, 12, 10);
    const wireframe = new THREE.LineSegments(new THREE.WireframeGeometry(geometry), material);
    root.add(wireframe);
    return root;
  }

  private buildTriggerDebugMesh(trigger: TriggerDefinition): ThreeType.Object3D {
    return this.buildColliderDebugMesh(trigger, trigger.role === 'coin-collect' ? 0xffd34d : 0xff7db5);
  }

  private registerOrientationSample(
    name: string,
    object: ThreeType.Object3D,
    axesSize: number,
  ): void {
    this.orientationSamples.push({ name, object });
    const axes = new THREE.AxesHelper(axesSize);
    object.add(axes);
    this.axesDebugObjects.push(axes);
  }

  private async buildPlayer(): Promise<void> {
    const characterAsset = await this.loadModel(GAME_CONFIG.character.modelPath);
    const characterRoot = characterAsset.scene.clone(true);
    setShadowProperties(characterRoot);
    const characterSceneRoot = characterRoot.children.length === 1 ? characterRoot.children[0]! : characterRoot;

    for (const override of GAME_CONFIG.character.nodeOverrides) {
      const target = findObjectByPath(characterSceneRoot, override.path);
      if (!target) {
        const availablePaths = collectNodePaths(characterRoot).join(', ');
        throw new Error(
          `[starter-kit-3d-platformer] Character override target ${override.path} missing; available paths: ${availablePaths}`,
        );
      }
      applyTransform(target, override.transform);
    }

    const mixer = new THREE.AnimationMixer(characterRoot);
    const requiredClips = new Map<CharacterAnimationName, ThreeType.AnimationClip | null>([
      ['idle', null],
      ['walk', null],
      ['jump', null],
    ]);
    for (const clip of characterAsset.animations) {
      const normalized = clip.name.toLowerCase();
      if (requiredClips.has(normalized as CharacterAnimationName)) {
        requiredClips.set(normalized as CharacterAnimationName, clip);
      }
    }

    const actions = {
      idle: mixer.clipAction(requiredClips.get('idle') ?? (() => { throw new Error('[starter-kit-3d-platformer] Missing idle animation'); })()),
      walk: mixer.clipAction(requiredClips.get('walk') ?? (() => { throw new Error('[starter-kit-3d-platformer] Missing walk animation'); })()),
      jump: mixer.clipAction(requiredClips.get('jump') ?? (() => { throw new Error('[starter-kit-3d-platformer] Missing jump animation'); })()),
    };
    actions.idle.play();

    const shadowTexture = await this.loadTexture('res://sprites/blob_shadow.png');
    shadowTexture.colorSpace = THREE.SRGBColorSpace;
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2, 1.2),
      new THREE.MeshBasicMaterial({
        map: shadowTexture,
        transparent: true,
        depthWrite: false,
        opacity: 0.7,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = PLAYER_SHADOW_Y;

    const root = new THREE.Group();
    applyTransform(root, GAME_CONFIG.playerSpawnTransform);
    root.add(characterRoot, shadow);
    this.renderRoot.add(root);

    const playerCollider = GAME_CONFIG.playerController.playerCollider;
    const colliderGroup = this.createPlayerCollider(playerCollider, GAME_CONFIG.playerSpawnTransform);

    const capsuleHalfHeight = getCapsuleHalfHeight(playerCollider);
    const debugGeometry = new THREE.CapsuleGeometry(
      playerCollider.radius,
      getCapsuleCylinderHeight(playerCollider),
      6,
      12,
    );
    const debugMesh = new THREE.Mesh(
      debugGeometry,
      new THREE.MeshBasicMaterial({
        color: PLAYER_DEBUG_COLOR,
        wireframe: true,
      }),
    );
    this.debugRoot.add(debugMesh);

    this.player = {
      root,
      model: characterRoot,
      shadow,
      debugMesh,
      mixer,
      actions,
      currentAnimation: 'idle',
      colliderGroup,
      colliderOffset: new THREE.Vector3(
        playerCollider.transform[9],
        playerCollider.transform[10],
        playerCollider.transform[11],
      ),
      capsuleHalfHeight,
      capsuleRadius: playerCollider.radius,
      horizontalVelocity: new THREE.Vector3(),
      verticalVelocity: 0,
      rotationDirection: 0,
      grounded: false,
      previouslyGrounded: false,
      jumpSingleAvailable: true,
      jumpDoubleAvailable: true,
      beaconsCleared: 0,
      resetCount: 0,
      recentReset: false,
    };

    this.playerAxesHelper = new THREE.AxesHelper(PLAYER_AXES_SIZE);
    this.debugRoot.add(this.playerAxesHelper);
    this.axesDebugObjects.push(this.playerAxesHelper);

    this.cameraRigAxesHelper = new THREE.AxesHelper(CAMERA_RIG_AXES_SIZE);
    this.debugRoot.add(this.cameraRigAxesHelper);
    this.axesDebugObjects.push(this.cameraRigAxesHelper);

    this.resetRuntimeCameraState(root.position);
    this.resetCameraOracleState();
    this.syncPlayerVisuals();
    this.updateCameraDiagnostics();
  }

  private createPlayerCollider(
    playerCollider: CapsuleColliderDefinition,
    rootTransform: Transform12,
  ): ColliderHandleGroup {
    const rootMatrix = godotTransformToMatrix(rootTransform);
    const rootPose = matrixToPositionQuaternion(rootMatrix);
    const bodyDesc = (RAPIER.RigidBodyDesc as typeof RapierRigidBodyDesc).kinematicPositionBased();
    bodyDesc.setTranslation(rootPose.position.x, rootPose.position.y, rootPose.position.z);
    const body = this.world.createRigidBody(bodyDesc);
    const colliderDesc = (RAPIER.ColliderDesc as typeof RapierColliderDesc).capsule(
      getCapsuleHalfHeight(playerCollider),
      playerCollider.radius,
    );
    colliderDesc.setTranslation(
      playerCollider.transform[9],
      playerCollider.transform[10],
      playerCollider.transform[11],
    );
    colliderDesc.setFriction(0.8);
    const collider = this.world.createCollider(colliderDesc, body);
    return {
      body,
      colliders: [collider],
    };
  }

  private setupInput(): void {
    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    window.addEventListener('blur', this.handleWindowBlur);
    window.addEventListener('resize', this.resizeObserver);
    window.addEventListener('orientationchange', this.resizeObserver);
    window.addEventListener('pointermove', this.handlePointerMove, { passive: false });
    window.addEventListener('pointerup', this.handlePointerUp, { passive: false });
    window.addEventListener('pointercancel', this.handlePointerUp, { passive: false });

    if (this.isTouchDevice && !this.touchHudInitialized) {
      this.joystickManager = nipplejs.create({
        zone: this.joystickZone,
        mode: 'static',
        position: { left: '50%', top: '50%' },
        color: '#ffffff',
        size: 120,
      });
      this.joystickManager.on('move', (_event: unknown, data: { vector?: { x: number; y: number } }) => {
        if (!data.vector) {
          return;
        }
        this.audio.unlock();
        this.touchMove.set(data.vector.x, data.vector.y);
      });
      this.joystickManager.on('end', () => {
        this.touchMove.set(0, 0);
      });
      this.touchHudInitialized = true;
    }
  }

  private setupUi(): void {
    this.startButton.addEventListener('pointerdown', () => {
      this.audio.unlock();
    });
    this.startButton.addEventListener('click', () => {
      this.beginRun();
      this.render();
    });
    this.secondaryButton.addEventListener('click', () => {
      this.resetLevel();
      this.showOverlay('start');
      this.updateHud();
      this.render();
    });

    this.canvas.addEventListener('pointerdown', this.handlePointerDown, { passive: false });
    this.jumpButton.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      this.audio.unlock();
      this.jumpTouchQueued = true;
    });

    this.renderModeButton.addEventListener('click', () => {
      this.setDebugView('render');
    });
    this.physicsModeButton.addEventListener('click', () => {
      this.setDebugView('physics');
    });
    this.followCameraButton.addEventListener('click', () => {
      this.setCameraMode('follow');
    });
    this.topdownCameraButton.addEventListener('click', () => {
      this.setCameraMode('topdown');
    });
    this.ghostStartButton.addEventListener('click', () => {
      this.runGhost();
    });
    this.ghostStopButton.addEventListener('click', () => {
      this.stopGhost();
      this.render();
    });
    this.ghostResetButton.addEventListener('click', () => {
      this.resetGhostState();
      this.render();
    });
    this.pauseButton.addEventListener('click', () => {
      this.setPaused(!this.simulationPaused);
    });
    this.stepFrameButton.addEventListener('click', () => {
      this.stepFrames(1);
    });
    this.stepTenFramesButton.addEventListener('click', () => {
      this.stepFrames(10);
    });
    this.axesToggleButton.addEventListener('click', () => {
      this.toggleAxes();
    });
    this.triggersToggleButton.addEventListener('click', () => {
      this.toggleTriggers();
    });
    this.cameraGizmoToggleButton.addEventListener('click', () => {
      this.toggleCameraGizmo();
    });
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    const key = this.normalizeKeyboardKey(event);
    this.keyboardKeys.add(key);
    this.audio.unlock();
    if (this.isHandledKeyboardControlKey(key)) {
      event.preventDefault();
    }
    this.syncDesktopControlHints();
    if (key === 'f') {
      void this.toggleFullscreen();
    }
  };

  private handleKeyUp = (event: KeyboardEvent): void => {
    const key = this.normalizeKeyboardKey(event);
    this.keyboardKeys.delete(key);
    if (this.isHandledKeyboardControlKey(key)) {
      event.preventDefault();
    }
    this.syncDesktopControlHints();
  };

  private handleWindowBlur = (): void => {
    this.keyboardKeys.clear();
    this.syncDesktopControlHints();
  };

  private handlePointerDown = (event: PointerEvent): void => {
    if (this.mode !== 'playing') {
      return;
    }

    if (event.pointerType === 'mouse') {
      if (event.button !== 0) {
        return;
      }
      this.audio.unlock();
      this.activeLookPointerId = event.pointerId;
      this.activeLookPosition.set(event.clientX, event.clientY);
      this.canvas.setPointerCapture?.(event.pointerId);
      event.preventDefault();
      return;
    }

    if (!this.isTouchDevice || event.clientX <= window.innerWidth * 0.45) {
      return;
    }

    this.audio.unlock();
    this.activeLookPointerId = event.pointerId;
    this.activeLookPosition.set(event.clientX, event.clientY);
    this.canvas.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (this.activeLookPointerId !== event.pointerId) {
      return;
    }
    const dx = event.clientX - this.activeLookPosition.x;
    const dy = event.clientY - this.activeLookPosition.y;
    this.activeLookPosition.set(event.clientX, event.clientY);
    this.touchLookDelta.x += dx * TOUCH_LOOK_SENSITIVITY;
    this.touchLookDelta.y += dy * TOUCH_LOOK_SENSITIVITY;
    event.preventDefault();
  };

  private handlePointerUp = (event: PointerEvent): void => {
    if (this.activeLookPointerId !== event.pointerId) {
      return;
    }
    this.activeLookPointerId = null;
    this.canvas.releasePointerCapture?.(event.pointerId);
    event.preventDefault();
  };

  private async toggleFullscreen(): Promise<void> {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      return;
    }
    await document.exitFullscreen();
  }

  private handleResize(): void {
    const width = Math.max(1, window.innerWidth);
    const height = Math.max(1, window.innerHeight);
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.perfTracker.setCanvasMetrics(
      this.renderer.domElement.width,
      this.renderer.domElement.height,
      this.renderer.getPixelRatio(),
    );
  }

  private stepFrames(count: number): void {
    this.perfSubsystemTimer.reset();
    const updateStart = performance.now();
    for (let index = 0; index < count; index += 1) {
      this.stepSimulation(FIXED_DT);
    }
    const updateTimeMs = performance.now() - updateStart;
    const renderStart = performance.now();
    const renderStats = this.render();
    const renderTimeMs = performance.now() - renderStart;
    if (this.perfDebugEnabled) {
      this.perfSubsystemTimer.add('render', renderTimeMs);
    }
    this.recordPerfSample(count * FIXED_DT_MS, updateTimeMs, renderTimeMs, 'synthetic', renderStats);
  }

  private installDeterministicHooks(): void {
    window.advanceTime = (ms: number) => {
      const steps = Math.max(1, Math.round(ms / FIXED_DT_MS));
      this.stepFrames(steps);
    };

    window.render_game_to_text = () => this.renderGameToText();
    window.__listingCapture = {
      prepare: (sceneId: string) => {
        if (sceneId !== 'listing-landscape' && sceneId !== 'listing-portrait') {
          throw new Error(`[starter-kit-3d-platformer] Unsupported listing scene ${sceneId}`);
        }
        this.setDebugView('render');
        this.setCameraMode('follow');
        this.setPaused(false);
        this.stopGhost();
        const listingPitchDegrees = sceneId === 'listing-portrait' ? -20 : -22;
        const listingYawDegrees = sceneId === 'listing-portrait' ? 128 : 118;
        const listingZoom = sceneId === 'listing-portrait' ? 8.2 : 9.2;
        this.cameraTargetEuler.set(
          THREE.MathUtils.degToRad(listingPitchDegrees),
          THREE.MathUtils.degToRad(listingYawDegrees),
          0,
        );
        this.cameraCurrentEuler.copy(this.cameraTargetEuler);
        this.cameraZoomTarget = listingZoom;
        this.cameraZoomCurrent = listingZoom;
        this.cameraOracle.targetEulerDegrees.set(listingPitchDegrees, listingYawDegrees, 0);
        this.cameraOracle.visibleEulerDegrees.copy(this.cameraOracle.targetEulerDegrees);
        this.cameraOracleZoomTarget = listingZoom;
        this.cameraOracle.localCameraPosition.set(0, 0, listingZoom);
        this.syncCameraOracleWorldState();
        const listingQuaternion = new THREE.Quaternion().setFromEuler(this.cameraCurrentEuler);
        this.camera.position
          .set(0, 0, listingZoom)
          .applyQuaternion(listingQuaternion)
          .add(this.cameraFocus);
        this.camera.quaternion.copy(listingQuaternion);
        this.camera.updateMatrixWorld(true);
        this.updateCameraDiagnostics();
        this.render();
      },
    };
    window.__starterKitDebug = {
      runGhost: (name = 'smoke') => {
        this.runGhost(name);
      },
      stopGhost: () => {
        this.stopGhost();
      },
      stepFrames: (count: number) => {
        this.stepFrames(Math.max(1, Math.floor(count)));
      },
      setDebugView: (mode: DebugView) => {
        this.setDebugView(mode);
      },
      setCameraMode: (mode: CameraMode) => {
        this.setCameraMode(mode);
      },
      setPaused: (paused: boolean) => {
        this.setPaused(paused);
      },
      snapshot: () => JSON.parse(this.renderGameToText()),
    };
  }

  private handleFrame = (time: number): void => {
    const frameTimeMs = this.consumeFrameTimeMs(time);
    this.perfSubsystemTimer.reset();
    if (this.simulationPaused) {
      this.accumulatorMs = 0;
      const renderStart = performance.now();
      const renderStats = this.render();
      const renderTimeMs = performance.now() - renderStart;
      if (this.perfDebugEnabled) {
        this.perfSubsystemTimer.add('render', renderTimeMs);
      }
      this.recordPerfSample(frameTimeMs, 0, renderTimeMs, 'raf', renderStats);
      this.animationFrame = window.requestAnimationFrame(this.handleFrame);
      return;
    }

    this.accumulatorMs += frameTimeMs;
    const updateStart = performance.now();

    while (this.accumulatorMs >= FIXED_DT_MS) {
      this.stepSimulation(FIXED_DT);
      this.accumulatorMs -= FIXED_DT_MS;
    }
    const updateTimeMs = performance.now() - updateStart;

    const renderStart = performance.now();
    const renderStats = this.render();
    const renderTimeMs = performance.now() - renderStart;
    if (this.perfDebugEnabled) {
      this.perfSubsystemTimer.add('render', renderTimeMs);
    }
    this.recordPerfSample(frameTimeMs, updateTimeMs, renderTimeMs, 'raf', renderStats);
    this.animationFrame = window.requestAnimationFrame(this.handleFrame);
  };

  private shouldRunInterval(intervalFrames: number): boolean {
    return intervalFrames <= 1 || this.simulationFrame % intervalFrames === 0;
  }

  private consumeFrameTimeMs(time: number): number {
    const previousTime = this.lastFrameTime;
    this.lastFrameTime = time;
    if (previousTime <= 0) {
      return FIXED_DT_MS;
    }
    return Math.min(100, Math.max(0, time - previousTime));
  }

  private timePerfSubsystem<T>(name: string, callback: () => T): T {
    if (!this.perfDebugEnabled) {
      return callback();
    }
    const startTime = performance.now();
    try {
      return callback();
    } finally {
      this.perfSubsystemTimer.add(name, performance.now() - startTime);
    }
  }

  private recordPerfSample(
    frameTimeMs: number,
    updateTimeMs: number,
    renderTimeMs: number,
    source: PerfSampleSource,
    renderStats: RenderPerfStats,
  ): void {
    this.perfTracker.recordFrame(frameTimeMs, updateTimeMs, renderTimeMs, source, {
      drawCalls: renderStats.drawCalls,
      triangles: renderStats.triangles,
      subsystemTimeMs: this.perfDebugEnabled ? this.perfSubsystemTimer.snapshot() : null,
      frameId: this.simulationFrame,
    });
    this.maybePublishBenchmarkResult();
    if (!this.qualityProfile.perfUiEnabled && !this.debugUiEnabled) {
      return;
    }
    if (this.lastPerfHudSampleFrame === this.simulationFrame || this.simulationFrame % 10 !== 0) {
      return;
    }
    this.lastPerfHudSampleFrame = this.simulationFrame;
    this.perfHud.update(this.perfTracker.snapshot());
  }

  private maybePublishBenchmarkResult(): void {
    if (!this.benchmarkEnabled || this.benchmarkReported || this.ghostRun?.completed !== true) {
      return;
    }

    const snapshot = this.perfTracker.snapshot();
    if (snapshot.frameTimingSource !== 'raf' || snapshot.realSampleCount < 30) {
      return;
    }

    document.title = formatBenchmarkTitle(
      createBenchmarkPayload(
        'shardspan',
        this.ghostRun?.name ?? null,
        snapshot,
      ),
    );
    this.benchmarkReported = true;
  }

  private stepSimulation(delta: number): void {
    const player = this.player;
    if (!player) {
      return;
    }

    const fixedUpdateStartTime = this.perfDebugEnabled ? performance.now() : 0;
    this.simulationFrame += 1;
    player.recentReset = false;

    const input = this.collectFrameInput(delta);
    if (this.mode === 'playing') {
      this.updateRunClock(delta, input);
      this.timePerfSubsystem('fallingPlatformUpdate', () => {
        this.updateFallingPlatforms(delta);
      });
      this.updatePlayer(delta, input);
      this.timePerfSubsystem('physicsStep', () => {
        this.world.step();
      });
      this.syncPlayerVisuals();
      if (this.shouldRunInterval(this.qualityProfile.decorationUpdateIntervalFrames)) {
        this.timePerfSubsystem('bridgeUpdate', () => {
          this.updatePhaseBridges(delta * this.qualityProfile.decorationUpdateIntervalFrames);
          this.updateBeacons(delta * this.qualityProfile.decorationUpdateIntervalFrames);
        });
      }
      if (
        this.qualityProfile.cloudsEnabled &&
        this.shouldRunInterval(this.qualityProfile.decorationUpdateIntervalFrames)
      ) {
        this.updateClouds(delta * this.qualityProfile.decorationUpdateIntervalFrames);
      }
      this.updateBricks();
      this.timePerfSubsystem('triggerUpdate', () => {
        this.updateTriggers();
      });
      this.updateHud();
    }

    this.timePerfSubsystem('effectsUpdate', () => {
      if (this.mode === 'playing' && this.shouldRunInterval(this.qualityProfile.effectUpdateIntervalFrames)) {
        this.updatePlayerEffects(delta * this.qualityProfile.effectUpdateIntervalFrames);
      }
      player.mixer.update(delta);
      this.particleSystem?.update(delta);
    });
    this.updateCamera(delta, input);
    this.updateCameraDiagnostics();
    if (this.perfDebugEnabled) {
      this.perfSubsystemTimer.add('fixedUpdate', performance.now() - fixedUpdateStartTime);
    }
  }

  private collectFrameInput(delta: number): FrameInput {
    const forward = this.keyboardKeys.has('w') || this.keyboardKeys.has('arrowup');
    const back = this.keyboardKeys.has('s') || this.keyboardKeys.has('arrowdown');
    const left = this.keyboardKeys.has('a') || this.keyboardKeys.has('arrowleft');
    const right = this.keyboardKeys.has('d') || this.keyboardKeys.has('arrowright');
    const zoomIn = this.keyboardKeys.has('+') || this.keyboardKeys.has('=');
    const zoomOut = this.keyboardKeys.has('-') || this.keyboardKeys.has('_');
    const keyboardJump = this.keyboardKeys.has(' ');

    let moveX = Number(right) - Number(left);
    let moveZ = Number(back) - Number(forward);
    let lookX = 0;
    let lookY = 0;
    let zoom = Number(zoomOut) - Number(zoomIn);
    let jumpDown = keyboardJump;
    let inputMode: InputMode = 'keyboard';

    const gamepad = getActiveGamepad();
    if (gamepad) {
      const gamepadMoveX = readGamepadAxis(gamepad, 0, 14, 15, GAMEPAD_DEADZONE);
      const gamepadMoveY = readGamepadAxis(gamepad, 1, 12, 13, GAMEPAD_DEADZONE);
      const gamepadLookX = applyGamepadDeadzone(gamepad.axes[2] ?? 0, GAMEPAD_DEADZONE);
      const gamepadLookY = applyGamepadDeadzone(gamepad.axes[3] ?? 0, GAMEPAD_DEADZONE);
      const leftTrigger = readGamepadButtonValue(gamepad.buttons[6]);
      const rightTrigger = readGamepadButtonValue(gamepad.buttons[7]);
      const gamepadJump = readGamepadButtonPressed(gamepad.buttons[0]);

      if (
        Math.abs(gamepadMoveX) > 0 ||
        Math.abs(gamepadMoveY) > 0 ||
        Math.abs(gamepadLookX) > 0 ||
        Math.abs(gamepadLookY) > 0 ||
        leftTrigger > 0 ||
        rightTrigger > 0 ||
        gamepadJump
      ) {
        moveX = gamepadMoveX;
        moveZ = gamepadMoveY;
        lookX = gamepadLookX * GAMEPAD_LOOK_SPEED;
        lookY = gamepadLookY * GAMEPAD_LOOK_SPEED;
        zoom = leftTrigger - rightTrigger;
        jumpDown = jumpDown || gamepadJump;
        inputMode = 'gamepad';
      }
    }

    if (this.isTouchDevice || this.touchLookDelta.lengthSq() > 0 || this.jumpTouchQueued) {
      const touchMagnitude = this.touchMove.length();
      if (touchMagnitude > TOUCH_DEADZONE || this.touchLookDelta.lengthSq() > 0 || this.jumpTouchQueued) {
        moveX = this.touchMove.x;
        moveZ = -this.touchMove.y;
        lookX = this.touchLookDelta.x;
        lookY = this.touchLookDelta.y;
        zoom = this.zoomTouchDirection;
        jumpDown = jumpDown || this.jumpTouchQueued;
        inputMode = this.isTouchDevice ? 'touch' : 'keyboard';
      }
    }

    const ghostInput = this.advanceGhostRun();
    if (ghostInput) {
      moveX = ghostInput.moveX;
      moveZ = ghostInput.moveZ;
      lookX = ghostInput.lookX;
      lookY = ghostInput.lookY;
      zoom = ghostInput.zoom;
      jumpDown = ghostInput.jumpDown;
      inputMode = 'keyboard';
    }

    this.activeInputMode = inputMode;

    const jumpPressed = jumpDown && !this.previousJumpDown;
    this.previousJumpDown = jumpDown;
    this.jumpTouchQueued = false;
    this.touchLookDelta.set(0, 0);

    const length = Math.hypot(moveX, moveZ);
    if (length > 1) {
      moveX /= length;
      moveZ /= length;
    }

    return {
      moveX,
      moveZ,
      lookX,
      lookY,
      zoom,
      jumpPressed,
      inputMode,
    };
  }

  private teleportPlayerTo(position: ThreeType.Vector3): void {
    const player = this.player;
    if (!player) {
      return;
    }

    player.colliderGroup.body.setTranslation(new RAPIER.Vector3(position.x, position.y, position.z), true);
    player.colliderGroup.body.setNextKinematicTranslation(
      new RAPIER.Vector3(position.x, position.y, position.z),
    );
    player.root.position.copy(position);
    player.horizontalVelocity.set(0, 0, 0);
    player.verticalVelocity = 0;
    player.rotationDirection = 0;
    player.grounded = false;
    player.previouslyGrounded = false;
    player.jumpSingleAvailable = true;
    player.jumpDoubleAvailable = true;
    player.model.scale.copy(ONE_VECTOR);
    this.lastLandingEvent = null;
    this.lastTriggerHit = null;
    this.resetRuntimeCameraState(position.clone());
    this.resetCameraOracleState();
    this.syncPlayerVisuals();
    this.updateCameraDiagnostics();
  }

  private getGhostScript(name: string): GhostScript {
    if (name === 'smoke' || name === 'relay-smoke') {
      return {
        name,
        steps: [
          {
            label: 'start-game',
            frames: 1,
            input: createGhostFrameInput(),
            onStart: () => {
              this.beginRun();
            },
          },
          { label: 'settle-idle', frames: 45, input: createGhostFrameInput() },
          { label: 'drive-to-relay', frames: 150, input: createGhostFrameInput({ moveZ: -1 }) },
          { label: 'land', frames: 45, input: createGhostFrameInput() },
        ],
      };
    }

    if (name === 'relay-demo' || name === 'clear') {
      return {
        name,
        steps: [
          {
            label: 'start-game',
            frames: 1,
            input: createGhostFrameInput(),
            onStart: () => {
              this.beginRun();
            },
          },
          { label: 'settle', frames: 30, input: createGhostFrameInput() },
          { label: 'relay-1', frames: 150, input: createGhostFrameInput({ moveZ: -1 }) },
          { label: 'settle-1', frames: 16, input: createGhostFrameInput() },
          { label: 'relay-2', frames: 170, input: createGhostFrameInput({ moveX: 1 }) },
          { label: 'settle-2', frames: 16, input: createGhostFrameInput() },
          { label: 'relay-3', frames: 170, input: createGhostFrameInput({ moveZ: -1 }) },
          { label: 'settle-3', frames: 16, input: createGhostFrameInput() },
          { label: 'relay-4', frames: 170, input: createGhostFrameInput({ moveX: 1 }) },
          { label: 'settle-4', frames: 16, input: createGhostFrameInput() },
          { label: 'finish', frames: 170, input: createGhostFrameInput({ moveZ: -1 }) },
          { label: 'victory-pause', frames: 30, input: createGhostFrameInput() },
        ],
      };
    }

    throw new Error(`[starter-kit-3d-platformer] Unsupported ghost run ${name}`);
  }

  private runGhost(name = 'smoke'): void {
    const script = this.getGhostScript(name);
    this.setPaused(false);
    this.ghostRun = {
      name: script.name,
      active: true,
      completed: false,
      currentStepIndex: 0,
      frameInStep: 0,
      currentInput: createGhostFrameInput(),
      steps: script.steps,
    };
    this.lastLandingEvent = null;
    this.lastTriggerHit = null;
    this.previousJumpDown = false;
    this.render();
  }

  private stopGhost(): void {
    if (!this.ghostRun) {
      return;
    }
    this.ghostRun.active = false;
    this.ghostRun.currentInput = createGhostFrameInput();
  }

  private resetGhostState(): void {
    this.stopGhost();
    this.ghostRun = null;
    if (this.player) {
      this.beginRun();
    }
  }

  private advanceGhostRun(): GhostFrameInput | null {
    if (!this.ghostRun || !this.ghostRun.active) {
      return null;
    }

    const step = this.ghostRun.steps[this.ghostRun.currentStepIndex];
    if (!step) {
      this.ghostRun.active = false;
      this.ghostRun.completed = true;
      this.ghostRun.currentInput = createGhostFrameInput();
      return null;
    }

    if (this.ghostRun.frameInStep === 0) {
      step.onStart?.();
    }

    this.ghostRun.currentInput = step.input;
    this.ghostRun.frameInStep += 1;

    if (this.ghostRun.frameInStep >= step.frames) {
      this.ghostRun.currentStepIndex += 1;
      this.ghostRun.frameInStep = 0;
      if (this.ghostRun.currentStepIndex >= this.ghostRun.steps.length) {
        this.ghostRun.active = false;
        this.ghostRun.completed = true;
      }
    }

    return this.ghostRun.currentInput;
  }

  private probePlayerGround(rootTranslation: RapierVector): GroundProbeResult {
    const player = this.player;
    if (!player) {
      return {
        grounded: false,
        hoverDistance: 0,
      };
    }

    const rayOrigin = {
      x: rootTranslation.x + player.colliderOffset.x,
      y: rootTranslation.y + player.colliderOffset.y,
      z: rootTranslation.z + player.colliderOffset.z,
    };
    const ray = new RAPIER.Ray(rayOrigin, { x: 0, y: -1, z: 0 });
    const rayLength = player.capsuleHalfHeight + player.capsuleRadius + GROUND_RAYCAST_MARGIN;
    const hit = this.world.castRayAndGetNormal(
      ray,
      rayLength,
      true,
      undefined,
      undefined,
      player.colliderGroup.colliders[0],
      player.colliderGroup.body,
    );

    if (hit === null || hit.normal.y < GROUND_MIN_NORMAL_Y) {
      return {
        grounded: false,
        hoverDistance: 0,
      };
    }

    return {
      grounded: true,
      hoverDistance: Math.max(0, hit.toi - (player.capsuleHalfHeight + player.capsuleRadius)),
    };
  }

  private updatePlayer(delta: number, input: FrameInput): void {
    const player = this.player;
    if (!player) {
      return;
    }

    const yawOnly = this.scratchQuaternion.setFromAxisAngle(WORLD_UP, this.cameraCurrentEuler.y);
    const movementDirection = this.scratchVectorA.set(input.moveX, 0, input.moveZ).applyQuaternion(yawOnly);
    const targetHorizontalVelocity = movementDirection.multiplyScalar(GAME_CONFIG.playerController.movementSpeed);
    player.horizontalVelocity.lerp(targetHorizontalVelocity, delta * GAME_CONFIG.playerController.velocityLerp);

    if (input.jumpPressed && (player.jumpSingleAvailable || player.jumpDoubleAvailable)) {
      player.verticalVelocity = GAME_CONFIG.playerController.jumpStrength;
      player.model.scale.set(0.5, 1.5, 0.5);
      this.markPerfEvent('jump');
      this.audio.playOneShot(this.jumpUrl, 0.75);
      if (player.jumpSingleAvailable) {
        player.jumpSingleAvailable = false;
        player.jumpDoubleAvailable = true;
      } else {
        player.jumpDoubleAvailable = false;
      }
    }

    if (!player.grounded || player.verticalVelocity > 0) {
      player.verticalVelocity -= GAME_CONFIG.playerController.gravityAcceleration * delta;
    }

    const desiredTranslation = new RAPIER.Vector3(
      player.horizontalVelocity.x * delta,
      player.verticalVelocity * delta,
      player.horizontalVelocity.z * delta,
    );
    const attemptedDownwardMotion = desiredTranslation.y <= 0;
    const impactVelocity = player.verticalVelocity;

    player.previouslyGrounded = player.grounded;
    this.characterController.computeColliderMovement(player.colliderGroup.colliders[0], desiredTranslation);
    const correctedMovement = this.characterController.computedMovement();
    const computedGrounded = this.characterController.computedGrounded();
    const correctedDownwardMotion =
      attemptedDownwardMotion && correctedMovement.y > desiredTranslation.y + 0.0001;
    const currentTranslation = player.colliderGroup.body.translation();
    const nextTranslation = new RAPIER.Vector3(
      currentTranslation.x + correctedMovement.x,
      currentTranslation.y + correctedMovement.y,
      currentTranslation.z + correctedMovement.z,
    );
    const groundProbe = this.probePlayerGround(nextTranslation);
    const snappedToGround = attemptedDownwardMotion && groundProbe.grounded && groundProbe.hoverDistance > 0;
    if (snappedToGround) {
      nextTranslation.y -= groundProbe.hoverDistance;
    }

    player.grounded = computedGrounded || correctedDownwardMotion || groundProbe.grounded;
    this.groundedReason = computedGrounded
      ? 'computed-grounded'
      : correctedDownwardMotion
        ? 'corrected-downward-motion'
        : snappedToGround
          ? 'ground-snap'
          : groundProbe.grounded
          ? 'raycast-ground'
          : 'airborne';

    player.colliderGroup.body.setNextKinematicTranslation(
      nextTranslation,
    );

    if (player.grounded) {
      if (impactVelocity < -2 && !player.previouslyGrounded) {
        player.model.scale.set(1.25, 0.75, 1.25);
        this.markPerfEvent('land', `velocity ${impactVelocity.toFixed(3)}`);
        this.audio.playOneShot(this.landUrl, 0.75);
        this.lastLandingEvent = {
          frame: this.simulationFrame,
          impactSpeed: Number(Math.abs(impactVelocity).toFixed(3)),
        };
      }
      player.verticalVelocity = Math.max(0, player.verticalVelocity);
      player.jumpSingleAvailable = true;
      if (!input.jumpPressed) {
        player.jumpDoubleAvailable = true;
      }
    }

    if (player.horizontalVelocity.lengthSq() > 0.0001) {
      player.rotationDirection = Math.atan2(player.horizontalVelocity.x, player.horizontalVelocity.z);
    }

    player.root.rotation.y = THREE.MathUtils.lerp(
      player.root.rotation.y,
      player.rotationDirection,
      delta * GAME_CONFIG.playerController.rotationLerp,
    );
    player.model.scale.lerp(ONE_VECTOR, delta * GAME_CONFIG.playerController.modelScaleLerp);

    const rootPosition = player.colliderGroup.body.translation();
    if (rootPosition.y < GAME_CONFIG.playerController.fallResetY) {
      this.respawnAfterFall();
    }
  }

  private syncPlayerVisuals(): void {
    const player = this.player;
    if (!player) {
      return;
    }

    const translation = player.colliderGroup.body.translation();
    player.root.position.set(translation.x, translation.y, translation.z);
    player.root.updateMatrixWorld(true);

    const shadowHeight = clamp(player.root.position.y * 0.04, 0, 0.55);
    (player.shadow.material as ThreeType.MeshBasicMaterial).opacity = 0.7 - shadowHeight;

    player.debugMesh.position.copy(player.root.position).add(player.colliderOffset);
    player.debugMesh.scale.set(1, 1, 1);
    player.debugMesh.visible = this.debugView === 'physics';
  }

  private updatePlayerEffects(delta: number): void {
    const player = this.player;
    const particleSystem = this.particleSystem;
    if (!player || !particleSystem) {
      return;
    }

    const horizontalSpeed = Math.hypot(player.horizontalVelocity.x, player.horizontalVelocity.z);
    const speedFactor = horizontalSpeed / GAME_CONFIG.playerController.movementSpeed;

    if (player.grounded) {
      if (speedFactor > 0.05) {
        this.setPlayerAnimation('walk');
      } else {
        this.setPlayerAnimation('idle');
      }

      if (speedFactor > 0.3) {
        this.audio.setLoop(this.footstepUrl, true, 0.35, clamp(speedFactor, 0.7, 1.8));
      } else {
        this.audio.setLoop(this.footstepUrl, false, 0);
      }

      if (speedFactor > 0.75) {
        const emissionPosition = this.scratchVectorA.copy(player.root.position);
        emissionPosition.y += 0.05;
        const velocity = this.scratchVectorB.set(
          (Math.random() - 0.5) * 0.35,
          0.6,
          (Math.random() - 0.5) * 0.35,
        );
        particleSystem.emit({
          position: emissionPosition,
          velocity,
          color: 0xb4d7ff,
          size: 0.34,
          life: 0.55,
          gravity: -0.8,
        });
      }
    } else {
      this.audio.setLoop(this.footstepUrl, false, 0);
      this.setPlayerAnimation('jump');
    }

    if (player.currentAnimation === 'walk') {
      player.actions.walk.timeScale = clamp(speedFactor, 0.4, 1.8);
    }
  }

  private setPlayerAnimation(name: CharacterAnimationName): void {
    const player = this.player;
    if (!player || player.currentAnimation === name) {
      return;
    }

    const nextAction = player.actions[name];
    const currentAction = player.actions[player.currentAnimation];
    currentAction.fadeOut(0.12);
    nextAction.reset().fadeIn(0.12).play();
    player.currentAnimation = name;
  }

  private updateRunClock(delta: number, input: FrameInput): void {
    if (!this.runStarted) {
      const wantsToMove =
        Math.abs(input.moveX) > 0.05 ||
        Math.abs(input.moveZ) > 0.05 ||
        input.jumpPressed;
      if (wantsToMove) {
        this.runStarted = true;
      }
      return;
    }

    this.elapsedSeconds += delta;
    this.timerRemainingSeconds = Math.max(0, this.timerRemainingSeconds - delta);
    if (this.timerRemainingSeconds <= 0) {
      this.failRun();
    }
  }

  private updatePhaseBridges(delta: number): void {
    for (const bridge of this.phaseBridges) {
      bridge.bobPhase += delta * 1.8;
      const material = bridge.mesh.material as ThreeType.MeshStandardMaterial;
      if (bridge.phase === null) {
        material.opacity = 1;
        material.emissiveIntensity = 0.2;
        continue;
      }

      const pulse = 0.55 + Math.max(0, Math.sin(bridge.bobPhase)) * 0.22;
      material.opacity = bridge.active ? 0.96 : 0.18;
      material.emissiveIntensity = bridge.active ? pulse : 0.08;
      bridge.root.position.y = bridge.baseY + Math.sin(bridge.bobPhase) * 0.04;
      for (const collider of bridge.colliderGroup.colliders) {
        collider.setEnabled(bridge.active);
      }
    }
  }

  private updateBeacons(delta: number): void {
    const activeBeaconIndex = this.player?.beaconsCleared ?? 0;
    for (let index = 0; index < this.beacons.length; index += 1) {
      const beacon = this.beacons[index]!;
      const nextColor = beacon.nextPhase === 'cobalt' ? PHASE_COBALT_COLOR : PHASE_AMBER_COLOR;
      const baseMaterial = beacon.base.material as ThreeType.MeshStandardMaterial;
      const crystalMaterial = beacon.crystal.material as ThreeType.MeshStandardMaterial;
      const beamMaterial = beacon.beam.material as ThreeType.MeshBasicMaterial;
      const ringMaterial = beacon.ring.material as ThreeType.MeshBasicMaterial;
      const isNext = index === activeBeaconIndex && !beacon.collected;
      const isComplete = beacon.collected;
      const pulseSpeed = isNext ? 3.4 : 1.4;
      beacon.bobPhase += delta * pulseSpeed;
      beacon.pulse = Math.max(0, beacon.pulse - delta * 1.8);
      beacon.crystal.rotation.y += delta * (isNext ? 2.8 : 1.2);
      beacon.crystal.position.y = 1.18 + Math.sin(beacon.bobPhase) * 0.08;
      beacon.ring.scale.setScalar(1 + beacon.pulse * 0.45 + (isNext ? 0.08 : 0));

      if (isComplete) {
        baseMaterial.color.setHex(0x33446e);
        crystalMaterial.color.setHex(RELAY_CLEAR_COLOR);
        crystalMaterial.emissive.setHex(RELAY_CLEAR_COLOR);
        crystalMaterial.emissiveIntensity = 0.65;
        beamMaterial.color.setHex(RELAY_CLEAR_COLOR);
        beamMaterial.opacity = 0.14;
        ringMaterial.color.setHex(RELAY_CLEAR_COLOR);
        ringMaterial.opacity = 0.2;
        continue;
      }

      baseMaterial.color.setHex(isNext ? 0x283454 : 0x202b46);
      crystalMaterial.color.setHex(nextColor);
      crystalMaterial.emissive.setHex(nextColor);
      crystalMaterial.emissiveIntensity = isNext ? 1.7 : 0.45;
      beamMaterial.color.setHex(nextColor);
      beamMaterial.opacity = isNext ? 0.48 : 0.16;
      ringMaterial.color.setHex(nextColor);
      ringMaterial.opacity = isNext ? 0.9 : 0.22;
    }

    if (this.finishGate) {
      this.finishGate.pulse += delta * 2.2;
      const archMaterial = this.finishGate.arch.material as ThreeType.MeshStandardMaterial;
      const beamMaterial = this.finishGate.beam.material as ThreeType.MeshBasicMaterial;
      const exitReady = (this.player?.beaconsCleared ?? 0) >= this.beacons.length;
      archMaterial.emissiveIntensity = exitReady ? 1 + Math.sin(this.finishGate.pulse) * 0.2 : 0.18;
      beamMaterial.opacity = exitReady ? 0.32 : 0.08;
      this.finishGate.beam.visible = exitReady;
    }
  }

  private updateClouds(delta: number): void {
    for (const cloud of this.clouds) {
      cloud.phase += delta * cloud.floatSpeed;
      cloud.root.position.y = cloud.basePosition.y + Math.sin(cloud.phase) * cloud.floatAmplitude;
    }
  }

  private updateFallingPlatforms(delta: number): void {
    for (const platform of this.fallingPlatforms) {
      platform.root.scale.lerp(ONE_VECTOR, delta * 10);

      if (platform.state === 'falling') {
        platform.fallVelocity += FALL_PLATFORM_DROP_SPEED * delta;
        const current = platform.colliderGroup.body.translation();
        platform.colliderGroup.body.setNextKinematicTranslation(
          new RAPIER.Vector3(current.x, current.y - platform.fallVelocity * delta, current.z),
        );
      }

      const translation = platform.colliderGroup.body.translation();
      platform.root.position.set(translation.x, translation.y, translation.z);
      platform.debugRoot.position.copy(platform.root.position);
      platform.debugRoot.quaternion.copy(platform.root.quaternion);
      platform.debugRoot.scale.copy(platform.root.scale);

      if (platform.state !== 'gone' && translation.y < GAME_CONFIG.playerController.fallResetY) {
        platform.state = 'gone';
        platform.root.visible = false;
        platform.debugRoot.visible = false;
        for (const collider of platform.colliderGroup.colliders) {
          collider.setEnabled(false);
        }
      }
    }
  }

  private updateBricks(): void {
    for (const brick of this.bricks) {
      brick.root.visible = !brick.broken;
      brick.debugRoot.visible = !brick.broken;
    }
  }

  private emitBeaconBurst(position: ThreeType.Vector3, color: number): void {
    if (!this.particleSystem) {
      return;
    }
    for (let index = 0; index < 10; index += 1) {
      const velocity = this.scratchVectorG.set(
        (Math.random() - 0.5) * 1.6,
        1.4 + Math.random() * 0.8,
        (Math.random() - 0.5) * 1.6,
      );
      this.particleSystem.emit({
        position,
        velocity,
        color,
        size: 0.28,
        life: 0.8,
        gravity: -1.8,
      });
    }
  }

  private setPhase(phase: PhaseFamily): void {
    this.currentPhase = phase;
    for (const bridge of this.phaseBridges) {
      bridge.active = bridge.phase === null || bridge.phase === phase;
      for (const collider of bridge.colliderGroup.colliders) {
        collider.setEnabled(bridge.active);
      }
    }
  }

  private failRun(): void {
    if (this.mode !== 'playing') {
      return;
    }
    this.timerRemainingSeconds = 0;
    this.audio.stopLoops();
    this.stopGhost();
    this.showOverlay('fail');
    this.updateHud();
  }

  private completeRun(): void {
    if (this.mode !== 'playing') {
      return;
    }
    this.audio.stopLoops();
    this.stopGhost();
    const isBest = this.bestTimeSeconds === null || this.elapsedSeconds < this.bestTimeSeconds;
    if (isBest) {
      this.saveBestTimeSeconds(this.elapsedSeconds);
    }
    this.showOverlay('success');
    this.updateHud();
  }

  private respawnAfterFall(): void {
    if (this.mode !== 'playing') {
      return;
    }
    this.deathCount += 1;
    if (this.runStarted) {
      this.timerRemainingSeconds = Math.max(0, this.timerRemainingSeconds - SHARDSPAN_FALL_PENALTY_SECONDS);
    }
    if (this.timerRemainingSeconds <= 0) {
      this.failRun();
      return;
    }
    this.audio.stopLoops();
    this.teleportPlayerTo(this.checkpointPosition.clone());
    this.emitBeaconBurst(this.checkpointPosition.clone(), this.currentPhase === 'cobalt' ? PHASE_COBALT_COLOR : PHASE_AMBER_COLOR);
    this.updateHud();
  }

  private updateTriggers(): void {
    const player = this.player;
    if (!player) {
      return;
    }

    const capsuleCenter = this.scratchVectorA.copy(player.root.position).add(player.colliderOffset);
    const capsuleStart = this.scratchVectorB.copy(capsuleCenter);
    capsuleStart.y -= player.capsuleHalfHeight;
    const capsuleEnd = this.scratchVectorC.copy(capsuleCenter);
    capsuleEnd.y += player.capsuleHalfHeight;
    const feetPoint = this.scratchVectorD.copy(player.root.position);
    feetPoint.y += 0.05;
    const nextBeaconIndex = player.beaconsCleared;
    const nextBeacon = this.beacons[nextBeaconIndex] ?? null;
    if (nextBeacon && !nextBeacon.collected) {
      const triggerMatrix = fillTriggerWorldMatrix(this.scratchMatrix, nextBeacon.trigger, nextBeacon.root);
      const worldPosition = this.scratchVectorF.setFromMatrixPosition(triggerMatrix);
      if (
        capsuleIntersectsSphere(
          capsuleStart,
          capsuleEnd,
          player.capsuleRadius,
          worldPosition,
          nextBeacon.trigger.radius,
        )
      ) {
        nextBeacon.collected = true;
        nextBeacon.pulse = 1;
        player.beaconsCleared += 1;
        this.checkpointPosition.copy(nextBeacon.checkpoint);
        this.setPhase(nextBeacon.nextPhase);
        this.lastTriggerHit = {
          frame: this.simulationFrame,
          role: 'beacon',
          name: nextBeacon.id,
        };
        this.markPerfEvent('beacon', nextBeacon.id);
        this.audio.playOneShot(this.coinUrl, 0.9);
        this.emitBeaconBurst(worldPosition.clone(), nextBeacon.nextPhase === 'cobalt' ? PHASE_COBALT_COLOR : PHASE_AMBER_COLOR);
      }
    }

    if (!this.finishGate || player.beaconsCleared < this.beacons.length) {
      return;
    }

    const gateMatrix = fillTriggerWorldMatrix(this.scratchMatrix, this.finishGate.trigger, this.finishGate.root);
    const inverse = this.scratchMatrixB.copy(gateMatrix).invert();
    const localFeet = this.scratchVectorF.copy(feetPoint).applyMatrix4(inverse);
    const halfX = this.finishGate.trigger.size[0] * 0.5 + player.capsuleRadius;
    const halfY = this.finishGate.trigger.size[1] * 0.5 + 0.35;
    const halfZ = this.finishGate.trigger.size[2] * 0.5 + player.capsuleRadius;
    if (
      Math.abs(localFeet.x) <= halfX &&
      Math.abs(localFeet.y) <= halfY &&
      Math.abs(localFeet.z) <= halfZ
    ) {
      this.lastTriggerHit = {
        frame: this.simulationFrame,
        role: 'finish-gate',
        name: 'finish-gate',
      };
      this.completeRun();
    }
  }

  private updateCamera(delta: number, input: FrameInput): void {
    if (!this.player) {
      return;
    }

    this.updateCameraOracle(delta, input);

    if (this.cameraMode === 'topdown') {
      this.camera.position.set(this.worldCenter.x, this.worldCenter.y + TOPDOWN_CAMERA_HEIGHT, this.worldCenter.z + TOPDOWN_CAMERA_TILT);
      this.camera.lookAt(this.worldCenter);
      this.camera.updateMatrixWorld(true);
      return;
    }

    this.cameraFocus.lerp(this.player.root.position, delta * GAME_CONFIG.cameraController.positionLerp);
    const rotationSpeedRadians = THREE.MathUtils.degToRad(GAME_CONFIG.cameraController.rotationSpeed);
    this.cameraTargetEuler.y += input.lookX * rotationSpeedRadians * delta;
    this.cameraTargetEuler.x = clamp(
      this.cameraTargetEuler.x + input.lookY * rotationSpeedRadians * delta,
      THREE.MathUtils.degToRad(GAME_CONFIG.cameraController.pitchMin),
      THREE.MathUtils.degToRad(GAME_CONFIG.cameraController.pitchMax),
    );
    this.cameraZoomTarget = clamp(
      this.cameraZoomTarget + input.zoom * GAME_CONFIG.cameraController.zoomSpeed * delta,
      Math.min(GAME_CONFIG.cameraController.zoomMaximum, GAME_CONFIG.cameraController.zoomMinimum),
      Math.max(GAME_CONFIG.cameraController.zoomMaximum, GAME_CONFIG.cameraController.zoomMinimum),
    );

    const rotationAlpha = clamp(delta * GAME_CONFIG.cameraController.rotationLerp, 0, 1);
    this.cameraCurrentEuler.x = lerp(this.cameraCurrentEuler.x, this.cameraTargetEuler.x, rotationAlpha);
    this.cameraCurrentEuler.y = lerpAngleRadians(
      this.cameraCurrentEuler.y,
      this.cameraTargetEuler.y,
      rotationAlpha,
    );
    this.cameraZoomCurrent = lerp(
      this.cameraZoomCurrent,
      this.cameraZoomTarget,
      clamp(delta * GAME_CONFIG.cameraController.zoomLerp, 0, 1),
    );

    const cameraQuaternion = this.scratchQuaternion.setFromEuler(this.cameraCurrentEuler);
    const desiredPosition = this.scratchVectorA
      .set(0, 0, this.cameraZoomCurrent)
      .applyQuaternion(cameraQuaternion)
      .add(this.cameraFocus);
    this.camera.position.copy(desiredPosition);
    this.camera.quaternion.copy(cameraQuaternion);
    this.camera.updateMatrixWorld(true);
  }

  private resetRuntimeCameraState(focusPosition: ThreeType.Vector3): void {
    this.cameraTargetEuler.set(
      THREE.MathUtils.degToRad(DEFAULT_CAMERA_PITCH_DEGREES),
      THREE.MathUtils.degToRad(DEFAULT_CAMERA_YAW_DEGREES),
      0,
    );
    this.cameraCurrentEuler.copy(this.cameraTargetEuler);
    this.cameraZoomTarget = DEFAULT_CAMERA_ZOOM;
    this.cameraZoomCurrent = this.cameraZoomTarget;
    this.cameraFocus.copy(focusPosition);
  }

  private resetCameraOracleState(): void {
    this.cameraOracle.rigPosition.set(0, 0, 0);
    this.cameraOracle.targetEulerDegrees.set(
      DEFAULT_CAMERA_PITCH_DEGREES,
      DEFAULT_CAMERA_YAW_DEGREES,
      0,
    );
    this.cameraOracle.visibleEulerDegrees.copy(this.cameraOracle.targetEulerDegrees);
    this.cameraOracle.localCameraPosition.set(0, 0, DEFAULT_CAMERA_ZOOM);
    this.cameraOracleZoomTarget = DEFAULT_CAMERA_ZOOM;
    this.cameraOracle.localCameraPosition.z = this.cameraOracleZoomTarget;
    this.syncCameraOracleWorldState();
    this.cameraSourceMatch = this.measureCameraSourceMatch();
  }

  private updateCameraOracle(delta: number, input: FrameInput): void {
    if (!this.player) {
      return;
    }

    const positionAlpha = clamp(delta * GAME_CONFIG.cameraController.positionLerp, 0, 1);
    const rotationAlpha = clamp(delta * GAME_CONFIG.cameraController.rotationLerp, 0, 1);
    const zoomAlpha = clamp(delta * GAME_CONFIG.cameraController.zoomLerp, 0, 1);

    this.cameraOracle.rigPosition.lerp(this.player.root.position, positionAlpha);
    this.cameraOracle.visibleEulerDegrees.lerp(this.cameraOracle.targetEulerDegrees, rotationAlpha);
    this.cameraOracle.localCameraPosition.lerp(
      this.scratchVectorB.set(0, 0, this.cameraOracleZoomTarget),
      zoomAlpha,
    );

    this.cameraOracle.targetEulerDegrees.y += input.lookX * GAME_CONFIG.cameraController.rotationSpeed * delta;
    this.cameraOracle.targetEulerDegrees.x = clamp(
      this.cameraOracle.targetEulerDegrees.x + input.lookY * GAME_CONFIG.cameraController.rotationSpeed * delta,
      GAME_CONFIG.cameraController.pitchMin,
      GAME_CONFIG.cameraController.pitchMax,
    );
    this.cameraOracleZoomTarget = clamp(
      this.cameraOracleZoomTarget + input.zoom * GAME_CONFIG.cameraController.zoomSpeed * delta,
      Math.min(GAME_CONFIG.cameraController.zoomMaximum, GAME_CONFIG.cameraController.zoomMinimum),
      Math.max(GAME_CONFIG.cameraController.zoomMaximum, GAME_CONFIG.cameraController.zoomMinimum),
    );
    this.syncCameraOracleWorldState();
  }

  private syncCameraOracleWorldState(): void {
    this.cameraOracle.worldQuaternion.copy(
      eulerDegreesToQuaternion(this.cameraOracle.visibleEulerDegrees),
    );
    this.cameraOracle.worldPosition
      .copy(this.cameraOracle.localCameraPosition)
      .applyQuaternion(this.cameraOracle.worldQuaternion)
      .add(this.cameraOracle.rigPosition);
    this.cameraOracle.worldMatrix.compose(
      this.cameraOracle.worldPosition,
      this.cameraOracle.worldQuaternion,
      ONE_VECTOR,
    );
    this.cameraOracle.forward.set(0, 0, -1).applyQuaternion(this.cameraOracle.worldQuaternion).normalize();
    this.cameraOracle.up.set(0, 1, 0).applyQuaternion(this.cameraOracle.worldQuaternion).normalize();
  }

  private measureCameraSourceMatch(): CameraSourceMatch {
    const maxElementDelta = maxMatrixElementDelta(this.cameraOracle.worldMatrix, this.sourceCameraMatrix);
    return {
      matched: maxElementDelta <= CAMERA_SOURCE_MATCH_THRESHOLD,
      maxElementDelta: Number(maxElementDelta.toFixed(6)),
    };
  }

  private populateRuntimeCameraSnapshot(): CameraSnapshot {
    const snapshot = this.runtimeCameraSnapshot;
    const runtimeVisibleEulerDegrees = quaternionToEulerDegrees(this.camera.quaternion);
    const rigQuaternion =
      this.cameraMode === 'topdown'
        ? this.camera.quaternion
        : new THREE.Quaternion().setFromEuler(this.cameraCurrentEuler);
    snapshot.targetEulerDegrees.set(
      THREE.MathUtils.radToDeg(this.cameraTargetEuler.x),
      THREE.MathUtils.radToDeg(this.cameraTargetEuler.y),
      THREE.MathUtils.radToDeg(this.cameraTargetEuler.z),
    );
    snapshot.visibleEulerDegrees.copy(runtimeVisibleEulerDegrees);
    snapshot.localCameraPosition.set(
      0,
      0,
      this.cameraMode === 'topdown' ? 0 : this.cameraZoomCurrent,
    );
    snapshot.worldPosition.copy(this.camera.position);
    snapshot.worldQuaternion.copy(this.camera.quaternion);
    snapshot.rigPosition
      .copy(snapshot.localCameraPosition)
      .applyQuaternion(rigQuaternion)
      .multiplyScalar(-1)
      .add(this.camera.position);
    snapshot.worldMatrix.copy(this.camera.matrixWorld);
    snapshot.forward.set(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
    snapshot.up.set(0, 1, 0).applyQuaternion(this.camera.quaternion).normalize();
    return snapshot;
  }

  private updateCameraDiagnostics(): void {
    if (!this.debugUiEnabled) {
      return;
    }
    const runtime = this.populateRuntimeCameraSnapshot();
    this.cameraOracleDelta.positionDistance = Number(
      runtime.worldPosition.distanceTo(this.cameraOracle.worldPosition).toFixed(4),
    );
    this.cameraOracleDelta.yawDegrees = Number(
      shortestAngleDegrees(runtime.visibleEulerDegrees.y, this.cameraOracle.visibleEulerDegrees.y).toFixed(3),
    );
    this.cameraOracleDelta.pitchDegrees = Number(
      shortestAngleDegrees(runtime.visibleEulerDegrees.x, this.cameraOracle.visibleEulerDegrees.x).toFixed(3),
    );
    this.cameraOracleDelta.rollDegrees = Number(
      shortestAngleDegrees(runtime.visibleEulerDegrees.z, this.cameraOracle.visibleEulerDegrees.z).toFixed(3),
    );
    this.cameraOracleDelta.forwardDegrees = Number(
      angleBetweenVectorsDegrees(runtime.forward, this.cameraOracle.forward).toFixed(3),
    );
    this.cameraOracleDelta.upDegrees = Number(
      angleBetweenVectorsDegrees(runtime.up, this.cameraOracle.up).toFixed(3),
    );
    this.cameraOracleDelta.matrixMaxElementDelta = Number(
      maxMatrixElementDelta(runtime.worldMatrix, this.cameraOracle.worldMatrix).toFixed(6),
    );
  }

  private resetLevel(): void {
    const player = this.player;
    if (!player) {
      return;
    }

    this.runStarted = false;
    this.elapsedSeconds = 0;
    this.timerRemainingSeconds = SHARDSPAN_TIMER_LIMIT_SECONDS;
    this.deathCount = 0;
    this.currentPhase = SHARDSPAN_INITIAL_PHASE;
    this.checkpointPosition.set(
      GAME_CONFIG.playerSpawnTransform[9],
      GAME_CONFIG.playerSpawnTransform[10],
      GAME_CONFIG.playerSpawnTransform[11],
    );

    player.colliderGroup.body.setNextKinematicTranslation(
      new RAPIER.Vector3(
        GAME_CONFIG.playerSpawnTransform[9],
        GAME_CONFIG.playerSpawnTransform[10],
        GAME_CONFIG.playerSpawnTransform[11],
      ),
    );
    player.horizontalVelocity.set(0, 0, 0);
    player.verticalVelocity = 0;
    player.rotationDirection = 0;
    player.grounded = false;
    player.previouslyGrounded = false;
    player.jumpSingleAvailable = true;
    player.jumpDoubleAvailable = true;
    player.beaconsCleared = 0;
    player.resetCount += 1;
    player.recentReset = true;
    player.model.scale.copy(ONE_VECTOR);
    this.groundedReason = 'respawned';
    this.lastLandingEvent = null;
    this.lastTriggerHit = null;
    this.audio.stopLoops();
    this.particleSystem?.clear();
    this.setPhase(SHARDSPAN_INITIAL_PHASE);

    for (const beacon of this.beacons) {
      beacon.collected = false;
      beacon.pulse = 0;
      beacon.root.visible = true;
    }

    for (const bridge of this.phaseBridges) {
      bridge.root.position.y = bridge.baseY;
    }

    for (const platform of this.fallingPlatforms) {
      platform.state = 'idle';
      platform.fallVelocity = 0;
      platform.root.visible = true;
      platform.debugRoot.visible = true;
      platform.root.position.copy(platform.spawnPosition);
      platform.root.quaternion.copy(platform.spawnRotation);
      platform.root.scale.copy(ONE_VECTOR);
      platform.colliderGroup.body.setNextKinematicTranslation(
        new RAPIER.Vector3(platform.spawnPosition.x, platform.spawnPosition.y, platform.spawnPosition.z),
      );
      for (const collider of platform.colliderGroup.colliders) {
        collider.setEnabled(true);
      }
    }

    for (const brick of this.bricks) {
      brick.broken = false;
      brick.root.visible = true;
      brick.debugRoot.visible = true;
      for (const collider of brick.colliderGroup.colliders) {
        collider.setEnabled(true);
      }
    }

    this.setPlayerAnimation('idle');
    this.resetRuntimeCameraState(
      new THREE.Vector3(
        GAME_CONFIG.playerSpawnTransform[9],
        GAME_CONFIG.playerSpawnTransform[10],
        GAME_CONFIG.playerSpawnTransform[11],
      ),
    );
    this.resetCameraOracleState();
    this.syncPlayerVisuals();
    this.updateCameraDiagnostics();
    this.updateHud();
  }

  private updateHud(): void {
    const player = this.player;
    const remainingRatio = clamp(this.timerRemainingSeconds / SHARDSPAN_TIMER_LIMIT_SECONDS, 0, 1);
    const phaseColor = this.currentPhase === 'cobalt' ? '#59a6ff' : '#f0b43f';
    const nextBeacon = this.beacons[player?.beaconsCleared ?? 0] ?? null;
    const objectivePosition = nextBeacon?.root.position ?? this.finishGate?.root.position ?? null;
    const objectiveLabel = nextBeacon ? nextBeacon.label : 'Exit Gate';
    const objectiveCue = nextBeacon ? nextBeacon.cue : 'Cross the gate to secure the span.';

    this.timerValueLabel.textContent = this.formatSeconds(this.timerRemainingSeconds);
    this.timerFill.style.transform = `scaleX(${remainingRatio})`;
    this.timerFill.style.background = remainingRatio <= 0.2 ? '#ff6b6b' : phaseColor;
    this.progressValueLabel.textContent = `${player?.beaconsCleared ?? 0}/${this.beacons.length}`;
    this.phaseValueLabel.textContent = `${this.currentPhase.toUpperCase()} solid`;
    this.phaseValueLabel.style.color = phaseColor;

    if (player && objectivePosition) {
      const objectiveVector = this.scratchVectorA.copy(objectivePosition).sub(player.root.position);
      const horizontalDistance = Math.hypot(objectiveVector.x, objectiveVector.z);
      const objectiveAngle =
        Math.atan2(objectiveVector.x, objectiveVector.z) - this.cameraCurrentEuler.y;
      const normalized = ((objectiveAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const arrowIndex = Math.round(normalized / (Math.PI / 4)) % 8;
      const arrows = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];
      this.nextObjectiveLabel.textContent = `${objectiveLabel} ${arrows[arrowIndex]} ${horizontalDistance.toFixed(0)}m - ${objectiveCue}`;
    } else {
      this.nextObjectiveLabel.textContent = `${objectiveLabel} - ${objectiveCue}`;
    }
  }

  private buildGhostRunSummary(): Record<string, unknown> {
    const step = this.ghostRun?.steps[this.ghostRun.currentStepIndex] ?? null;
    return {
      name: this.ghostRun?.name ?? null,
      active: this.ghostRun?.active ?? false,
      completed: this.ghostRun?.completed ?? false,
      currentStepIndex: this.ghostRun?.currentStepIndex ?? -1,
      currentStepLabel: step?.label ?? null,
      frameInStep: this.ghostRun?.frameInStep ?? 0,
      currentInput: this.ghostRun
        ? {
            moveX: Number(this.ghostRun.currentInput.moveX.toFixed(3)),
            moveZ: Number(this.ghostRun.currentInput.moveZ.toFixed(3)),
            lookX: Number(this.ghostRun.currentInput.lookX.toFixed(3)),
            lookY: Number(this.ghostRun.currentInput.lookY.toFixed(3)),
            zoom: Number(this.ghostRun.currentInput.zoom.toFixed(3)),
            jumpDown: this.ghostRun.currentInput.jumpDown,
          }
        : null,
      lastLandingEvent: this.lastLandingEvent,
      lastTriggerHit: this.lastTriggerHit,
      currentAnimation: this.player?.currentAnimation ?? null,
      cameraOracleDelta: { ...this.cameraOracleDelta },
    };
  }

  private buildAxesSummary(runtime: CameraSnapshot): Record<string, unknown> {
    const sampleSummaries = this.orientationSamples.slice(0, ORIENTATION_SAMPLE_LIMIT).map((sample) => {
      const up = new THREE.Vector3(0, 1, 0)
        .applyQuaternion(sample.object.getWorldQuaternion(new THREE.Quaternion()))
        .normalize();
      const tiltDegrees = angleBetweenVectorsDegrees(up, WORLD_UP);
      return {
        name: sample.name,
        up: vectorToRecord(up, 3),
        tiltDegrees: Number(tiltDegrees.toFixed(3)),
      };
    });
    const maxWorldTiltDegrees = sampleSummaries.reduce<number>(
      (maxValue, sample) => Math.max(maxValue, sample.tiltDegrees),
      0,
    );
    const cameraRollDegrees = Number(runtime.visibleEulerDegrees.z.toFixed(3));
    const oracleCameraRollDegrees = Number(this.cameraOracle.visibleEulerDegrees.z.toFixed(3));
    const classification =
      maxWorldTiltDegrees > WORLD_TILT_THRESHOLD_DEGREES
        ? 'world-tilt-likely'
        : Math.abs(cameraRollDegrees) > CAMERA_TILT_THRESHOLD_DEGREES
          ? 'camera-only-tilt-likely'
          : 'no-tilt-detected';

    return {
      classification,
      maxWorldTiltDegrees: Number(maxWorldTiltDegrees.toFixed(3)),
      cameraRollDegrees,
      oracleCameraRollDegrees,
      rollDeltaDegrees: this.cameraOracleDelta.rollDegrees,
      runtimeCameraUp: vectorToRecord(runtime.up, 3),
      runtimeCameraForward: vectorToRecord(runtime.forward, 3),
      samples: sampleSummaries,
    };
  }

  private renderGameToText(): string {
    const player = this.player;
    const runtimeCamera = this.populateRuntimeCameraSnapshot();
    const axesSummary = this.buildAxesSummary(runtimeCamera);
    const capsuleCenter = player
      ? player.root.position.clone().add(player.colliderOffset)
      : new THREE.Vector3();
    const colliderBottomY = player
      ? player.root.position.y + player.colliderOffset.y - (player.capsuleHalfHeight + player.capsuleRadius)
      : 0;
    const remainingBeacons = this.beacons.filter((beacon) => !beacon.collected).map((beacon) => ({
      id: beacon.id,
      x: Number(beacon.root.position.x.toFixed(2)),
      y: Number(beacon.root.position.y.toFixed(2)),
      z: Number(beacon.root.position.z.toFixed(2)),
    }));

    const payload = {
      coordinateSystem: '+X right, +Y up, -Z forward',
      mode: this.mode,
      debugView: this.debugView,
      cameraMode: this.cameraMode,
      inputMode: this.activeInputMode,
      controlHints: this.buildDesktopControlHintSummary(),
      player: player
        ? {
            position: {
              x: Number(player.root.position.x.toFixed(3)),
              y: Number(player.root.position.y.toFixed(3)),
              z: Number(player.root.position.z.toFixed(3)),
            },
            colliderCenter: {
              x: Number(capsuleCenter.x.toFixed(3)),
              y: Number(capsuleCenter.y.toFixed(3)),
              z: Number(capsuleCenter.z.toFixed(3)),
            },
            colliderBottomY: Number(colliderBottomY.toFixed(3)),
            colliderBottomOffsetFromRoot: Number((player.root.position.y - colliderBottomY).toFixed(3)),
            velocity: {
              x: Number(player.horizontalVelocity.x.toFixed(3)),
              y: Number(player.verticalVelocity.toFixed(3)),
              z: Number(player.horizontalVelocity.z.toFixed(3)),
            },
            grounded: player.grounded,
            groundedReason: this.groundedReason,
            jumpSingleAvailable: player.jumpSingleAvailable,
            jumpDoubleAvailable: player.jumpDoubleAvailable,
            beaconsCleared: player.beaconsCleared,
            resetCount: player.resetCount,
            recentReset: player.recentReset,
            animation: player.currentAnimation,
          }
        : null,
      cameraRuntime: {
        rigPosition: vectorToRecord(runtimeCamera.rigPosition, 3),
        targetEulerDegrees: vectorToRecord(runtimeCamera.targetEulerDegrees, 3),
        visibleEulerDegrees: vectorToRecord(runtimeCamera.visibleEulerDegrees, 3),
        localCameraPosition: vectorToRecord(runtimeCamera.localCameraPosition, 3),
        worldPosition: vectorToRecord(runtimeCamera.worldPosition, 3),
        forward: vectorToRecord(runtimeCamera.forward, 3),
        up: vectorToRecord(runtimeCamera.up, 3),
      },
      camera: {
        yawDegrees: Number(runtimeCamera.visibleEulerDegrees.y.toFixed(2)),
        pitchDegrees: Number(runtimeCamera.visibleEulerDegrees.x.toFixed(2)),
        zoom: Number(this.cameraZoomCurrent.toFixed(2)),
      },
      cameraOracle: {
        rigPosition: vectorToRecord(this.cameraOracle.rigPosition, 3),
        targetEulerDegrees: vectorToRecord(this.cameraOracle.targetEulerDegrees, 3),
        visibleEulerDegrees: vectorToRecord(this.cameraOracle.visibleEulerDegrees, 3),
        localCameraPosition: vectorToRecord(this.cameraOracle.localCameraPosition, 3),
        worldPosition: vectorToRecord(this.cameraOracle.worldPosition, 3),
        forward: vectorToRecord(this.cameraOracle.forward, 3),
        up: vectorToRecord(this.cameraOracle.up, 3),
        sourceMatch: this.cameraSourceMatch,
      },
      cameraDelta: { ...this.cameraOracleDelta },
      groundedReason: this.groundedReason,
      phase: this.currentPhase,
      overlayState: this.overlayState,
      runStarted: this.runStarted,
      timerRemainingSeconds: Number(this.timerRemainingSeconds.toFixed(3)),
      elapsedSeconds: Number(this.elapsedSeconds.toFixed(3)),
      deathCount: this.deathCount,
      checkpointPosition: vectorToRecord(this.checkpointPosition, 3),
      ghostRun: this.buildGhostRunSummary(),
      axesSummary,
      beaconsRemaining: remainingBeacons.length,
      remainingBeaconPositions: remainingBeacons,
      finishGateReady: (this.player?.beaconsCleared ?? 0) >= this.beacons.length,
      fallingPlatforms: this.fallingPlatforms.map((platform) => ({
        name: platform.name,
        state: platform.state,
        position: {
          x: Number(platform.root.position.x.toFixed(2)),
          y: Number(platform.root.position.y.toFixed(2)),
          z: Number(platform.root.position.z.toFixed(2)),
        },
      })),
      bricksRemaining: this.bricks.filter((brick) => !brick.broken).length,
      perf: this.perfTracker.snapshot(),
    };

    return JSON.stringify(payload);
  }

  private syncDebugButtons(): void {
    this.renderModeButton.setAttribute('aria-pressed', String(this.debugView === 'render'));
    this.physicsModeButton.setAttribute('aria-pressed', String(this.debugView === 'physics'));
    this.followCameraButton.setAttribute('aria-pressed', String(this.cameraMode === 'follow'));
    this.topdownCameraButton.setAttribute('aria-pressed', String(this.cameraMode === 'topdown'));
    this.pauseButton.setAttribute('aria-pressed', String(this.simulationPaused));
    this.pauseButton.textContent = this.simulationPaused ? 'Resume' : 'Pause';
    this.axesToggleButton.setAttribute('aria-pressed', String(this.showAxes));
    this.triggersToggleButton.setAttribute('aria-pressed', String(this.showTriggers));
    this.cameraGizmoToggleButton.setAttribute('aria-pressed', String(this.showCameraGizmo));
    this.ghostStartButton.setAttribute('aria-pressed', String(Boolean(this.ghostRun?.active)));
    this.ghostStopButton.disabled = !this.ghostRun?.active;
  }

  private updateDebugStatus(): void {
    if (!this.debugUiEnabled) {
      return;
    }
    const runtime = this.populateRuntimeCameraSnapshot();
    const axesSummary = this.buildAxesSummary(runtime) as {
      classification: string;
      maxWorldTiltDegrees: number;
      cameraRollDegrees: number;
      oracleCameraRollDegrees: number;
    };
    const ghostRun = this.buildGhostRunSummary();
    const ghostStepLabel =
      typeof ghostRun.currentStepLabel === 'string' && ghostRun.currentStepLabel.length > 0
        ? ghostRun.currentStepLabel
        : 'idle';
    this.debugStatus.textContent = [
      `Tilt ${axesSummary.classification} | world ${axesSummary.maxWorldTiltDegrees.toFixed(3)} | runtime roll ${axesSummary.cameraRollDegrees.toFixed(3)} | oracle roll ${axesSummary.oracleCameraRollDegrees.toFixed(3)}`,
      `Camera delta pos ${this.cameraOracleDelta.positionDistance.toFixed(4)} | yaw ${this.cameraOracleDelta.yawDegrees.toFixed(3)} | pitch ${this.cameraOracleDelta.pitchDegrees.toFixed(3)} | roll ${this.cameraOracleDelta.rollDegrees.toFixed(3)}`,
      `Grounded ${this.player?.grounded ?? false} (${this.groundedReason}) | animation ${this.player?.currentAnimation ?? 'none'} | source match ${this.cameraSourceMatch.matched} (${this.cameraSourceMatch.maxElementDelta.toFixed(6)})`,
      `Perf ${this.perfTracker.snapshot().estimatedFps.toFixed(1)} fps | quality ${this.qualityProfile.name}`,
      `Ghost ${ghostStepLabel} | step ${String(ghostRun.currentStepIndex)} | last landing ${this.lastLandingEvent ? this.lastLandingEvent.impactSpeed.toFixed(3) : 'none'} | last trigger ${this.lastTriggerHit?.role ?? 'none'}`,
    ].join('\n');
  }

  private syncDebugScene(): void {
    const physicsVisible = this.debugView === 'physics';
    this.renderRoot.visible = !physicsVisible;
    this.debugRoot.visible = physicsVisible;
    this.scene.background = physicsVisible ? PHYSICS_BACKGROUND : this.renderBackground;

    if (!this.debugUiEnabled && !physicsVisible) {
      this.cameraGizmoRoot.visible = false;
      this.runtimeCameraHelper.visible = false;
      if (this.player) {
        this.player.debugMesh.visible = false;
      }
      return;
    }

    for (const triggerMesh of this.triggerDebugObjects) {
      triggerMesh.visible = this.showTriggers;
    }
    for (const axesObject of this.axesDebugObjects) {
      axesObject.visible = this.showAxes;
    }
    this.cameraGizmoRoot.visible = physicsVisible && this.showCameraGizmo;
    this.runtimeCameraHelper.visible = this.showCameraGizmo;

    if (this.player) {
      this.player.debugMesh.visible = physicsVisible;
      if (this.playerAxesHelper) {
        this.playerAxesHelper.position.copy(this.player.root.position);
        this.playerAxesHelper.quaternion.copy(this.player.root.quaternion);
      }
    }

    if (this.cameraRigAxesHelper) {
      const rigQuaternion =
        this.cameraMode === 'topdown'
          ? this.camera.quaternion
          : this.scratchQuaternion.setFromEuler(this.cameraCurrentEuler);
      this.cameraRigAxesHelper.position.copy(this.runtimeCameraSnapshot.rigPosition);
      this.cameraRigAxesHelper.quaternion.copy(rigQuaternion);
    }

    this.runtimeCameraHelper.update();
    this.runtimeCameraForwardArrow.position.copy(this.runtimeCameraSnapshot.worldPosition);
    this.runtimeCameraForwardArrow.setDirection(this.runtimeCameraSnapshot.forward);
    this.runtimeCameraUpArrow.position.copy(this.runtimeCameraSnapshot.worldPosition);
    this.runtimeCameraUpArrow.setDirection(this.runtimeCameraSnapshot.up);
    this.oracleCameraForwardArrow.position.copy(this.cameraOracle.worldPosition);
    this.oracleCameraForwardArrow.setDirection(this.cameraOracle.forward);
    this.oracleCameraUpArrow.position.copy(this.cameraOracle.worldPosition);
    this.oracleCameraUpArrow.setDirection(this.cameraOracle.up);
    this.updateDebugStatus();
  }

  private render(): RenderPerfStats {
    if (this.debugUiEnabled || this.debugView === 'physics') {
      this.populateRuntimeCameraSnapshot();
    }
    this.syncDebugScene();
    this.renderer.info.reset();
    this.renderer.render(this.scene, this.camera);
    return {
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
    };
  }
}

async function main(): Promise<void> {
  const host = window.playdrop;
  if (!host) {
    throw new Error('[starter-kit-3d-platformer] window.playdrop unavailable');
  }
  const sdk = await resolveSdk();

  host.host?.setLoadingState?.({
    status: 'loading',
    message: 'Preparing physics...',
    progress: 0.08,
  });
  await RAPIER.init();

  const app = new PlatformerApp(host, sdk, window.__starterKit3dPlatformerHarnessConfig__ ?? null);
  await app.init();
}

async function resolveSdk(): Promise<StarterKitSdk> {
  if (window.__starterKit3dPlatformerSdk__) {
    return window.__starterKit3dPlatformerSdk__;
  }
  if (!window.__starterKit3dPlatformerSdkPromise__) {
    throw new Error('[starter-kit-3d-platformer] sdk bootstrap promise unavailable');
  }
  const sdk = await window.__starterKit3dPlatformerSdkPromise__;
  window.__starterKit3dPlatformerSdk__ = sdk;
  return sdk;
}

main().catch((error) => {
  console.error('[starter-kit-3d-platformer] startup failed', error);
  if (window.__starterKit3dPlatformerHarnessConfig__?.benchmarkEnabled === true) {
    document.title = formatBenchmarkErrorTitle(
      'starter-kit-3d-platformer',
      error instanceof Error ? error.message : 'Failed to load Starter Kit 3D Platformer',
    );
  }
  window.playdrop?.host?.setLoadingState?.({
    status: 'error',
    message: error instanceof Error ? error.message : 'Failed to load Starter Kit 3D Platformer',
  });
});

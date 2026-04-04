/// <reference types="playdrop-sdk-types" />

import type { PlaydropSDK } from 'playdrop-sdk-types';
import * as THREE from 'three';

import { AudioController } from './audio';
import { CameraController, createPostProcessingStack } from './camera';
import {
  FIXED_DT,
  GODOT_AMBIENT_COLOR,
  GODOT_BACKGROUND_COLOR,
  START_SPHERE_POSITION,
  SUN_LIGHT_INTENSITY,
  SUN_POSITION_DIRECTION,
  SUN_SHADOW_INTENSITY,
  TRACK_Y,
} from './constants';
import {
  BEACON_TRIGGER_RADIUS,
  CONTRACT_BY_ID,
  CONTRACTS,
  CONTRACT_START_POSITION,
  CONTRACT_START_YAW,
  RESPAWN_TIME_PENALTY_SECONDS,
  formatClock,
  formatDeltaSeconds,
  getBestTimeStorageKey,
  getMedalTier,
  type ContractDefinition,
  type ContractId,
  type MedalTier,
  type RouteBeacon,
} from './contracts';
import { PhysicsController } from './physics';
import { SmokeSystem } from './particles';
import { TrackController } from './track';
import type { AssetBundle } from './shared';
import { VehicleController } from './vehicle';

type GamePhase = 'select' | 'countdown' | 'driving' | 'result';
type ControlsSnapshot = { x: number; z: number };
type BeaconVisual = {
  group: THREE.Group;
  beam: THREE.Mesh;
  pillar: THREE.Mesh;
  orb: THREE.Mesh;
  ring: THREE.Mesh;
  light: THREE.PointLight;
};
type ResultState = {
  success: boolean;
  finalTimeSeconds: number;
  bestTimeSeconds: number | null;
  medal: MedalTier;
  summary: string;
};
type ContractButton = HTMLButtonElement & {
  dataset: DOMStringMap & { contractId: ContractId };
};

type UiElements = {
  startOverlay: HTMLElement;
  contractButtons: ContractButton[];
  startContractButton: HTMLButtonElement;
  viewMedalsButton: HTMLButtonElement;
  medalNotes: HTMLElement;
  hud: HTMLElement;
  countdownOverlay: HTMLElement;
  countdownValue: HTMLElement;
  timerValue: HTMLElement;
  timerSubvalue: HTMLElement;
  contractName: HTMLElement;
  progressValue: HTMLElement;
  nextName: HTMLElement;
  nextHint: HTMLElement;
  eventToast: HTMLElement;
  resultOverlay: HTMLElement;
  resultMedal: HTMLElement;
  resultTitle: HTMLElement;
  resultSummary: HTMLElement;
  resultTime: HTMLElement;
  resultBest: HTMLElement;
  resultHits: HTMLElement;
  retryButton: HTMLButtonElement;
  backButton: HTMLButtonElement;
};

const ROAD_KINDS = new Set(['corner', 'straight', 'finish']);

function requireElement<T extends HTMLElement>(id: string, ctor: { new (): T }) {
  const element = document.getElementById(id);
  if (!(element instanceof ctor)) {
    throw new Error(`[switchback-dispatch] missing #${id}`);
  }
  return element;
}

function requireButton(id: string) {
  return requireElement(id, HTMLButtonElement);
}

function requirePanel(id: string) {
  return requireElement(id, HTMLElement);
}

function createBeaconVisual(): BeaconVisual {
  const group = new THREE.Group();

  const beam = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.86, 6.2, 24, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0xf8d488,
      emissive: 0xf7bf43,
      emissiveIntensity: 1.1,
      roughness: 0.1,
      metalness: 0,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  beam.position.y = 3.1;

  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16, 0.24, 2.2, 18),
    new THREE.MeshStandardMaterial({
      color: 0xf7bf43,
      emissive: 0xc48a15,
      emissiveIntensity: 0.65,
      roughness: 0.28,
      metalness: 0.12,
    }),
  );
  pillar.position.y = 1.1;
  pillar.castShadow = true;
  pillar.receiveShadow = true;

  const orb = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 24, 16),
    new THREE.MeshStandardMaterial({
      color: 0xfff1c5,
      emissive: 0xf7bf43,
      emissiveIntensity: 1.4,
      roughness: 0.08,
      metalness: 0,
    }),
  );
  orb.position.y = 2.2;
  orb.castShadow = true;

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.48, 0.12, 18, 48),
    new THREE.MeshStandardMaterial({
      color: 0xffd982,
      emissive: 0xc48a15,
      emissiveIntensity: 0.85,
      roughness: 0.36,
      metalness: 0.08,
      transparent: true,
      opacity: 0.96,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.12;
  ring.receiveShadow = true;

  const light = new THREE.PointLight(0xffd36f, 8, 12, 2);
  light.position.y = 1.95;

  group.add(beam, pillar, orb, ring, light);
  group.visible = false;

  return { group, beam, pillar, orb, ring, light };
}

function setBeaconState(visual: BeaconVisual, state: 'active' | 'next' | 'hidden') {
  if (state === 'hidden') {
    visual.group.visible = false;
    return;
  }

  visual.group.visible = true;
  if (state === 'active') {
    (visual.beam.material as THREE.MeshStandardMaterial).color.set('#f8d488');
    (visual.beam.material as THREE.MeshStandardMaterial).emissive.set('#f7bf43');
    (visual.beam.material as THREE.MeshStandardMaterial).opacity = 0.28;
    (visual.pillar.material as THREE.MeshStandardMaterial).color.set('#f7bf43');
    (visual.pillar.material as THREE.MeshStandardMaterial).emissive.set('#c48a15');
    (visual.pillar.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.7;
    (visual.orb.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.45;
    (visual.ring.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.9;
    (visual.ring.material as THREE.MeshStandardMaterial).opacity = 0.96;
    visual.light.intensity = 8;
  } else {
    (visual.beam.material as THREE.MeshStandardMaterial).color.set('#7fdbe0');
    (visual.beam.material as THREE.MeshStandardMaterial).emissive.set('#69d0d6');
    (visual.beam.material as THREE.MeshStandardMaterial).opacity = 0.16;
    (visual.pillar.material as THREE.MeshStandardMaterial).color.set('#69d0d6');
    (visual.pillar.material as THREE.MeshStandardMaterial).emissive.set('#1e6d74');
    (visual.pillar.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.42;
    (visual.orb.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.62;
    (visual.ring.material as THREE.MeshStandardMaterial).emissiveIntensity = 0.38;
    (visual.ring.material as THREE.MeshStandardMaterial).opacity = 0.5;
    visual.light.intensity = 2.6;
  }
}

function getControls(keyState: Set<string>): ControlsSnapshot {
  let x = 0;
  let z = 0;

  if (keyState.has('KeyA') || keyState.has('ArrowLeft')) {
    x -= 1;
  }
  if (keyState.has('KeyD') || keyState.has('ArrowRight')) {
    x += 1;
  }
  if (keyState.has('KeyW') || keyState.has('ArrowUp')) {
    z += 1;
  }
  if (keyState.has('KeyS') || keyState.has('ArrowDown')) {
    z -= 1;
  }

  return { x, z };
}

export class SwitchbackDispatchGame {
  private readonly canvas: HTMLCanvasElement;
  private readonly sdk: PlaydropSDK;
  private readonly host: PlaydropSDK['host'];
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly renderWorld = new THREE.Group();
  private readonly beaconsRoot = new THREE.Group();
  private readonly smokeSystem: SmokeSystem;
  private readonly audioController: AudioController;
  private readonly trackController: TrackController;
  private readonly physicsController: PhysicsController;
  private readonly cameraController: CameraController;
  private readonly vehicleController: VehicleController;
  private readonly ui: UiElements;
  private readonly keyState = new Set<string>();
  private readonly beaconVisuals = new Map<string, BeaconVisual>();
  private readonly listingCaptureEnabled =
    new URLSearchParams(window.location.search).get('listingCapture') === '1';

  private postProcessing: ReturnType<typeof createPostProcessingStack> | null = null;
  private stopPauseSubscription: (() => void) | null = null;
  private stopResumeSubscription: (() => void) | null = null;
  private stopAudioPolicySubscription: (() => void) | null = null;

  private phase: GamePhase = 'select';
  private selectedContractId: ContractId = 'first-light';
  private countdownRemaining = 0;
  private timerRemaining = CONTRACT_BY_ID['first-light'].timeLimitSeconds;
  private elapsedSeconds = 0;
  private activeBeaconIndex = 0;
  private offRoadSeconds = 0;
  private barrierHits = 0;
  private medalNotesVisible = false;
  private lastFrameAt = 0;
  private accumulator = 0;
  private resultState: ResultState | null = null;
  private lastImpactRegisteredAt = 0;
  private toastRemaining = 0;
  private toastText = '';

  constructor(
    canvas: HTMLCanvasElement,
    sdk: PlaydropSDK,
    host: PlaydropSDK['host'],
    assets: AssetBundle,
    webglContext: WebGL2RenderingContext,
  ) {
    this.canvas = canvas;
    this.sdk = sdk;
    this.host = host;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      context: webglContext,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.smokeSystem = new SmokeSystem(assets.smokeTexture);
    this.audioController = new AudioController(assets.audioBuffers);
    this.trackController = new TrackController(assets.tiles);
    this.physicsController = new PhysicsController();
    this.cameraController = new CameraController(window.location.search, this.trackController.worldBounds);
    this.vehicleController = new VehicleController(assets.vehicles);
    this.ui = this.getUiElements();

    this.scene.background = new THREE.Color('#203145');
    this.scene.fog = new THREE.Fog('#203145', 22, 74);
    this.vehicleController.setVehicleId('truck-yellow');

    this.buildScene();
    this.installDomHooks();
    this.installWindowHooks();
    this.resetVehicleToStart();
    this.syncBeaconVisuals();
    this.syncUi();
    this.installGlobalDebugHooks();
  }

  async initialize() {
    this.host.setLoadingState({ status: 'loading', message: 'Preparing route', progress: 0.78 });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.CineonToneMapping;
    this.renderer.toneMappingExposure = 1.4;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.cameraController.updateProjection(window.innerWidth, window.innerHeight);
    this.postProcessing = createPostProcessingStack(
      this.renderer,
      this.scene,
      this.cameraController.followCamera,
      window.innerWidth,
      window.innerHeight,
    );

    this.stopPauseSubscription = this.host.onPause?.(() => {
      this.audioController.setHostPaused(true);
    }) ?? null;
    this.stopResumeSubscription = this.host.onResume?.(() => {
      this.audioController.setHostPaused(false);
    }) ?? null;
    this.stopAudioPolicySubscription = this.host.onAudioPolicyChange?.(({ enabled }) => {
      this.audioController.setHostAudioEnabled(enabled);
    }) ?? null;

    this.audioController.setHostPaused(this.host.isPaused);
    this.audioController.setHostAudioEnabled(this.host.audioEnabled);

    if (this.listingCaptureEnabled) {
      this.render();
    } else {
      this.renderer.setAnimationLoop((time) => {
        this.handleAnimationFrame(typeof time === 'number' ? time : performance.now());
      });
    }

    this.host.setLoadingState({ status: 'ready' });
    this.host.ready();
  }

  dispose() {
    this.stopPauseSubscription?.();
    this.stopResumeSubscription?.();
    this.stopAudioPolicySubscription?.();
    this.postProcessing?.dispose();
    this.renderer.dispose();
  }

  private getUiElements(): UiElements {
    const contractButtons = Array.from(document.querySelectorAll('[data-contract-id]')).map((element) => {
      if (!(element instanceof HTMLButtonElement)) {
        throw new Error('[switchback-dispatch] contract buttons must be buttons');
      }
      return element as ContractButton;
    });
    if (contractButtons.length !== CONTRACTS.length) {
      throw new Error('[switchback-dispatch] missing contract buttons');
    }

    return {
      startOverlay: requirePanel('start-overlay'),
      contractButtons,
      startContractButton: requireButton('start-contract-button'),
      viewMedalsButton: requireButton('view-medals-button'),
      medalNotes: requirePanel('medal-notes'),
      hud: requirePanel('hud-root'),
      countdownOverlay: requirePanel('countdown-overlay'),
      countdownValue: requirePanel('countdown-value'),
      timerValue: requirePanel('hud-clock-value'),
      timerSubvalue: requirePanel('hud-clock-subvalue'),
      contractName: requirePanel('hud-contract-name'),
      progressValue: requirePanel('hud-progress-value'),
      nextName: requirePanel('hud-next-name'),
      nextHint: requirePanel('hud-next-hint'),
      eventToast: requirePanel('event-toast'),
      resultOverlay: requirePanel('result-overlay'),
      resultMedal: requirePanel('result-medal'),
      resultTitle: requirePanel('result-title'),
      resultSummary: requirePanel('result-summary'),
      resultTime: requirePanel('result-time'),
      resultBest: requirePanel('result-best'),
      resultHits: requirePanel('result-hits'),
      retryButton: requireButton('retry-button'),
      backButton: requireButton('back-button'),
    };
  }

  private buildScene() {
    const ambient = new THREE.HemisphereLight(0x9db8d8, 0xffffff, 0.44);
    ambient.color.copy(GODOT_AMBIENT_COLOR);
    ambient.groundColor.setRGB(1, 1, 1);

    const sun = new THREE.DirectionalLight(0xffffff, SUN_LIGHT_INTENSITY);
    sun.position.copy(SUN_POSITION_DIRECTION).multiplyScalar(24);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.intensity = SUN_SHADOW_INTENSITY;
    sun.shadow.bias = -0.0002;
    sun.shadow.normalBias = 0.02;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 90;
    sun.shadow.camera.left = -24;
    sun.shadow.camera.right = 24;
    sun.shadow.camera.top = 24;
    sun.shadow.camera.bottom = -24;
    sun.target.position.set(-4, 0, -4);

    this.renderWorld.add(
      this.trackController.group,
      this.beaconsRoot,
      this.vehicleController.container,
      this.smokeSystem.group,
    );
    this.scene.add(ambient, sun, sun.target, this.renderWorld, this.cameraController.followCamera, this.cameraController.mapCamera);

    for (const contract of CONTRACTS) {
      for (const beacon of contract.deliveries) {
        if (this.beaconVisuals.has(beacon.id)) {
          continue;
        }
        const visual = createBeaconVisual();
        visual.group.position.copy(beacon.position);
        this.beaconsRoot.add(visual.group);
        this.beaconVisuals.set(beacon.id, visual);
      }
    }
  }

  private installDomHooks() {
    for (const button of this.ui.contractButtons) {
      button.addEventListener('click', () => {
        this.selectedContractId = button.dataset.contractId;
        this.syncUi();
      });
    }
    this.ui.startContractButton.addEventListener('click', () => {
      void this.audioController.unlock();
      this.startSelectedContract();
    });
    this.ui.viewMedalsButton.addEventListener('click', () => {
      this.medalNotesVisible = !this.medalNotesVisible;
      this.syncUi();
    });
    this.ui.retryButton.addEventListener('click', () => {
      void this.audioController.unlock();
      this.startSelectedContract();
    });
    this.ui.backButton.addEventListener('click', () => {
      this.phase = 'select';
      this.resultState = null;
      this.medalNotesVisible = false;
      this.toastRemaining = 0;
      this.toastText = '';
      this.resetVehicleToStart();
      this.syncBeaconVisuals();
      this.syncUi();
    });
  }

  private installWindowHooks() {
    window.addEventListener('keydown', (event) => {
      this.keyState.add(event.code);
      if (event.code === 'Enter' && this.phase === 'select') {
        event.preventDefault();
        void this.audioController.unlock();
        this.startSelectedContract();
      }
      if (event.code === 'KeyR' && this.phase === 'result') {
        event.preventDefault();
        void this.audioController.unlock();
        this.startSelectedContract();
      }
      void this.audioController.unlock();
    });
    window.addEventListener('keyup', (event) => {
      this.keyState.delete(event.code);
    });
    window.addEventListener('blur', () => {
      this.keyState.clear();
    });
    window.addEventListener(
      'pointerdown',
      () => {
        void this.audioController.unlock();
      },
      { passive: true },
    );
    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }

  private installGlobalDebugHooks() {
    window.advanceTime = (ms) => {
      let remaining = ms / 1000;
      while (remaining > 0) {
        const step = Math.min(FIXED_DT, remaining);
        this.tick(step);
        remaining -= step;
      }
      this.render();
    };
    window.render_game_to_text = () => {
      return JSON.stringify(
        {
          phase: this.phase,
          contract: this.currentContract.id,
          countdownRemaining: Number(this.countdownRemaining.toFixed(2)),
          timerRemaining: Number(this.timerRemaining.toFixed(2)),
          elapsedSeconds: Number(this.elapsedSeconds.toFixed(2)),
          deliveryIndex: this.activeBeaconIndex,
          deliveriesTotal: this.currentContract.deliveries.length,
          activeBeacon: this.getActiveBeacon()?.label ?? null,
          nextBeacon: this.getNextBeacon()?.label ?? null,
          barrierHits: this.barrierHits,
          offRoadSeconds: Number(this.offRoadSeconds.toFixed(2)),
          bestTime: this.readBestTime(this.currentContract.id),
          toast: this.toastRemaining > 0 ? this.toastText : null,
          telemetry: {
            position: [
              Number(this.vehicleController.telemetry.spherePosition.x.toFixed(2)),
              Number(this.vehicleController.telemetry.spherePosition.y.toFixed(2)),
              Number(this.vehicleController.telemetry.spherePosition.z.toFixed(2)),
            ],
            speed: Number(this.vehicleController.telemetry.linearSpeed.toFixed(3)),
            driftIntensity: Number(this.vehicleController.telemetry.driftIntensity.toFixed(3)),
          },
        },
        null,
        2,
      );
    };
  }

  private get currentContract() {
    return CONTRACT_BY_ID[this.selectedContractId];
  }

  private getActiveBeacon() {
    return this.currentContract.deliveries[this.activeBeaconIndex] ?? null;
  }

  private getNextBeacon() {
    return this.currentContract.deliveries[this.activeBeaconIndex + 1] ?? null;
  }

  private handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.cameraController.updateProjection(width, height);
    this.postProcessing?.resize(width, height);
    this.render();
  }

  private handleAnimationFrame(now: number) {
    if (this.lastFrameAt === 0) {
      this.lastFrameAt = now;
    }
    const delta = Math.min((now - this.lastFrameAt) / 1000, 0.1);
    this.lastFrameAt = now;
    this.accumulator += delta;

    while (this.accumulator >= FIXED_DT) {
      this.tick(FIXED_DT);
      this.accumulator -= FIXED_DT;
    }

    this.render();
  }

  private tick(dt: number) {
    if (this.phase === 'countdown') {
      this.countdownRemaining = Math.max(0, this.countdownRemaining - dt);
      if (this.countdownRemaining <= 0) {
        this.phase = 'driving';
      }
      this.cameraController.update(
        this.vehicleController.position,
        0,
        dt,
        this.getActiveBeacon()?.position ?? CONTRACT_START_POSITION,
      );
      this.syncUi();
      return;
    }

    if (this.phase !== 'driving') {
      this.cameraController.update(
        this.vehicleController.position,
        this.vehicleController.telemetry.linearSpeed,
        dt,
        this.getActiveBeacon()?.position ?? this.vehicleController.position,
      );
      return;
    }

    const controls = getControls(this.keyState);
    const groundState = this.physicsController.sampleGround();
    this.vehicleController.applyControls(this.physicsController.sphereBody, { ...controls, source: 'keyboard' }, groundState, dt);
    this.physicsController.step();
    const refreshedGroundState = this.physicsController.sampleGround();
    this.vehicleController.sync(
      this.physicsController.sphereBody,
      refreshedGroundState,
      dt,
      this.smokeSystem,
      this.audioController,
    );
    this.cameraController.update(
      this.vehicleController.position,
      this.vehicleController.telemetry.linearSpeed,
      dt,
      this.getActiveBeacon()?.position ?? this.vehicleController.position,
    );

    const impact = this.physicsController.consumeLocalImpactImpulse();
    if (impact !== null) {
      this.audioController.playImpact(impact);
      if (impact > 0.95 && performance.now() - this.lastImpactRegisteredAt > 180) {
        this.barrierHits += 1;
        this.lastImpactRegisteredAt = performance.now();
      }
    }

    this.elapsedSeconds += dt;
    this.timerRemaining = Math.max(0, this.currentContract.timeLimitSeconds - this.elapsedSeconds);
    this.toastRemaining = Math.max(0, this.toastRemaining - dt);
    this.maybeResolveBeacon();
    this.maybeRespawn();

    if (this.timerRemaining <= 0) {
      this.finishRun(false);
      return;
    }

    this.syncUi();
  }

  private maybeResolveBeacon() {
    const activeBeacon = this.getActiveBeacon();
    if (!activeBeacon) {
      return;
    }

    const position = this.vehicleController.telemetry.spherePosition;
    const dx = position.x - activeBeacon.position.x;
    const dz = position.z - activeBeacon.position.z;
    const withinRange = dx * dx + dz * dz <= BEACON_TRIGGER_RADIUS * BEACON_TRIGGER_RADIUS;
    if (!withinRange) {
      return;
    }

    this.activeBeaconIndex += 1;
    this.audioController.playCheckpoint();
    if (this.activeBeaconIndex >= this.currentContract.deliveries.length) {
      this.showToast(`${activeBeacon.label} delivered. Contract closed.`, 1.2);
      this.finishRun(true);
      return;
    }
    this.showToast(`${activeBeacon.label} locked. Next ${this.getActiveBeacon()?.label ?? 'drop'}.`, 1.15);
    this.syncBeaconVisuals();
  }

  private maybeRespawn() {
    const currentTile = this.trackController.getCurrentTile(
      this.vehicleController.telemetry.spherePosition,
      this.physicsController.getGroundState().isGrounded,
      this.physicsController.getGroundState().lastGroundY,
    );
    const onRoad = currentTile !== null && ROAD_KINDS.has(currentTile.kind);
    if (onRoad) {
      this.offRoadSeconds = 0;
      return;
    }

    this.offRoadSeconds += FIXED_DT;
    if (this.offRoadSeconds < 0.45 && this.vehicleController.telemetry.spherePosition.y > TRACK_Y - 1.5) {
      return;
    }

    this.elapsedSeconds += RESPAWN_TIME_PENALTY_SECONDS;
    this.timerRemaining = Math.max(0, this.currentContract.timeLimitSeconds - this.elapsedSeconds);
    this.barrierHits += 1;
    this.resetVehicleToStart();
    this.offRoadSeconds = 0;
    this.syncUi();
  }

  private resetVehicleToStart() {
    this.physicsController.resetGroundState();
    this.physicsController.setVehicleBodyState(CONTRACT_START_POSITION, new THREE.Vector3());
    this.vehicleController.setPose(CONTRACT_START_POSITION, CONTRACT_START_YAW, new THREE.Vector3());
    this.cameraController.resetFocus(CONTRACT_START_POSITION);
  }

  private startSelectedContract() {
    this.phase = 'countdown';
    this.countdownRemaining = 3;
    this.elapsedSeconds = 0;
    this.timerRemaining = this.currentContract.timeLimitSeconds;
    this.activeBeaconIndex = 0;
    this.offRoadSeconds = 0;
    this.barrierHits = 0;
    this.resultState = null;
    this.medalNotesVisible = false;
    this.toastRemaining = 0;
    this.toastText = '';
    this.keyState.clear();
    this.resetVehicleToStart();
    this.syncBeaconVisuals();
    this.syncUi();
  }

  private finishRun(success: boolean) {
    this.phase = 'result';
    this.audioController.playFinish(success);
    const finalTimeSeconds = success ? this.elapsedSeconds : this.currentContract.timeLimitSeconds;
    const medal = success ? getMedalTier(this.currentContract, finalTimeSeconds) : 'none';
    const bestTimeSeconds = success ? this.writeBestTimeIfNeeded(this.currentContract.id, finalTimeSeconds) : this.readBestTime(this.currentContract.id);
    const summary = success
      ? medal === 'gold'
        ? 'Gold route locked. That run is clean enough to market honestly.'
        : medal === 'silver'
          ? 'Strong line. There is still time left in the route for a cleaner gold push.'
          : medal === 'bronze'
            ? 'Contract finished. The route still wants a sharper apex and less rail time.'
            : 'Finished, but not on medal pace. The line is still slower than the fantasy.'
      : 'Shift failed. The clock beat the route before the final drop.';

    this.resultState = {
      success,
      finalTimeSeconds,
      bestTimeSeconds,
      medal,
      summary,
    };
    this.syncUi();
  }

  private readBestTime(contractId: ContractId) {
    const raw = window.localStorage.getItem(getBestTimeStorageKey(contractId));
    if (!raw) {
      return null;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private writeBestTimeIfNeeded(contractId: ContractId, candidateSeconds: number) {
    const currentBest = this.readBestTime(contractId);
    if (currentBest !== null && currentBest <= candidateSeconds) {
      return currentBest;
    }
    window.localStorage.setItem(getBestTimeStorageKey(contractId), String(candidateSeconds));
    return candidateSeconds;
  }

  private syncBeaconVisuals() {
    const activeBeacon = this.getActiveBeacon();
    const nextBeacon = this.getNextBeacon();
    for (const contract of CONTRACTS) {
      for (const beacon of contract.deliveries) {
        const visual = this.beaconVisuals.get(beacon.id);
        if (!visual) {
          continue;
        }
        if (activeBeacon && beacon.id === activeBeacon.id && this.phase !== 'result' && this.phase !== 'select') {
          setBeaconState(visual, 'active');
        } else if (nextBeacon && beacon.id === nextBeacon.id && this.phase === 'driving') {
          setBeaconState(visual, 'next');
        } else {
          setBeaconState(visual, 'hidden');
        }
      }
    }
  }

  private syncUi() {
    const contract = this.currentContract;
    const activeBeacon = this.getActiveBeacon();
    const nextBeacon = this.getNextBeacon();
    const bestTime = this.readBestTime(contract.id);

    this.ui.startOverlay.hidden = this.phase !== 'select';
    this.ui.hud.hidden = this.phase !== 'driving';
    this.ui.countdownOverlay.hidden = this.phase !== 'countdown';
    this.ui.resultOverlay.hidden = this.phase !== 'result';
    this.ui.countdownValue.textContent = this.phase === 'countdown' ? String(Math.max(1, Math.ceil(this.countdownRemaining))) : '';
    this.ui.medalNotes.hidden = !this.medalNotesVisible;

    for (const button of this.ui.contractButtons) {
      const isActive = button.dataset.contractId === this.selectedContractId;
      button.classList.toggle('is-active', isActive);
      const contractDef = CONTRACT_BY_ID[button.dataset.contractId];
      const bestElement = button.querySelector('[data-contract-best]');
      if (bestElement) {
        bestElement.textContent = this.readBestTime(contractDef.id)
          ? formatClock(this.readBestTime(contractDef.id) ?? 0)
          : '--';
      }
    }

    this.ui.timerValue.textContent = formatClock(this.timerRemaining);
    this.ui.timerSubvalue.textContent = `Gold pace ${formatDeltaSeconds(this.elapsedSeconds - contract.goldSeconds)}`;
    this.ui.contractName.textContent = contract.name;
    this.ui.progressValue.textContent = `${Math.min(this.activeBeaconIndex + 1, contract.deliveries.length)} / ${contract.deliveries.length}`;
    this.ui.nextName.textContent = activeBeacon?.label ?? 'Route complete';
    this.ui.nextHint.textContent = activeBeacon?.hint ?? 'Contract closed.';
    this.ui.eventToast.hidden = this.phase !== 'driving' || this.toastRemaining <= 0;
    this.ui.eventToast.textContent = this.toastText;

    if (!this.resultState) {
      return;
    }

    this.ui.resultMedal.textContent =
      this.resultState.medal === 'none'
        ? this.resultState.success
          ? 'Route Complete'
          : 'Shift Failed'
        : `${this.resultState.medal.toUpperCase()} Route`;
    this.ui.resultTitle.textContent = this.resultState.success
      ? `${contract.name} Complete`
      : `${contract.name} Missed`;
    this.ui.resultSummary.textContent = this.resultState.summary;
    this.ui.resultTime.textContent = formatClock(this.resultState.finalTimeSeconds);
    this.ui.resultBest.textContent = this.resultState.bestTimeSeconds !== null
      ? formatClock(this.resultState.bestTimeSeconds)
      : '--';
    this.ui.resultHits.textContent = String(this.barrierHits);

    if (bestTime !== null) {
      this.ui.resultBest.textContent = formatClock(bestTime);
    }
  }

  private showToast(text: string, durationSeconds: number) {
    this.toastText = text;
    this.toastRemaining = durationSeconds;
    this.syncUi();
  }

  private render() {
    if (this.postProcessing) {
      this.postProcessing.render();
      return;
    }
    this.renderer.render(this.scene, this.cameraController.getActiveCamera());
  }
}

/// <reference types="playdrop-sdk-types" />

import type { PlaydropSDK } from 'playdrop-sdk-types';
import * as THREE from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';

import {
  getCurrentTrackSpawnPosition,
  getCurrentTrackSpawnYaw,
  getCurrentTrackDocument,
  applyTrackDocument,
  type MultiplayerTrackRoomConfig,
  type LoadedTrackState,
} from '../ugc/runtime-track';
import type { ResolvedStarterKitRacingFlags } from './flags';
import {
  FIXED_DT,
  GRID_STEP,
  GODOT_AMBIENT_COLOR,
  GODOT_BACKGROUND_COLOR,
  START_OVERLAY_ID,
  SUN_LIGHT_INTENSITY,
  SUN_POSITION_DIRECTION,
  SUN_SHADOW_INTENSITY,
} from './constants';
import {
  setDebugModeSelection,
  setDesktopControlHintsVisible,
  setModeBarVisible,
  setModeSelection,
  setOverlayStatus,
  setStartOverlayVisible,
  setTouchControlsVisible,
  setTouchDeviceMode,
  setVehiclePickerPreviewImages,
  setVehiclePickerSelection,
  setVehiclePickerShellVisible,
} from './dom';
import {
  DISPLAY_TONE_MAPPING,
  DISPLAY_TONE_MAPPING_EXPOSURE,
} from './preview-renderer';
import type {
  AssetBundle,
  CameraPose,
  CameraMode,
  DesktopControlHintsElements,
  DebugMode,
  DebugToggleButtons,
  OverlayNavigationSource,
  OverlayUiElements,
  TouchControlsElements,
  VehicleId,
  VehiclePickerOptions,
} from './shared';
import { AudioController } from './audio';
import { CameraController, createPostProcessingStack } from './camera';
import { ControlsController } from './controls';
import { SmokeSystem } from './particles';
import { PhysicsController } from './physics';
import { PreviewRaceController } from './preview';
import { TrackController } from './track';
import { VehicleController, renderVehiclePreviewImages } from './vehicle';
import { DRIFT_THRESHOLD } from './constants';
import { PLAYER_VEHICLE_IDS, vehicleIdToIndex } from './shared';
import { type LocalMotionState } from './multiplayer/packets';
import { MultiplayerController } from './multiplayer/system';

type SessionMode = 'preview' | 'overlay' | 'solo' | 'multiplayer';
type BusyAction = 'auth' | 'join' | null;
type SessionNavigationSource = OverlayNavigationSource | 'system';

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => {
      reject(reader.error ?? new Error('[starter-kit-racing] failed to read recorded audio blob'));
    };
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') {
        reject(new Error('[starter-kit-racing] expected a data URL when encoding recorded audio'));
        return;
      }
      const commaIndex = result.indexOf(',');
      if (commaIndex < 0) {
        reject(new Error('[starter-kit-racing] recorded audio data URL is malformed'));
        return;
      }
      resolve(result.slice(commaIndex + 1));
    };
    reader.readAsDataURL(blob);
  });
}

function normalizeMultiplayerErrorMessage(error: unknown) {
  const rawMessage = error instanceof Error ? error.message : String(error);
  if (!rawMessage) {
    return 'Unable to join multiplayer right now.';
  }
  if (
    rawMessage.includes('room_') ||
    rawMessage.includes('realtime_') ||
    rawMessage.includes('connection_')
  ) {
    return 'Unable to join multiplayer right now.';
  }
  return rawMessage;
}

const MULTIPLAYER_SPAWN_LANE_SPACING = GRID_STEP * 0.32;
const MULTIPLAYER_SPAWN_ROW_SPACING = GRID_STEP * 0.32;

export class StarterKitRacingDemo {
  private readonly canvas: HTMLCanvasElement;
  private readonly vehicleOptions: VehiclePickerOptions;
  private readonly overlayUi: OverlayUiElements;
  private readonly debugButtons: DebugToggleButtons;
  private readonly sdk: PlaydropSDK;
  private readonly vehicles: Record<VehicleId, GLTF>;
  private readonly playerLabelLayer: HTMLElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly trackTiles: AssetBundle['tiles'];
  private readonly scene = new THREE.Scene();
  private readonly renderWorld = new THREE.Group();
  private readonly debugWorld = new THREE.Group();
  private readonly multiplayerRoot = new THREE.Group();
  private readonly host: PlaydropSDK['host'];
  private readonly listingCaptureEnabled: boolean;
  private readonly testHooksEnabled: boolean;
  private readonly smokeSystem: SmokeSystem;
  private readonly audioController: AudioController;
  private readonly trackController: TrackController;
  private readonly physicsController: PhysicsController;
  private readonly previewController: PreviewRaceController;
  private readonly cameraController: CameraController;
  private readonly vehicleController: VehicleController;
  private readonly controlsController: ControlsController;
  private readonly cameraMode: CameraMode;
  private currentTrackRoomConfig: MultiplayerTrackRoomConfig | null;

  private multiplayerController: MultiplayerController | null = null;
  private stopAuthSubscription: (() => void) | null = null;
  private stopPhaseSubscription: (() => void) | null = null;
  private stopPauseSubscription: (() => void) | null = null;
  private stopResumeSubscription: (() => void) | null = null;
  private stopAudioPolicySubscription: (() => void) | null = null;
  private animationReady = false;
  private sessionMode: SessionMode = 'preview';
  private busyAction: BusyAction = null;
  private vehiclePickerVisible = false;
  private overlayFocusedVehicle: VehicleId | null = null;
  private accumulator = 0;
  private lastFrameTime = 0;
  private postProcessing: ReturnType<typeof createPostProcessingStack> | null = null;
  private debugMode: DebugMode;
  private uiVisible = true;
  private editorPaused = false;
  private suspendedSessionMode: SessionMode | null = null;
  private listingAudioRecorder: MediaRecorder | null = null;
  private listingAudioStopPromise: Promise<{ mimeType: string; base64: string }> | null = null;
  private sessionStatusMessage: string | null = null;
  private sessionStatusTimer: number | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    vehicleOptions: VehiclePickerOptions,
    overlayUi: OverlayUiElements,
    debugButtons: DebugToggleButtons,
    touchControls: TouchControlsElements,
    desktopControlHints: DesktopControlHintsElements,
    playerLabelLayer: HTMLElement,
    sdk: PlaydropSDK,
    host: PlaydropSDK['host'],
    assets: AssetBundle,
    renderer: THREE.WebGLRenderer,
    flags: ResolvedStarterKitRacingFlags,
    initialTrack: LoadedTrackState,
  ) {
    this.canvas = canvas;
    this.vehicleOptions = vehicleOptions;
    this.overlayUi = overlayUi;
    this.debugButtons = debugButtons;
    this.sdk = sdk;
    this.vehicles = assets.vehicles;
    this.playerLabelLayer = playerLabelLayer;
    this.host = host;
    this.renderer = renderer;
    this.listingCaptureEnabled = flags.listingCapture;
    this.testHooksEnabled = flags.enableTestHooks;
    this.debugMode = flags.debugMode;
    this.cameraMode = flags.cameraMode;
    this.currentTrackRoomConfig = initialTrack.multiplayerRoomConfig;
    this.trackTiles = assets.tiles;
    this.smokeSystem = new SmokeSystem(assets.smokeTexture);
    this.audioController = new AudioController(assets.audioBuffers);
    this.trackController = new TrackController(assets.tiles);
    this.physicsController = new PhysicsController(assets.collisionShapes);
    this.previewController = new PreviewRaceController(
      assets.vehicles,
      assets.smokeTexture,
      assets.collisionShapes,
      this.audioController,
    );
    this.cameraController = new CameraController(this.cameraMode, this.trackController.worldBounds);
    this.vehicleController = new VehicleController(assets.vehicles);
    this.controlsController = new ControlsController({
      touchControls,
      desktopControlHints,
      onOverlayActionRequested: (source) => {
        void this.activateFocusedOverlayAction(source);
      },
      onSelectVehicleRelative: (delta) => {
        this.selectRelativeVehicle(delta);
      },
      onActivationGesture: (source) => {
        void this.handleActivationGesture(source);
      },
    });

    this.multiplayerRoot.name = 'multiplayer-root';
    this.scene.background = GODOT_BACKGROUND_COLOR.clone();
    setVehiclePickerPreviewImages(this.vehicleOptions, renderVehiclePreviewImages(assets.vehicles, this.renderer));
    setTouchDeviceMode(this.controlsController.isTouchDevice);
    setTouchControlsVisible(false);
    setDesktopControlHintsVisible(false);

    this.buildScene(playerLabelLayer);
    this.installDomHooks();
    this.installListingCaptureHook();
    this.updateVehicleSelectionUi();
    this.resetVehicle();
    this.applySceneVisibility();
    this.syncUiState();

    if (this.testHooksEnabled) {
      window.advanceTime = (ms) => {
        this.stepSimulation(ms / 1000);
        this.render();
      };
      window.render_game_to_text = () => this.renderToText();
      window.__starterKitRacingTestHooks = {
        pauseLocalMultiplayerMotion: (ms) => {
          this.multiplayerController?.pauseLocalMotion(ms);
        },
        resetLocalVehicle: () => {
          this.resetVehicle();
        },
        setLocalVehicleTestState: (state) => {
          this.setLocalVehicleTestState(state);
        },
        getPreviewBenchmark: () => {
          return this.previewController.benchmarkState;
        },
      };
    } else {
      window.advanceTime = undefined;
      window.render_game_to_text = undefined;
      window.__starterKitRacingTestHooks = undefined;
    }
  }

  async initialize(width: number, height: number) {
    this.host.setLoadingState({ status: 'loading', message: 'Initializing renderer', progress: 0.75 });
    this.previewController.updateProjection(width, height);
    this.cameraController.updateProjection(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = DISPLAY_TONE_MAPPING;
    this.renderer.toneMappingExposure = DISPLAY_TONE_MAPPING_EXPOSURE;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.postProcessing = createPostProcessingStack(
      this.renderer,
      this.scene,
      this.cameraController.followCamera,
      width,
      height,
    );
    this.animationReady = true;

    this.stopAuthSubscription = this.sdk.me.onAuthChange?.(() => {
      this.handleAuthChanged();
    }) ?? null;
    this.stopPhaseSubscription = this.host.onPhaseChange?.((nextPhase) => {
      void this.applyHostedPhase(nextPhase === 'preview' ? 'preview' : 'play');
    }) ?? null;
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

    await this.applyHostedPhase(this.host.phase === 'preview' ? 'preview' : 'play');

    if (this.listingCaptureEnabled) {
      this.render();
    }
  }

  async switchTrack(track: LoadedTrackState) {
    const previousMode = this.sessionMode;
    const previousVehicleId = this.vehicleController.currentVehicleId;
    const previousTrackDocument = getCurrentTrackDocument();
    const previousTrackRoomConfig = this.currentTrackRoomConfig;

    if (previousMode === 'multiplayer') {
      await this.switchMultiplayerTrack(track, previousVehicleId, previousTrackDocument, previousTrackRoomConfig);
      return;
    }

    this.applyLoadedTrack(track);

    if (previousMode === 'preview') {
      this.busyAction = null;
      this.sessionMode = 'preview';
      this.overlayFocusedVehicle = null;
      this.previewController.start();
      this.syncUiState();
      return;
    }

    await this.startSolo('system', { forceVehicle: previousVehicleId });
  }

  resize(width: number, height: number) {
    this.postProcessing?.resize(width, height);
    this.previewController.updateProjection(width, height);
    this.cameraController.updateProjection(width, height);
    this.render();
  }

  renderFrame(time: number) {
    this.handleAnimationFrame(time);
  }

  renderNow() {
    this.render();
  }

  setUiVisible(visible: boolean) {
    this.uiVisible = visible;
    if (!visible) {
      this.vehiclePickerVisible = false;
      this.overlayFocusedVehicle = null;
    }
    this.syncUiState();
  }

  openVehiclePicker() {
    if (!this.uiVisible || this.busyAction !== null || this.sessionMode === 'preview') {
      return;
    }
    this.vehiclePickerVisible = true;
    this.overlayFocusedVehicle = this.vehicleController.currentVehicleId;
    this.syncUiState();
  }

  closeVehiclePicker() {
    if (!this.vehiclePickerVisible && this.overlayFocusedVehicle === null) {
      return;
    }
    this.vehiclePickerVisible = false;
    this.overlayFocusedVehicle = null;
    this.syncUiState();
  }

  toggleVehiclePicker() {
    if (this.vehiclePickerVisible) {
      this.closeVehiclePicker();
      return;
    }
    this.openVehiclePicker();
  }

  suspendForEditor() {
    if (this.editorPaused) {
      return;
    }
    this.editorPaused = true;
    this.suspendedSessionMode = this.sessionMode;
    this.vehiclePickerVisible = false;
    this.overlayFocusedVehicle = null;
    if (this.sessionMode === 'preview') {
      this.previewController.stop();
    }
    if (this.sessionMode === 'multiplayer') {
      this.sessionMode = 'solo';
      void this.disposeMultiplayerController();
    }
    this.busyAction = null;
    this.audioController.setAppPaused(true);
    this.syncUiState();
  }

  resumeFromEditor() {
    if (!this.editorPaused) {
      return;
    }
    const resumeMode = this.suspendedSessionMode;
    this.editorPaused = false;
    this.suspendedSessionMode = null;
    this.audioController.setAppPaused(false);
    if (resumeMode === 'preview') {
      this.previewController.start();
    } else if (resumeMode === 'multiplayer' && this.sdk.me.isLoggedIn) {
      void this.startMultiplayer('system', this.vehicleController.currentVehicleId);
    }
    this.syncUiState();
    this.render();
  }

  private buildScene(playerLabelLayer: HTMLElement) {
    const ambient = new THREE.HemisphereLight(0x9db8d8, 0xffffff, 0.42);
    ambient.color.copy(GODOT_AMBIENT_COLOR);
    ambient.groundColor.setRGB(1, 1, 1);
    this.scene.add(ambient);

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
    this.scene.add(sun, sun.target);

    playerLabelLayer.innerHTML = '';
    this.scene.add(this.renderWorld, this.debugWorld, this.cameraController.followCamera, this.cameraController.mapCamera);
    this.renderWorld.add(
      this.trackController.group,
      this.previewController.group,
      this.multiplayerRoot,
      this.vehicleController.container,
      this.smokeSystem.group,
    );
    this.debugWorld.add(this.physicsController.debugGroup, this.vehicleController.debugSphereMesh);
  }

  private installDomHooks() {
    const startOverlay = document.getElementById(START_OVERLAY_ID);
    if (!(startOverlay instanceof HTMLElement)) {
      throw new Error('[starter-kit-racing] #start-overlay missing');
    }

    for (const mode of ['render', 'physics'] as const) {
      this.debugButtons[mode].addEventListener('click', () => {
        this.setDebugMode(mode);
      });
    }

    for (const vehicleId of PLAYER_VEHICLE_IDS) {
      this.vehicleOptions[vehicleId].button.addEventListener('click', () => {
        void this.selectVehicle(vehicleId, 'pointer');
      });
    }

    this.overlayUi.soloModeButton.addEventListener('click', () => {
      void this.requestSoloMode('pointer');
    });
    this.overlayUi.multiplayerModeButton.addEventListener('click', () => {
      void this.requestMultiplayerMode('pointer');
    });
    startOverlay.addEventListener('click', (event) => {
      if (event.target === startOverlay) {
        this.closeVehiclePicker();
      }
    });
    window.addEventListener('keydown', (event) => {
      if (event.code === 'Escape' && this.vehiclePickerVisible) {
        event.preventDefault();
        this.closeVehiclePicker();
      }
    });

    window.addEventListener('pagehide', () => {
      void this.disposeMultiplayerController();
    });
  }

  private installListingCaptureHook() {
    window.__listingCapture = {
      prepare: async (sceneId: string) => {
        if (sceneId !== 'listing-landscape' && sceneId !== 'listing-portrait') {
          throw new Error(`[starter-kit-racing] Unsupported listing scene ${sceneId}`);
        }
        this.setDebugMode('render');
        await this.enterPreviewMode();
        await this.audioController.unlock();
        setTouchControlsVisible(false);
        setDesktopControlHintsVisible(false);
        this.render();
      },
      startAudioCapture: async () => {
        await this.startListingAudioCapture();
      },
      stopAudioCapture: async () => {
        return this.stopListingAudioCapture();
      },
    };
  }

  private async startListingAudioCapture() {
    if (this.listingAudioRecorder || this.listingAudioStopPromise) {
      throw new Error('[starter-kit-racing] listing audio capture is already running');
    }
    if (typeof MediaRecorder === 'undefined') {
      throw new Error('[starter-kit-racing] MediaRecorder is unavailable for listing audio capture');
    }

    await this.audioController.unlock();
    const stream = this.audioController.createCaptureStream();
    const preferredMimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
      ? 'audio/webm;codecs=opus'
      : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : '';
    const recorder = preferredMimeType
      ? new MediaRecorder(stream, { mimeType: preferredMimeType })
      : new MediaRecorder(stream);
    const chunks: Blob[] = [];

    this.listingAudioStopPromise = new Promise((resolve, reject) => {
      recorder.addEventListener('dataavailable', (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      });
      recorder.addEventListener('error', () => {
        reject(new Error('[starter-kit-racing] listing audio recorder failed'));
      });
      recorder.addEventListener('stop', () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        void blobToBase64(blob)
          .then((base64) => {
            resolve({
              mimeType: recorder.mimeType || 'audio/webm',
              base64,
            });
          })
          .catch(reject)
          .finally(() => {
            stream.getTracks().forEach((track) => track.stop());
          });
      });
    });

    recorder.start(250);
    this.listingAudioRecorder = recorder;
  }

  private async stopListingAudioCapture() {
    const recorder = this.listingAudioRecorder;
    const stopPromise = this.listingAudioStopPromise;
    if (!recorder || !stopPromise) {
      throw new Error('[starter-kit-racing] listing audio capture is not running');
    }

    this.listingAudioRecorder = null;
    this.listingAudioStopPromise = null;
    recorder.stop();
    return stopPromise;
  }

  private async applyHostedPhase(phase: 'preview' | 'play') {
    if (phase === 'preview') {
      await this.enterPreviewMode();
      return;
    }
    if (this.sdk.me.isLoggedIn) {
      await this.startMultiplayer('system', this.vehicleController.currentVehicleId);
      return;
    }
    await this.enterGuestSoloMode({ forceDefaultVehicle: true });
  }

  private async enterPreviewMode() {
    if (this.sessionMode === 'preview') {
      return;
    }
    this.clearSessionStatus();
    this.busyAction = null;
    this.vehiclePickerVisible = false;
    await this.disposeMultiplayerController();
    this.sessionMode = 'preview';
    this.overlayFocusedVehicle = null;
    this.previewController.start();
    this.resetVehicle();
    this.syncUiState();
  }

  private async enterOverlayMode(options: { focusedVehicle?: VehicleId | null } = {}) {
    if (this.sessionMode === 'multiplayer') {
      await this.disposeMultiplayerController();
    }
    this.clearSessionStatus();
    this.busyAction = null;
    this.sessionMode = 'overlay';
    this.vehiclePickerVisible = true;
    this.overlayFocusedVehicle = options.focusedVehicle ?? null;
    this.previewController.stop();
    this.resetVehicle();
    this.syncUiState();
  }

  private async enterGuestSoloMode(options: { forceDefaultVehicle?: boolean } = {}) {
    if (this.sessionMode === 'multiplayer') {
      await this.disposeMultiplayerController();
    }
    this.clearSessionStatus();
    this.previewController.stop();
    const nextVehicle = options.forceDefaultVehicle ? 'truck-yellow' : this.vehicleController.currentVehicleId;
    this.vehicleController.setVehicleId(nextVehicle);
    this.vehiclePickerVisible = false;
    this.overlayFocusedVehicle = null;
    this.resetVehicle();
    this.sessionMode = 'solo';
    this.busyAction = null;
    this.syncUiState();
  }

  private async startSolo(
    source: SessionNavigationSource,
    options: { forceVehicle?: VehicleId; unlockAudio?: boolean } = {},
  ) {
    if (this.busyAction) {
      return;
    }
    if (this.sessionMode === 'multiplayer') {
      await this.disposeMultiplayerController();
    }
    this.clearSessionStatus();
    this.previewController.stop();
    const nextVehicle = options.forceVehicle ?? this.vehicleController.currentVehicleId;
    this.vehicleController.setVehicleId(nextVehicle);
    this.vehiclePickerVisible = false;
    this.overlayFocusedVehicle = null;
    this.resetVehicle();
    if (options.unlockAudio ?? (source !== 'gamepad' && source !== 'system')) {
      await this.audioController.unlock();
    }
    this.sessionMode = 'solo';
    this.busyAction = null;
    this.syncUiState();
  }

  private async requestSoloMode(source: OverlayNavigationSource) {
    if (this.sessionMode === 'solo' || this.busyAction) {
      return;
    }
    await this.startSolo(source);
  }

  private async requestMultiplayerMode(source: OverlayNavigationSource) {
    if (this.busyAction) {
      return;
    }
    if (this.sessionMode === 'multiplayer') {
      return;
    }
    if (this.sdk.me.isLoggedIn) {
      await this.startMultiplayer(source, this.vehicleController.currentVehicleId);
      return;
    }

    this.busyAction = 'auth';
    this.syncUiState();
    try {
      await this.sdk.me.promptLogin();
    } catch (error) {
      console.warn('[starter-kit-racing] multiplayer login prompt did not complete', error);
    }

    this.busyAction = null;
    if (!this.sdk.me.isLoggedIn) {
      await this.enterGuestSoloMode();
      return;
    }
    await this.startMultiplayer(source, this.vehicleController.currentVehicleId);
  }

  private async startMultiplayer(
    source: SessionNavigationSource,
    vehicleId: VehicleId,
    options: { unlockAudio?: boolean } = {},
  ): Promise<boolean> {
    if (this.busyAction) {
      return false;
    }
    if (!this.sdk.me.isLoggedIn) {
      throw new Error('[starter-kit-racing] multiplayer start requires authentication');
    }

    this.clearSessionStatus();
    this.busyAction = 'join';
    this.vehiclePickerVisible = false;
    this.overlayFocusedVehicle = vehicleId;
    this.vehicleController.setVehicleId(vehicleId);
    this.syncUiState();
    let multiplayer: MultiplayerController | null = null;
    try {
      if (options.unlockAudio ?? (source !== 'gamepad' && source !== 'system')) {
        await this.audioController.unlock();
      }
      multiplayer = this.createMultiplayerController();
      await multiplayer.ensureJoined(this.getRequiredMultiplayerRoomConfig(), () => this.captureLocalMotionState());
      this.attachMultiplayerController(multiplayer);
      this.previewController.stop();
      this.sessionMode = 'multiplayer';
      this.resetVehicle();
      this.busyAction = null;
      this.syncUiState();
      return true;
    } catch (error) {
      console.error('[starter-kit-racing] failed to start multiplayer session', error);
      if (multiplayer) {
        await this.destroyDetachedMultiplayerController(multiplayer);
      }
      this.busyAction = null;
      await this.disposeMultiplayerController();
      await this.startSolo('system', { forceVehicle: vehicleId, unlockAudio: false });
      this.setSessionStatus(normalizeMultiplayerErrorMessage(error));
      return false;
    }
  }

  private createMultiplayerController() {
    return new MultiplayerController({
      sdk: this.sdk,
      vehicles: this.vehicles,
      labelLayer: this.playerLabelLayer,
    });
  }

  private attachMultiplayerController(controller: MultiplayerController) {
    if (this.multiplayerController) {
      throw new Error('[starter-kit-racing] multiplayer controller already attached');
    }
    this.multiplayerController = controller;
    this.multiplayerRoot.add(controller.group);
  }

  private async destroyDetachedMultiplayerController(controller: MultiplayerController) {
    if (this.multiplayerController === controller) {
      throw new Error('[starter-kit-racing] expected detached multiplayer controller');
    }
    await controller.dispose();
  }

  private getRequiredMultiplayerRoomConfig(): MultiplayerTrackRoomConfig {
    if (!this.currentTrackRoomConfig) {
      throw new Error('[starter-kit-racing] multiplayer requires a published track');
    }
    return this.currentTrackRoomConfig;
  }

  private async disposeMultiplayerController() {
    if (!this.multiplayerController) {
      return;
    }
    const controller = this.multiplayerController;
    this.multiplayerController = null;
    this.multiplayerRoot.remove(controller.group);
    await controller.dispose();
  }

  private applyLoadedTrack(track: LoadedTrackState) {
    this.currentTrackRoomConfig = track.multiplayerRoomConfig;
    applyTrackDocument(track.document);
    this.trackController.reload(this.trackTiles);
    this.physicsController.reloadTrack();
    this.previewController.reloadTrack();
    this.cameraController.updateProjection(window.innerWidth, window.innerHeight);
    this.cameraController.updateMapCamera();
  }

  private async switchMultiplayerTrack(
    track: LoadedTrackState,
    vehicleId: VehicleId,
    previousTrackDocument: ReturnType<typeof getCurrentTrackDocument>,
    previousTrackRoomConfig: MultiplayerTrackRoomConfig | null,
  ) {
    if (!this.sdk.me.isLoggedIn) {
      this.applyLoadedTrack(track);
      await this.enterGuestSoloMode();
      return;
    }
    if (!track.multiplayerRoomConfig) {
      throw new Error('[starter-kit-racing] multiplayer requires a published track');
    }
    if (!this.multiplayerController) {
      throw new Error('[starter-kit-racing] multiplayer controller missing during track switch');
    }

    const previousController = this.multiplayerController;
    this.clearSessionStatus();
    this.busyAction = 'join';
    this.vehiclePickerVisible = false;
    this.overlayFocusedVehicle = vehicleId;
    this.syncUiState();
    this.multiplayerController = null;
    this.multiplayerRoot.remove(previousController.group);

    try {
      await previousController.dispose();
      const nextController = this.createMultiplayerController();
      try {
        await nextController.ensureJoined(track.multiplayerRoomConfig, () => this.captureLocalMotionState());
      } catch (error) {
        await this.destroyDetachedMultiplayerController(nextController);
        throw error;
      }

      this.applyLoadedTrack(track);
      this.attachMultiplayerController(nextController);
      this.sessionMode = 'multiplayer';
      this.resetVehicle();
      this.busyAction = null;
      this.syncUiState();
    } catch (error) {
      console.error('[starter-kit-racing] failed to switch multiplayer track', error);
      applyTrackDocument(previousTrackDocument);
      this.trackController.reload(this.trackTiles);
      this.physicsController.reloadTrack();
      this.previewController.reloadTrack();
      this.cameraController.updateProjection(window.innerWidth, window.innerHeight);
      this.cameraController.updateMapCamera();
      this.currentTrackRoomConfig = previousTrackRoomConfig;

      if (previousTrackRoomConfig) {
        const rollbackController = this.createMultiplayerController();
        try {
          await rollbackController.ensureJoined(previousTrackRoomConfig, () => this.captureLocalMotionState());
          this.attachMultiplayerController(rollbackController);
          this.sessionMode = 'multiplayer';
          this.resetVehicle();
          this.busyAction = null;
          this.setSessionStatus(normalizeMultiplayerErrorMessage(error));
          this.syncUiState();
          return;
        } catch (rollbackError) {
          console.error('[starter-kit-racing] failed to restore previous multiplayer room', rollbackError);
          await this.destroyDetachedMultiplayerController(rollbackController);
        }
      }

      this.busyAction = null;
      await this.startSolo('system', { forceVehicle: vehicleId, unlockAudio: false });
      this.setSessionStatus(normalizeMultiplayerErrorMessage(error));
    }
  }

  private updateVehicleSelectionUi() {
    setVehiclePickerSelection(
      this.vehicleOptions,
      this.vehiclePickerVisible ? this.overlayFocusedVehicle : null,
    );
  }

  private async selectVehicle(vehicleId: VehicleId, source: OverlayNavigationSource) {
    if (!this.canSelectVehicle()) {
      return;
    }
    this.overlayFocusedVehicle = vehicleId;
    this.vehicleController.setVehicleId(vehicleId);
    if (this.sessionMode === 'multiplayer') {
      this.multiplayerController?.sendLocalMotion(() => this.captureLocalMotionState(), true);
    } else if (source !== 'gamepad') {
      await this.audioController.unlock().catch((error) => {
        console.error('[starter-kit-racing] failed to unlock audio after vehicle change', error);
      });
    }
    this.closeVehiclePicker();
  }

  private selectRelativeVehicle(delta: number) {
    if (!this.canSelectVehicle()) {
      return;
    }
    const currentIndex = PLAYER_VEHICLE_IDS.indexOf(
      this.overlayFocusedVehicle ?? this.vehicleController.currentVehicleId,
    );
    const nextIndex = (currentIndex + delta + PLAYER_VEHICLE_IDS.length) % PLAYER_VEHICLE_IDS.length;
    this.overlayFocusedVehicle = PLAYER_VEHICLE_IDS[nextIndex];
    this.syncUiState();
  }

  private canSelectVehicle() {
    return this.vehiclePickerVisible && this.busyAction === null;
  }

  private handleAuthChanged() {
    if (!this.sdk.me.isLoggedIn && (this.sessionMode === 'overlay' || this.sessionMode === 'multiplayer')) {
      void this.enterGuestSoloMode();
      return;
    }

    if (this.sdk.me.isLoggedIn && this.sessionMode === 'overlay') {
      void this.startMultiplayer('system', this.vehicleController.currentVehicleId);
      return;
    }

    if (this.sdk.me.isLoggedIn && this.sessionMode === 'solo' && this.host.phase === 'play') {
      void this.startMultiplayer('system', this.vehicleController.currentVehicleId);
      return;
    }

    this.syncUiState();
  }

  private syncUiState() {
    if (!this.uiVisible) {
      setStartOverlayVisible(false);
      setModeBarVisible(this.overlayUi, false);
      setVehiclePickerShellVisible(this.overlayUi, false);
      setOverlayStatus(this.overlayUi, null);
      setTouchControlsVisible(false);
      setDesktopControlHintsVisible(false);
      this.controlsController.setOverlayState({
        active: false,
        vehicleSelectionVisible: false,
      });
      return;
    }
    const overlayVisible = this.vehiclePickerVisible;
    const showVehiclePicker = this.vehiclePickerVisible;
    const showModeBar = this.sessionMode !== 'preview';
    const selectedMode = this.sessionMode === 'solo' ? 'solo' : 'multiplayer';
    const busyMessage =
      this.busyAction === 'auth'
        ? 'Signing in...'
        : this.busyAction === 'join'
          ? 'Joining multiplayer...'
          : null;
    const overlayStatus = busyMessage ?? this.sessionStatusMessage;

    setStartOverlayVisible(overlayVisible);
    setModeBarVisible(this.overlayUi, showModeBar);
    setModeSelection(this.overlayUi, selectedMode);
    setVehiclePickerShellVisible(this.overlayUi, showVehiclePicker);
    setOverlayStatus(this.overlayUi, overlayStatus);
    this.overlayUi.soloModeButton.disabled = !showModeBar || this.busyAction !== null;
    this.overlayUi.multiplayerModeButton.disabled = !showModeBar || this.busyAction !== null;
    for (const vehicleId of PLAYER_VEHICLE_IDS) {
      this.vehicleOptions[vehicleId].button.disabled = !showVehiclePicker || this.busyAction !== null;
    }
    this.updateVehicleSelectionUi();
    this.controlsController.setOverlayState({
      active: overlayVisible,
      vehicleSelectionVisible: showVehiclePicker,
    });
    this.updateTouchControlsVisibility();
    this.updateDesktopControlHintsVisibility();
    this.applySceneVisibility();
  }

  private clearSessionStatus() {
    if (this.sessionStatusTimer !== null) {
      window.clearTimeout(this.sessionStatusTimer);
      this.sessionStatusTimer = null;
    }
    this.sessionStatusMessage = null;
  }

  private setSessionStatus(message: string, durationMs = 4000) {
    this.clearSessionStatus();
    this.sessionStatusMessage = message;
    this.syncUiState();
    this.sessionStatusTimer = window.setTimeout(() => {
      this.sessionStatusTimer = null;
      if (this.sessionStatusMessage !== message) {
        return;
      }
      this.sessionStatusMessage = null;
      this.syncUiState();
    }, durationMs);
  }

  private updateTouchControlsVisibility() {
    const driving = this.sessionMode === 'solo' || this.sessionMode === 'multiplayer';
    setTouchControlsVisible(this.controlsController.isTouchDevice && driving);
    if (!driving) {
      this.controlsController.resetTouch();
    }
  }

  private updateDesktopControlHintsVisibility() {
    const driving = this.sessionMode === 'solo' || this.sessionMode === 'multiplayer';
    setDesktopControlHintsVisible(!this.controlsController.isTouchDevice && driving);
  }

  private applySceneVisibility() {
    const physicsMode = this.debugMode === 'physics' && this.sessionMode !== 'preview';
    const showPlayer = this.sessionMode !== 'preview';
    this.renderWorld.visible = !physicsMode;
    this.debugWorld.visible = physicsMode;
    this.previewController.group.visible = !physicsMode && this.sessionMode === 'preview';
    this.multiplayerRoot.visible = !physicsMode && this.sessionMode === 'multiplayer';
    this.vehicleController.setRenderVisible(!physicsMode && showPlayer);
    this.vehicleController.debugSphereMesh.visible = physicsMode && showPlayer;
    this.smokeSystem.group.visible = !physicsMode && (this.sessionMode === 'solo' || this.sessionMode === 'multiplayer');
    this.scene.background =
      physicsMode ? this.vehicleController.debugBackgroundColor : GODOT_BACKGROUND_COLOR;
    this.scene.environment = null;
    setDebugModeSelection(this.debugButtons, this.debugMode);
  }

  private async handleActivationGesture(source: 'keyboard' | 'pointer') {
    if (this.sessionMode !== 'solo' && this.sessionMode !== 'multiplayer') {
      return;
    }
    await this.audioController.unlock().catch((error) => {
      console.error(`[starter-kit-racing] failed to unlock audio from ${source}`, error);
    });
  }

  private handleAnimationFrame(time: number) {
    const deltaMs = this.lastFrameTime === 0 ? 1000 / 60 : Math.min(100, Math.max(0, time - this.lastFrameTime));
    this.lastFrameTime = time;
    this.stepSimulation(deltaMs / 1000);
    this.render();
  }

  private stepSimulation(deltaSeconds: number) {
    if (this.host.isPaused || this.editorPaused) {
      return;
    }
    this.controlsController.updateMenuNavigation();
    this.accumulator += deltaSeconds;

    while (this.accumulator >= FIXED_DT) {
      switch (this.sessionMode) {
        case 'preview':
          this.previewController.step(FIXED_DT);
          break;
        case 'overlay':
          this.cameraController.update(this.vehicleController.position, 0, FIXED_DT);
          this.cameraController.updateMapCamera();
          this.smokeSystem.update(FIXED_DT);
          break;
        case 'solo':
        case 'multiplayer':
          this.fixedUpdate(FIXED_DT);
          break;
      }
      this.accumulator -= FIXED_DT;
    }
  }

  private fixedUpdate(dt: number) {
    const multiplayer = this.sessionMode === 'multiplayer' ? this.multiplayerController : null;
    if (multiplayer) {
      this.physicsController.syncRemoteCollisionProxies(multiplayer.sampleRemoteCollisionStates());
      multiplayer.applyPendingImpactAssists(this.physicsController.sphereBody);
    } else {
      this.physicsController.syncRemoteCollisionProxies([]);
    }

    let groundState = this.physicsController.sampleGround();
    const controls = this.controlsController.readGameplayInput();
    this.vehicleController.applyControls(this.physicsController.sphereBody, controls, groundState, dt);
    this.physicsController.step();
    const localImpactImpulse = this.physicsController.consumeLocalImpactImpulse();
    if (typeof localImpactImpulse === 'number') {
      this.audioController.playImpact(localImpactImpulse);
    }

    if (multiplayer) {
      multiplayer.syncCollisionPresentation(this.physicsController.remoteProxyPresentationState);
      multiplayer.maybeSendImpactAssists(
        this.physicsController.remoteProxyPresentationState,
        this.physicsController.sphereBody,
      );
    }

    groundState = this.physicsController.sampleGround();
    this.vehicleController.sync(
      this.physicsController.sphereBody,
      groundState,
      dt,
      this.smokeSystem,
      this.audioController,
    );
    this.cameraController.update(
      this.vehicleController.position,
      this.vehicleController.telemetry.linearSpeed,
      dt,
    );
    this.smokeSystem.update(dt);
    if (multiplayer) {
      multiplayer.sendLocalMotion(() => this.captureLocalMotionState());
    }
  }

  private resetVehicle() {
    const spawnPosition = this.resolveSpawnPosition();
    const spawnYaw = getCurrentTrackSpawnYaw();
    this.physicsController.resetVehicleBody(spawnPosition);
    this.physicsController.resetGroundState();
    this.controlsController.resetTouch();
    this.vehicleController.resetState(spawnPosition, spawnYaw);
    const groundState = this.physicsController.sampleGround();
    this.vehicleController.sync(
      this.physicsController.sphereBody,
      groundState,
      FIXED_DT,
      this.smokeSystem,
      this.audioController,
    );
    this.cameraController.resetFocus(spawnPosition);
    this.cameraController.update(
      this.vehicleController.position,
      this.vehicleController.telemetry.linearSpeed,
      FIXED_DT,
    );
    this.cameraController.updateMapCamera();
    if (this.sessionMode === 'multiplayer' && this.multiplayerController) {
      this.multiplayerController.noteLocalReset(() => this.captureLocalMotionState());
    }
  }

  private resolveSpawnPosition() {
    const spawnPosition = getCurrentTrackSpawnPosition();
    const multiplayer = this.multiplayerController;
    if (!multiplayer || this.sessionMode !== 'multiplayer') {
      return spawnPosition;
    }

    const roomMemberCount = multiplayer.getRoomMemberCount();
    if (roomMemberCount <= 1) {
      return spawnPosition;
    }

    const slotIndex = multiplayer.getLocalSpawnSlotIndex();
    const columnCount = 2;
    const columnIndex = slotIndex % columnCount;
    const rowIndex = Math.floor(slotIndex / columnCount);
    const laneOffset = (columnIndex - (columnCount - 1) / 2) * MULTIPLAYER_SPAWN_LANE_SPACING;
    const rowOffset = rowIndex * MULTIPLAYER_SPAWN_ROW_SPACING;
    const spawnYaw = getCurrentTrackSpawnYaw();
    const forward = new THREE.Vector3(Math.sin(spawnYaw), 0, Math.cos(spawnYaw));
    const right = new THREE.Vector3(-forward.z, 0, forward.x);

    return spawnPosition
      .clone()
      .addScaledVector(right, laneOffset)
      .addScaledVector(forward, -rowOffset);
  }

  private setLocalVehicleTestState({
    position,
    velocity,
  }: {
    position: [number, number, number];
    velocity: [number, number, number];
  }) {
    const nextPosition = new THREE.Vector3(position[0], position[1], position[2]);
    const nextVelocity = new THREE.Vector3(velocity[0], velocity[1], velocity[2]);
    this.physicsController.setVehicleBodyState(nextPosition, nextVelocity);
    this.physicsController.resetGroundState();
    const groundState = this.physicsController.sampleGround();
    this.vehicleController.sync(
      this.physicsController.sphereBody,
      groundState,
      FIXED_DT,
      this.smokeSystem,
      this.audioController,
    );
    this.cameraController.resetFocus(nextPosition);
    this.cameraController.update(
      this.vehicleController.position,
      this.vehicleController.telemetry.linearSpeed,
      FIXED_DT,
    );
    this.cameraController.updateMapCamera();
    if (this.sessionMode === 'multiplayer' && this.multiplayerController) {
      this.multiplayerController.noteLocalReset(() => this.captureLocalMotionState());
    }
  }

  private getRenderableCamera() {
    return this.sessionMode === 'preview'
      ? this.previewController.camera
      : this.cameraController.getActiveCamera();
  }

  private render() {
    if (!this.animationReady) {
      return;
    }
    this.multiplayerController?.render(
      this.getRenderableCamera(),
      this.sessionMode === 'multiplayer' && this.debugMode !== 'physics',
      this.canvas.clientWidth || window.innerWidth,
      this.canvas.clientHeight || window.innerHeight,
    );
    if (this.debugMode === 'physics' && this.sessionMode !== 'preview') {
      this.renderer.render(this.scene, this.getRenderableCamera());
      return;
    }
    if (
      this.sessionMode !== 'preview' &&
      this.cameraController.cameraMode === 'follow' &&
      this.postProcessing
    ) {
      this.postProcessing.render();
      return;
    }
    this.renderer.render(this.scene, this.getRenderableCamera());
  }

  private activateFocusedOverlayAction(source: OverlayNavigationSource) {
    if (this.overlayFocusedVehicle === null) {
      return;
    }
    void this.selectVehicle(this.overlayFocusedVehicle, source);
  }

  private setDebugMode(mode: DebugMode) {
    if (this.debugMode === mode) {
      return;
    }
    this.debugMode = mode;
    this.applySceneVisibility();
    this.render();
  }

  private renderToText() {
    const groundState = this.physicsController.getGroundState();
    const telemetry = this.vehicleController.telemetry;
    const currentTile = this.trackController.getCurrentTile(
      telemetry.spherePosition,
      groundState.isGrounded,
      groundState.lastGroundY,
    );
    const cameraPose: CameraPose =
      this.sessionMode === 'preview'
        ? {
            focus: this.previewController.focus.clone(),
            position: this.previewController.camera.position.clone(),
            forward: this.previewController.camera.getWorldDirection(new THREE.Vector3()),
          }
        : this.cameraController.getPose();

    return JSON.stringify({
      mode: this.sessionMode,
      busyAction: this.busyAction,
      auth: {
        isLoggedIn: this.sdk.me.isLoggedIn,
        username: this.sdk.me.username,
      },
      host: {
        phase: this.host.phase,
        isPaused: this.host.isPaused,
        audioEnabled: this.host.audioEnabled,
      },
      modeToggle: {
        visible: this.sessionMode !== 'preview',
        selected: this.sessionMode === 'solo' ? 'solo' : 'multiplayer',
      },
      overlay: {
        visible: this.vehiclePickerVisible,
        focusedVehicle: this.overlayFocusedVehicle,
        vehiclePickerVisible: this.vehiclePickerVisible,
      },
      desktopControls: {
        visible: !this.controlsController.isTouchDevice &&
          (this.sessionMode === 'solo' || this.sessionMode === 'multiplayer'),
        pressed: this.controlsController.getDesktopControlHintState(),
      },
      debugMode: this.debugMode,
      coordinateSystem: {
        origin: 'world center',
        axes: { x: 'right', y: 'up', z: 'forward' },
      },
      player: {
        vehicleId: this.vehicleController.currentVehicleId,
        spherePosition: [
          Number(telemetry.spherePosition.x.toFixed(3)),
          Number(telemetry.spherePosition.y.toFixed(3)),
          Number(telemetry.spherePosition.z.toFixed(3)),
        ],
        sphereVelocity: [
          Number(telemetry.sphereVelocity.x.toFixed(3)),
          Number(telemetry.sphereVelocity.y.toFixed(3)),
          Number(telemetry.sphereVelocity.z.toFixed(3)),
        ],
        headingYaw: Number(telemetry.headingYaw.toFixed(3)),
        linearSpeed: Number(telemetry.linearSpeed.toFixed(3)),
        acceleration: Number(telemetry.acceleration.toFixed(3)),
        grounded: groundState.isGrounded,
      },
      tile: currentTile
        ? {
            kind: currentTile.kind,
            gridX: currentTile.gridX,
            gridY: currentTile.gridY,
            gridZ: currentTile.gridZ,
            orientationIndex: currentTile.orientationIndex,
            layer: currentTile.layer,
          }
        : null,
      effects: {
        drifting: telemetry.driftIntensity > DRIFT_THRESHOLD,
        driftIntensity: Number(telemetry.driftIntensity.toFixed(3)),
        smokeActive: this.smokeSystem.particles.some((particle) => particle.active),
      },
      audio: this.audioController.debugState,
      guestUpsellVisible: false,
      remotePlayers: {
        count: this.multiplayerController?.debugState.length ?? 0,
        players: this.multiplayerController?.debugState ?? [],
      },
      impactAssist: this.multiplayerController?.impactAssistDebugState ?? null,
      multiplayerDebug: this.multiplayerController
        ? {
            collisionReplayTargetTimeMs: Number(this.multiplayerController.collisionReplayTargetTimeMs.toFixed(1)),
            localSphereVelocity: [
              Number(telemetry.sphereVelocity.x.toFixed(3)),
              Number(telemetry.sphereVelocity.y.toFixed(3)),
              Number(telemetry.sphereVelocity.z.toFixed(3)),
            ],
          }
        : null,
      remoteCollisionProxies: {
        count: this.physicsController.remoteProxyDebugState.length,
        proxies: this.physicsController.remoteProxyDebugState,
      },
      previewRace:
        this.sessionMode === 'preview'
          ? this.previewController.benchmarkState
          : null,
      physicsDebug: {
        sphereRadius: 0.5,
        catchSurfaceY: 0,
        colliders: this.physicsController.debugStats,
      },
      camera: {
        mode: this.sessionMode === 'preview' ? 'preview' : this.cameraController.cameraMode,
        focus: [
          Number(cameraPose.focus.x.toFixed(3)),
          Number(cameraPose.focus.y.toFixed(3)),
          Number(cameraPose.focus.z.toFixed(3)),
        ],
        position: [
          Number(cameraPose.position.x.toFixed(3)),
          Number(cameraPose.position.y.toFixed(3)),
          Number(cameraPose.position.z.toFixed(3)),
        ],
        forward: [
          Number(cameraPose.forward.x.toFixed(3)),
          Number(cameraPose.forward.y.toFixed(3)),
          Number(cameraPose.forward.z.toFixed(3)),
        ],
      },
    });
  }

  private captureLocalMotionState(): LocalMotionState {
    const telemetry = this.vehicleController.telemetry;
    return {
      spherePosition: telemetry.spherePosition.clone(),
      sphereVelocity: telemetry.sphereVelocity.clone(),
      quaternion: this.vehicleController.orientation.clone(),
      speed: telemetry.linearSpeed,
      steer: telemetry.inputX,
      throttle: telemetry.inputZ,
      vehicleIndex: vehicleIdToIndex(this.vehicleController.currentVehicleId),
    };
  }
}

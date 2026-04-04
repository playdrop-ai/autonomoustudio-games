/// <reference types="playdrop-sdk-types" />

import type { PlaydropSDK } from 'playdrop-sdk-types';
import * as THREE from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';

import {
  FIXED_DT,
  GODOT_AMBIENT_COLOR,
  GODOT_BACKGROUND_COLOR,
  SUN_LIGHT_INTENSITY,
  SUN_POSITION_DIRECTION,
  SUN_SHADOW_INTENSITY,
} from './constants';
import {
  getDebugModeFromLocation,
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
import type {
  AssetBundle,
  CameraPose,
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
import { DRIFT_THRESHOLD, START_SPHERE_POSITION } from './constants';
import { PLAYER_VEHICLE_IDS, vehicleIdToIndex } from './shared';
import { type LocalMotionState } from './multiplayer/packets';
import { MultiplayerController } from './multiplayer/system';

type SessionMode = 'preview' | 'overlay' | 'solo' | 'multiplayer';
type BusyAction = 'auth' | 'join' | null;

export class StarterKitRacingDemo {
  private readonly canvas: HTMLCanvasElement;
  private readonly vehicleOptions: VehiclePickerOptions;
  private readonly overlayUi: OverlayUiElements;
  private readonly debugButtons: DebugToggleButtons;
  private readonly sdk: PlaydropSDK;
  private readonly vehicles: Record<VehicleId, GLTF>;
  private readonly playerLabelLayer: HTMLElement;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly renderWorld = new THREE.Group();
  private readonly debugWorld = new THREE.Group();
  private readonly multiplayerRoot = new THREE.Group();
  private readonly host: PlaydropSDK['host'];
  private readonly listingCaptureEnabled = new URLSearchParams(window.location.search).get('listingCapture') === '1';
  private readonly smokeSystem: SmokeSystem;
  private readonly audioController: AudioController;
  private readonly trackController: TrackController;
  private readonly physicsController: PhysicsController;
  private readonly previewController: PreviewRaceController;
  private readonly cameraController: CameraController;
  private readonly vehicleController: VehicleController;
  private readonly controlsController: ControlsController;

  private multiplayerController: MultiplayerController | null = null;
  private stopAuthSubscription: (() => void) | null = null;
  private stopPhaseSubscription: (() => void) | null = null;
  private stopPauseSubscription: (() => void) | null = null;
  private stopResumeSubscription: (() => void) | null = null;
  private stopAudioPolicySubscription: (() => void) | null = null;
  private animationReady = false;
  private sessionMode: SessionMode = 'overlay';
  private busyAction: BusyAction = null;
  private overlayFocusedVehicle: VehicleId | null = null;
  private accumulator = 0;
  private lastFrameTime = 0;
  private postProcessing: ReturnType<typeof createPostProcessingStack> | null = null;
  private debugMode: DebugMode = getDebugModeFromLocation(window.location.search);

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
    webglContext: WebGL2RenderingContext,
  ) {
    this.canvas = canvas;
    this.vehicleOptions = vehicleOptions;
    this.overlayUi = overlayUi;
    this.debugButtons = debugButtons;
    this.sdk = sdk;
    this.vehicles = assets.vehicles;
    this.playerLabelLayer = playerLabelLayer;
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
    this.previewController = new PreviewRaceController(assets.vehicles, assets.smokeTexture);
    this.cameraController = new CameraController(window.location.search, this.trackController.worldBounds);
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
    setVehiclePickerPreviewImages(this.vehicleOptions, renderVehiclePreviewImages(assets.vehicles));
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
  }

  async initialize() {
    this.host.setLoadingState({ status: 'loading', message: 'Initializing renderer', progress: 0.75 });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.previewController.updateProjection(window.innerWidth, window.innerHeight);
    this.cameraController.updateProjection(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.CineonToneMapping;
    this.renderer.toneMappingExposure = 1.45;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.postProcessing = createPostProcessingStack(
      this.renderer,
      this.scene,
      this.cameraController.followCamera,
      window.innerWidth,
      window.innerHeight,
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
    } else {
      this.renderer.setAnimationLoop((time) => {
        this.handleAnimationFrame(typeof time === 'number' ? time : performance.now());
      });
    }
    this.host.setLoadingState({ status: 'ready' });
    this.host.ready();
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
    window.addEventListener('resize', () => {
      this.renderer.setSize(window.innerWidth, window.innerHeight, false);
      this.postProcessing?.resize(window.innerWidth, window.innerHeight);
      this.previewController.updateProjection(window.innerWidth, window.innerHeight);
      this.cameraController.updateProjection(window.innerWidth, window.innerHeight);
      this.render();
    });

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
        setTouchControlsVisible(false);
        setDesktopControlHintsVisible(false);
        this.render();
      },
    };
  }

  private async applyHostedPhase(phase: 'preview' | 'play') {
    if (phase === 'preview') {
      await this.enterPreviewMode();
      return;
    }
    if (this.sdk.me.isLoggedIn) {
      await this.enterOverlayMode();
      return;
    }
    await this.enterGuestSoloMode();
  }

  private async enterPreviewMode() {
    if (this.sessionMode === 'preview') {
      return;
    }
    this.busyAction = null;
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
    this.busyAction = null;
    this.sessionMode = 'overlay';
    this.overlayFocusedVehicle = options.focusedVehicle ?? null;
    this.previewController.stop();
    this.resetVehicle();
    this.syncUiState();
  }

  private async enterGuestSoloMode() {
    if (this.sessionMode === 'multiplayer') {
      await this.disposeMultiplayerController();
    }
    this.previewController.stop();
    this.vehicleController.setVehicleId('truck-yellow');
    this.overlayFocusedVehicle = null;
    this.resetVehicle();
    this.sessionMode = 'solo';
    this.busyAction = null;
    this.syncUiState();
  }

  private async startSolo(source: OverlayNavigationSource, options: { forceVehicle?: VehicleId } = {}) {
    if (this.busyAction) {
      return;
    }
    if (this.sessionMode === 'multiplayer') {
      await this.disposeMultiplayerController();
    }
    this.previewController.stop();
    const nextVehicle = options.forceVehicle ?? 'truck-yellow';
    this.vehicleController.setVehicleId(nextVehicle);
    this.overlayFocusedVehicle = null;
    this.resetVehicle();
    if (source !== 'gamepad') {
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

  private async requestMultiplayerMode(_source: OverlayNavigationSource) {
    if (this.busyAction) {
      return;
    }
    if (this.sdk.me.isLoggedIn && (this.sessionMode === 'overlay' || this.sessionMode === 'multiplayer')) {
      return;
    }
    if (this.sdk.me.isLoggedIn) {
      await this.enterOverlayMode({ focusedVehicle: this.overlayFocusedVehicle });
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
    await this.enterOverlayMode();
  }

  private async startMultiplayer(source: OverlayNavigationSource, vehicleId: VehicleId) {
    if (this.sessionMode !== 'overlay' || this.busyAction) {
      return;
    }
    if (!this.sdk.me.isLoggedIn) {
      throw new Error('[starter-kit-racing] multiplayer start requires authentication');
    }

    this.busyAction = 'join';
    this.overlayFocusedVehicle = vehicleId;
    this.vehicleController.setVehicleId(vehicleId);
    this.resetVehicle();
    this.syncUiState();
    try {
      if (source !== 'gamepad') {
        await this.audioController.unlock();
      }
      const multiplayer = this.ensureMultiplayerController();
      await multiplayer.ensureJoined(() => this.captureLocalMotionState());
      this.previewController.stop();
      this.sessionMode = 'multiplayer';
      this.busyAction = null;
      this.syncUiState();
    } catch (error) {
      console.error('[starter-kit-racing] failed to start multiplayer session', error);
      this.busyAction = null;
      this.syncUiState();
      this.host.setLoadingState({
        status: 'error',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private ensureMultiplayerController() {
    if (this.multiplayerController) {
      return this.multiplayerController;
    }
    const controller = new MultiplayerController({
      sdk: this.sdk,
      vehicles: this.vehicles,
      labelLayer: this.playerLabelLayer,
    });
    this.multiplayerController = controller;
      this.multiplayerRoot.add(controller.group);
    return controller;
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

  private updateVehicleSelectionUi() {
    setVehiclePickerSelection(
      this.vehicleOptions,
      this.sessionMode === 'overlay' ? this.overlayFocusedVehicle : null,
    );
  }

  private async selectVehicle(vehicleId: VehicleId, source: OverlayNavigationSource) {
    if (!this.canSelectVehicle()) {
      return;
    }
    this.overlayFocusedVehicle = vehicleId;
    this.updateVehicleSelectionUi();
    await this.startMultiplayer(source, vehicleId);
  }

  private selectRelativeVehicle(delta: number) {
    if (!this.canSelectVehicle()) {
      return;
    }
    if (this.overlayFocusedVehicle === null) {
      this.overlayFocusedVehicle =
        delta >= 0
          ? PLAYER_VEHICLE_IDS[0]
          : PLAYER_VEHICLE_IDS[PLAYER_VEHICLE_IDS.length - 1];
      this.syncUiState();
      return;
    }
    const currentIndex = PLAYER_VEHICLE_IDS.indexOf(this.overlayFocusedVehicle);
    const nextIndex = (currentIndex + delta + PLAYER_VEHICLE_IDS.length) % PLAYER_VEHICLE_IDS.length;
    this.overlayFocusedVehicle = PLAYER_VEHICLE_IDS[nextIndex];
    this.syncUiState();
  }

  private canSelectVehicle() {
    return this.sessionMode === 'overlay' && this.sdk.me.isLoggedIn && this.busyAction === null;
  }

  private handleAuthChanged() {
    if (!this.sdk.me.isLoggedIn && (this.sessionMode === 'overlay' || this.sessionMode === 'multiplayer')) {
      void this.enterGuestSoloMode();
      return;
    }

    if (this.sdk.me.isLoggedIn && this.sessionMode === 'overlay') {
      this.syncUiState();
      return;
    }

    // The hosted SDK can hydrate auth shortly after boot. If play mode started as guest
    // because auth had not arrived yet, promote the user into the logged-in multiplayer prep flow.
    if (this.sdk.me.isLoggedIn && this.sessionMode === 'solo' && this.host.phase === 'play') {
      void this.enterOverlayMode();
      return;
    }

    this.syncUiState();
  }

  private syncUiState() {
    const overlayVisible = this.sessionMode === 'overlay';
    const showVehiclePicker = overlayVisible;
    const showModeBar = this.sessionMode !== 'preview';
    const selectedMode = this.sessionMode === 'solo' ? 'solo' : 'multiplayer';
    const busyMessage =
      this.busyAction === 'auth'
        ? 'Signing in...'
        : this.busyAction === 'join'
          ? 'Joining multiplayer...'
          : null;

    setStartOverlayVisible(overlayVisible);
    setModeBarVisible(this.overlayUi, showModeBar);
    setModeSelection(this.overlayUi, selectedMode);
    setVehiclePickerShellVisible(this.overlayUi, showVehiclePicker);
    setOverlayStatus(this.overlayUi, busyMessage);
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
    if (this.host.isPaused) {
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
    this.physicsController.resetVehicleBody();
    this.physicsController.resetGroundState();
    this.controlsController.resetTouch();
    this.vehicleController.resetState();
    const groundState = this.physicsController.sampleGround();
    this.vehicleController.sync(
      this.physicsController.sphereBody,
      groundState,
      FIXED_DT,
      this.smokeSystem,
      this.audioController,
    );
    this.cameraController.resetFocus(START_SPHERE_POSITION);
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
    void this.startMultiplayer(source, this.overlayFocusedVehicle);
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
        visible: this.sessionMode === 'overlay',
        focusedVehicle: this.overlayFocusedVehicle,
        vehiclePickerVisible: this.sessionMode === 'overlay',
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

/// <reference types="playdrop-sdk-types" />

import type { PlaydropSDK } from 'playdrop-sdk-types';
import * as THREE from 'three';

import { RAPIER } from './vendor-runtime';
import { createTrackEditorController } from './ugc/editor-simple';
import { applyTrackDocument, createTrackRepository, type LoadedTrackState } from './ugc/runtime-track';
import { installTrackSelector, type TrackListTab } from './ugc/track-selector';
import { CANVAS_ID } from './runtime/constants';
import {
  getDesktopControlHintsElements,
  getDebugToggleButtons,
  getOverlayUiElements,
  getPlayerLabelLayerElement,
  getTouchControlsElements,
  getVehiclePickerOptions,
  setDebugPanelVisible,
  setUnsupportedOverlayVisible,
} from './runtime/dom';
import { getStarterKitRacingFlags } from './runtime/flags';
import { loadAssets } from './runtime/assets';
import { StarterKitRacingDemo } from './runtime/demo';
import { applyLauncherIcon, STEERING_WHEEL_ICON } from './runtime/launcher-icons';

type AppMode = 'game' | 'editor';

function createRenderer(canvas: HTMLCanvasElement, preserveDrawingBuffer: boolean) {
  const webglContext = canvas.getContext('webgl2', {
    antialias: true,
    alpha: false,
    depth: true,
    stencil: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer,
  });
  if (!(webglContext instanceof WebGL2RenderingContext)) {
    setUnsupportedOverlayVisible(true);
    throw new Error('[starter-kit-racing] WebGL2 unavailable');
  }
  return new THREE.WebGLRenderer({
    canvas,
    context: webglContext,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
}

function resizeRenderer(renderer: THREE.WebGLRenderer) {
  renderer.setPixelRatio(1);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
}

export class StarterKitRacingApp {
  private sdk: PlaydropSDK | null = null;
  private renderer: THREE.WebGLRenderer | null = null;
  private demo: StarterKitRacingDemo | null = null;
  private editor: Awaited<ReturnType<typeof createTrackEditorController>> | null = null;
  private selector: ReturnType<typeof installTrackSelector> | null = null;
  private vehicleLauncher: HTMLButtonElement | null = null;
  private currentTrack: LoadedTrackState | null = null;
  private mode: AppMode = 'game';
  private debugPanelVisible = false;
  private readonly flags = getStarterKitRacingFlags();

  async bootstrap() {
    this.sdk = await this.getSdk();

    const canvas = document.getElementById(CANVAS_ID);
    if (!(canvas instanceof HTMLCanvasElement)) {
      throw new Error('[starter-kit-racing] #game-canvas missing');
    }

    this.renderer = createRenderer(canvas, this.flags.listingCapture);
    resizeRenderer(this.renderer);

    const vehicleOptions = getVehiclePickerOptions();
    const overlayUi = getOverlayUiElements();
    const debugButtons = getDebugToggleButtons();
    const playerLabelLayer = getPlayerLabelLayerElement();
    const touchControls = getTouchControlsElements();
    const desktopControlHints = getDesktopControlHintsElements();

    this.sdk.host.setLoadingState({ status: 'loading', message: 'Preparing physics', progress: 0.12 });
    await RAPIER.init();

    this.sdk.host.setLoadingState({ status: 'loading', message: 'Loading racing assets', progress: 0.35 });
    const assets = await loadAssets(this.sdk);
    const repository = createTrackRepository(this.sdk);

    this.sdk.host.setLoadingState({ status: 'loading', message: 'Loading track', progress: 0.55 });
    const initialTrack = await repository.loadStockTrack();
    this.currentTrack = initialTrack;
    applyTrackDocument(initialTrack.document);

    this.sdk.host.setLoadingState({ status: 'loading', message: 'Building scene', progress: 0.72 });
    this.demo = new StarterKitRacingDemo(
      canvas,
      vehicleOptions,
      overlayUi,
      debugButtons,
      touchControls,
      desktopControlHints,
      playerLabelLayer,
      this.sdk,
      this.sdk.host,
      assets,
      this.renderer,
      this.flags,
      initialTrack,
    );
    await this.demo.initialize(window.innerWidth, window.innerHeight);

    this.editor = await createTrackEditorController({
      sdk: this.sdk,
      renderer: this.renderer,
      canvas,
      tileModels: assets.tiles,
      onCancelRequested: () => {
        this.openTrackSelector({ refresh: true });
      },
      onSaveCompleted: async (track) => {
        await this.playTrack(track);
        this.openTrackSelector({ tab: 'you', refresh: true });
      },
    });

    this.selector = installTrackSelector(this.sdk, repository, initialTrack, {
      onSelectRequested: async (selection) => {
        const track = selection.kind === 'owned'
          ? await repository.loadOwnedTrack(selection.assetRef)
          : await repository.loadPublicTrack(selection.assetRef);
        await this.playTrack(track);
        return track;
      },
      onCreateRequested: () => {
        this.editor?.openBlankTrack();
        this.enterEditorMode();
      },
      onRemixRequested: async (selection) => {
        const track = selection.kind === 'owned'
          ? await repository.loadOwnedTrack(selection.assetRef)
          : await repository.loadPublicTrack(selection.assetRef);
        this.editor?.openRemixTrack(track);
        this.enterEditorMode();
      },
      onEditRequested: async (selection) => {
        const track = selection.kind === 'owned'
          ? await repository.loadOwnedTrack(selection.assetRef)
          : await repository.loadPublicTrack(selection.assetRef);
        this.editor?.openOwnedTrack(track);
        this.enterEditorMode();
      },
    });
    this.installVehicleLauncher(this.selector.getLauncherRail());

    this.debugPanelVisible = this.flags.showDebugUi;
    setDebugPanelVisible(this.debugPanelVisible);
    this.installDebugToggle();
    this.installResizeHandling();

    this.enterGameMode();

    if (!this.flags.listingCapture) {
      this.renderer.setAnimationLoop((time) => {
        if (this.mode === 'editor') {
          this.editor?.renderFrame();
          return;
        }
        this.demo?.renderFrame(typeof time === 'number' ? time : performance.now());
      });
    }

    this.sdk.host.setLoadingState({ status: 'ready' });
    this.sdk.host.ready();
  }

  private installResizeHandling() {
    window.addEventListener('resize', () => {
      if (!this.renderer) {
        return;
      }
      resizeRenderer(this.renderer);
      this.demo?.resize(window.innerWidth, window.innerHeight);
      this.editor?.resize(window.innerWidth, window.innerHeight);
    });
  }

  private installDebugToggle() {
    window.addEventListener('keydown', (event) => {
      if (event.repeat || !event.metaKey || !event.shiftKey || event.code !== 'KeyD') {
        return;
      }
      event.preventDefault();
      this.debugPanelVisible = !this.debugPanelVisible;
      setDebugPanelVisible(this.debugPanelVisible && this.mode === 'game');
    });
  }

  private async playTrack(track: LoadedTrackState) {
    await this.demo?.switchTrack(track);
    this.currentTrack = track;
    this.selector?.setCurrentTrack(track);
  }

  private openTrackSelector(options: { tab?: TrackListTab; refresh?: boolean } = {}) {
    this.enterGameMode();
    this.demo?.closeVehiclePicker();
    this.selector?.open(options);
  }

  private enterEditorMode() {
    this.mode = 'editor';
    this.demo?.closeVehiclePicker();
    this.demo?.suspendForEditor();
    this.demo?.setUiVisible(false);
    this.selector?.close();
    this.selector?.setLauncherVisible(false);
    if (this.vehicleLauncher) {
      this.vehicleLauncher.hidden = true;
    }
    setDebugPanelVisible(false);
    this.editor?.showCurrentSession();
    this.editor?.renderFrame();
  }

  private enterGameMode() {
    this.mode = 'game';
    this.editor?.hide();
    this.demo?.setUiVisible(true);
    this.demo?.resumeFromEditor();
    this.selector?.setLauncherVisible(true);
    if (this.vehicleLauncher) {
      this.vehicleLauncher.hidden = false;
    }
    setDebugPanelVisible(this.debugPanelVisible);
    this.demo?.renderNow();
  }

  private installVehicleLauncher(launcherRail: HTMLElement) {
    this.vehicleLauncher?.remove();

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'track-selector-launcher';
    applyLauncherIcon(button, STEERING_WHEEL_ICON, 'Vehicules');
    button.addEventListener('click', () => {
      this.selector?.close();
      this.demo?.toggleVehiclePicker();
    });

    launcherRail.prepend(button);
    this.vehicleLauncher = button;
  }

  private async getSdk() {
    const sdkPromise = window.__starterKitRacingSdkPromise__;
    if (!sdkPromise) {
      throw new Error('[starter-kit-racing] sdk promise missing');
    }
    const sdk = await sdkPromise;
    if (!sdk?.host || !sdk?.me || !sdk?.connection) {
      throw new Error('[starter-kit-racing] incomplete Playdrop SDK runtime');
    }
    return sdk as PlaydropSDK;
  }
}

/// <reference types="playdrop-sdk-types" />

import type { PlaydropSDK } from 'playdrop-sdk-types';

import { RAPIER } from './vendor-runtime';
import { CANVAS_ID } from './runtime/constants';
import { setUnsupportedOverlayVisible } from './runtime/dom';
import { loadAssets } from './runtime/assets';
import { SwitchbackDispatchGame } from './runtime/game';

async function getSdk() {
  const sdkPromise = window.__starterKitRacingSdkPromise__;
  if (!sdkPromise) {
    throw new Error('[switchback-dispatch] sdk promise missing');
  }
  const sdk = await sdkPromise;
  if (!sdk?.host || !sdk?.me || !sdk?.connection) {
    throw new Error('[switchback-dispatch] incomplete PlayDrop SDK runtime');
  }
  return sdk as PlaydropSDK;
}

async function bootstrap() {
  const sdk = await getSdk();
  const canvas = document.getElementById(CANVAS_ID);
  if (!(canvas instanceof HTMLCanvasElement)) {
    throw new Error('[switchback-dispatch] #game-canvas missing');
  }

  const webglContext = canvas.getContext('webgl2', {
    antialias: true,
    alpha: false,
    depth: true,
    stencil: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: new URLSearchParams(window.location.search).get('listingCapture') === '1',
  });
  if (!(webglContext instanceof WebGL2RenderingContext)) {
    setUnsupportedOverlayVisible(true);
    throw new Error('[switchback-dispatch] WebGL2 unavailable');
  }

  const host = sdk.host;
  host.setLoadingState({ status: 'loading', message: 'Preparing physics', progress: 0.12 });
  await RAPIER.init();

  host.setLoadingState({ status: 'loading', message: 'Loading route assets', progress: 0.35 });
  const assets = await loadAssets();

  host.setLoadingState({ status: 'loading', message: 'Building courier scene', progress: 0.65 });
  const game = new SwitchbackDispatchGame(canvas, sdk, host, assets, webglContext);
  await game.initialize();

  window.addEventListener('beforeunload', () => {
    game.dispose();
  });
}

void bootstrap().catch((error) => {
  console.error('[switchback-dispatch] bootstrap failed', error);
  setUnsupportedOverlayVisible(true);
  window.playdrop?.host?.setLoadingState?.({
    status: 'error',
    message: error instanceof Error ? error.message : String(error),
  });
});

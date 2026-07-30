/// <reference types="playdrop-sdk-types" />
import type { PlaydropSDK, ThreeRuntime } from 'playdrop-sdk-types';

declare global {
  // The game modules are intentionally evaluated only after these are ready.
  // Several procedural Three.js geometries are created at module scope.
  var __FLIGHTY_SDK__: PlaydropSDK | undefined;
  var __FLIGHTY_THREE__: ThreeRuntime | undefined;
}

async function main(): Promise<void> {
  const loader = window.playdrop;
  if (!loader) throw new Error('[flighty-saucer] window.playdrop unavailable');

  const sdk = await loader.init();
  globalThis.__FLIGHTY_SDK__ = sdk;
  globalThis.__FLIGHTY_THREE__ = await sdk.libs.three.load();

  const { Store } = await import('./storage.js');
  await Store.init(sdk);

  const gameModule = await import('./game-app.js');
  await gameModule.boot();
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  window.playdrop?.host?.error(message);
  throw error;
});

import { StarterKitRacingApp } from './app';
import { setUnsupportedOverlayVisible } from './runtime/dom';

void new StarterKitRacingApp().bootstrap().catch((error) => {
  console.error('[starter-kit-racing] bootstrap failed', error);
  setUnsupportedOverlayVisible(true);
  window.playdrop?.host?.setLoadingState?.({
    status: 'error',
    message: error instanceof Error ? error.message : String(error),
  });
});

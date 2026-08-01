import Phaser from "phaser";
import { BlockBurstScene, type PreviewPayload } from "./game/BlockBurstScene";
import { computeDesign, HAMMER_START } from "./game/constants";
import { PlaydropServices } from "./services/playdrop";

declare global {
  interface Window {
    __listingCapture?: {
      prepare?: (payload?: PreviewPayload) => Promise<void> | void;
      startAudioCapture?: () => Promise<void> | void;
      stopAudioCapture?: () => Promise<{ mimeType: string; base64: string }> | { mimeType: string; base64: string };
    };
    render_game_to_text?: () => string;
  }
}

const services = new PlaydropServices();

void boot().catch((error) => {
  services.reportError(error);
  throw error;
});

async function boot(): Promise<void> {
  await services.init();
  const initialHammers = await services.loadHammers(HAMMER_START);
  const design = computeDesign();
  const scene = new BlockBurstScene({
    initialHammers,
    tutorialEnabled: !services.isPreviewPhase(),
    saveHammers: (hammers) => services.saveHammers(hammers),
    prepareRewarded: () => services.prepareRewarded(),
    showRewarded: () => services.showRewarded(),
    showInterstitial: () => services.showInterstitial(),
    submitScore: (score) => services.submitScore(score),
  });

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: "game",
    width: design.dw,
    height: design.dh,
    backgroundColor: "#111119",
    disableContextMenu: true,
    render: { preserveDrawingBuffer: true, antialias: true, roundPixels: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene,
  });

  window.addEventListener("resize", () => {
    const next = computeDesign();
    if (game.scale.width !== next.dw || game.scale.height !== next.dh) {
      game.scale.setGameSize(next.dw, next.dh);
      game.scale.refresh();
    }
  });
  window.addEventListener("blockburst:host-phase", (event) => {
    const phase = (event as CustomEvent<{ phase?: string }>).detail?.phase;
    if (phase === "preview") {
      void scene.preparePreview({ active: true, sceneId: "sdk-preview", audioPolicy: "sfx-only" });
    } else {
      void scene.preparePreview({ active: false });
    }
  });

  window.__listingCapture = {
    prepare: (payload) => scene.preparePreview(payload),
    startAudioCapture: () => scene.startAudioCapture(),
    stopAudioCapture: () => scene.stopAudioCapture(),
  };
  window.render_game_to_text = () => JSON.stringify(scene.getPreviewDebugState());

  await scene.whenReady();
  if (services.isPreviewPhase()) {
    await scene.preparePreview({ active: true, sceneId: "sdk-preview", audioPolicy: "sfx-only" });
  }
  services.markReady();
}

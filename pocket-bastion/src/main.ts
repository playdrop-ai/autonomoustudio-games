/// <reference types="playdrop-sdk-types" />

import Phaser from "phaser";

import { LEADERBOARD_KEY } from "./game/config";
import { WORLD_HEIGHT, WORLD_WIDTH } from "./game/level";
import { PocketBastionScene } from "./scenes/PocketBastionScene";
import type { MetaEvent } from "./game/types";
import { HudController } from "./ui/hud";

type AuthMode = "OPTIONAL" | "REQUIRED" | "NONE";

interface PocketBastionLeaderboardEntry {
  rank?: number | null;
  position?: number | null;
  place?: number | null;
  score?: number | null;
  value?: number | null;
  bestScore?: number | null;
  scoreDisplay?: string;
  displayScore?: string;
  valueDisplay?: string;
}

interface PocketBastionLeaderboardSummary {
  definition?: {
    key?: string;
  };
  key?: string;
  player?: PocketBastionLeaderboardEntry | null;
}

interface PocketBastionLeaderboardListResponse {
  leaderboards?: PocketBastionLeaderboardSummary[];
}

interface PocketBastionLeaderboardResponse {
  player?: PocketBastionLeaderboardEntry | null;
  me?: PocketBastionLeaderboardEntry | null;
  currentPlayer?: PocketBastionLeaderboardEntry | null;
}

interface PocketBastionRuntime {
  host?: {
    ready?: () => void;
    setLoadingState?: (state: { status: "loading" | "ready" | "error"; message?: string; progress?: number }) => void;
  };
  app?: {
    authMode?: AuthMode;
  };
  me?: {
    isLoggedIn: boolean;
    userId?: number | null;
    username?: string | null;
    login?: () => Promise<void>;
    promptLogin?: () => Promise<void>;
    onAuthChange?: (callback: () => void) => (() => void) | void;
  };
  achievements?: {
    unlock?: (key: string) => Promise<void>;
  };
  leaderboards?: {
    submitScore: (key: string, score: number) => Promise<void>;
    list?: () => Promise<PocketBastionLeaderboardListResponse>;
    get?: (key: string, options?: { limit?: number }) => Promise<PocketBastionLeaderboardResponse | null>;
  };
}

function readNumber(...values: unknown[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function readDisplay(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function parseLeaderboardEntry(entry: PocketBastionLeaderboardEntry | null | undefined) {
  const score = readNumber(entry?.score, entry?.bestScore, entry?.value);
  return {
    rank: readNumber(entry?.rank, entry?.position, entry?.place),
    score,
    display: readDisplay(entry?.scoreDisplay, entry?.displayScore, entry?.valueDisplay, score !== null ? `Wave ${score}` : null),
  };
}

class PlaydropMetaController {
  private sdk: PocketBastionRuntime | null = null;
  private pendingAchievements = new Set<string>();
  private pendingScore: number | null = null;
  private busy = false;
  private sceneReady = false;
  private hostReady = false;
  private authChangeCleanup: (() => void) | null = null;
  private leaderboardLoaded = false;
  private leaderboardRank: number | null = null;
  private leaderboardBestScore: number | null = null;
  private leaderboardBestDisplay: string | null = null;
  private newHighScore = false;

  constructor(private readonly scene: PocketBastionScene) {}

  markSceneReady(): void {
    this.sceneReady = true;
    this.syncHostReady();
  }

  destroy(): void {
    this.authChangeCleanup?.();
    this.authChangeCleanup = null;
  }

  async init(): Promise<void> {
    const namespace = window.playdrop;
    if (!namespace) {
      this.scene.setPlatformSnapshot({ available: false });
      return;
    }

    const sdk = (await namespace.init()) as unknown as PocketBastionRuntime;
    this.sdk = sdk;

    const authChange = sdk.me?.onAuthChange;
    if (typeof authChange === "function") {
      const cleanup = authChange.call(sdk.me, () => {
        if (!this.hasViewerIdentity()) {
          this.clearLeaderboardState();
          this.syncSceneSnapshot();
          return;
        }

        void this.refreshLeaderboardState();
        if (this.hasPendingMeta()) {
          void this.flushPendingMeta();
        } else {
          this.syncSceneSnapshot();
        }
      });

      if (typeof cleanup === "function") {
        this.authChangeCleanup = cleanup;
      }
    }

    if (this.hasViewerIdentity() || typeof this.sdk.leaderboards?.list === "function") {
      await this.refreshLeaderboardState();
    }

    this.syncSceneSnapshot();
    this.syncHostReady();
  }

  queue(events: MetaEvent[]): void {
    for (const event of events) {
      if (event.type === "achievement") {
        this.pendingAchievements.add(event.key);
        continue;
      }

      if (event.type === "leaderboard-score" && typeof event.value === "number") {
        this.pendingScore = Math.max(this.pendingScore ?? 0, event.value);
      }
    }

    this.syncSceneSnapshot();

    if (this.pendingScore !== null && this.hasViewerIdentity()) {
      void this.flushPendingMeta();
    }
  }

  async handleMetaAction(): Promise<void> {
    if (!this.sdk) {
      return;
    }

    this.setBusy(true);
    try {
      if (!this.hasViewerIdentity() && this.getAuthMode() === "OPTIONAL") {
        const loginFn = this.sdk.me?.promptLogin ?? this.sdk.me?.login;
        if (loginFn) {
          await loginFn.call(this.sdk.me);
        }
      }

      if (!this.hasViewerIdentity()) {
        this.syncSceneSnapshot();
        return;
      }

      await this.flushPendingMeta();
      await this.refreshLeaderboardState();
    } finally {
      this.setBusy(false);
      this.syncSceneSnapshot();
    }
  }

  private async flushPendingMeta(): Promise<void> {
    if (!this.sdk || !this.hasViewerIdentity()) {
      return;
    }

    const achievements = Array.from(this.pendingAchievements);
    for (const key of achievements) {
      try {
        await this.sdk.achievements?.unlock?.(key);
        this.pendingAchievements.delete(key);
      } catch (error) {
        console.warn("[pocket-bastion] Failed to grant achievement", key, error);
      }
    }

    if (this.pendingScore !== null) {
      const submittedScore = this.pendingScore;
      const previousBest = this.leaderboardBestScore;
      try {
        await this.sdk.leaderboards?.submitScore(LEADERBOARD_KEY, submittedScore);
        this.pendingScore = null;
        await this.refreshLeaderboardState(submittedScore, previousBest);
      } catch (error) {
        console.warn("[pocket-bastion] Failed to submit leaderboard score", error);
      }
    } else {
      await this.refreshLeaderboardState();
    }

    this.syncSceneSnapshot();
  }

  private getAuthMode(): AuthMode {
    return this.sdk?.app?.authMode ?? "NONE";
  }

  private hasViewerIdentity(): boolean {
    const userId = this.sdk?.me?.userId;
    if (typeof userId === "number" && Number.isFinite(userId) && userId > 0) {
      return true;
    }

    const username = this.sdk?.me?.username;
    if (typeof username === "string" && username.trim().length > 0) {
      return true;
    }

    if (this.leaderboardRank !== null || this.leaderboardBestScore !== null) {
      return true;
    }

    return Boolean(this.sdk?.me?.isLoggedIn);
  }

  private hasPendingMeta(): boolean {
    return this.pendingAchievements.size > 0 || this.pendingScore !== null;
  }

  private clearLeaderboardState(): void {
    this.leaderboardLoaded = false;
    this.leaderboardRank = null;
    this.leaderboardBestScore = null;
    this.leaderboardBestDisplay = null;
    this.newHighScore = false;
  }

  private async refreshLeaderboardState(submittedScore?: number, previousBest = this.leaderboardBestScore): Promise<void> {
    if (!this.sdk?.leaderboards?.list) {
      return;
    }

    try {
      const response = await this.sdk.leaderboards.list();
      const summaries = response.leaderboards ?? [];
      const summary = summaries.find(
        (candidate) => candidate.definition?.key === LEADERBOARD_KEY || candidate.key === LEADERBOARD_KEY,
      );

      let player = summary?.player ?? null;

      if (!player && typeof this.sdk.leaderboards.get === "function") {
        const detail = await this.sdk.leaderboards.get(LEADERBOARD_KEY, { limit: 10 }).catch(() => null);
        player = detail?.player ?? detail?.me ?? detail?.currentPlayer ?? null;
      }

      const parsed = parseLeaderboardEntry(player);
      this.leaderboardLoaded = true;
      this.leaderboardRank = parsed.rank;

      if (parsed.score !== null) {
        this.leaderboardBestScore = parsed.score;
        this.leaderboardBestDisplay = parsed.display ?? `Wave ${parsed.score}`;
      } else if (submittedScore !== undefined) {
        const fallbackBest = Math.max(previousBest ?? 0, submittedScore);
        this.leaderboardBestScore = fallbackBest;
        this.leaderboardBestDisplay = `Wave ${fallbackBest}`;
      }

      if (submittedScore !== undefined) {
        const bestAfter = this.leaderboardBestScore ?? submittedScore;
        this.newHighScore = previousBest === null ? bestAfter >= submittedScore : bestAfter > previousBest;
      }
    } catch (error) {
      console.warn("[pocket-bastion] Failed to refresh leaderboard state", error);
    }
  }

  private setBusy(nextBusy: boolean): void {
    this.busy = nextBusy;
    this.syncSceneSnapshot();
  }

  private syncHostReady(): void {
    if (!this.sceneReady || this.hostReady || !this.sdk?.host) {
      return;
    }

    if (typeof this.sdk.host.ready === "function") {
      this.sdk.host.ready();
      this.hostReady = true;
      return;
    }

    if (typeof this.sdk.host.setLoadingState === "function") {
      this.sdk.host.setLoadingState({ status: "ready" });
      this.hostReady = true;
    }
  }

  private syncSceneSnapshot(): void {
    this.scene.setPlatformSnapshot({
      available: Boolean(this.sdk),
      authOptional: this.getAuthMode() === "OPTIONAL",
      isLoggedIn: this.hasViewerIdentity(),
      pendingMeta: this.hasPendingMeta(),
      busy: this.busy,
      leaderboardLoaded: this.leaderboardLoaded,
      leaderboardRank: this.leaderboardRank,
      leaderboardBestScore: this.leaderboardBestScore,
      leaderboardBestDisplay: this.leaderboardBestDisplay,
      newHighScore: this.newHighScore,
    });
  }
}

function shouldAutoStartHostedPlaySurface(): boolean {
  const referrer = document.referrer;
  if (!referrer) {
    return false;
  }

  try {
    const referrerUrl = new URL(referrer);
    const isHostedReferrer = referrerUrl.hostname.endsWith("playdrop.ai");
    const isLocalPlayWrapper = referrerUrl.hostname === "127.0.0.1" || referrerUrl.hostname === "localhost";
    if (!isHostedReferrer && !isLocalPlayWrapper) {
      return false;
    }

    return /\/play(?:$|[/?#])/.test(referrerUrl.pathname);
  } catch {
    return referrer.includes("playdrop.ai") && /\/play(?:$|[/?#])/.test(referrer);
  }
}

async function bootstrap() {
  const gameCanvas = document.getElementById("game-canvas");
  const hudRoot = document.getElementById("hud-root");

  if (!(gameCanvas instanceof HTMLElement) || !(hudRoot instanceof HTMLElement)) {
    throw new Error("[pocket-bastion] App shell missing canvas or HUD roots");
  }

  const hud = new HudController(hudRoot);
  let metaController: PlaydropMetaController | null = null;

  const scene = new PocketBastionScene({
    onSceneReady(api) {
      hud.bind(api);
      window.__pocketBastion__ = api;
      window.render_game_to_text = () => JSON.stringify(api.getSnapshot());
      const autoStarted = shouldAutoStartHostedPlaySurface() ? api.startGame() : false;
      if (!autoStarted) {
        hud.render(api.getSnapshot());
      }
      metaController?.markSceneReady();
    },
    onStateChange(snapshot) {
      hud.render(snapshot);
    },
    onMetaEvents(events) {
      metaController?.queue(events);
    },
    onMetaAction() {
      return metaController?.handleMetaAction() ?? Promise.resolve();
    },
  });

  metaController = new PlaydropMetaController(scene);

  const game = new Phaser.Game({
    type: Phaser.CANVAS,
    parent: gameCanvas,
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    backgroundColor: "#274236",
    render: {
      antialias: false,
      pixelArt: true,
      roundPixels: true,
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: WORLD_WIDTH,
      height: WORLD_HEIGHT,
    },
    scene: [scene],
  });
  void metaController.init().catch((error) => {
    console.warn("[pocket-bastion] Playdrop init failed", error);
  });

  window.addEventListener("beforeunload", () => {
    metaController?.destroy();
    game.destroy(true);
  });
}

bootstrap().catch((error) => {
  const playdrop = window.playdrop as unknown as PocketBastionRuntime | undefined;
  playdrop?.host?.setLoadingState?.({
    status: "error",
    message: String(error),
  });

  document.body.innerHTML = `<pre style="padding:16px;color:#fff;background:#1a1715;font:16px/1.4 monospace;">${String(error)}</pre>`;
  throw error;
});

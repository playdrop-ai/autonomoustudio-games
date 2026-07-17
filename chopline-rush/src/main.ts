import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { FragmentPhysics } from "./game/fragmentPhysics";
import { normalizeKnifeModel, type KnifeGeometry, type KnifeModelDefinition } from "./game/knifeModel";
import { REFERENCE_CONFIG } from "./referenceLevels";

export {};

type Mode = "level" | "endless";
type Screen = "boot" | "menu" | "levels" | "shop" | "playing" | "paused" | "revive" | "result";
type RunOutcome = "won" | "lost";
type PreviewSurface = "desktop" | "mobile-landscape" | "mobile-portrait";
type PreviewAudioPolicy = "music-and-sfx" | "sfx-only" | "silent";

interface PreviewPayload {
  active?: boolean;
  sceneId?: string;
  surface?: PreviewSurface;
  seed?: string;
  audioPolicy?: PreviewAudioPolicy;
}

type AdLoadStatus = "ready" | "no_fill" | "rate_limited" | "blocked";
type InterstitialShowStatus = "dismissed" | "not_ready" | "expired";
type RewardedShowStatus = "completed" | "dismissed" | "not_ready" | "expired";
type AdLoad = { status: AdLoadStatus };
type InterstitialResult = { status: InterstitialShowStatus };
type RewardedResult = { status: RewardedShowStatus };
type AdPlacement = {
  load?: () => Promise<AdLoad>;
  show?: () => Promise<InterstitialResult | RewardedResult>;
};
type HostLoadingState = { status: "loading"; message?: string; progress?: number } | { status: "ready" } | { status: "error"; message?: string };
type ShopReceipt = { id: string | number; status?: string };
type ShopPurchasePayload = {
  kind?: "consumable" | "entitlement";
  sku: string;
  displayName: string;
  priceCredits: number;
  previewImage?: string | null;
};
type PlaydropSdk = {
  init?: () => Promise<PlaydropSdk>;
  host?: {
    ready?: () => void;
    setLoadingState?: (state: HostLoadingState) => void;
    audioEnabled?: boolean;
    onAudioPolicyChange?: (callback: (policy: { enabled: boolean }) => void) => void;
  };
  me?: {
    login?: () => Promise<void>;
    isLoggedIn?: boolean;
    appData?: {
      data?: Record<string, unknown>;
      get?: <T>(key: string) => Promise<T | null>;
      set?: <T>(key: string, value: T) => Promise<unknown>;
    } | null;
    updateAppData?: (data: Record<string, unknown>) => Promise<unknown>;
    promptLogin?: () => Promise<unknown>;
  };
  ads?: {
    interstitial?: AdPlacement;
    rewarded?: AdPlacement;
  };
  shop?: {
    purchase?: (payload: ShopPurchasePayload | string) => Promise<ShopReceipt>;
    listProducts?: () => Promise<Array<{ key: string }>>;
    grant?: (receiptId: string | number) => Promise<ShopReceipt>;
    consume?: (receiptId: string | number) => Promise<unknown>;
  };
  achievements?: {
    unlock?: (key: string) => Promise<unknown>;
    setProgressAtLeast?: (key: string, progress: number) => Promise<unknown>;
  };
  leaderboards?: {
    submitScore?: (key: string, score: number) => Promise<unknown>;
  };
};

declare global {
  interface Window {
    __listingCapture?: {
      prepare?: (payload?: PreviewPayload) => Promise<void> | void;
      startAudioCapture?: () => Promise<void> | void;
      stopAudioCapture?: () => Promise<{ mimeType: string; base64: string }> | { mimeType: string; base64: string };
    };
    __choplineTest?: {
      setProfile: (overrides: Partial<Profile>) => void;
      startLevel: (level: number) => void;
      startEndless: () => void;
      forceWin: (score?: number) => void;
      forceLoss: (score?: number) => void;
      useCoinRevive: () => void;
      useRewardedRevive: () => Promise<void>;
      doubleCoins: () => Promise<void>;
      stageLandingProof: () => void;
      stageSideLandingProof: () => void;
      stageFlatLandingProof: () => void;
      stageHandleLandingProof: () => void;
      stageSliceProof: () => void;
      stageInvalidSliceProof: () => void;
      stageSplitVisualProof: (preferredType?: string) => void;
      stageEndlessSplitVisualProof: (preferredType?: string) => void;
      tap: () => void;
      advance: (seconds: number) => void;
      makeNextFlipReady: () => void;
      setProofFrozen: (frozen: boolean) => void;
      resetMotionClocks: () => void;
      setEndlessTimer: (seconds: number, active?: boolean) => void;
      state: () => {
        screen: Screen;
        profile: Profile;
        run: RunState | null;
        knife: {
          state: KnifeState;
          stuckFace: StuckFace;
          stuckPlatformId: string | null;
          slicing: boolean;
          y: number;
          z: number;
          velocityY: number;
          velocityZ: number;
          rotation: number;
          landingPunch: number;
        };
        knifeGeometry: {
          bladeReach: number;
          handleReach: number;
          tipError: number;
          handleEndError: number;
          physicsTip: { x: number; y: number; z: number };
          visualTip: { x: number; y: number; z: number };
        };
      sliceables: {
        total: number;
        sliced: number;
        visible: number;
      };
      endless: {
        cursorZ: number;
        templates: number;
        platforms: Array<{
          id: string;
          y: number;
          z: number;
          depth: number;
          height: number;
          moving: boolean;
          objectCount: number;
          sliceableCount: number;
          obstacleCount: number;
          objectTypes: string[];
        }>;
        nearObjectCount: number;
        unattachedObjectCount: number;
        planEvents: EndlessPlanProofEvent[];
      };
      slicePieces: {
        count: number;
        phases: SlicePiecePhase[];
        sliding: number;
          falling: number;
          grounded: number;
          spreadX: number;
          velocities: Array<{ x: number; y: number; z: number }>;
          bounds: Array<{ objectType: string; direction: -1 | 1; xMin: number; xMax: number; yMin: number; yMax: number; zMin?: number; zMax?: number }>;
          objectTypes: string[];
        };
        sliceEvents: SliceProofEvent[];
        stickEvents: StickProofEvent[];
        background: {
          counts: Record<string, number>;
          objects: Array<{ kind: string; x: number; y: number; z: number }>;
        };
        resultTitle: string;
        resultSubtitle: string;
        resultContinue: string;
        resultCoins: string;
      };
    };
  }
}

const getPlaydropSdk = (): PlaydropSdk | null =>
  (window as unknown as { playdrop?: PlaydropSdk }).playdrop ?? null;

function markHostReady(sdk: PlaydropSdk | null): void {
  if (!sdk?.host) return;
  if (sdk.host.ready) {
    sdk.host.ready();
    return;
  }
  sdk.host.setLoadingState?.({ status: "ready" });
}

interface RefPlatform {
  id: string;
  y?: number;
  z: number;
  depth: number;
  height: number;
  moving?: boolean;
  moveAxis?: "x" | "y" | "z";
  moveDistance?: number;
  moveSpeed?: number;
  moveDelay?: number;
}

interface RefThing {
  type: string;
  platformId?: string;
  y?: number;
  z?: number;
  count?: number;
  moving?: boolean;
  moveAxis?: "x" | "y" | "z";
  moveDistance?: number;
  moveSpeed?: number;
  moveDelay?: number;
  rotation?: { x?: number | null; y?: number | null; z?: number | null };
}

interface RefLevel {
  platforms: RefPlatform[];
  roofs?: RefPlatform[];
  sliceables?: RefThing[];
  obstacles?: RefThing[];
  requiredScore?: number;
  reward?: number;
  finishLinePlatformId?: string;
}

interface EndlessTemplate {
  platform: Omit<RefPlatform, "id" | "z">;
  sliceables?: Array<Omit<RefThing, "platformId">>;
  obstacles?: Array<Omit<RefThing, "platformId">>;
}

interface EndlessSpawnPlan {
  gap: number;
  templateIndex: number;
  template: EndlessTemplate;
}

type KnifeState = "stuck" | "flying" | "bouncing" | "rotating-stick" | "tumbling" | "dead";
type StuckFace = "top" | "bottom" | "side";
type PlatformKind = "platform" | "roof";
type CollisionAxis = "y" | "z";
type CollisionDir = -1 | 1;
type SlicePiecePhase = "sliding" | "falling" | "grounded";

interface CollisionAABB {
  bottomY: number;
  topY: number;
  halfZ: number;
  centerZ?: number;
  originalHalfZ?: number;
}

interface KnifeOBB {
  cY: number;
  cZ: number;
  axisY: number;
  axisZ: number;
  halfLen: number;
  halfWid: number;
}

interface FaceHit {
  axis: CollisionAxis;
  dir: CollisionDir;
  coord: number;
}

interface PlatformEntity {
  id: string;
  kind: PlatformKind;
  mesh: THREE.Mesh;
  base: THREE.Vector3;
  width: number;
  depth: number;
  height: number;
  moving: boolean;
  moveAxis: "x" | "y" | "z";
  moveDistance: number;
  moveSpeed: number;
  moveDelay: number;
  moveElapsed: number;
  bounds: THREE.Box3;
}

interface SliceEntity {
  id: string;
  type: string;
  group: THREE.Group;
  base: THREE.Vector3;
  localPosition: THREE.Vector3;
  platformId: string | null;
  configIndex: number;
  stackIndex: number;
  radius: number;
  collision: CollisionAABB;
  sliced: boolean;
  collisionEnabled: boolean;
  moving: boolean;
  moveAxis: "x" | "y" | "z";
  moveDistance: number;
  moveSpeed: number;
  moveDelay: number;
  moveElapsed: number;
}

interface ObstacleEntity {
  id: string;
  group: THREE.Group;
  base: THREE.Vector3;
  localPosition: THREE.Vector3;
  platformId: string | null;
  radius: number;
  collision: CollisionAABB;
  cleared?: boolean;
  moving: boolean;
  moveAxis: "x" | "y" | "z";
  moveDistance: number;
  moveSpeed: number;
  moveDelay: number;
  moveElapsed: number;
  moveDirY: number;
  moveDirZ: number;
}

interface Particle {
  mesh: THREE.Object3D;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface SlicePiece {
  mesh: THREE.Object3D;
  sourceId: string;
  spawnPosition: THREE.Vector3;
  phase: SlicePiecePhase;
  objectType: string;
  velocity: THREE.Vector3;
  direction: -1 | 1;
  localBounds: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    zMin?: number;
    zMax?: number;
  };
  bodyHandle: number;
}

interface SlicePieceProofSummary {
  count: number;
  phases: SlicePiecePhase[];
  sliding: number;
  falling: number;
  grounded: number;
  spreadX: number;
  velocities: Array<{ x: number; y: number; z: number }>;
  bounds: Array<{ objectType: string; direction: -1 | 1; xMin: number; xMax: number; yMin: number; yMax: number; zMin?: number; zMax?: number }>;
  maxSourceSpawnSpreadX: number;
  maxSourceSpawnSpreadY: number;
  objectTypes: string[];
}

interface CoinProduct {
  sku: string;
  displayName: string;
  coins: number;
  priceCredits: number;
}

interface KnifeSkin {
  id: string;
  displayName: string;
  price: number;
  sourceRef: string;
  image: string;
  model: string;
  handle: number;
  blade: number;
  trail: number;
  modelDefinition: KnifeModelDefinition;
}

interface WorldTheme {
  id: string;
  displayName: string;
  price: number;
  sky: number;
  horizon: number;
  ground: number;
  platformTop: number;
  platformSide: number;
  mountain: number;
  tree: number;
}

interface Profile {
  coins: number;
  ownedKnives: string[];
  equippedKnife: string;
  ownedThemes: string[];
  equippedTheme: string;
  highestLevel: number;
  highestLevelCompleted: number;
  endlessBest: number;
  totalRuns: number;
  totalSlices: number;
  totalCoinsEarned: number;
  achievements: string[];
}

interface RunState {
  mode: Mode;
  levelIndex: number;
  score: number;
  combo: number;
  bestCombo: number;
  targetScore: number;
  endlessScoreTimer: number;
  endlessTimerActive: boolean;
  tapHintConsumed: boolean;
  reward: number;
  startedAt: number;
  outcome: RunOutcome | null;
  reviveUsed: boolean;
  coinsAwarded: number;
  doubled: boolean;
  interstitialShown: boolean;
  goalAnnounced: boolean;
}

const LEVELS = REFERENCE_CONFIG.levels as unknown as RefLevel[];
const LEVEL_COUNT = Math.min(30, LEVELS.length);
const PROFILE_KEY = "chopline-rush-v2-profile";
const REMOTE_PROFILE_KEY = "chopline-rush-profile";
const LEADERBOARD_LEVEL = "max_level";
const LEADERBOARD_ENDLESS = "endless_score";
const ENDLESS_SCORE_TIMEOUT = 10;
const REVIVE_COST = 100;
const ENDLESS_GENERATE_AHEAD = 120;
const ENDLESS_CLEANUP_BEHIND = 60;
const ENDLESS_FLIP_DISTANCE = 4;
const ENDLESS_REFERENCE_STARTUP_RANDOM_DRAWS = 4096;
const ENDLESS_REFERENCE_POST_BUILD_RANDOM_DRAWS = 8;
const ENDLESS_REFERENCE_EXTRA_RANDOM_BUDGET_BY_TEMPLATE = new Map<number, number>([
  [0, 64],
  [10, 40],
  [36, 128],
  [298, 1024],
  [38, 93],
  [89, 249],
  [205, 240],
  [42, 36],
  [60, 24],
  [211, 352],
  [75, 128],
  [87, 188],
  [115, 168],
  [188, 264],
  [197, 232],
  [213, 256],
  [246, 176],
  [255, 592],
  [260, 232],
  [268, 176],
  [316, 824],
  [283, 440],
  [172, 296],
  [261, 480],
  [184, 144],
  [79, 732],
  [68, 96],
  [128, 276],
  [82, 36],
  [288, 625],
  [98, 259],
  [301, 280],
  [228, 520],
  [162, 388],
]);

const AUDIO = {
  music: "assets/audio/background-music.mp3",
  sliceSoft: "assets/audio/slice-soft.mp3",
  sliceWood: "assets/audio/slice-wood.mp3",
  knifeFlip: "assets/audio/knife-flip.mp3",
  knifeStick: "assets/audio/knife-stick.mp3",
  knifeBounce: "assets/audio/knife-bounce.mp3",
  gameOver: "assets/audio/game-over.mp3",
  victory: "assets/audio/victory.mp3",
  hazard: "assets/audio/hazard.mp3",
  coin: "assets/audio/coin.mp3",
  button: "assets/audio/button.mp3",
} as const;

const KNIVES: KnifeSkin[] = [
  {
    id: "utensil",
    displayName: "Utensil Knife",
    price: 0,
    sourceRef: "asset:playdrop/food-kit-utensil-knife@r1",
    image: "assets/knives/utensil-knife.png",
    model: "assets/knives/utensil-knife.glb",
    handle: 0xc43cff,
    blade: 0xe8f2ff,
    trail: 0x75d4ff,
    modelDefinition: {
      sourceAxis: "x",
      bladeDirection: -1,
      anchors: { tip: [-0.300384, 0.009, 0], hilt: [0.11, 0.009, 0], handleEnd: [0.300384, 0.009, 0] },
      bladeReach: 1.7,
      bladeHalfWidth: 0.15,
      handleHalfWidth: 0.1,
      readyAngle: THREE.MathUtils.degToRad(-140),
    },
  },
  {
    id: "cooking",
    displayName: "Cooking Knife",
    price: 180,
    sourceRef: "asset:playdrop/food-kit-cooking-knife@r1",
    image: "assets/knives/cooking-knife.png",
    model: "assets/knives/cooking-knife.glb",
    handle: 0x9f4bff,
    blade: 0xf2f6ff,
    trail: 0xff8cdc,
    modelDefinition: {
      sourceAxis: "x",
      bladeDirection: -1,
      anchors: { tip: [-0.358125, 0.02, 0], hilt: [0.08, 0.02, 0], handleEnd: [0.358125, 0.02, 0] },
      bladeReach: 1.7,
      bladeHalfWidth: 0.2,
      handleHalfWidth: 0.12,
      readyAngle: THREE.MathUtils.degToRad(-140),
    },
  },
  {
    id: "chopping",
    displayName: "Chopping Knife",
    price: 450,
    sourceRef: "asset:playdrop/food-kit-cooking-knife-chopping@r1",
    image: "assets/knives/chopping-knife.png",
    model: "assets/knives/chopping-knife.glb",
    handle: 0x4935e8,
    blade: 0xf6fbff,
    trail: 0xffcf4d,
    modelDefinition: {
      sourceAxis: "x",
      bladeDirection: -1,
      anchors: { tip: [-0.3, 0.02, 0.014], hilt: [0.11, 0.02, 0.014], handleEnd: [0.3, 0.02, 0.014] },
      bladeReach: 1.76,
      bladeHalfWidth: 0.3,
      handleHalfWidth: 0.14,
      readyAngle: THREE.MathUtils.degToRad(-140),
    },
  },
  {
    id: "ultimate-food",
    displayName: "Ultimate Food Knife",
    price: 950,
    sourceRef: "asset:playdrop/ultimate-food-knife@r2",
    image: "assets/knives/ultimate-food-knife.png",
    model: "assets/knives/ultimate-food-knife.glb",
    handle: 0xff5aa5,
    blade: 0xffffff,
    trail: 0x47f4b4,
    modelDefinition: {
      sourceAxis: "z",
      bladeDirection: 1,
      anchors: { tip: [0, 0, 1.291942], hilt: [0, 0, -0.32], handleEnd: [0, 0, -0.715891] },
      bladeReach: 1.72,
      bladeHalfWidth: 0.17,
      handleHalfWidth: 0.11,
      readyAngle: THREE.MathUtils.degToRad(-140),
    },
  },
  {
    id: "home-interior",
    displayName: "Home Interior Knife",
    price: 1600,
    sourceRef: "asset:playdrop/ultimate-home-interior-knife@r3",
    image: "assets/knives/home-interior-knife.png",
    model: "assets/knives/home-interior-knife.glb",
    handle: 0x6f52ff,
    blade: 0xeaf2ff,
    trail: 0xffffff,
    modelDefinition: {
      sourceAxis: "z",
      bladeDirection: 1,
      anchors: { tip: [0, 0, 0.159239], hilt: [0, 0, -0.12], handleEnd: [0, 0, -0.259893] },
      bladeReach: 1.7,
      bladeHalfWidth: 0.16,
      handleHalfWidth: 0.11,
      readyAngle: THREE.MathUtils.degToRad(-140),
    },
  },
  {
    id: "survival",
    displayName: "Survival Knife",
    price: 2600,
    sourceRef: "asset:playdrop/survival-knife@r2",
    image: "assets/knives/survival-knife.png",
    model: "assets/knives/survival-knife.glb",
    handle: 0x263238,
    blade: 0xd7dde8,
    trail: 0xff4f7a,
    modelDefinition: {
      sourceAxis: "y",
      bladeDirection: 1,
      anchors: { tip: [0, 1.19925, 0], hilt: [0, 0.12, 0], handleEnd: [0, -0.363614, 0] },
      bladeReach: 1.72,
      bladeHalfWidth: 0.23,
      handleHalfWidth: 0.14,
      readyAngle: THREE.MathUtils.degToRad(-140),
    },
  },
];
const STARTER_KNIFE_ID = "chopping";

const THEMES: WorldTheme[] = [
  {
    id: "forest",
    displayName: "Forest",
    price: 0,
    sky: 0x78dce7,
    horizon: 0x82d9c5,
    ground: 0x8ed05a,
    platformTop: 0xf5f3eb,
    platformSide: 0xbcc2c4,
    mountain: 0x78cbb5,
    tree: 0x4fa88d,
  },
  {
    id: "beach",
    displayName: "Beach",
    price: 600,
    sky: 0x64d9ed,
    horizon: 0x75e5dc,
    ground: 0xf2cf6b,
    platformTop: 0xfff8df,
    platformSide: 0xd9bc82,
    mountain: 0x54c8c5,
    tree: 0x2ca58d,
  },
  {
    id: "sunset",
    displayName: "Sunset",
    price: 1500,
    sky: 0xf39f83,
    horizon: 0xf3c17b,
    ground: 0x76bd69,
    platformTop: 0xf7eee5,
    platformSide: 0xbba8a2,
    mountain: 0xc77f86,
    tree: 0x536d68,
  },
];
const STARTER_THEME_ID = "forest";

const COIN_PRODUCTS: CoinProduct[] = [
  { sku: "coins_500", displayName: "500 Coins", coins: 500, priceCredits: 25 },
  { sku: "coins_1500", displayName: "1,500 Coins", coins: 1500, priceCredits: 70 },
  { sku: "coins_4000", displayName: "4,000 Coins", coins: 4000, priceCredits: 160 },
];

const DEFAULT_PROFILE: Profile = {
  coins: 0,
  ownedKnives: [STARTER_KNIFE_ID],
  equippedKnife: STARTER_KNIFE_ID,
  ownedThemes: [STARTER_THEME_ID],
  equippedTheme: STARTER_THEME_ID,
  highestLevel: 1,
  highestLevelCompleted: 0,
  endlessBest: 0,
  totalRuns: 0,
  totalSlices: 0,
  totalCoinsEarned: 0,
  achievements: [],
};

const root = document.createElement("div");
root.id = "app";
document.body.append(root);

const style = document.createElement("style");
style.textContent = `
  @import url("https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&display=swap");
  :root {
    color-scheme: dark;
    --pink: #f6a8bd;
    --magenta: #d946ef;
    --blue: #2597e9;
    --purple: #271b52;
    --panel: rgba(42, 30, 80, 0.9);
    --space-sm: 16px;
    --space-md: 24px;
  }
  html, body, #app {
    margin: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
    touch-action: none;
    background: #140722;
    font-family: "Fredoka", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }
  #app {
    position: fixed;
    inset: 0;
    --game-width: 100vw;
    --game-height: 100vh;
  }
  button {
    font: inherit;
    border: 0;
    cursor: pointer;
  }
  #stage {
    position: absolute;
    top: 50%;
    left: 50%;
    width: var(--game-width);
    height: var(--game-height);
    transform: translate(-50%, -50%);
    overflow: hidden;
    background: linear-gradient(180deg, #f6a8bd 0%, #ee69d7 100%);
  }
  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }
  .hud, .screen, .toast {
    position: absolute;
    top: 50%;
    left: 50%;
    width: var(--game-width);
    height: var(--game-height);
    transform: translate(-50%, -50%);
    pointer-events: none;
    z-index: 5;
    overflow: hidden;
  }
  .hud > *, .screen > *, .toast > * {
    pointer-events: auto;
  }
  .pill {
    color: white;
    text-shadow: 0 2px 5px rgba(61, 22, 60, 0.55);
    background: rgba(112, 62, 92, 0.58);
    border-radius: 999px;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.25), 0 7px 20px rgba(74, 27, 69, 0.24);
    backdrop-filter: blur(8px);
  }
  #level-pill {
    position: absolute;
    top: 18px;
    left: 18px;
    padding: 10px 17px;
    font-weight: 700;
    font-size: 18px;
  }
  #score-pill {
    position: absolute;
    top: var(--space-sm);
    left: 50%;
    min-width: 140px;
    transform: translateX(-50%);
    padding: 12px 32px;
    text-align: center;
    pointer-events: none;
    background: rgba(0,0,0,0.35);
    border-radius: 50px;
    backdrop-filter: blur(4px);
    box-shadow: none;
    text-shadow: 0 2px 8px rgba(0,0,0,0.4);
  }
  #score-pill strong {
    display: block;
    font-size: 36px;
    line-height: 1.08;
    font-weight: 700;
  }
  #score-pill span {
    display: block;
    margin-top: 2px;
    color: rgba(255,255,255,0.6);
    font-size: 16px;
    font-weight: 400;
  }
  #score-pill .goal-ready {
    color: #6f6;
  }
  #endless-timer {
    display: none;
    margin-top: 6px;
  }
  #endless-timer-bar-wrap {
    width: 80%;
    height: 4px;
    margin: 0 auto;
    background: rgba(255,255,255,0.15);
    border-radius: 2px;
    overflow: hidden;
    position: relative;
  }
  #endless-timer-bar {
    width: 100%;
    height: 100%;
    background: #4CAF50;
    border-radius: 2px;
    transition: background 0.3s;
  }
  #endless-timer-bar.warn {
    background: #FFB300;
  }
  #endless-timer-bar.danger {
    background: #FF4444;
    animation: timer-pulse 0.5s ease-in-out infinite;
  }
  @keyframes timer-pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }
  #endless-timer-text,
  #endless-timer-hint {
    display: block;
    color: rgba(255,255,255,0.5);
    font-size: 16px;
    margin-top: 3px;
  }
  #endless-timer-hint {
    margin-top: 2px;
  }
  #app.preview-capture #pause-btn,
  #app.preview-capture #shop-btn {
    display: none;
  }
  #coin-pill {
    position: absolute;
    top: calc(var(--space-sm) + 64px);
    left: var(--space-sm);
    display: flex;
    align-items: center;
    gap: 8px;
    pointer-events: none;
    z-index: 20;
    color: #FFD700;
    font-weight: 700;
    font-size: 24px;
    text-shadow: 0 2px 6px rgba(0,0,0,0.5);
  }
  .coin-icon {
    width: 30px;
    height: 30px;
    min-width: 30px;
    flex-shrink: 0;
    border-radius: 50%;
    background: linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FFD700 100%);
    border: 2.5px solid #DAA520;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3),
      inset 0 -2px 4px rgba(0,0,0,0.2),
      inset 0 2px 4px rgba(255,255,255,0.3);
  }
  .top-button {
    position: absolute;
    right: var(--space-sm);
    width: 64px;
    height: 64px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-weight: 700;
    font-size: 26px;
    border: 2px solid rgba(255,255,255,0.25);
    background: #6057f0;
    box-shadow: none;
    z-index: 20;
    backdrop-filter: blur(6px);
    transition: transform 0.15s ease-out;
    -webkit-tap-highlight-color: transparent;
  }
  #pause-btn { top: var(--space-sm); }
  #shop-btn {
    top: calc(var(--space-sm) + 72px);
    color: #fff;
    background: #ffb302;
  }
  .top-button:hover { transform: scale(1.1); }
  .top-button:active { transform: scale(0.93); }
  #tap-hint {
    position: absolute;
    left: 50%;
    bottom: 140px;
    transform: translateX(-50%);
    display: block;
    text-align: center;
    color: white;
    pointer-events: none;
  }
  #tap-hint .tap-circle {
    width: 72px;
    height: 72px;
    border: 4px solid rgba(255,255,255,0.9);
    border-radius: 50%;
    background: rgba(255,255,255,0.15);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: tap-pulse 1.2s ease-in-out infinite;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    margin: 0 auto 12px;
  }
  #tap-hint .tap-circle::after {
    content: "";
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: rgba(255,255,255,0.9);
  }
  #tap-hint div:last-child {
    font-size: 26px;
    font-weight: 600;
    color: #fff;
    text-shadow: 0 2px 8px rgba(0,0,0,0.5);
    letter-spacing: 1px;
  }
  @keyframes tap-pulse {
    0%, 100% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(1.12); opacity: 1; }
  }
  .screen {
    display: none;
    align-items: center;
    justify-content: center;
    background: radial-gradient(circle at 50% 20%, rgba(89,55,146,0.35), rgba(18,7,33,0.22) 55%, rgba(18,7,33,0.7));
  }
  .screen.visible {
    display: flex;
  }
  #menu-screen {
    background: linear-gradient(180deg, #1d1a44 0%, #351d55 46%, #571f55 100%);
  }
  #menu-screen .card {
    width: min(372px, 100vw);
    min-height: 100vh;
    max-height: none;
    display: flex;
    flex-direction: column;
    justify-content: center;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    padding: 0 24px;
  }
  .card {
    width: min(440px, calc(100vw - 32px));
    max-height: calc(100vh - 30px);
    overflow: auto;
    border-radius: 30px;
    background: linear-gradient(180deg, rgba(54,38,104,0.97), rgba(83,28,88,0.97));
    box-shadow: 0 28px 70px rgba(18, 7, 33, 0.45);
    border: 1px solid rgba(255,255,255,0.13);
    color: white;
    padding: 28px;
    text-align: center;
  }
  .brand-knife {
    width: 94px;
    height: 56px;
    margin: 0 auto 8px;
    position: relative;
    filter: drop-shadow(0 9px 18px rgba(0,0,0,0.35));
    animation: float-knife 2.5s ease-in-out infinite;
  }
  .brand-knife::before {
    content: "";
    position: absolute;
    left: 35px;
    top: 22px;
    width: 55px;
    height: 17px;
    background: linear-gradient(90deg, #ffffff, #a7c2ff 65%, #6f8cdb);
    clip-path: polygon(0 20%, 84% 0, 100% 50%, 84% 100%, 0 80%);
    transform: rotate(25deg);
    border-radius: 12px;
  }
  .brand-knife::after {
    content: "";
    position: absolute;
    left: 8px;
    top: 19px;
    width: 43px;
    height: 20px;
    border-radius: 14px;
    background: linear-gradient(180deg, #ef58ff, #8d35e9);
    transform: rotate(25deg);
  }
  @keyframes float-knife {
    0%, 100% { transform: translateY(0) rotate(-5deg); }
    50% { transform: translateY(-9px) rotate(7deg); }
  }
  .title {
    margin: 0;
    font-size: 42px;
    line-height: 0.94;
    text-shadow: 0 5px 14px rgba(0,0,0,0.35);
  }
  .subtitle {
    margin: 8px 0 22px;
    color: rgba(255,255,255,0.58);
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 3px;
    text-transform: uppercase;
  }
  .menu-line {
    width: 140px;
    height: 4px;
    border-radius: 99px;
    margin: 0 auto 31px;
    background: linear-gradient(90deg, #ff64ff, #8c6bff);
  }
  .primary-button, .secondary-button, .danger-button {
    min-height: 52px;
    border-radius: 999px;
    padding: 0 28px;
    color: white;
    font-weight: 700;
    box-shadow: 0 9px 23px rgba(32, 16, 66, 0.26);
  }
  .primary-button {
    background: linear-gradient(180deg, #ef65ff, #a948ef);
  }
  .secondary-button {
    background: linear-gradient(180deg, #45bfff, #238ee8);
  }
  .danger-button {
    background: linear-gradient(180deg, #ff6b7c, #d91d4a);
  }
  .menu-buttons {
    display: grid;
    gap: 14px;
    width: 220px;
    margin: 0 auto;
  }
  .level-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 10px;
    margin-top: 18px;
  }
  .level-card {
    aspect-ratio: 1;
    border-radius: 17px;
    background: rgba(255,255,255,0.12);
    color: rgba(255,255,255,0.45);
    font-size: 21px;
    font-weight: 700;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.12);
  }
  .level-card.unlocked {
    color: white;
    background: linear-gradient(180deg, #ff75ea, #814cff);
  }
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }
  .icon-button {
    width: 46px;
    height: 46px;
    border-radius: 14px;
    color: white;
    background: rgba(255,255,255,0.14);
    font-size: 24px;
  }
  .shop-list {
    display: grid;
    gap: 10px;
    margin-top: 16px;
  }
  .shop-item {
    display: grid;
    grid-template-columns: 68px 1fr auto;
    align-items: center;
    gap: 12px;
    padding: 10px;
    border-radius: 18px;
    background: rgba(255,255,255,0.1);
    text-align: left;
  }
  .shop-item img {
    width: 64px;
    height: 42px;
    object-fit: contain;
    filter: drop-shadow(0 4px 7px rgba(0,0,0,0.35));
  }
  .shop-item strong {
    display: block;
    font-size: 16px;
  }
  .shop-item span {
    display: block;
    margin-top: 2px;
    font-size: 12px;
    color: rgba(255,255,255,0.62);
  }
  .small-button {
    height: 38px;
    min-width: 80px;
    border-radius: 999px;
    padding: 0 14px;
    background: rgba(255,255,255,0.16);
    color: white;
    font-weight: 700;
  }
  #coin-pill.endless-pos {
    top: var(--space-sm);
  }
  .small-button.active {
    background: linear-gradient(180deg, #ffdc43, #ffad00);
    color: #553700;
  }
  .result-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
    margin: 22px 0;
  }
  .stat-tile {
    border-radius: 18px;
    background: rgba(255,255,255,0.11);
    padding: 13px;
  }
  .stat-tile strong {
    display: block;
    font-size: 28px;
  }
  .stat-tile span {
    color: rgba(255,255,255,0.62);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
  }
  .result-subtitle {
    margin: 8px auto 0;
    max-width: 270px;
    min-height: 38px;
    color: rgba(255,255,255,0.72);
    font-size: 15px;
    line-height: 1.25;
  }
  .screen.reference-game-over {
    background: linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.75) 100%);
  }
  .screen.reference-game-over .card {
    box-sizing: border-box;
    width: min(320px, calc(100vw - 48px));
    min-width: 280px;
    max-width: 320px;
    padding: 36px 40px 28px;
    border-radius: 28px;
    border: 2px solid rgba(255,255,255,0.12);
    background: rgba(30,30,60,0.95);
    box-shadow: 0 20px 60px rgba(0,0,0,0.5);
  }
  .screen.reference-game-over #result-title {
    margin-bottom: 6px;
    color: #fff;
    font-size: 40px !important;
    letter-spacing: 1px;
    text-shadow: 0 3px 16px rgba(217, 70, 239, 0.4);
  }
  .screen.reference-game-over .result-subtitle {
    margin: 0 0 8px;
    min-height: 0;
    color: rgba(255,255,255,0.85);
    font-size: 24px;
  }
  .screen.reference-game-over .result-subtitle span {
    color: #FFD700;
    font-size: 36px;
    font-weight: 700;
    text-shadow: 0 2px 8px rgba(255,215,0,0.4);
  }
  .screen.reference-game-over .result-stats,
  .screen.reference-game-over [data-action="double-coins"],
  .screen.reference-game-over [data-action="show-menu"] {
    display: none;
  }
  .screen.reference-game-over .menu-buttons {
    width: 100% !important;
    gap: 12px;
  }
  .screen.reference-game-over #result-continue {
    background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
    box-shadow: 0 6px 22px rgba(245, 158, 11, 0.35);
  }
  .toast {
    inset: auto 18px 26px 18px;
    display: flex;
    justify-content: center;
    z-index: 20;
  }
  #toast-message {
    opacity: 0;
    transform: translateY(10px);
    transition: opacity 150ms ease, transform 150ms ease;
    background: rgba(29, 18, 51, 0.88);
    border: 1px solid rgba(255,255,255,0.14);
    color: white;
    border-radius: 999px;
    padding: 11px 18px;
    box-shadow: 0 14px 32px rgba(0,0,0,0.3);
  }
  #toast-message.visible {
    opacity: 1;
    transform: translateY(0);
  }
  #feedback-flash {
    position: fixed;
    inset: 0;
    pointer-events: none;
    z-index: 4;
    opacity: 0;
  }
  #feedback-flash.success {
    animation: success-flash 520ms ease-out;
  }
  #feedback-flash.danger {
    animation: danger-flash 520ms ease-out;
  }
  #feedback-flash.slice {
    animation: slice-flash 260ms ease-out;
  }
  .score-pop {
    position: fixed;
    z-index: 9;
    pointer-events: none;
    color: #fffce1;
    font-size: 28px;
    font-weight: 800;
    text-shadow: 0 3px 0 rgba(118, 63, 94, 0.72), 0 8px 16px rgba(78, 24, 86, 0.55);
    transform: translate(-50%, -50%);
    animation: score-pop 780ms ease-out forwards;
  }
  @keyframes score-pop {
    0% { opacity: 0; transform: translate(-50%, -20%) scale(0.78); }
    18% { opacity: 1; transform: translate(-50%, -58%) scale(1.14); }
    100% { opacity: 0; transform: translate(-50%, -115%) scale(0.92); }
  }
  @keyframes success-flash {
    0% { opacity: 0.5; background: rgba(108, 255, 134, 0.18); }
    100% { opacity: 0; background: rgba(108, 255, 134, 0); }
  }
  @keyframes slice-flash {
    0% { opacity: 0.34; background: rgba(255, 252, 225, 0.18); }
    100% { opacity: 0; background: rgba(255, 252, 225, 0); }
  }
  @keyframes danger-flash {
    0% { opacity: 0.58; background: rgba(255, 60, 112, 0.25); }
    100% { opacity: 0; background: rgba(255, 60, 112, 0); }
  }
  .hidden {
    display: none !important;
  }
  /* Endless-only presentation: gameplay stays visible behind every lightweight overlay. */
  #stage {
    background: #78dce7;
  }
  #level-pill,
  #endless-timer,
  #levels-screen,
  #revive-screen,
  #menu-screen,
  #coin-list + h3 {
    display: none !important;
  }
  #score-pill {
    top: 18px;
    min-width: 96px;
    padding: 8px 20px;
    color: #173d78;
    background: rgba(255,255,255,0.94);
    border: 4px solid rgba(255,255,255,0.72);
    box-shadow: 0 5px 0 rgba(37, 102, 141, 0.16);
    text-shadow: none;
    backdrop-filter: none;
  }
  #score-pill strong {
    font-size: 30px;
    line-height: 1;
  }
  #score-required {
    display: block !important;
    margin-top: 4px;
    color: #7390b9 !important;
    font-size: 12px !important;
  }
  #coin-pill,
  #coin-pill.endless-pos {
    top: 18px;
    right: 18px;
    left: auto;
    min-width: 82px;
    justify-content: flex-end;
    padding: 6px 10px;
    color: #173d78;
    font-size: 22px;
    text-shadow: none;
    background: rgba(255,255,255,0.94);
    border-radius: 999px;
    box-shadow: 0 5px 0 rgba(37, 102, 141, 0.16);
  }
  #coin-pill .coin-icon,
  #shop-coins .coin-icon {
    width: 27px;
    height: 27px;
    min-width: 27px;
    border-width: 2px;
  }
  .top-button {
    width: 50px;
    height: 50px;
    border-radius: 8px;
    border: 3px solid white;
    color: #173d78;
    background: rgba(255,255,255,0.92);
    box-shadow: 0 5px 0 rgba(37, 102, 141, 0.16);
    font-size: 22px;
  }
  #pause-btn { top: 18px; right: auto; left: 18px; }
  #shop-btn {
    top: 78px;
    right: auto;
    left: 18px;
    color: #173d78;
    background: rgba(255,255,255,0.92);
    font-family: Arial, sans-serif;
    font-size: 28px;
    font-weight: 400;
  }
  #tap-hint {
    bottom: 84px;
  }
  #tap-hint .tap-circle {
    width: 62px;
    height: 62px;
    border-width: 5px;
    background: rgba(255,255,255,0.18);
    box-shadow: 0 5px 0 rgba(33, 92, 91, 0.18);
  }
  #tap-hint div:last-child {
    font-size: 30px;
    font-weight: 700;
    letter-spacing: 0;
    text-shadow: 0 3px 0 rgba(48, 104, 78, 0.28);
  }
  .screen {
    background: rgba(15, 51, 73, 0.34);
    backdrop-filter: blur(4px);
  }
  .card,
  #shop-screen .card,
  #pause-screen .card,
  #result-screen .card,
  .screen.reference-game-over .card {
    box-sizing: border-box;
    width: min(390px, calc(100vw - 28px));
    max-height: calc(100vh - 44px);
    border: 4px solid rgba(255,255,255,0.95);
    border-radius: 8px;
    color: #173d78;
    background: rgba(248, 252, 250, 0.97);
    box-shadow: 0 12px 0 rgba(24, 83, 99, 0.2);
  }
  .primary-button, .secondary-button, .danger-button, .small-button {
    border-radius: 8px;
    box-shadow: 0 5px 0 rgba(19, 77, 119, 0.2);
  }
  .primary-button { background: #168df0; }
  .secondary-button { background: #63b96b; }
  .danger-button { background: #ef655f; }
  .shop-item {
    border-radius: 6px;
    color: #173d78;
    background: #e7f2ef;
    border: 2px solid #c9dfda;
  }
  .shop-item span { color: #64809a; }
  .small-button { color: white; background: #168df0; }
  .small-button.active { color: #173d78; background: #ffd74d; }
  .stat-tile {
    border-radius: 6px;
    background: #e7f2ef;
  }
  .stat-tile span,
  .result-subtitle,
  .screen.reference-game-over .result-subtitle {
    color: #64809a;
  }
  .screen.reference-game-over #result-title {
    color: #173d78;
    text-shadow: none;
  }
  .screen.reference-game-over .result-stats {
    display: grid;
  }
  .screen.reference-game-over [data-action="open-shop"] {
    display: block;
  }
  .praise-pop {
    position: fixed;
    z-index: 10;
    pointer-events: none;
    color: white;
    font-size: 44px;
    font-weight: 800;
    text-shadow: 0 4px 0 rgba(29, 104, 128, 0.35);
    transform: translate(-50%, -50%);
    animation: praise-pop 850ms ease-out forwards;
  }
  @keyframes praise-pop {
    0% { opacity: 0; transform: translate(-50%, -20%) scale(0.7); }
    22% { opacity: 1; transform: translate(-50%, -50%) scale(1.12); }
    100% { opacity: 0; transform: translate(-50%, -95%) scale(0.94); }
  }
  @media (max-width: 760px) {
    #level-pill { font-size: 15px; }
    .card { padding: 22px; }
  }
`;
document.head.append(style);

root.innerHTML = `
  <div id="stage"></div>
  <div id="feedback-flash"></div>
  <div class="hud hidden" id="hud">
    <button class="pill" id="level-pill">Endless</button>
    <div class="pill" id="score-pill">
      <strong>0</strong>
      <span id="score-required">BEST 0</span>
      <div id="endless-timer">
        <div id="endless-timer-bar-wrap"><div id="endless-timer-bar"></div></div>
        <span id="endless-timer-text">10.0s</span>
        <span id="endless-timer-hint">Score to survive!</span>
      </div>
    </div>
    <div id="coin-pill"><span class="coin-icon"></span><span id="coin-count">0</span></div>
    <button class="top-button" id="pause-btn" aria-label="Pause">&#10074;&#10074;</button>
    <button class="top-button" id="shop-btn" aria-label="Knives and themes" title="Knives and themes">&#9881;&#xfe0e;</button>
    <div id="tap-hint"><div class="tap-circle"></div><div>TAP TO FLIP</div></div>
  </div>
  <div class="screen visible" id="menu-screen">
    <div class="card">
      <div class="brand-knife"></div>
      <h1 class="title">Slice Rush</h1>
      <div class="subtitle">Flip · Slice · Conquer</div>
      <div class="menu-line"></div>
      <div class="menu-buttons">
        <button class="primary-button" data-action="start-endless">Play</button>
      </div>
    </div>
  </div>
  <div class="screen" id="levels-screen">
    <div class="card">
      <div class="toolbar">
        <button class="icon-button" data-action="show-menu" aria-label="Back">&lt;</button>
        <h2 class="title" style="font-size: 32px;">Select Level</h2>
        <button class="icon-button" data-action="open-shop" aria-label="Shop">$</button>
      </div>
      <div class="level-grid" id="level-grid"></div>
    </div>
  </div>
  <div class="screen" id="shop-screen">
    <div class="card">
      <div class="toolbar">
        <button class="icon-button" data-action="close-shop" aria-label="Back">&lt;</button>
        <h2 class="title" style="font-size: 31px;">Gear</h2>
        <div id="shop-coins" style="font-size: 19px; font-weight: 700;"></div>
      </div>
      <div class="shop-list" id="knife-list"></div>
      <h3 style="margin: 22px 0 8px;">Themes</h3>
      <div class="shop-list" id="coin-list"></div>
    </div>
  </div>
  <div class="screen" id="pause-screen">
    <div class="card">
      <h2 class="title" style="font-size: 38px;">Paused</h2>
      <div class="menu-buttons" style="margin-top: 24px;">
        <button class="primary-button" data-action="resume">Continue</button>
        <button class="secondary-button" data-action="restart">Retry</button>
        <button class="secondary-button" data-action="open-shop">Gear</button>
      </div>
    </div>
  </div>
  <div class="screen" id="revive-screen">
    <div class="card">
      <h2 class="title" style="font-size: 38px;">Game Over!</h2>
      <p style="color: rgba(255,255,255,0.72);">Use one revive to keep the run alive.</p>
      <div class="menu-buttons" style="width: 260px; margin-top: 20px;">
        <button class="primary-button" data-action="revive-coins">Use 100 coins</button>
        <button class="secondary-button" data-action="revive-ad">Rewarded revive</button>
        <button class="danger-button" data-action="finish-run">End run</button>
      </div>
    </div>
  </div>
  <div class="screen" id="result-screen">
    <div class="card">
      <h2 class="title" id="result-title" style="font-size: 40px;">Victory!</h2>
      <p class="result-subtitle" id="result-subtitle">Level cleared.</p>
      <div class="result-stats">
        <div class="stat-tile"><strong id="result-score">0</strong><span>Score</span></div>
        <div class="stat-tile"><strong id="result-coins">0</strong><span>Coins</span></div>
      </div>
      <div class="menu-buttons" style="width: 260px;">
        <button class="primary-button" id="result-continue" data-action="next-run">Try Again</button>
        <button class="secondary-button" data-action="open-shop">Gear</button>
      </div>
    </div>
  </div>
  <div class="toast"><div id="toast-message"></div></div>
`;

function requireElement<T extends HTMLElement>(id: string, type: { new(): T }): T {
  const element = document.getElementById(id);
  if (!(element instanceof type)) {
    throw new Error(`[chopline-rush] Missing #${id}`);
  }
  return element;
}

const stage = requireElement("stage", HTMLDivElement);
const isChoplineTestMode = new URLSearchParams(window.location.search).has("chopline_test");
const feedbackFlash = requireElement("feedback-flash", HTMLDivElement);
const hud = requireElement("hud", HTMLDivElement);
const menuScreen = requireElement("menu-screen", HTMLDivElement);
const levelsScreen = requireElement("levels-screen", HTMLDivElement);
const shopScreen = requireElement("shop-screen", HTMLDivElement);
const pauseScreen = requireElement("pause-screen", HTMLDivElement);
const reviveScreen = requireElement("revive-screen", HTMLDivElement);
const resultScreen = requireElement("result-screen", HTMLDivElement);
const levelGrid = requireElement("level-grid", HTMLDivElement);
const knifeList = requireElement("knife-list", HTMLDivElement);
const coinList = requireElement("coin-list", HTMLDivElement);
const toastMessage = requireElement("toast-message", HTMLDivElement);
const levelPill = requireElement("level-pill", HTMLButtonElement);
const scorePill = requireElement("score-pill", HTMLDivElement);
const scoreRequired = requireElement("score-required", HTMLSpanElement);
const endlessTimer = requireElement("endless-timer", HTMLDivElement);
const endlessTimerBar = requireElement("endless-timer-bar", HTMLDivElement);
const endlessTimerText = requireElement("endless-timer-text", HTMLSpanElement);
const endlessTimerHint = requireElement("endless-timer-hint", HTMLSpanElement);
const coinPill = requireElement("coin-pill", HTMLDivElement);
const coinCount = requireElement("coin-count", HTMLSpanElement);
const shopCoins = requireElement("shop-coins", HTMLDivElement);
const tapHint = requireElement("tap-hint", HTMLDivElement);
const resultTitle = requireElement("result-title", HTMLHeadingElement);
const resultSubtitle = requireElement("result-subtitle", HTMLParagraphElement);
const resultScore = requireElement("result-score", HTMLElement);
const resultCoins = requireElement("result-coins", HTMLElement);
const resultContinue = requireElement("result-continue", HTMLButtonElement);

function cloneProfile(input: Profile): Profile {
  return {
    coins: input.coins,
    ownedKnives: [...input.ownedKnives],
    equippedKnife: input.equippedKnife,
    ownedThemes: [...input.ownedThemes],
    equippedTheme: input.equippedTheme,
    highestLevel: input.highestLevel,
    highestLevelCompleted: input.highestLevelCompleted,
    endlessBest: input.endlessBest,
    totalRuns: input.totalRuns,
    totalSlices: input.totalSlices,
    totalCoinsEarned: input.totalCoinsEarned,
    achievements: [...input.achievements],
  };
}

function sanitizeProfile(value: unknown): Profile {
  if (!value || typeof value !== "object") return cloneProfile(DEFAULT_PROFILE);
  const source = value as Partial<Profile>;
  const owned = Array.isArray(source.ownedKnives) ? source.ownedKnives.filter((item): item is string => typeof item === "string") : [];
  const ownedThemes = Array.isArray(source.ownedThemes) ? source.ownedThemes.filter((item): item is string => typeof item === "string") : [];
  const achievements = Array.isArray(source.achievements) ? source.achievements.filter((item): item is string => typeof item === "string") : [];
  let equipped = typeof source.equippedKnife === "string" && KNIVES.some((knife) => knife.id === source.equippedKnife) ? source.equippedKnife : STARTER_KNIFE_ID;
  if (equipped === "utensil" && !owned.includes(STARTER_KNIFE_ID)) equipped = STARTER_KNIFE_ID;
  const equippedThemeCandidate = typeof source.equippedTheme === "string" && THEMES.some((theme) => theme.id === source.equippedTheme)
    ? source.equippedTheme
    : STARTER_THEME_ID;
  const sanitizedOwnedThemes = Array.from(new Set([STARTER_THEME_ID, ...ownedThemes]));
  const equippedTheme = sanitizedOwnedThemes.includes(equippedThemeCandidate) ? equippedThemeCandidate : STARTER_THEME_ID;
  return {
    coins: safeInt(source.coins, 0, 999999999),
    ownedKnives: Array.from(new Set([STARTER_KNIFE_ID, ...owned])),
    equippedKnife: equipped,
    ownedThemes: sanitizedOwnedThemes,
    equippedTheme,
    highestLevel: safeInt(source.highestLevel, 1, LEVEL_COUNT),
    highestLevelCompleted: safeInt(source.highestLevelCompleted, 0, LEVEL_COUNT),
    endlessBest: safeInt(source.endlessBest, 0, 999999999),
    totalRuns: safeInt(source.totalRuns, 0, 999999999),
    totalSlices: safeInt(source.totalSlices, 0, 999999999),
    totalCoinsEarned: safeInt(source.totalCoinsEarned, 0, 999999999),
    achievements,
  };
}

function mergeProfile(a: Profile, b: Profile): Profile {
  const owned = Array.from(new Set([...a.ownedKnives, ...b.ownedKnives]));
  const ownedThemes = Array.from(new Set([...a.ownedThemes, ...b.ownedThemes]));
  const achievements = Array.from(new Set([...a.achievements, ...b.achievements]));
  const highestLevelCompleted = Math.max(a.highestLevelCompleted, b.highestLevelCompleted);
  return {
    coins: Math.max(a.coins, b.coins),
    ownedKnives: owned,
    equippedKnife: owned.includes(b.equippedKnife) ? b.equippedKnife : a.equippedKnife,
    ownedThemes,
    equippedTheme: ownedThemes.includes(b.equippedTheme) ? b.equippedTheme : a.equippedTheme,
    highestLevel: Math.max(a.highestLevel, b.highestLevel, highestLevelCompleted + 1),
    highestLevelCompleted,
    endlessBest: Math.max(a.endlessBest, b.endlessBest),
    totalRuns: Math.max(a.totalRuns, b.totalRuns),
    totalSlices: Math.max(a.totalSlices, b.totalSlices),
    totalCoinsEarned: Math.max(a.totalCoinsEarned, b.totalCoinsEarned),
    achievements,
  };
}

function safeInt(value: unknown, min: number, max: number): number {
  const num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.max(min, Math.min(max, Math.floor(num)));
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(Math.floor(value));
}

function currentTheme(): WorldTheme {
  return THEMES.find((theme) => theme.id === profile.equippedTheme) ?? THEMES[0]!;
}

function showToast(message: string): void {
  toastMessage.textContent = message;
  toastMessage.classList.add("visible");
  window.setTimeout(() => toastMessage.classList.remove("visible"), 1800);
}

function pulseHaptic(duration: number): void {
  navigator.vibrate?.(duration);
}

function flashFeedback(kind: "success" | "danger" | "slice"): void {
  feedbackFlash.classList.remove("success", "danger", "slice");
  void feedbackFlash.offsetWidth;
  feedbackFlash.classList.add(kind);
  window.setTimeout(() => feedbackFlash.classList.remove(kind), 560);
}

class Platform {
  private sdk: PlaydropSdk | null = null;
  private loggedIn = false;
  private audioEnabled = true;

  async init(): Promise<void> {
    const playdrop = getPlaydropSdk();
    playdrop?.host?.setLoadingState?.({ status: "loading", message: "Sharpening the knife", progress: 0.35 });
    const hasHostedChannel = new URLSearchParams(window.location.search).has("playdrop_channel");
    if (playdrop?.init && hasHostedChannel) {
      const sdk = await playdrop.init();
      this.sdk = sdk;
    } else {
      this.sdk = playdrop;
    }

    this.audioEnabled = this.sdk?.host?.audioEnabled ?? true;
    this.sdk?.host?.onAudioPolicyChange?.((policy) => {
      this.audioEnabled = policy.enabled;
      audio.syncEnabled(policy.enabled);
    });
    this.loggedIn = Boolean(this.sdk?.me?.isLoggedIn);
    const sdk = this.sdk;
    if (sdk?.host?.ready) {
      sdk.host.ready();
    } else {
      markHostReady(sdk);
    }
  }

  get available(): boolean {
    return Boolean(this.sdk);
  }

  get canPlayAudio(): boolean {
    return this.audioEnabled;
  }

  async loadRemoteProfile(): Promise<Profile | null> {
    if (!this.loggedIn) return null;
    const storedProfile = await this.sdk?.me?.appData?.get?.<Profile>(REMOTE_PROFILE_KEY);
    if (storedProfile) return storedProfile;
    const appDataProfile = this.sdk?.me?.appData?.data?.[REMOTE_PROFILE_KEY];
    if (appDataProfile) return appDataProfile as Profile;
    return null;
  }

  async saveRemoteProfile(profile: Profile): Promise<void> {
    if (!this.loggedIn) return;
    if (this.sdk?.me?.appData?.set) {
      await this.sdk.me.appData.set(REMOTE_PROFILE_KEY, profile);
      return;
    }
    if (this.sdk?.me?.updateAppData) {
      await this.sdk.me.updateAppData({
        ...(this.sdk.me.appData?.data ?? {}),
        [REMOTE_PROFILE_KEY]: profile,
      });
      return;
    }
  }

  async login(): Promise<void> {
    if (this.sdk?.me?.promptLogin) {
      await this.sdk.me.promptLogin();
    } else if (this.sdk?.me?.login) {
      await this.sdk.me.login();
    } else {
      throw new Error("[chopline-rush] Login API unavailable");
    }
    this.loggedIn = true;
  }

  canUseRewardedAds(): boolean {
    const rewarded = this.sdk?.ads?.rewarded;
    return Boolean(rewarded?.load && rewarded.show);
  }

  async showRewarded(): Promise<boolean> {
    const rewarded = this.sdk?.ads?.rewarded;
    if (!rewarded?.load || !rewarded.show) throw new Error("[chopline-rush] Rewarded ad API unavailable");
    const loaded = await rewarded.load();
    if (loaded.status !== "ready") return false;
    const result = await rewarded.show();
    return result.status === "completed";
  }

  async showInterstitial(): Promise<void> {
    const interstitial = this.sdk?.ads?.interstitial;
    if (!interstitial?.load || !interstitial.show) return;
    const loaded = await interstitial.load();
    if (loaded.status === "ready") await interstitial.show();
  }

  async purchaseCoins(product: CoinProduct): Promise<void> {
    const shop = this.sdk?.shop;
    if (!shop?.purchase) throw new Error("[chopline-rush] Shop purchase API unavailable");
    const products = await shop.listProducts?.();
    let receipt: ShopReceipt;
    if (products) {
      const listedProduct = products.find((item) => item.key === product.sku);
      if (!listedProduct) throw new Error(`[chopline-rush] Coin product not listed: ${product.sku}`);
      receipt = await shop.purchase(listedProduct.key);
    } else {
      receipt = await shop.purchase({
        kind: "consumable",
        sku: product.sku,
        displayName: product.displayName,
        priceCredits: product.priceCredits,
      });
    }
    if (receipt.status === "CANCELLED") throw new Error("[chopline-rush] Purchase was cancelled");
    const granted = shop.grant && receipt.status !== "GRANTED" ? await shop.grant(receipt.id) : receipt;
    if (granted.status && granted.status !== "GRANTED" && granted.status !== "CONSUMED") {
      throw new Error(`[chopline-rush] Purchase receipt not grantable: ${granted.status}`);
    }
    await shop.consume?.(receipt.id);
  }

  async unlockAchievements(keys: string[]): Promise<void> {
    const unique = Array.from(new Set(keys.filter((key) => !profile.achievements.includes(key))));
    if (unique.length === 0) return;
    profile.achievements.push(...unique);
    saveProfile();
    await Promise.all(unique.map(async (key) => this.sdk?.achievements?.unlock?.(key)));
  }

  async setAchievementProgress(key: string, progress: number): Promise<void> {
    await this.sdk?.achievements?.setProgressAtLeast?.(key, progress);
  }

  async submitLeaderboard(key: string, score: number): Promise<void> {
    if (score > 0) await this.sdk?.leaderboards?.submitScore?.(key, Math.floor(score));
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index] ?? 0);
  }
  return window.btoa(binary);
}

class GameAudio {
  private context: AudioContext | null = null;
  private buffers = new Map<keyof typeof AUDIO, AudioBuffer>();
  private master: GainNode | null = null;
  private music: AudioBufferSourceNode | null = null;
  private enabled = true;
  private captureDestination: MediaStreamAudioDestinationNode | null = null;
  private captureRecorder: MediaRecorder | null = null;
  private captureChunks: Blob[] = [];
  private captureMimeType = "audio/webm";

  syncEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) this.stopMusic();
  }

  async init(): Promise<void> {
    const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) throw new Error("[chopline-rush] Web Audio unavailable");
    this.context = new AudioCtor();
    this.master = this.context.createGain();
    this.master.gain.value = 1;
    this.master.connect(this.context.destination);
    await Promise.all((Object.keys(AUDIO) as Array<keyof typeof AUDIO>).map(async (key) => {
      const response = await fetch(AUDIO[key]);
      if (!response.ok) throw new Error(`[chopline-rush] Audio asset failed: ${AUDIO[key]}`);
      const buffer = await response.arrayBuffer();
      this.buffers.set(key, await this.context!.decodeAudioData(buffer));
    }));
  }

  async startMusic(): Promise<void> {
    if (((!this.enabled || !platform.canPlayAudio) && !previewMode) || this.music) return;
    if (!this.context) await this.init();
    if (!this.context) return;
    if (this.context.state === "suspended") await this.context.resume();
    const buffer = this.buffers.get("music");
    if (!buffer || !this.master) return;
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    gain.gain.value = previewMode ? 0.62 : 0.36;
    source.buffer = buffer;
    source.loop = true;
    source.connect(gain).connect(this.master);
    source.start();
    this.music = source;
  }

  stopMusic(): void {
    this.music?.stop();
    this.music = null;
  }

  play(key: Exclude<keyof typeof AUDIO, "music">, volume = 0.7): void {
    if (((!this.enabled || !platform.canPlayAudio) && !previewMode) || !this.context || !this.master) return;
    const buffer = this.buffers.get(key);
    if (!buffer) return;
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    gain.gain.value = volume;
    source.buffer = buffer;
    source.connect(gain).connect(this.master);
    source.start();
  }

  async startCapture(): Promise<void> {
    if (!this.context) await this.init();
    if (!this.context || !this.master) throw new Error("[chopline-rush] Audio capture unavailable");
    if (this.context.state === "suspended") await this.context.resume();
    if (this.captureRecorder && this.captureRecorder.state !== "inactive") return;

    this.captureDestination = this.context.createMediaStreamDestination();
    this.master.connect(this.captureDestination);
    this.captureChunks = [];
    this.captureMimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : "audio/webm";
    this.captureRecorder = new MediaRecorder(this.captureDestination.stream, { mimeType: this.captureMimeType });
    this.captureRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.captureChunks.push(event.data);
    };
    this.captureRecorder.start();
  }

  async stopCapture(): Promise<{ mimeType: string; base64: string }> {
    const recorder = this.captureRecorder;
    if (!recorder || recorder.state === "inactive") {
      throw new Error("[chopline-rush] Audio capture was not started");
    }
    const mimeType = this.captureMimeType;
    const chunks = this.captureChunks;
    const destination = this.captureDestination;
    return await new Promise((resolve, reject) => {
      recorder.onerror = () => reject(new Error("[chopline-rush] Audio capture failed"));
      recorder.onstop = () => {
        void (async () => {
          try {
            if (destination && this.master) this.master.disconnect(destination);
            this.captureRecorder = null;
            this.captureDestination = null;
            this.captureChunks = [];
            const blob = new Blob(chunks, { type: mimeType });
            const base64 = arrayBufferToBase64(await blob.arrayBuffer());
            resolve({ mimeType, base64 });
          } catch (error) {
            reject(error);
          }
        })();
      };
      recorder.requestData();
      recorder.stop();
    });
  }
}

const platform = new Platform();
const audio = new GameAudio();
let profile = loadLocalProfile();
let screen: Screen = "boot";
let previousScreen: Screen = "menu";
let selectedLevel = Math.max(1, Math.min(profile.highestLevel, LEVEL_COUNT));
let selectedMode: Mode = "endless";
let currentRun: RunState | null = null;
let isolatedVisualRandomSeed = 0x9e3779b9;
let endlessTemplates: EndlessTemplate[] = [];
let endlessCursorZ = 0;
let endlessPlanCursorZ = 0;
let endlessSpawnPlans: EndlessSpawnPlan[] = [];
let endlessPlanCount = 0;
let endlessLastTemplateIndex = -1;
let endlessPlatformCounter = 0;
let endlessSliceableCounter = 0;
let endlessObstacleCounter = 0;
let previewMode = false;
let autoFlipTimer = 0;
let previewAudioPolicy: PreviewAudioPolicy = "music-and-sfx";

function setPreviewMode(active: boolean): void {
  previewMode = active;
  root.classList.toggle("preview-capture", active);
}

function choosePreviewLevel(payload?: PreviewPayload): number {
  const sceneId = payload?.sceneId ?? "";
  const levelMatch = sceneId.match(/level-(\d+)/);
  if (levelMatch) return Math.max(1, Math.min(LEVEL_COUNT, Number(levelMatch[1])));
  if (sceneId.includes("hazard") || payload?.surface === "mobile-portrait") return 8;
  return 12;
}

const scene = new THREE.Scene();
const REFERENCE_PORTRAIT_ASPECT = 720 / 1280;
const camera = new THREE.PerspectiveCamera(56, REFERENCE_PORTRAIT_ASPECT, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.localClippingEnabled = true;
stage.append(renderer.domElement);

const ambientLight = new THREE.HemisphereLight(0xdffaff, 0x6ea34b, 1.45);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xfff7e7, 1.8);
dirLight.position.set(-8, 12, -4);
dirLight.castShadow = true;
const mobileShadow = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const shadowResolution = mobileShadow ? 512 : 1024;
dirLight.shadow.mapSize.set(shadowResolution, shadowResolution);
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 100;
dirLight.shadow.camera.left = -40;
dirLight.shadow.camera.right = 40;
dirLight.shadow.camera.top = 40;
dirLight.shadow.camera.bottom = -40;
scene.add(dirLight);
scene.add(dirLight.target);

const rimLight = new THREE.DirectionalLight(0xc9f4ff, 1.1);
rimLight.position.set(6, 8, -4);
scene.add(rimLight);
scene.add(rimLight.target);

const world = new THREE.Group();
scene.add(world);
const background = new THREE.Group();
scene.add(background);
const bgChunks = new Map<number, THREE.Object3D[]>();
const platformGroup = new THREE.Group();
const sliceGroup = new THREE.Group();
const obstacleGroup = new THREE.Group();
const particleGroup = new THREE.Group();
world.add(platformGroup, sliceGroup, obstacleGroup, particleGroup);

const platformEntities: PlatformEntity[] = [];
const sliceEntities: SliceEntity[] = [];
const obstacleEntities: ObstacleEntity[] = [];
const particles: Particle[] = [];
const slicePieces: SlicePiece[] = [];
const fragmentPhysics = new FragmentPhysics();
const tempBox = new THREE.Box3();
const tempVector = new THREE.Vector3();
const cameraShakeVector = new THREE.Vector3();
const tumbleStartQuat = new THREE.Quaternion();
const tumbleTargetQuat = new THREE.Quaternion();
let tumbleTimer = 0;
let tumbleStartY = 0;
let tumbleTargetY = 0;
let tumbleFallDistance = 0;
let tumbleVelocityY = 0;
let tumbleWobbleVelocity = 0;
let tumbleTargetEulerX = 0;
let tumbleLanded = false;
let tumblePlatformRef: PlatformEntity | null = null;
let tumblePlatformPreviousZ = 0;

const materials = {
  platformTop: new THREE.MeshPhongMaterial({ color: 0xc3f5c3, emissive: 0x7eff7e, emissiveIntensity: 0.32, shininess: 16 }),
  platformSide: new THREE.MeshPhongMaterial({ color: 0x98d898, emissive: 0x69ee69, emissiveIntensity: 0.24, shininess: 14 }),
  platformDark: new THREE.MeshLambertMaterial({ color: 0x98d898, emissive: 0x69ee69, emissiveIntensity: 0.24 }),
  hazard: new THREE.MeshPhongMaterial({ color: 0xd946ef, shininess: 50 }),
  hazardDark: new THREE.MeshPhongMaterial({ color: 0xc026d3, shininess: 35 }),
  wood: new THREE.MeshPhongMaterial({ color: 0x8b4513, shininess: 18 }),
  woodTop: new THREE.MeshPhongMaterial({ color: 0xdeb887, shininess: 22 }),
  watermelon: new THREE.MeshPhongMaterial({ color: 0x228b22, shininess: 28 }),
  watermelonStripe: new THREE.MeshPhongMaterial({ color: 0x90ee90, shininess: 18 }),
  watermelonInside: new THREE.MeshPhongMaterial({ color: 0xff6b6b, shininess: 18 }),
  apple: new THREE.MeshPhongMaterial({ color: 0xff4757, shininess: 40 }),
  donut: new THREE.MeshPhongMaterial({ color: 0xd2961e, shininess: 30 }),
  donutIcing: new THREE.MeshPhongMaterial({ color: 0xff69b4, shininess: 35 }),
  donutCut: new THREE.MeshPhongMaterial({ color: 0xf5deb3, shininess: 24, side: THREE.DoubleSide }),
  bookGreen: new THREE.MeshPhongMaterial({ color: 0x4caf50, shininess: 22 }),
  bookPink: new THREE.MeshPhongMaterial({ color: 0xe91e63, shininess: 22 }),
  bookYellow: new THREE.MeshPhongMaterial({ color: 0xffeb3b, shininess: 22 }),
  bookOrange: new THREE.MeshPhongMaterial({ color: 0xff9800, shininess: 22 }),
  bookBlue: new THREE.MeshPhongMaterial({ color: 0x2196f3, shininess: 22 }),
  cheese: new THREE.MeshPhongMaterial({ color: 0xfff3b0, shininess: 18 }),
  cheeseHole: new THREE.MeshPhongMaterial({ color: 0xe8d080, side: THREE.BackSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }),
  sausage: new THREE.MeshPhongMaterial({ color: 0xcc2222, shininess: 20 }),
  sausageTip: new THREE.MeshPhongMaterial({ color: 0x8b2020, shininess: 18 }),
  sausageRope: new THREE.MeshPhongMaterial({ color: 0xf5deb3, shininess: 18 }),
  baguette: new THREE.MeshPhongMaterial({ color: 0xd4a040, shininess: 20 }),
  baguetteBottom: new THREE.MeshPhongMaterial({ color: 0xc8903a, shininess: 20, side: THREE.DoubleSide }),
  cube: new THREE.MeshPhongMaterial({ color: 0xffeb3b, shininess: 25 }),
  sphere: new THREE.MeshPhongMaterial({ color: 0xff69b4, shininess: 35 }),
  orange: new THREE.MeshPhongMaterial({ color: 0xff8617, shininess: 34 }),
  emoji: new THREE.MeshPhongMaterial({ color: 0xffd43b, shininess: 34 }),
  cameraBody: new THREE.MeshPhongMaterial({ color: 0x53565f, shininess: 28 }),
  cameraDark: new THREE.MeshPhongMaterial({ color: 0x24262c, shininess: 18 }),
  white: new THREE.MeshLambertMaterial({ color: 0xffffff }),
  mountainOrange: new THREE.MeshLambertMaterial({ color: 0xff6347 }),
  treeTrunk: new THREE.MeshLambertMaterial({ color: 0xf5f4ff }),
  shadow: new THREE.MeshBasicMaterial({ color: 0x7b255d, transparent: true, opacity: 0.24 }),
};

const sharedMaterialSet = new Set<THREE.Material>(Object.values(materials));
const backgroundLambertMaterials = new Map<string, THREE.MeshLambertMaterial>();

function sharedLambertMaterial(color: number, options: { emissive?: number; emissiveIntensity?: number } = {}): THREE.MeshLambertMaterial {
  const key = `${color}:${options.emissive ?? 0}:${options.emissiveIntensity ?? 0}`;
  const cached = backgroundLambertMaterials.get(key);
  if (cached) return cached;
  const material = new THREE.MeshLambertMaterial({
    color,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 1,
  });
  backgroundLambertMaterials.set(key, material);
  sharedMaterialSet.add(material);
  return material;
}

function disposeMaterial(material: THREE.Material): void {
  if (!sharedMaterialSet.has(material)) material.dispose();
}

function disposeObject(object: THREE.Object3D): void {
  for (let i = object.children.length - 1; i >= 0; i -= 1) {
    const child = object.children[i];
    if (child) disposeObject(child);
  }
  if (object instanceof THREE.Mesh) {
    object.geometry.dispose();
    if (Array.isArray(object.material)) {
      object.material.forEach(disposeMaterial);
    } else {
      disposeMaterial(object.material);
    }
  }
}

function removeAndDispose(parent: THREE.Object3D, object: THREE.Object3D): void {
  parent.remove(object);
  disposeObject(object);
}

const knifeGroup = new THREE.Group();
const knife = {
  position: new THREE.Vector3(0, 6.1, -1.2),
  previousPosition: new THREE.Vector3(0, 6.1, -1.2),
  previousRotation: (Math.PI * 2) / 3,
  velocity: new THREE.Vector3(),
  rotation: -0.45,
  angularVelocity: 0,
  state: "stuck" as KnifeState,
  stuckFace: "top" as StuckFace,
  stuckPlatform: null as PlatformEntity | null,
  stuckSideDir: 1 as CollisionDir,
  rotationTarget: (Math.PI * 2) / 3,
  slicing: false,
  slicingStackConfigIndex: null as number | null,
  slicingStackMinIndex: 0,
  flipSourcePlatform: null as PlatformEntity | null,
  flipSourceFaceY: null as number | null,
  flipSourceFaceType: null as StuckFace | null,
  lastFlipAt: Number.NEGATIVE_INFINITY,
  lastBounceEntity: null as SliceEntity | null,
  rotatingStickPlatform: null as PlatformEntity | null,
  rotatingStickAccumAngle: 0,
  lastPlatformId: "",
  landingPunch: 0,
};
scene.add(knifeGroup);

interface SliceProofEvent {
  type: string;
  y: number;
  z: number;
  beforeRandom: number | null;
  afterRandom: number | null;
  beforePieces: number;
  afterPieces: number;
  score: number;
}

interface EndlessPlanProofEvent {
  templateIndex: number;
  budget: number;
  beforeRandom: number | null;
  afterRandom: number | null;
  targetCursorZ: number;
}

interface StickProofEvent {
  faceAxis: CollisionAxis;
  faceDir: CollisionDir;
  faceCoord: number;
  platformId: string;
  beforeY: number;
  beforeZ: number;
  beforeRotation: number;
  afterY: number;
  afterZ: number;
  afterRotation: number;
  slicing: boolean;
}

const sliceProofEvents: SliceProofEvent[] = [];
const endlessPlanProofEvents: EndlessPlanProofEvent[] = [];
const stickProofEvents: StickProofEvent[] = [];

const knifeModelLoader = new GLTFLoader();
const knifeModelCache = new Map<string, Promise<THREE.Object3D>>();
const knifeModelLength = 2.05;
const knifeModelCrossSection = 0.58;

const KNIFE_TIP_EMBED = 0.08;
const BASE_FLIP_Y = 10;
const BASE_FLIP_Z = 8;
const AIR_TAP_LIFT = 4;
const TAP_ROTATION_ANGLE = Math.PI * 2;
const GRAVITY = -20;
const ROTATION_SPEED = 7;
const FLIP_COOLDOWN = 0.28;
const MIN_CUT_SPEED = 2.4;
const MIN_CUT_TIP_FORWARD_SPEED = -0.75;
const MIN_CUT_BLADE_PROGRESS = 0.18;
const MIN_STICK_ALIGNMENT = 0.28;
const BRICK_CUT_COURSES = 7;
const MAX_SUB_STEP = 1 / 120;
const KNIFE_CEILING_DEFAULT = 30;
const KNIFE_LYING_OFFSET = 0.21;
const BLADE_EDGE_OFFSET = 0;
const BLADE_EMBED_DEPTH = 0.15;
const SIDE_EMBED_DEPTH = 0.4;
const SLICE_HALFZ_BONUS = 0.3;
const GROUND_Y = 0;
const SLICEABLE_VISUAL_SCALE = 2;
const BOOK_HEIGHT = 0.25;
const BOOK_STACK_GAP = 0.25;
const STAKE_STACK_HEIGHT = 1.5;
const WATERMELON_STACK_HEIGHT = 1;
const APPLE_STACK_HEIGHT = 0.95;
const DONUT_STACK_HEIGHT = 1;
const CHEESE_STACK_HEIGHT = 0.6;
const CUBE_STACK_HEIGHT = 0.75;
const SPHERE_STACK_HEIGHT = 1.5;
const BAGUETTE_STACK_HEIGHT = 0.35;
const SAUSAGE_STACK_HEIGHT = 0.4;
const CAM_OFFSET = new THREE.Vector3(-9.5, 2.8, -2.4);
const CAM_LOOK_AHEAD = 2.2;
const KNIFE_VISUAL_X = -1.25;
const KNIFE_VISUAL_YAW = 0;
let activeKnifeGeometry: KnifeGeometry = {
  bladeReach: 1.7,
  handleReach: 0.78,
  bladeHalfWidth: 0.25,
  handleHalfWidth: 0.12,
  tipLocal: new THREE.Vector3(0, 1.7, 0),
  hiltLocal: new THREE.Vector3(),
  handleEndLocal: new THREE.Vector3(0, -0.78, 0),
  readyAngle: THREE.MathUtils.degToRad(-140),
  yawOffset: 0,
};
const TRAJECTORY_POINT_LIMIT = 42;
const TRAJECTORY_WIDTH = 0.11;
const SLICE_HALF_LAUNCH_MIN_X = 4;
const SLICE_HALF_LAUNCH_SPAN_X = 2.5;
const SLICE_HALF_FALL_X_SPEED = 2;
const trajectoryGeometry = new THREE.BufferGeometry();
const trajectoryPositionAttribute = new THREE.BufferAttribute(new Float32Array(TRAJECTORY_POINT_LIMIT * 2 * 3), 3);
const trajectoryColorAttribute = new THREE.BufferAttribute(new Float32Array(TRAJECTORY_POINT_LIMIT * 2 * 3), 3);
const trajectoryIndices: number[] = [];
for (let i = 0; i < TRAJECTORY_POINT_LIMIT - 1; i += 1) {
  const base = i * 2;
  trajectoryIndices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
}
trajectoryGeometry.setAttribute("position", trajectoryPositionAttribute);
trajectoryGeometry.setAttribute("color", trajectoryColorAttribute);
trajectoryGeometry.setIndex(trajectoryIndices);
trajectoryGeometry.setDrawRange(0, 0);
const trajectoryLine = new THREE.Mesh(
  trajectoryGeometry,
  new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
);
trajectoryLine.visible = false;
trajectoryLine.frustumCulled = false;
scene.add(trajectoryLine);
let trajectoryPoints: THREE.Vector3[] = [];

let cameraTarget = new THREE.Vector3(0, 7.5, 4);
let lastTime = 0;
let cameraShakeTime = 0;
let cameraShakeDuration = 0;
let cameraShakeStrength = 0;
let hitStopTime = 0;
let proofFrozen = false;

function startCameraShake(strength: number, duration: number): void {
  cameraShakeTime = Math.max(cameraShakeTime, duration);
  cameraShakeDuration = duration;
  cameraShakeStrength = Math.max(cameraShakeStrength, strength);
}

function loadLocalProfile(): Profile {
  try {
    return sanitizeProfile(JSON.parse(localStorage.getItem(PROFILE_KEY) || "null"));
  } catch (error) {
    throw new Error(`[chopline-rush] Failed to load profile: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function saveProfile(): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  updateHud();
  void platform.saveRemoteProfile(profile).catch(() => undefined);
}

async function init(): Promise<void> {
  await fragmentPhysics.init();
  await platform.init();
  try {
    const remote = await platform.loadRemoteProfile();
    if (remote) {
      profile = mergeProfile(profile, sanitizeProfile(remote));
      saveProfile();
    }
  } catch {
    // Local profile remains authoritative when remote sync is unavailable.
  }
  await buildKnife();
  buildBackground();
  resize();
  newRun("endless", 0, true);
  setupPreviewHooks();
  setupTestHooks();
  requestAnimationFrame(frame);
}

function showScreen(next: Screen): void {
  screen = next;
  for (const node of [menuScreen, levelsScreen, shopScreen, pauseScreen, reviveScreen, resultScreen]) {
    node.classList.remove("visible");
  }
  hud.classList.toggle("hidden", next === "menu" || next === "levels" || next === "shop" || next === "boot");
  if (next === "menu") menuScreen.classList.add("visible");
  if (next === "levels") levelsScreen.classList.add("visible");
  if (next === "shop") shopScreen.classList.add("visible");
  if (next === "paused") pauseScreen.classList.add("visible");
  if (next === "revive") reviveScreen.classList.add("visible");
  if (next === "result") resultScreen.classList.add("visible");
  updateHud();
}

function renderLevelGrid(): void {
  levelGrid.innerHTML = "";
  for (let index = 0; index < LEVEL_COUNT; index += 1) {
    const button = document.createElement("button");
    button.className = `level-card ${index + 1 <= profile.highestLevel ? "unlocked" : "locked"}`;
    button.textContent = index + 1 <= profile.highestLevel ? String(index + 1) : "LOCK";
    button.disabled = index + 1 > profile.highestLevel;
    button.addEventListener("click", () => {
      selectedLevel = index + 1;
      void startRun("level");
    });
    levelGrid.append(button);
  }
}

function renderShop(): void {
  shopCoins.innerHTML = `<span class="coin-icon" style="display:inline-block; vertical-align:-4px;"></span> ${formatNumber(profile.coins)}`;
  knifeList.innerHTML = "";
  for (const knifeSkin of KNIVES) {
    const owned = profile.ownedKnives.includes(knifeSkin.id);
    const equipped = profile.equippedKnife === knifeSkin.id;
    const item = document.createElement("div");
    item.className = "shop-item";
    const buttonLabel = equipped ? "Equipped" : owned ? "Equip" : `${formatNumber(knifeSkin.price)}`;
    item.innerHTML = `
      <img src="${knifeSkin.image}" alt="${knifeSkin.displayName}">
      <div><strong>${knifeSkin.displayName}</strong><span>${owned ? "Ready to use" : "Knife upgrade"}</span></div>
      <button class="small-button ${equipped ? "active" : ""}">${buttonLabel}</button>
    `;
    item.querySelector("button")?.addEventListener("click", () => {
      void buyOrEquipKnife(knifeSkin).catch((error) => {
        console.error(error);
        showToast(error instanceof Error ? error.message : "Knife asset failed");
      });
    });
    knifeList.append(item);
  }
  coinList.innerHTML = "";
  for (const theme of THEMES) {
    const owned = profile.ownedThemes.includes(theme.id);
    const equipped = profile.equippedTheme === theme.id;
    const item = document.createElement("div");
    item.className = "shop-item";
    const swatch = `linear-gradient(135deg, #${theme.sky.toString(16).padStart(6, "0")} 0 48%, #${theme.ground.toString(16).padStart(6, "0")} 48% 100%)`;
    const buttonLabel = equipped ? "Active" : owned ? "Use" : formatNumber(theme.price);
    item.innerHTML = `
      <div style="width:54px;height:42px;margin-left:5px;border:3px solid white;border-radius:5px;background:${swatch};box-shadow:0 3px 0 rgba(23,61,120,.14);"></div>
      <div><strong>${theme.displayName}</strong><span>${owned ? "World theme" : "Unlock theme"}</span></div>
      <button class="small-button ${equipped ? "active" : ""}">${buttonLabel}</button>
    `;
    item.querySelector("button")?.addEventListener("click", () => buyOrEquipTheme(theme));
    coinList.append(item);
  }
}

function updateHud(): void {
  const run = currentRun;
  levelPill.textContent = "Endless";
  levelPill.style.display = "none";
  coinPill.classList.add("endless-pos");
  const score = run?.score ?? 0;
  const target = run?.targetScore ?? (LEVELS[selectedLevel - 1]?.requiredScore ?? 10);
  const scoreStrong = scorePill.querySelector("strong");
  if (scoreStrong) scoreStrong.textContent = formatNumber(score);
  scoreRequired.style.display = "block";
  scoreRequired.classList.remove("goal-ready");
  scoreRequired.textContent = `BEST ${formatNumber(Math.max(profile.endlessBest, score))}`;
  endlessTimer.style.display = "none";
  coinCount.textContent = formatNumber(profile.coins);
  tapHint.classList.toggle("hidden", !(screen === "playing" && knife.state === "stuck" && !previewMode && !run?.tapHintConsumed));
}

function loadKnifeSourceModel(skin: KnifeSkin): Promise<THREE.Object3D> {
  const cached = knifeModelCache.get(skin.model);
  if (cached) return cached;
  const request = knifeModelLoader.loadAsync(skin.model).then((gltf) => {
    if (gltf.scene.children.length === 0) {
      throw new Error(`[chopline-rush] Knife model is empty: ${skin.model}`);
    }
    return gltf.scene;
  });
  knifeModelCache.set(skin.model, request);
  return request;
}

function polishKnifeMaterial(source: THREE.Material, skin: KnifeSkin): THREE.Material {
  const material = source.clone();
  material.side = THREE.DoubleSide;
  const readable = material as THREE.Material & {
    color?: THREE.Color;
    emissive?: THREE.Color;
    emissiveIntensity?: number;
    roughness?: number;
    metalness?: number;
  };
  void skin;
  if (readable.color) readable.color.setHex(0xffffff);
  if (readable.emissive) readable.emissive.setHex(0x000000);
  readable.emissiveIntensity = 0;
  material.needsUpdate = true;
  return material;
}

function polishKnifeAsset(asset: THREE.Object3D, skin: KnifeSkin): void {
  asset.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    node.material = Array.isArray(node.material)
      ? node.material.map((material) => polishKnifeMaterial(material, skin))
      : polishKnifeMaterial(node.material, skin);
  });
}

function cloneKnifeAsset(source: THREE.Object3D, skin: KnifeSkin): { model: THREE.Group; geometry: KnifeGeometry } {
  const asset = source.clone(true);
  polishKnifeAsset(asset, skin);
  asset.traverse((node) => {
    if (node instanceof THREE.Mesh) {
      node.castShadow = true;
      node.receiveShadow = true;
    }
  });
  const geometry = normalizeKnifeModel(asset, skin.modelDefinition);

  const wrapper = new THREE.Group();
  wrapper.add(asset);
  return { model: wrapper, geometry };
}

async function buildKnife(): Promise<void> {
  const skin = KNIVES.find((item) => item.id === profile.equippedKnife) ?? KNIVES[0]!;
  const source = await loadKnifeSourceModel(skin);
  const { model, geometry } = cloneKnifeAsset(source, skin);
  activeKnifeGeometry = geometry;
  knifeGroup.clear();
  knifeGroup.add(model);
  knifeGroup.scale.setScalar(1);
  syncKnifeTransform();
}

function clearWorld(): void {
  fragmentPhysics.reset();
  hitStopTime = 0;
  for (const group of [platformGroup, sliceGroup, obstacleGroup, particleGroup]) {
    while (group.children.length) {
      const child = group.children[0];
      if (child) removeAndDispose(group, child);
    }
  }
  platformEntities.length = 0;
  sliceEntities.length = 0;
  obstacleEntities.length = 0;
  particles.length = 0;
  slicePieces.length = 0;
  sliceProofEvents.length = 0;
  endlessPlanProofEvents.length = 0;
  stickProofEvents.length = 0;
}

function newRun(mode: Mode, levelIndex = selectedLevel - 1, makeActive = true): void {
  const level = LEVELS[Math.max(0, Math.min(LEVEL_COUNT - 1, levelIndex))] ?? LEVELS[0]!;
  selectedMode = mode;
  currentRun = {
    mode,
    levelIndex: Math.max(0, Math.min(LEVEL_COUNT - 1, levelIndex)),
    score: 0,
    combo: 0,
    bestCombo: 0,
    targetScore: mode === "endless" ? 0 : level.requiredScore ?? 10,
    endlessScoreTimer: ENDLESS_SCORE_TIMEOUT,
    endlessTimerActive: false,
    tapHintConsumed: false,
    reward: mode === "endless" ? 30 : level.reward ?? 5,
    startedAt: performance.now(),
    outcome: null,
    reviveUsed: false,
    coinsAwarded: 0,
    doubled: false,
    interstitialShown: false,
    goalAnnounced: false,
  };
  clearWorld();
  if (mode === "endless") {
    buildEndlessWorld();
  } else {
    buildLevelWorld(level);
  }
  resetKnife();
  updateHud();
  if (makeActive) {
    previousScreen = "playing";
    showScreen("playing");
    void audio.startMusic();
  }
}

function resetGameOverTumble(): void {
  tumbleTimer = 0;
  tumbleStartY = 0;
  tumbleTargetY = 0;
  tumbleFallDistance = 0;
  tumbleVelocityY = 0;
  tumbleWobbleVelocity = 0;
  tumbleTargetEulerX = 0;
  tumbleLanded = false;
  tumblePlatformRef = null;
  tumblePlatformPreviousZ = 0;
  tumbleStartQuat.identity();
  tumbleTargetQuat.identity();
}

function plantedPivotOnTop(platform: PlatformEntity, rotation = activeKnifeGeometry.readyAngle): THREE.Vector3 {
  const platformTop = getPlatformTop(platform);
  const tipY = platformTop - KNIFE_TIP_EMBED;
  const tipZ = platform.mesh.position.z;
  return new THREE.Vector3(
    KNIFE_VISUAL_X,
    tipY - Math.cos(rotation) * activeKnifeGeometry.bladeReach,
    tipZ - Math.sin(rotation) * activeKnifeGeometry.bladeReach,
  );
}

function resetKnife(): void {
  resetGameOverTumble();
  const start = platformEntities[0];
  const readyAngle = activeKnifeGeometry.readyAngle;
  knife.position.copy(start ? plantedPivotOnTop(start, readyAngle) : new THREE.Vector3(KNIFE_VISUAL_X, 2.2, -1.2));
  knife.previousPosition.copy(knife.position);
  knife.previousRotation = readyAngle;
  knife.velocity.set(0, 0, 0);
  knife.rotation = readyAngle;
  knife.angularVelocity = 0;
  knife.state = "stuck";
  knife.stuckFace = "top";
  knife.stuckPlatform = start ?? null;
  knife.stuckSideDir = 1;
  knife.rotationTarget = readyAngle;
  knife.slicing = false;
  knife.flipSourcePlatform = null;
  knife.flipSourceFaceY = null;
  knife.flipSourceFaceType = null;
  knife.lastBounceEntity = null;
  knife.lastFlipAt = Number.NEGATIVE_INFINITY;
  knife.rotatingStickPlatform = null;
  knife.rotatingStickAccumAngle = 0;
  knife.lastPlatformId = start?.id ?? "";
  knife.landingPunch = 0;
  resetTrajectoryTrail();
  syncKnifeTransform();
  camera.position.copy(knife.position).add(CAM_OFFSET);
  cameraTarget.set(knife.position.x, knife.position.y, knife.position.z + CAM_LOOK_AHEAD);
  camera.lookAt(cameraTarget);
}

function snapCameraToKnife(): void {
  camera.position.copy(knife.position).add(CAM_OFFSET);
  cameraTarget.set(
    camera.position.x - CAM_OFFSET.x,
    camera.position.y - CAM_OFFSET.y,
    camera.position.z - CAM_OFFSET.z + CAM_LOOK_AHEAD,
  );
  camera.lookAt(cameraTarget);
  dirLight.position.set(knife.position.x - 8, knife.position.y + 12, knife.position.z - 4);
  dirLight.target.position.copy(knife.position);
  rimLight.position.set(knife.position.x + 6, knife.position.y + 8, knife.position.z - 4);
  rimLight.target.position.copy(knife.position);
  updateBackgroundChunks(knife.position.z);
}

function buildLevelWorld(level: RefLevel): void {
  const platformById = new Map<string, PlatformEntity>();
  level.platforms.forEach((def, index) => {
    const platformEntity = createPlatform(def, index);
    platformEntities.push(platformEntity);
    platformById.set(platformEntity.id, platformEntity);
  });
  (level.roofs ?? []).forEach((def, index) => {
    const roofEntity = createRoof(def, index);
    platformEntities.push(roofEntity);
    platformById.set(roofEntity.id, roofEntity);
  });
  (level.sliceables ?? []).forEach((def, index) => {
    createSliceable(def, index, platformById);
  });
  (level.obstacles ?? []).forEach((def, index) => {
    createObstacle(def, index, platformById);
  });
  createFinishMarker(level);
  buildBackground();
}

function copyEndlessThing(def: RefThing): Omit<RefThing, "platformId"> {
  const entry: Omit<RefThing, "platformId"> = {
    type: def.type,
    y: def.y ?? 0,
    z: def.z ?? 0,
  };
  if ((def.count ?? 1) > 1 && def.count !== undefined) entry.count = def.count;
  if (def.rotation) entry.rotation = { ...def.rotation };
  if (def.moving) {
    entry.moving = true;
    if (def.moveDistance !== undefined) entry.moveDistance = def.moveDistance;
    if (def.moveSpeed !== undefined) entry.moveSpeed = def.moveSpeed;
    if (def.moveDelay !== undefined) entry.moveDelay = def.moveDelay;
    if (def.moveAxis !== undefined) entry.moveAxis = def.moveAxis;
  }
  return entry;
}

function buildEndlessTemplatePool(): EndlessTemplate[] {
  const pool: EndlessTemplate[] = [];
  const seen = new Set<string>();

  for (const level of LEVELS) {
    const sliceablesByPlatform = new Map<string, RefThing[]>();
    const obstaclesByPlatform = new Map<string, RefThing[]>();

    for (const slice of level.sliceables ?? []) {
      if (!slice.platformId) continue;
      const entries = sliceablesByPlatform.get(slice.platformId) ?? [];
      entries.push(slice);
      sliceablesByPlatform.set(slice.platformId, entries);
    }

    for (const obstacle of level.obstacles ?? []) {
      if (!obstacle.platformId) continue;
      const entries = obstaclesByPlatform.get(obstacle.platformId) ?? [];
      entries.push(obstacle);
      obstaclesByPlatform.set(obstacle.platformId, entries);
    }

    for (const platformDef of level.platforms) {
      const sliceables = sliceablesByPlatform.get(platformDef.id) ?? [];
      const obstacles = obstaclesByPlatform.get(platformDef.id) ?? [];
      if (sliceables.length === 0 && obstacles.length === 0) continue;

      const signatureParts = [`${(platformDef.depth || 3).toFixed(1)}_${(platformDef.height || 1).toFixed(1)}`];
      for (const slice of [...sliceables].sort((a, b) => a.type.localeCompare(b.type) || (a.z ?? 0) - (b.z ?? 0))) {
        signatureParts.push(`s:${slice.type}:${slice.y ?? 0}:${slice.z ?? 0}:${slice.count ?? 1}`);
      }
      for (const obstacle of [...obstacles].sort((a, b) => (a.z ?? 0) - (b.z ?? 0))) {
        signatureParts.push(`o:${obstacle.y ?? 0}:${obstacle.z ?? 0}`);
      }

      const signature = signatureParts.join("|");
      if (seen.has(signature)) continue;
      seen.add(signature);

      const platformTemplate: EndlessTemplate["platform"] = {
        y: platformDef.y ?? 0,
        depth: platformDef.depth || 3,
        height: platformDef.height || 1,
      };
      if (platformDef.moving) {
        platformTemplate.moving = true;
        if (platformDef.moveAxis !== undefined) platformTemplate.moveAxis = platformDef.moveAxis;
        if (platformDef.moveDistance !== undefined) platformTemplate.moveDistance = platformDef.moveDistance;
        if (platformDef.moveSpeed !== undefined) platformTemplate.moveSpeed = platformDef.moveSpeed;
        if (platformDef.moveDelay !== undefined) platformTemplate.moveDelay = platformDef.moveDelay;
      }

      const template: EndlessTemplate = { platform: platformTemplate };
      if (sliceables.length > 0) template.sliceables = sliceables.map(copyEndlessThing);
      if (obstacles.length > 0) template.obstacles = obstacles.map(copyEndlessThing);
      pool.push(template);
    }
  }

  if (pool.length === 0) throw new Error("[chopline-rush] Reference levels did not produce any endless templates");
  return pool;
}

function expandedEndlessObjectCount(template: EndlessTemplate): number {
  const sliceableCount = (template.sliceables ?? []).reduce((sum, slice) => sum + (slice.count ?? 1), 0);
  return sliceableCount + (template.obstacles ?? []).length;
}

function estimateReferenceExtraRandomBudget(templateIndex: number, template: EndlessTemplate): number {
  const measured = ENDLESS_REFERENCE_EXTRA_RANDOM_BUDGET_BY_TEMPLATE.get(templateIndex);
  if (measured !== undefined) return measured;

  const objectCount = expandedEndlessObjectCount(template);
  const bookCount = (template.sliceables ?? [])
    .filter((slice) => slice.type === "book")
    .reduce((sum, slice) => sum + (slice.count ?? 1), 0);
  const obstacleCount = (template.obstacles ?? []).length;

  return Math.max(0, 24 + objectCount * 48 + bookCount * 9 + obstacleCount * 18);
}

function consumeEndlessReferenceRandomDraws(count: number): void {
  for (let i = 0; i < count; i += 1) {
    Math.random();
  }
}

function withIsolatedVisualRandom<T>(work: () => T): T {
  const originalRandom = Math.random;
  let state = (isolatedVisualRandomSeed += 0x6d2b79f5) >>> 0;
  Math.random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  try {
    return work();
  } finally {
    Math.random = originalRandom;
  }
}

function prepareEndlessSpawnPlans(targetCursorZ: number): void {
  if (endlessTemplates.length === 0) throw new Error("[chopline-rush] Endless templates are not initialized");
  while (endlessPlanCursorZ < targetCursorZ) {
    const openingSequence = [0, 1, 2, 3];
    const openingGaps = [1.55, 1.1, 1.4, 1.6];
    const gap = endlessPlanCount < openingGaps.length
      ? openingGaps[endlessPlanCount]!
      : 1.4 + Math.random() * 2.4;
    const templateIndex = endlessPlanCount < openingSequence.length
      ? openingSequence[endlessPlanCount]!
      : chooseEndlessTemplateIndex();
    const template = endlessTemplates[templateIndex];
    if (!template) throw new Error("[chopline-rush] Failed to choose an endless template");
    endlessSpawnPlans.push({ gap, templateIndex, template });
    endlessPlanCount += 1;
    endlessLastTemplateIndex = templateIndex;
    endlessPlanCursorZ += gap + template.platform.depth;
    const budget = 0;
    const randomWindow = window as Window & { __rngCount?: number };
    const beforeRandom = randomWindow.__rngCount ?? null;
    if (isChoplineTestMode) {
      endlessPlanProofEvents.push({
        templateIndex,
        budget,
        beforeRandom,
        afterRandom: randomWindow.__rngCount ?? null,
        targetCursorZ,
      });
    }
  }
}

function buildEndlessCourseTemplates(): EndlessTemplate[] {
  const curated: EndlessTemplate[] = [
    {
      platform: { y: 0, depth: 8, height: 1.4 },
      sliceables: [{ type: "brick", y: 0.5, z: 1.4, count: 13 }],
    },
    {
      platform: { y: 0, depth: 11, height: 1.4 },
      sliceables: [
        { type: "orange", y: 0.5, z: 2.4, count: 3 },
        { type: "emoji", y: 0.5, z: 5.5 },
        { type: "orange", y: 0.5, z: 8.8, count: 3 },
      ],
    },
    {
      platform: { y: 0.35, depth: 8, height: 2.1 },
      sliceables: [
        { type: "camera", y: 0.5, z: 2.2 },
        { type: "camera", y: 0.5, z: 5.8 },
      ],
    },
    {
      platform: { y: 0, depth: 6, height: 1.4 },
      sliceables: [{ type: "orange", y: 0.5, z: 3.3, count: 3 }],
    },
    {
      platform: { y: 0, depth: 10, height: 1 },
      sliceables: [
        { type: "donut", y: 0.5, z: 2.5, count: 2 },
        { type: "brick", y: 0.5, z: 7.2, count: 5 },
      ],
    },
    {
      platform: { y: 0, depth: 5, height: 1 },
    },
    {
      platform: { y: 0, depth: 11, height: 1 },
      sliceables: [
        { type: "baguette", y: 0.5, z: 2.5, count: 2 },
        { type: "sausage", y: 0.5, z: 6, count: 3 },
        { type: "apple", y: 0.5, z: 9, count: 2 },
      ],
    },
    {
      platform: { y: -0.25, depth: 8, height: 0.75 },
      sliceables: [{ type: "brick", y: 0.375, z: 4.5, count: 8 }],
    },
    {
      platform: { y: 0, depth: 8, height: 1, moving: true, moveAxis: "y", moveDistance: 1.2, moveSpeed: 1.1, moveDelay: 0.3 },
      sliceables: [{ type: "watermelon", y: 0.5, z: 4.5, count: 3 }],
    },
    {
      platform: { y: 0.8, depth: 6, height: 2.6 },
      sliceables: [{ type: "brick", y: 1.3, z: 3.3, count: 5 }],
    },
  ];

  return curated;
}

function chooseEndlessTemplateIndex(): number {
  const phase = endlessPlanCount % 6;
  if (phase === 5) return 5;

  const previous = endlessTemplates[endlessLastTemplateIndex];
  const previousHadHazard = (previous?.obstacles?.length ?? 0) > 0;
  const candidates: number[] = [];
  for (let index = 0; index < endlessTemplates.length; index += 1) {
    if (index === endlessLastTemplateIndex) continue;
    const template = endlessTemplates[index]!;
    const objectCount = expandedEndlessObjectCount(template);
    const hasHazard = (template.obstacles?.length ?? 0) > 0;
    if (previousHadHazard && hasHazard) continue;
    if (phase <= 1 && !hasHazard && objectCount >= 1 && objectCount <= 8) candidates.push(index);
    if ((phase === 2 || phase === 3) && !hasHazard && objectCount >= 4) candidates.push(index);
    if (phase === 4 && objectCount >= 3) candidates.push(index);
  }

  if (candidates.length === 0) return Math.floor(Math.random() * endlessTemplates.length);
  return candidates[Math.floor(Math.random() * candidates.length)]!;
}

function spawnNextEndlessPlatform(): void {
  if (endlessTemplates.length === 0) throw new Error("[chopline-rush] Endless templates are not initialized");

  if (endlessSpawnPlans.length === 0) {
    prepareEndlessSpawnPlans(endlessPlanCursorZ + 0.001);
  }
  const plan = endlessSpawnPlans.shift();
  if (!plan) throw new Error("[chopline-rush] Endless spawn plan was not prepared");
  const { gap, template } = plan;

  const platformId = `endless_${endlessPlatformCounter}`;
  endlessPlatformCounter += 1;
  const previousPlatform = [...platformEntities].reverse().find((item) => item.kind === "platform");
  const previousTop = previousPlatform ? getPlatformTop(previousPlatform) : 1;
  const authoredTop = (template.platform.y ?? 0) + template.platform.height;
  const reachableTop = THREE.MathUtils.clamp(authoredTop, previousTop - 1.5, previousTop + 3.8);
  const platformDef: RefPlatform = {
    ...template.platform,
    id: platformId,
    y: reachableTop - template.platform.height,
    z: endlessCursorZ + gap,
  };
  const platformEntity = withIsolatedVisualRandom(() => createPlatform(platformDef, platformEntities.length));
  platformEntities.push(platformEntity);

  const platformById = new Map<string, PlatformEntity>([[platformId, platformEntity]]);
  withIsolatedVisualRandom(() => {
    for (const slice of template.sliceables ?? []) {
      createSliceable({ ...slice, platformId }, endlessSliceableCounter, platformById);
      endlessSliceableCounter += 1;
    }
    for (const obstacle of template.obstacles ?? []) {
      createObstacle({ ...obstacle, platformId }, endlessObstacleCounter, platformById);
      endlessObstacleCounter += 1;
    }
  });

  endlessCursorZ = platformDef.z + platformDef.depth;
}

function buildEndlessWorld(): void {
  if (endlessTemplates.length === 0) {
    endlessTemplates = buildEndlessCourseTemplates();
  }
  endlessCursorZ = 0;
  endlessPlanCursorZ = 3.6;
  endlessSpawnPlans = [];
  endlessPlanCount = 0;
  endlessLastTemplateIndex = -1;
  endlessPlatformCounter = 0;
  endlessSliceableCounter = 0;
  endlessObstacleCounter = 0;

  prepareEndlessSpawnPlans(ENDLESS_GENERATE_AHEAD);

  const startPlatform = withIsolatedVisualRandom(() => createPlatform({ id: "endless_start", y: 0, z: 0, depth: 3.6, height: 1.4 }, 0));
  platformEntities.push(startPlatform);
  endlessCursorZ = 3.6;
  endlessPlatformCounter = 1;

  while (endlessCursorZ < ENDLESS_GENERATE_AHEAD) {
    spawnNextEndlessPlatform();
  }
  buildBackground();
}

function updateEndlessWorld(): void {
  if (currentRun?.mode !== "endless") return;
  while (endlessCursorZ < knife.position.z + ENDLESS_GENERATE_AHEAD) {
    spawnNextEndlessPlatform();
  }

  const cleanupZ = knife.position.z - ENDLESS_CLEANUP_BEHIND;
  for (let i = platformEntities.length - 1; i >= 0; i -= 1) {
    const platformEntity = platformEntities[i]!;
    if (platformEntity.mesh.position.z + platformEntity.depth / 2 < cleanupZ) {
      fragmentPhysics.removePlatform(platformEntity.id);
      removeAndDispose(platformGroup, platformEntity.mesh);
      platformEntities.splice(i, 1);
    }
  }
  for (let i = sliceEntities.length - 1; i >= 0; i -= 1) {
    const slice = sliceEntities[i]!;
    if (slice.group.position.z < cleanupZ) {
      removeAndDispose(sliceGroup, slice.group);
      sliceEntities.splice(i, 1);
    }
  }
  for (let i = obstacleEntities.length - 1; i >= 0; i -= 1) {
    const obstacle = obstacleEntities[i]!;
    if (obstacle.group.position.z < cleanupZ) {
      removeAndDispose(obstacleGroup, obstacle.group);
      obstacleEntities.splice(i, 1);
    }
  }
}

function updateEndlessTimer(dt: number): void {
  if (!currentRun || currentRun.mode !== "endless" || currentRun.outcome) return;
  if (screen !== "playing") return;
  if (currentRun.endlessTimerActive) {
    currentRun.endlessScoreTimer = Math.max(0, currentRun.endlessScoreTimer - dt);
  }
  const ratio = Math.max(0, Math.min(1, currentRun.endlessScoreTimer / ENDLESS_SCORE_TIMEOUT));
  endlessTimerBar.style.width = `${ratio * 100}%`;
  endlessTimerBar.className = currentRun.endlessScoreTimer > 3 ? "" : currentRun.endlessScoreTimer > 2 ? "warn" : "danger";
  endlessTimerText.textContent = `${currentRun.endlessScoreTimer.toFixed(1)}s`;
  if (currentRun.endlessTimerActive && currentRun.endlessScoreTimer <= 0) {
    failRun();
  }
}

function createPlatform(def: RefPlatform, index: number): PlatformEntity {
  const width = 3;
  const depth = Math.max(2, def.depth);
  const height = Math.max(0.6, def.height);
  const baseY = def.y ?? 0;
  const platformGeo = new THREE.BoxGeometry(width, height, depth);
  const top = new THREE.Mesh(platformGeo, [
    materials.platformSide,
    materials.platformSide,
    materials.platformTop,
    materials.platformTop,
    materials.platformTop,
    materials.platformTop,
  ]);
  top.position.set(0, baseY + height / 2, def.z + depth / 2);
  top.castShadow = true;
  top.receiveShadow = true;
  platformGroup.add(top);

  const entity: PlatformEntity = {
    id: def.id,
    kind: "platform",
    mesh: top,
    base: top.position.clone(),
    width,
    depth,
    height,
    moving: Boolean(def.moving),
    moveAxis: def.moveAxis || "y",
    moveDistance: def.moveDistance || 3,
    moveSpeed: def.moveSpeed || 2,
    moveDelay: def.moveDelay || 0.5,
    moveElapsed: 0,
    bounds: new THREE.Box3(),
  };
  updatePlatformBounds(entity);
  fragmentPhysics.addPlatform(entity.id, entity.mesh.position, { x: width, y: height, z: depth }, entity.moving);
  return entity;
}

function getPlatformTop(platform: PlatformEntity): number {
  return platform.mesh.position.y + platform.height / 2;
}

function createRoof(def: RefPlatform, index: number): PlatformEntity {
  const width = 3;
  const depth = Math.max(2, def.depth);
  const height = 20;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), [
    materials.platformSide,
    materials.platformSide,
    materials.platformTop,
    materials.platformTop,
    materials.platformTop,
    materials.platformTop,
  ]);
  roof.position.set(0, (def.y ?? 0) + height / 2, def.z + depth / 2);
  roof.castShadow = true;
  roof.receiveShadow = true;
  roof.name = `roof-${index}`;
  platformGroup.add(roof);

  const entity: PlatformEntity = {
    id: def.id || `roof-${index}`,
    kind: "roof",
    mesh: roof,
    base: roof.position.clone(),
    width,
    depth,
    height,
    moving: false,
    moveAxis: "y",
    moveDistance: 0,
    moveSpeed: 0,
    moveDelay: 0,
    moveElapsed: 0,
    bounds: new THREE.Box3(),
  };
  updatePlatformBounds(entity);
  fragmentPhysics.addPlatform(entity.id, entity.mesh.position, { x: width, y: height, z: depth }, false);
  return entity;
}

function getThingPlacement(def: RefThing, platformById: Map<string, PlatformEntity>): { position: THREE.Vector3; localPosition: THREE.Vector3; platformId: string | null } {
  const platform = def.platformId ? platformById.get(def.platformId) : undefined;
  if (!platform) {
    const position = new THREE.Vector3(0, def.y ?? 1.5, def.z ?? 0);
    return { position, localPosition: position.clone(), platformId: null };
  }
  const localPosition = new THREE.Vector3(0, def.y ?? 0.6, -platform.depth / 2 + (def.z ?? platform.depth / 2));
  const position = platform.mesh.position.clone().add(localPosition);
  return { position, localPosition, platformId: platform.id };
}

function createSliceable(def: RefThing, index: number, platformById: Map<string, PlatformEntity>): void {
  const count = Math.max(1, Math.min(25, def.count ?? 1));
  const placement = getThingPlacement(def, platformById);
  const stackGap = getStackGap(def.type) * SLICEABLE_VISUAL_SCALE;
  for (let i = 0; i < count; i += 1) {
    const group = buildSliceMesh(def.type, i);
    const offset = stackOffset(i, stackGap);
    const base = placement.position.clone().add(offset);
    const localPosition = placement.localPosition.clone().add(offset);
    group.position.copy(base);
    group.userData.base = group.position.clone();
    sliceGroup.add(group);
    sliceEntities.push({
      id: `s-${index}-${i}`,
      type: def.type,
      group,
      base: group.position.clone(),
      localPosition,
      platformId: placement.platformId,
      configIndex: index,
      stackIndex: i,
      radius: sliceRadius(def.type),
      collision: sliceCollisionAABB(def.type),
      sliced: false,
      collisionEnabled: true,
      moving: Boolean(def.moving),
      moveAxis: def.moveAxis ?? "y",
      moveDistance: def.moveDistance ?? 2,
      moveSpeed: def.moveSpeed ?? 1.5,
      moveDelay: def.moveDelay ?? 0,
      moveElapsed: 0,
    });
  }
}

function sliceCollisionAABB(type: string): CollisionAABB {
  if (type === "brick") return { bottomY: 0, topY: 0.2 * SLICEABLE_VISUAL_SCALE, halfZ: 0.5 * SLICEABLE_VISUAL_SCALE };
  if (type === "wooden_stake") return { bottomY: 0, topY: 1.5 * SLICEABLE_VISUAL_SCALE, halfZ: 0.25 * SLICEABLE_VISUAL_SCALE };
  if (type === "book") return { bottomY: 0, topY: BOOK_HEIGHT * SLICEABLE_VISUAL_SCALE, halfZ: 0.3 * SLICEABLE_VISUAL_SCALE };
  if (type === "watermelon") return { bottomY: 0, topY: 1.0 * SLICEABLE_VISUAL_SCALE, halfZ: 0.5 * SLICEABLE_VISUAL_SCALE };
  if (type === "apple") return { bottomY: 0, topY: 0.95 * SLICEABLE_VISUAL_SCALE, halfZ: 0.4 * SLICEABLE_VISUAL_SCALE };
  if (type === "orange") return { bottomY: 0, topY: 0.9 * SLICEABLE_VISUAL_SCALE, halfZ: 0.42 * SLICEABLE_VISUAL_SCALE };
  if (type === "emoji") return { bottomY: 0, topY: 1.0 * SLICEABLE_VISUAL_SCALE, halfZ: 0.5 * SLICEABLE_VISUAL_SCALE };
  if (type === "camera") return { bottomY: 0, topY: 1.55 * SLICEABLE_VISUAL_SCALE, halfZ: 0.62 * SLICEABLE_VISUAL_SCALE };
  if (type === "donut") return { bottomY: 0, topY: 1.0 * SLICEABLE_VISUAL_SCALE, halfZ: 0.18 * SLICEABLE_VISUAL_SCALE };
  if (type === "cheese") return { bottomY: 0, topY: 0.6 * SLICEABLE_VISUAL_SCALE, halfZ: 0.375 * SLICEABLE_VISUAL_SCALE };
  if (type === "cube") return { bottomY: 0, topY: 0.75 * SLICEABLE_VISUAL_SCALE, halfZ: 0.375 * SLICEABLE_VISUAL_SCALE };
  if (type === "sphere") return { bottomY: 0, topY: 1.5 * SLICEABLE_VISUAL_SCALE, halfZ: 0.75 * SLICEABLE_VISUAL_SCALE };
  if (type === "baguette") return { bottomY: 0, topY: 0.35 * SLICEABLE_VISUAL_SCALE, halfZ: 0.35 * SLICEABLE_VISUAL_SCALE };
  if (type === "sausage") return { bottomY: 0, topY: 0.4 * SLICEABLE_VISUAL_SCALE, halfZ: 0.2 * SLICEABLE_VISUAL_SCALE };
  return { bottomY: 0, topY: 1.0 * SLICEABLE_VISUAL_SCALE, halfZ: 0.4 * SLICEABLE_VISUAL_SCALE };
}

function getStackGap(type: string): number {
  if (type === "brick") return 0.19;
  if (type === "book") return BOOK_STACK_GAP;
  if (type === "wooden_stake") return STAKE_STACK_HEIGHT;
  if (type === "watermelon") return WATERMELON_STACK_HEIGHT;
  if (type === "apple") return APPLE_STACK_HEIGHT;
  if (type === "orange") return 0.82;
  if (type === "emoji") return 1;
  if (type === "camera") return 1.6;
  if (type === "donut") return DONUT_STACK_HEIGHT;
  if (type === "cheese") return CHEESE_STACK_HEIGHT;
  if (type === "cube") return CUBE_STACK_HEIGHT;
  if (type === "sphere") return SPHERE_STACK_HEIGHT;
  if (type === "baguette") return BAGUETTE_STACK_HEIGHT;
  if (type === "sausage") return SAUSAGE_STACK_HEIGHT;
  return 1;
}

function stackOffset(index: number, gap: number): THREE.Vector3 {
  return new THREE.Vector3(0, index * gap, 0);
}

function sliceRadius(type: string): number {
  const baseRadius = (() => {
    if (type === "brick") return 0.62;
    if (type === "wooden_stake") return 0.6;
    if (type === "book") return 0.48;
    if (type === "watermelon") return 0.75;
    if (type === "orange" || type === "emoji") return 0.55;
    if (type === "camera") return 0.75;
    if (type === "donut") return 0.55;
    return 0.5;
  })();
  return baseRadius * SLICEABLE_VISUAL_SCALE;
}

function buildSliceMesh(type: string, index: number): THREE.Group {
  const group = new THREE.Group();
  if (type === "brick") {
    const colors = [0xbd5837, 0xc96642, 0xad472f];
    const brick = new THREE.Mesh(
      new THREE.BoxGeometry(1, 0.16, 0.48),
      new THREE.MeshStandardMaterial({ color: colors[index % colors.length] ?? 0xbd5837, roughness: 0.68, metalness: 0 }),
    );
    brick.position.y = 0.1;
    brick.rotation.y = (index % 2 === 0 ? 1 : -1) * 0.035;
    brick.castShadow = true;
    group.add(brick);
  } else if (type === "wooden_stake") {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 1.5, 8), materials.wood);
    trunk.position.y = 0.75;
    trunk.castShadow = true;
    group.add(trunk);
  } else if (type === "book") {
    const colors = [materials.bookGreen, materials.bookPink, materials.bookYellow, materials.bookOrange, materials.bookBlue];
    const book = new THREE.Mesh(new THREE.BoxGeometry(0.8, BOOK_HEIGHT, 0.6), colors[index % colors.length] ?? materials.bookGreen);
    book.position.y = BOOK_HEIGHT / 2;
    book.rotation.y = (Math.random() - 0.5) * 0.3;
    book.castShadow = true;
    group.add(book);
  } else if (type === "watermelon") {
    const melon = new THREE.Mesh(new THREE.SphereGeometry(0.5, 16, 16), materials.watermelon);
    melon.position.y = 0.5;
    melon.castShadow = true;
    group.add(melon);
    for (let i = 0; i < 4; i += 1) {
      const stripe = new THREE.Mesh(new THREE.SphereGeometry(0.51, 16, 16, 0, Math.PI * 0.15), materials.watermelonStripe);
      stripe.rotation.y = i * Math.PI / 2;
      stripe.position.y = 0.5;
      group.add(stripe);
    }
  } else if (type === "apple") {
    const apple = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 16), materials.apple);
    apple.position.y = 0.4;
    apple.castShadow = true;
    group.add(apple);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 6), materials.wood);
    stem.position.y = 0.85;
    group.add(stem);
  } else if (type === "orange" || type === "emoji") {
    const radius = type === "orange" ? 0.42 : 0.5;
    const fruit = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 16), type === "orange" ? materials.orange : materials.emoji);
    fruit.position.y = radius;
    fruit.castShadow = true;
    group.add(fruit);
    if (type === "orange") {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.12, 6), materials.wood);
      stem.position.y = radius * 2 + 0.04;
      group.add(stem);
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), materials.bookGreen);
      leaf.scale.set(0.35, 0.18, 1);
      leaf.position.set(0, radius * 2 + 0.07, 0.08);
      group.add(leaf);
    } else {
      for (const z of [-0.16, 0.16]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 10, 8), materials.cameraDark);
        eye.scale.x = 0.35;
        eye.position.set(-0.48, 0.63, z);
        group.add(eye);
      }
      const smileCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.49, 0.38, -0.18),
        new THREE.Vector3(-0.51, 0.3, 0),
        new THREE.Vector3(-0.49, 0.38, 0.18),
      ]);
      const smile = new THREE.Mesh(new THREE.TubeGeometry(smileCurve, 12, 0.028, 6, false), materials.cameraDark);
      group.add(smile);
    }
  } else if (type === "camera") {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.45, 0.78), materials.cameraBody);
    body.position.y = 1.02;
    body.castShadow = true;
    group.add(body);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.2, 14), materials.cameraDark);
    lens.rotation.z = Math.PI / 2;
    lens.position.set(-0.36, 1.02, 0);
    lens.castShadow = true;
    group.add(lens);
    for (const z of [-0.22, 0.22]) {
      const reel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.13, 14), materials.cameraBody);
      reel.rotation.z = Math.PI / 2;
      reel.position.set(-0.03, 1.4, z);
      reel.castShadow = true;
      group.add(reel);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.14, 10), materials.cameraDark);
      hub.rotation.z = Math.PI / 2;
      hub.position.copy(reel.position);
      group.add(hub);
    }
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.3, 7), materials.cameraDark);
    neck.position.y = 0.66;
    group.add(neck);
    for (const [z, angle] of [[-0.26, -0.32], [0.26, 0.32], [0, 0]] as Array<[number, number]>) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.72, 7), materials.cameraDark);
      leg.rotation.x = angle;
      leg.position.set(0, 0.32, z / 2);
      leg.castShadow = true;
      group.add(leg);
    }
  } else if (type === "donut") {
    buildReferenceDonut(group);
  } else if (type === "cheese") {
    const shape = new THREE.Shape();
    shape.moveTo(-0.27, -0.375);
    shape.lineTo(0.27, -0.375);
    shape.lineTo(0, 0.375);
    shape.closePath();
    const cheeseGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.6, bevelEnabled: false });
    cheeseGeo.rotateX(-Math.PI / 2);
    const cheese = new THREE.Mesh(cheeseGeo, materials.cheese);
    cheese.castShadow = true;
    group.add(cheese);
    const normalX = -0.75;
    const normalZ = -0.27;
    const normalLength = Math.hypot(normalX, normalZ);
    const faceAngle = Math.atan2(normalX, normalZ);
    for (const hole of [
      { t: 0.32, y: 0.2, r: 0.105 },
      { t: 0.65, y: 0.25, r: 0.075 },
      { t: 0.4, y: 0.47, r: 0.09 },
      { t: 0.7, y: 0.5, r: 0.065 },
    ]) {
      const holeGeo = new THREE.SphereGeometry(hole.r, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
      holeGeo.rotateX(-Math.PI / 2);
      const holeMesh = new THREE.Mesh(holeGeo, materials.cheeseHole);
      const outDist = hole.r * 0.85;
      holeMesh.position.set(
        -0.27 + 0.27 * hole.t + (normalX / normalLength) * outDist,
        hole.y,
        0.375 - 0.75 * hole.t + (normalZ / normalLength) * outDist,
      );
      holeMesh.rotation.y = faceAngle;
      group.add(holeMesh);
    }
  } else if (type === "sausage") {
    const radius = 0.2;
    const halfLength = 0.7;
    const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, halfLength * 2, 16), materials.sausage);
    body.geometry.rotateZ(Math.PI / 2);
    body.position.y = radius;
    body.castShadow = true;
    group.add(body);
    for (const side of [-1, 1]) {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), materials.sausage);
      cap.rotation.z = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      cap.position.set(side * halfLength, radius, 0);
      cap.castShadow = true;
      group.add(cap);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.08, 8), materials.sausageTip);
      cone.rotation.z = side > 0 ? -Math.PI / 2 : Math.PI / 2;
      cone.position.set(side * (halfLength + radius + 0.04), radius, 0);
      cone.castShadow = true;
      group.add(cone);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.02, 6, 16), materials.sausageRope);
      ring.rotation.y = Math.PI / 2;
      ring.position.set(side * (halfLength + radius * 0.5), radius, 0);
      group.add(ring);
    }
  } else if (type === "baguette") {
    const body = new THREE.Mesh(
      new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      materials.baguette,
    );
    body.scale.set(1, 0.35, 0.35);
    body.castShadow = true;
    group.add(body);
    const bottomGeo = new THREE.CircleGeometry(1, 20);
    bottomGeo.rotateX(Math.PI / 2);
    const bottom = new THREE.Mesh(bottomGeo, materials.baguetteBottom);
    bottom.scale.set(1, 1, 0.35);
    group.add(bottom);
  } else if (type === "cube") {
    const colors = [materials.bookGreen, materials.bookPink, materials.bookYellow, materials.bookOrange, materials.bookBlue];
    const cube = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.75, 0.75), colors[(index + 2) % colors.length] ?? materials.bookYellow);
    cube.position.y = 0.375;
    cube.castShadow = true;
    group.add(cube);
  } else {
    const colors = [materials.bookGreen, materials.bookPink, materials.bookYellow, materials.bookOrange, materials.bookBlue];
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.75, 16, 16), colors[(index + 4) % colors.length] ?? materials.bookBlue);
    sphere.position.y = 0.75;
    sphere.castShadow = true;
    group.add(sphere);
  }
  group.scale.setScalar(SLICEABLE_VISUAL_SCALE);
  return group;
}

function buildReferenceDonut(group: THREE.Group): void {
  const ringRadius = 0.38;
  const tubeRadius = 0.12;
  const centerY = ringRadius + tubeRadius;
  const segments = 12;
  const inner = new THREE.Group();
  inner.rotation.x = Math.PI / 2;
  inner.position.y = centerY;
  group.add(inner);

  const topProfile: THREE.Vector2[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const angle = (Math.PI * i) / segments;
    topProfile.push(new THREE.Vector2(ringRadius + tubeRadius * Math.cos(angle), tubeRadius * Math.sin(angle)));
  }
  const top = new THREE.Mesh(new THREE.LatheGeometry(topProfile, 24), materials.donutIcing);
  top.castShadow = true;
  inner.add(top);

  const cutFace = new THREE.Mesh(new THREE.RingGeometry(ringRadius - tubeRadius, ringRadius + tubeRadius, 24), materials.donutCut);
  cutFace.rotation.x = -Math.PI / 2;
  inner.add(cutFace);

  const bottomProfile: THREE.Vector2[] = [];
  for (let i = 0; i <= segments; i += 1) {
    const angle = Math.PI + (Math.PI * i) / segments;
    bottomProfile.push(new THREE.Vector2(ringRadius + tubeRadius * Math.cos(angle), tubeRadius * Math.sin(angle)));
  }
  const bottom = new THREE.Mesh(new THREE.LatheGeometry(bottomProfile, 24), materials.donut);
  bottom.castShadow = true;
  inner.add(bottom);
}

function createObstacle(def: RefThing, index: number, platformById: Map<string, PlatformEntity>): void {
  const group = new THREE.Group();
  const placement = getThingPlacement(def, platformById);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(2, 0.3, 2), materials.hazard);
  slab.position.y = 0.15;
  slab.castShadow = true;
  group.add(slab);
  for (const x of [-0.6, -0.2, 0.2, 0.6]) {
    for (const z of [-0.6, -0.2, 0.2, 0.6]) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.5, 4), materials.hazardDark);
      spike.position.set(x, 0.55, z);
      spike.rotation.y = Math.PI / 4;
      spike.castShadow = true;
      group.add(spike);
    }
  }
  group.position.copy(placement.position);
  group.rotation.x = toRadians(def.rotation?.x ?? 0);
  group.rotation.y = toRadians(def.rotation?.y ?? 0);
  group.rotation.z = toRadians(def.rotation?.z ?? 0);
  obstacleGroup.add(group);
  const spikeDir = new THREE.Vector3(0, 1, 0).applyEuler(group.rotation);
  spikeDir.x = 0;
  if (spikeDir.lengthSq() > 0.000001) {
    spikeDir.normalize();
  } else {
    spikeDir.set(0, 1, 0);
  }
  obstacleEntities.push({
    id: `o-${index}`,
    group,
    base: group.position.clone(),
    localPosition: placement.localPosition,
    platformId: placement.platformId,
    radius: 1.18,
    collision: computeRotatedAABB({ bottomY: 0, topY: 0.8, halfZ: 1.0 }, group.rotation),
    moving: Boolean(def.moving),
    moveAxis: def.moveAxis || "y",
    moveDistance: def.moveDistance || 3,
    moveSpeed: def.moveSpeed || 2,
    moveDelay: def.moveDelay || 0.5,
    moveElapsed: 0,
    moveDirY: spikeDir.y,
    moveDirZ: spikeDir.z,
  });
}

function computeRotatedAABB(aabb: CollisionAABB, rotation: THREE.Euler): CollisionAABB {
  if (Math.abs(rotation.x) < 0.0001 && Math.abs(rotation.y) < 0.0001 && Math.abs(rotation.z) < 0.0001) {
    return { ...aabb };
  }
  const matrix = new THREE.Matrix4().makeRotationFromEuler(rotation);
  const corners = [
    new THREE.Vector3(0, aabb.bottomY, -aabb.halfZ),
    new THREE.Vector3(0, aabb.bottomY, aabb.halfZ),
    new THREE.Vector3(0, aabb.topY, -aabb.halfZ),
    new THREE.Vector3(0, aabb.topY, aabb.halfZ),
  ];
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  let minZ = Number.POSITIVE_INFINITY;
  let maxZ = Number.NEGATIVE_INFINITY;
  for (const corner of corners) {
    corner.applyMatrix4(matrix);
    minY = Math.min(minY, corner.y);
    maxY = Math.max(maxY, corner.y);
    minZ = Math.min(minZ, corner.z);
    maxZ = Math.max(maxZ, corner.z);
  }
  return {
    bottomY: minY,
    topY: maxY,
    halfZ: (maxZ - minZ) / 2,
    centerZ: (minZ + maxZ) / 2,
  };
}

function toRadians(value: number | null): number {
  if (value === null) return 0;
  return Math.abs(value) > Math.PI * 2 ? THREE.MathUtils.degToRad(value) : value;
}

function createFinishMarker(level: RefLevel): void {
  const targetId = level.finishLinePlatformId;
  const fallback = [...platformEntities].reverse().find((item) => item.kind === "platform");
  const platform = (targetId ? platformEntities.find((item) => item.id === targetId && item.kind === "platform") : undefined) ?? fallback;
  if (!platform) return;
  const z = platform.mesh.position.z + platform.depth / 2 - 0.3;
  const y = getPlatformTop(platform);
  const poleHeight = 3;
  const poleMat = new THREE.MeshPhongMaterial({ color: 0xffd700, shininess: 30 });
  const bannerMat = new THREE.MeshPhongMaterial({ color: 0xff4444, shininess: 25 });
  const blackMat = new THREE.MeshPhongMaterial({ color: 0x000000, shininess: 8 });
  const whiteMat = new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 8 });
  const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, poleHeight, 8);
  const left = new THREE.Mesh(poleGeo, poleMat);
  left.position.set(-1.4, y + poleHeight / 2, z);
  const right = left.clone();
  right.position.x = 1.4;
  const banner = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.5, 0.1), bannerMat);
  banner.position.set(0, y + poleHeight - 0.25, z);
  const finishMeshes: THREE.Mesh[] = [left, right, banner];
  const checkGeo = new THREE.BoxGeometry(0.3, 0.12, 0.5);
  for (let i = 0; i < 10; i += 1) {
    const check = new THREE.Mesh(checkGeo, i % 2 === 0 ? whiteMat : blackMat);
    check.position.set(-1.35 + i * 0.3, y + 0.06, z - 0.5);
    finishMeshes.push(check);
  }
  for (const mesh of finishMeshes) {
    mesh.castShadow = true;
    platformGroup.add(mesh);
  }
}

function buildBackground(): void {
  while (background.children.length) {
    const child = background.children[0];
    if (child) removeAndDispose(background, child);
  }
  bgChunks.clear();
  const theme = currentTheme();
  materials.platformTop.color.setHex(theme.platformTop);
  materials.platformTop.emissive.setHex(theme.platformTop);
  materials.platformTop.emissiveIntensity = 0.05;
  materials.platformSide.color.setHex(theme.platformSide);
  materials.platformSide.emissive.setHex(theme.platformSide);
  materials.platformSide.emissiveIntensity = 0.03;
  materials.platformDark.color.setHex(theme.platformSide);
  materials.platformDark.emissive.setHex(theme.platformSide);
  materials.platformDark.emissiveIntensity = 0.03;
  scene.background = new THREE.Color(theme.sky);
  scene.fog = new THREE.Fog(theme.horizon, 46, 155);
  updateBackgroundChunks(knife.position.z);
}

function updateBackgroundChunks(referenceZ: number): void {
  const currentChunk = Math.floor(referenceZ / 100);
  const minChunk = currentChunk - 1;
  const maxChunk = currentChunk + 2;
  for (let chunk = minChunk; chunk <= maxChunk; chunk += 1) {
    createBackgroundChunk(chunk);
  }
  for (const [chunk, objects] of bgChunks) {
    if (chunk < minChunk || chunk > maxChunk) {
      for (const object of objects) removeAndDispose(background, object);
      bgChunks.delete(chunk);
    }
  }
}

function createBackgroundChunk(chunkIndex: number): void {
  if (bgChunks.has(chunkIndex)) return;
  const theme = currentTheme();
  const objects: THREE.Object3D[] = [];
  const zMin = chunkIndex * 100;
  const zSpan = 100;
  const zMax = zMin + zSpan;
  const backdropZ = (): number => zMin + Math.random() * zSpan;

  const add = (object: THREE.Object3D): void => {
    background.add(object);
    objects.push(object);
  };

  const groundMaterial = sharedLambertMaterial(theme.ground);
  const hillMaterial = sharedLambertMaterial(theme.horizon);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, zSpan + 20), groundMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, (zMin + zMax) / 2);
  ground.receiveShadow = true;
  ground.userData.bgKind = "ground";
  add(ground);

  const hillPositions: Array<{ x: number; z: number; r: number; sy: number }> = [];
  for (let i = 0; i < Math.max(2, Math.round(zSpan / 15)); i += 1) {
    const radius = 8 + Math.random() * 7;
    const hillDef = {
      x: 52 + Math.random() * 20,
      z: backdropZ(),
      r: radius,
      sy: 0.2 + Math.random() * 0.18,
    };
    hillPositions.push(hillDef);
    const hill = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      hillMaterial,
    );
    hill.scale.y = hillPositions[i]!.sy;
    hill.position.set(hillPositions[i]!.x, 0, hillPositions[i]!.z);
    hill.userData.bgKind = "hill";
    add(hill);
  }

  const hillY = (x: number, z: number): number => {
    let maxY = 0;
    for (const hill of hillPositions) {
      const dx = x - hill.x;
      const dz = z - hill.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < hill.r * hill.r) {
        maxY = Math.max(maxY, hill.sy * Math.sqrt(hill.r * hill.r - d2));
      }
    }
    return maxY;
  };

  for (let i = 0; i < Math.max(2, Math.round(zSpan / 28)); i += 1) {
    const height = 13 + Math.random() * 8;
    const radius = 9 + Math.random() * 5;
    const mountain = new THREE.Mesh(
      new THREE.ConeGeometry(radius, height, 5),
      sharedLambertMaterial(theme.mountain),
    );
    mountain.position.set(43 + Math.random() * 18, height / 2, backdropZ());
    mountain.userData.bgKind = "mountain";
    add(mountain);
  }

  const treeMaterial = sharedLambertMaterial(theme.tree);
  const treeDarkMaterial = sharedLambertMaterial(new THREE.Color(theme.tree).multiplyScalar(0.76).getHex());
  for (let i = 0; i < Math.max(3, Math.round(zSpan / 11)); i += 1) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 2.2, 5), treeDarkMaterial);
    trunk.position.y = 1.1;
    tree.add(trunk);
    for (let tier = 0; tier < 3; tier += 1) {
      const crown = new THREE.Mesh(new THREE.ConeGeometry(1.6 - tier * 0.2, 2.8, 5), treeMaterial);
      crown.position.y = 2.3 + tier * 1.25;
      crown.castShadow = true;
      tree.add(crown);
    }
    const x = 28 + Math.random() * 18;
    const z = backdropZ();
    tree.position.set(x, hillY(x, z), z);
    tree.scale.setScalar(0.8 + Math.random() * 0.6);
    tree.userData.bgKind = "pine";
    add(tree);
  }

  bgChunks.set(chunkIndex, objects);
}

function calculateMovingOffset(entity: { moving: boolean; moveDistance: number; moveSpeed: number; moveDelay: number; moveElapsed: number }, dt: number): number {
  if (!entity.moving || entity.moveDistance <= 0 || entity.moveSpeed <= 0) return 0;
  entity.moveElapsed += dt;
  const period = Math.max(0.001, (2 * entity.moveDistance) / entity.moveSpeed);
  const t = Math.max(0, entity.moveElapsed - entity.moveDelay);
  return ((1 - Math.cos((2 * Math.PI * t) / period)) / 2) * entity.moveDistance;
}

function findPlatformById(id: string | null): PlatformEntity | undefined {
  if (!id) return undefined;
  return platformEntities.find((platform) => platform.id === id);
}

function getChildBasePosition(entity: { base: THREE.Vector3; localPosition: THREE.Vector3; platformId: string | null }): THREE.Vector3 {
  const platform = findPlatformById(entity.platformId);
  if (!platform) return entity.base.clone();
  return platform.mesh.position.clone().add(entity.localPosition);
}

function updateMovingWorld(dt: number): void {
  const stuckPlatform = knife.state === "stuck" ? knife.stuckPlatform : null;
  const stuckOldY = stuckPlatform?.mesh.position.y;
  const stuckOldZ = stuckPlatform?.mesh.position.z;

  for (const platformEntity of platformEntities) {
    const offset = calculateMovingOffset(platformEntity, dt);
    platformEntity.mesh.position.copy(platformEntity.base);
    if (platformEntity.moving) {
      platformEntity.mesh.position[platformEntity.moveAxis] += offset;
    }
    updatePlatformBounds(platformEntity);
    fragmentPhysics.updatePlatform(platformEntity.id, platformEntity.mesh.position);
  }

  if (stuckPlatform && stuckOldY !== undefined && stuckOldZ !== undefined) {
    const dy = stuckPlatform.mesh.position.y - stuckOldY;
    const dz = stuckPlatform.mesh.position.z - stuckOldZ;
    if (dy !== 0 || dz !== 0) {
      knife.position.y += dy;
      knife.position.z += dz;
      knife.previousPosition.y += dy;
      knife.previousPosition.z += dz;
    }
  }

  for (const obstacle of obstacleEntities) {
    if (obstacle.cleared) continue;
    const base = getChildBasePosition(obstacle);
    if (obstacle.moving) {
      const offset = calculateMovingOffset(obstacle, dt);
      obstacle.group.position.set(base.x, base.y + obstacle.moveDirY * offset, base.z + obstacle.moveDirZ * offset);
    } else {
      obstacle.group.position.copy(base);
    }
  }

  for (const slice of sliceEntities) {
    if (slice.sliced || !slice.collisionEnabled) continue;
    const base = getChildBasePosition(slice);
    const offset = calculateMovingOffset(slice, dt);
    slice.group.position.copy(base);
    if (slice.moving) {
      slice.group.position[slice.moveAxis] += offset;
    }
  }
}

function updatePlatformBounds(platform: PlatformEntity): void {
  platform.bounds.setFromCenterAndSize(
    new THREE.Vector3(platform.mesh.position.x, platform.mesh.position.y, platform.mesh.position.z),
    new THREE.Vector3(platform.width, platform.height + 0.1, platform.depth),
  );
}

function frame(timestamp: number): void {
  const dtRaw = lastTime ? (timestamp - lastTime) / 1000 : 0.016;
  lastTime = timestamp;
  const dt = Math.min(0.033, Math.max(0.001, dtRaw));
  const elapsed = currentRun ? (timestamp - currentRun.startedAt) / 1000 : 0;
  update(dt, elapsed);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function update(dt: number, elapsed: number): void {
  void elapsed;
  if (proofFrozen) return;
  if (hitStopTime > 0) {
    hitStopTime = Math.max(0, hitStopTime - dt);
    updateCamera(dt);
    return;
  }
  knife.landingPunch = Math.max(0, knife.landingPunch - dt * 8);
  updateMovingWorld(dt);
  updateKnife(dt);
  updateGameOverTumble(dt);
  updateEndlessWorld();
  updateTrajectoryTrail();
  updateParticles(dt);
  updateSlicePieces(dt);
  updateCamera(dt);
  if (previewMode && screen === "playing") {
    autoFlipTimer -= dt;
    if (autoFlipTimer <= 0 && knife.state === "stuck") {
      autoFlipTimer = 0.82;
      flipKnife();
    }
  }
}

function updateKnife(dt: number): void {
  if (!currentRun || screen !== "playing") return;
  if (knife.state === "dead" || knife.state === "tumbling") return;
  if (knife.state === "stuck") {
    syncKnifeTransform();
    checkCollisions();
    checkFinish();
    return;
  }

  const subSteps = Math.max(1, Math.ceil(dt / MAX_SUB_STEP));
  const subDt = dt / subSteps;
  for (let i = 0; i < subSteps; i += 1) {
    knife.previousPosition.copy(knife.position);
    knife.previousRotation = knife.rotation;
    updateKnifePhysics(subDt);
    syncKnifeTransform();
    checkCollisions();
    const stateAfterCollision = knife.state as KnifeState;
    if (stateAfterCollision === "stuck" || stateAfterCollision === "dead" || currentRun.outcome) break;
  }

  if (knife.position.y < GROUND_Y - 5 && !currentRun.outcome) {
    if (previewMode) {
      recoverPreviewRun();
    } else {
      failRun();
    }
  }
  checkFinish();
}

function updateKnifePhysics(dt: number): void {
  if (knife.state === "rotating-stick") {
    knife.angularVelocity = ROTATION_SPEED;
    knife.rotation += knife.angularVelocity * dt;
    knife.rotatingStickAccumAngle += knife.angularVelocity * dt;
    if (knife.rotatingStickPlatform) {
      const platformTop = getPlatformTop(knife.rotatingStickPlatform);
      const cosR = Math.cos(knife.rotation);
      const lowestDrop = cosR < 0 ? -activeKnifeGeometry.bladeReach * cosR : activeKnifeGeometry.handleReach * cosR;
      const targetY = platformTop + lowestDrop;
      if (knife.position.y >= platformTop && targetY > knife.position.y) {
        knife.position.y = targetY;
      }
    }
    return;
  }

  if (knife.slicing) {
    const diff = knife.rotationTarget - knife.rotation;
    const step = 8 * dt;
    if (Math.abs(diff) <= step) {
      knife.rotation = knife.rotationTarget;
    } else {
      knife.rotation += Math.sign(diff) * step;
    }
    knife.angularVelocity = 0;
  }

  knife.velocity.y += GRAVITY * dt;
  knife.position.addScaledVector(knife.velocity, dt);
  if (knife.position.y > KNIFE_CEILING_DEFAULT) {
    knife.position.y = KNIFE_CEILING_DEFAULT;
    if (knife.velocity.y > 0) knife.velocity.y = 0;
  }

  if (knife.angularVelocity > 0 && !knife.slicing) {
    const nextRotation = knife.rotation + knife.angularVelocity * dt;
    if (nextRotation >= knife.rotationTarget) {
      knife.rotation = knife.rotationTarget;
      knife.angularVelocity = 0;
    } else {
      knife.rotation = nextRotation;
    }
  } else if (!knife.slicing) {
    knife.rotation += knife.angularVelocity * dt;
  }
}

function syncKnifeTransform(): void {
  knifeGroup.position.copy(knife.position);
  knifeGroup.position.x = KNIFE_VISUAL_X;
  knifeGroup.rotation.set(knife.rotation, KNIFE_VISUAL_YAW + activeKnifeGeometry.yawOffset, 0);
  knifeGroup.scale.setScalar(1 + knife.landingPunch * 0.075);
}

function flipKnife(): void {
  if (screen !== "playing" || knife.state === "dead" || currentRun?.outcome) return;
  const wasAirborne = knife.state !== "stuck";
  const now = performance.now();
  if (now - knife.lastFlipAt < FLIP_COOLDOWN * 1000) return;
  knife.lastFlipAt = now;
  if (currentRun) currentRun.tapHintConsumed = true;
  tapHint.classList.add("hidden");

  knife.flipSourcePlatform = knife.stuckPlatform;
  if (knife.stuckPlatform && (knife.stuckFace === "top" || knife.stuckFace === "bottom")) {
    const halfHeight = knife.stuckPlatform.height / 2;
    knife.flipSourceFaceType = knife.stuckFace;
    knife.flipSourceFaceY = knife.stuckFace === "top"
      ? knife.stuckPlatform.mesh.position.y + halfHeight
      : knife.stuckPlatform.mesh.position.y - halfHeight;
  } else {
    knife.flipSourceFaceType = null;
    knife.flipSourceFaceY = null;
  }

  if (knife.stuckFace === "side" && knife.flipSourcePlatform) {
    const platform = knife.flipSourcePlatform;
    const zMin = platform.mesh.position.z - platform.depth / 2;
    const zMax = platform.mesh.position.z + platform.depth / 2;
    const bladeExtZ = activeKnifeGeometry.bladeReach * Math.abs(Math.sin(knife.rotation));
    const margin = 0.1;
    if (knife.stuckSideDir < 0) {
      knife.position.z = Math.min(knife.position.z, zMin - bladeExtZ - margin);
    } else {
      knife.position.z = Math.max(knife.position.z, zMax + bladeExtZ + margin);
    }
  }

  knife.state = "flying";
  knife.stuckPlatform = null;
  knife.slicing = false;
  restoreWidenedObjects();
  knife.rotatingStickPlatform = null;
  knife.rotatingStickAccumAngle = 0;
  knife.previousPosition.copy(knife.position);
  knife.previousRotation = knife.rotation;
  if (wasAirborne) {
    knife.velocity.y = Math.min(BASE_FLIP_Y, Math.max(0, knife.velocity.y) + AIR_TAP_LIFT);
    knife.velocity.z = Math.max(BASE_FLIP_Z, knife.velocity.z);
  } else if (knife.stuckFace === "bottom") {
    const bottomCoeff = knife.flipSourcePlatform?.kind === "roof" ? 0.25 : 0.1;
    knife.velocity.set(0, -BASE_FLIP_Y * bottomCoeff, BASE_FLIP_Z);
  } else if (knife.stuckFace === "side") {
    const sideZScale = knife.stuckSideDir < 0 ? 0.72 : 1;
    knife.velocity.set(0, BASE_FLIP_Y, BASE_FLIP_Z * sideZScale);
  } else {
    knife.velocity.set(0, BASE_FLIP_Y, BASE_FLIP_Z);
  }
  knife.stuckFace = "top";
  knife.angularVelocity = ROTATION_SPEED;
  knife.rotationTarget = wasAirborne
    ? knife.rotation + TAP_ROTATION_ANGLE
    : nextRotationTarget(knife.rotation);
  knife.lastPlatformId = "";
  knife.landingPunch = 0;
  trajectoryPoints = [knifeBladeTip()];
  trajectoryLine.visible = true;
  audio.play("knifeFlip", 0.5);
  pulseHaptic(5);
  void audio.startMusic();
}

function nextRotationTarget(rotation: number): number {
  const minTarget = rotation + Math.PI;
  const n = Math.ceil((minTarget - activeKnifeGeometry.readyAngle) / (2 * Math.PI));
  return n * (2 * Math.PI) + activeKnifeGeometry.readyAngle;
}

function resetTrajectoryTrail(): void {
  trajectoryPoints = [];
  trajectoryLine.visible = false;
  trajectoryGeometry.setDrawRange(0, 0);
}

function updateTrajectoryTrail(): void {
  if (knife.state !== "flying" && knife.state !== "bouncing") {
    if (trajectoryLine.visible) resetTrajectoryTrail();
    return;
  }
  const tip = knifeBladeTip();
  const head = trajectoryPoints[0];
  if (!head || head.distanceToSquared(tip) > 0.018) {
    trajectoryPoints.unshift(tip);
    if (trajectoryPoints.length > TRAJECTORY_POINT_LIMIT) trajectoryPoints.pop();
  }
  const points = trajectoryPoints;
  if (points.length < 2) {
    trajectoryGeometry.setDrawRange(0, 0);
    return;
  }
  for (let i = 0; i < points.length; i += 1) {
    const point = points[i]!;
    const next = points[Math.min(points.length - 1, i + 1)]!;
    const prev = points[Math.max(0, i - 1)]!;
    const tangentY = next.y - prev.y;
    const tangentZ = next.z - prev.z;
    const length = Math.hypot(tangentY, tangentZ) || 1;
    const perpY = tangentZ / length;
    const perpZ = -tangentY / length;
    const t = 1 - i / Math.max(1, points.length - 1);
    const brightness = t * t;
    const width = TRAJECTORY_WIDTH * brightness;
    const base = i * 2;
    trajectoryPositionAttribute.setXYZ(base, point.x, point.y + perpY * width, point.z + perpZ * width);
    trajectoryPositionAttribute.setXYZ(base + 1, point.x, point.y - perpY * width, point.z - perpZ * width);
    trajectoryColorAttribute.setXYZ(base, brightness, brightness, brightness);
    trajectoryColorAttribute.setXYZ(base + 1, brightness, brightness, brightness);
  }
  trajectoryPositionAttribute.needsUpdate = true;
  trajectoryColorAttribute.needsUpdate = true;
  trajectoryGeometry.setDrawRange(0, (points.length - 1) * 6);
  trajectoryLine.visible = true;
}

function knifeAxis(): THREE.Vector3 {
  return new THREE.Vector3(0, Math.cos(knife.rotation), Math.sin(knife.rotation));
}

function knifeBladeTip(): THREE.Vector3 {
  return knife.position.clone().addScaledVector(knifeAxis(), activeKnifeGeometry.bladeReach);
}

function knifeHandleEnd(): THREE.Vector3 {
  return knife.position.clone().addScaledVector(knifeAxis(), -activeKnifeGeometry.handleReach);
}

function knifeGeometryProof(): {
  bladeReach: number;
  handleReach: number;
  tipError: number;
  handleEndError: number;
  physicsTip: { x: number; y: number; z: number };
  visualTip: { x: number; y: number; z: number };
} {
  knifeGroup.updateMatrixWorld(true);
  const visualTip = knifeGroup.localToWorld(activeKnifeGeometry.tipLocal.clone());
  const visualHandleEnd = knifeGroup.localToWorld(activeKnifeGeometry.handleEndLocal.clone());
  const physicsTip = knifeBladeTip();
  const physicsHandleEnd = knifeHandleEnd();
  return {
    bladeReach: activeKnifeGeometry.bladeReach,
    handleReach: activeKnifeGeometry.handleReach,
    tipError: visualTip.distanceTo(physicsTip),
    handleEndError: visualHandleEnd.distanceTo(physicsHandleEnd),
    physicsTip: { x: physicsTip.x, y: physicsTip.y, z: physicsTip.z },
    visualTip: { x: visualTip.x, y: visualTip.y, z: visualTip.z },
  };
}

function getBladeOBBAt(y: number, z: number, rot: number): KnifeOBB {
  const cosR = Math.cos(rot);
  const sinR = Math.sin(rot);
  return {
    cY: y + (activeKnifeGeometry.bladeReach / 2) * cosR + (-sinR) * BLADE_EDGE_OFFSET,
    cZ: z + (activeKnifeGeometry.bladeReach / 2) * sinR + cosR * BLADE_EDGE_OFFSET,
    axisY: cosR,
    axisZ: sinR,
    halfLen: activeKnifeGeometry.bladeReach / 2,
    halfWid: activeKnifeGeometry.bladeHalfWidth,
  };
}

function getHandleOBBAt(y: number, z: number, rot: number): KnifeOBB {
  const cosR = Math.cos(rot);
  const sinR = Math.sin(rot);
  return {
    cY: y - (activeKnifeGeometry.handleReach / 2) * cosR,
    cZ: z - (activeKnifeGeometry.handleReach / 2) * sinR,
    axisY: cosR,
    axisZ: sinR,
    halfLen: activeKnifeGeometry.handleReach / 2,
    halfWid: activeKnifeGeometry.handleHalfWidth,
  };
}

function obbAABBOverlap(obb: KnifeOBB, yMin: number, yMax: number, zMin: number, zMax: number): boolean {
  const aabbCY = (yMin + yMax) / 2;
  const aabbCZ = (zMin + zMax) / 2;
  const aabbHY = (yMax - yMin) / 2;
  const aabbHZ = (zMax - zMin) / 2;
  const dY = obb.cY - aabbCY;
  const dZ = obb.cZ - aabbCZ;
  const perpY = -obb.axisZ;
  const perpZ = obb.axisY;
  const obbProjY = obb.halfLen * Math.abs(obb.axisY) + obb.halfWid * Math.abs(perpY);
  if (Math.abs(dY) > aabbHY + obbProjY) return false;
  const obbProjZ = obb.halfLen * Math.abs(obb.axisZ) + obb.halfWid * Math.abs(perpZ);
  if (Math.abs(dZ) > aabbHZ + obbProjZ) return false;
  const dAlong = dY * obb.axisY + dZ * obb.axisZ;
  const aabbProjAlong = aabbHY * Math.abs(obb.axisY) + aabbHZ * Math.abs(obb.axisZ);
  if (Math.abs(dAlong) > obb.halfLen + aabbProjAlong) return false;
  const dPerp = dY * perpY + dZ * perpZ;
  const aabbProjPerp = aabbHY * Math.abs(perpY) + aabbHZ * Math.abs(perpZ);
  return Math.abs(dPerp) <= obb.halfWid + aabbProjPerp;
}

function obbObjectOverlap(obb: KnifeOBB, position: THREE.Vector3, aabb: CollisionAABB): boolean {
  const centerZ = position.z + (aabb.centerZ ?? 0);
  return obbAABBOverlap(obb, position.y + aabb.bottomY, position.y + aabb.topY, centerZ - aabb.halfZ, centerZ + aabb.halfZ);
}

function determineFace(pivotY: number, pivotZ: number, yMin: number, yMax: number, zMin: number, zMax: number): FaceHit {
  const cY = (yMin + yMax) / 2;
  const cZ = (zMin + zMax) / 2;
  const hY = (yMax - yMin) / 2;
  const hZ = (zMax - zMin) / 2;
  const nY = Math.abs(pivotY - cY) / Math.max(0.001, hY);
  const nZ = Math.abs(pivotZ - cZ) / Math.max(0.001, hZ);
  if (nY >= nZ) {
    return pivotY > cY ? { axis: "y", dir: 1, coord: yMax } : { axis: "y", dir: -1, coord: yMin };
  }
  return pivotZ < cZ ? { axis: "z", dir: -1, coord: zMin } : { axis: "z", dir: 1, coord: zMax };
}

function restoreWidenedObjects(): void {
  for (const slice of sliceEntities) {
    if (slice.collision.originalHalfZ !== undefined) {
      slice.collision.halfZ = slice.collision.originalHalfZ;
      delete slice.collision.originalHalfZ;
    }
  }
}

function widenStackSiblings(slice: SliceEntity): void {
  restoreWidenedObjects();
  for (const sibling of sliceEntities) {
    if (sibling === slice || sibling.sliced || sibling.configIndex !== slice.configIndex) continue;
    sibling.collision.originalHalfZ = sibling.collision.halfZ;
    sibling.collision.halfZ += SLICE_HALFZ_BONUS;
  }
}

function stickToFace(faceAxis: CollisionAxis, faceDir: CollisionDir, faceCoord: number, platformEntity: PlatformEntity): void {
  const impactSpeed = Math.min(1, Math.hypot(knife.velocity.y, knife.velocity.z) / 14);
  const stickEvent: StickProofEvent | null = isChoplineTestMode
    ? {
      faceAxis,
      faceDir,
      faceCoord,
      platformId: platformEntity.id,
      beforeY: knife.position.y,
      beforeZ: knife.position.z,
      beforeRotation: knife.rotation,
      afterY: knife.position.y,
      afterZ: knife.position.z,
      afterRotation: knife.rotation,
      slicing: knife.slicing,
    }
    : null;
  knife.state = "stuck";
  knife.slicing = false;
  restoreWidenedObjects();
  knife.velocity.set(0, 0, 0);
  knife.angularVelocity = 0;
  knife.stuckPlatform = platformEntity;
  knife.rotatingStickPlatform = null;
  knife.rotatingStickAccumAngle = 0;
  knife.lastBounceEntity = null;
  knife.lastPlatformId = platformEntity.id;

  const cosR = Math.cos(knife.rotation);
  const sinR = Math.sin(knife.rotation);

  if (faceAxis === "y") {
    if (faceDir > 0) {
      knife.stuckFace = "top";
      const lowestDrop = cosR < 0 ? -activeKnifeGeometry.bladeReach * cosR : activeKnifeGeometry.handleReach * cosR;
      const embedDepth = BLADE_EMBED_DEPTH * Math.max(0, -cosR);
      knife.position.y = faceCoord - embedDepth + lowestDrop;
    } else {
      knife.stuckFace = "bottom";
      const highestRise = cosR > 0 ? activeKnifeGeometry.bladeReach * cosR : -activeKnifeGeometry.handleReach * cosR;
      const embedDepth = BLADE_EMBED_DEPTH * Math.max(0, cosR);
      knife.position.y = faceCoord + embedDepth - highestRise;
    }
  } else {
    knife.stuckFace = "side";
    knife.stuckSideDir = faceDir;
    const zOffset = activeKnifeGeometry.bladeReach * sinR;
    const embedDepth = SIDE_EMBED_DEPTH * Math.abs(sinR);
    knife.position.z = faceCoord - zOffset + Math.sign(sinR || faceDir) * embedDepth;
  }

  knife.landingPunch = 0.75 + impactSpeed * 0.25;
  knife.previousPosition.copy(knife.position);
  knife.previousRotation = knife.rotation;
  if (stickEvent) {
    stickEvent.afterY = knife.position.y;
    stickEvent.afterZ = knife.position.z;
    stickEvent.afterRotation = knife.rotation;
    stickProofEvents.push(stickEvent);
  }
  resetTrajectoryTrail();
  audio.play("knifeStick", 0.7);
  spawnParticles(knifeBladeTip(), 0xfff5d6, 3);
  startCameraShake(0.065 + impactSpeed * 0.07, 0.1 + impactSpeed * 0.06);
  pulseHaptic(Math.round(10 + impactSpeed * 14));
  syncKnifeTransform();
  updateHud();
}

function enterRotatingStick(platformEntity: PlatformEntity): void {
  knife.state = "rotating-stick";
  knife.velocity.set(0, 0, 0);
  knife.angularVelocity = ROTATION_SPEED;
  knife.slicing = false;
  restoreWidenedObjects();
  knife.rotatingStickPlatform = platformEntity;
  knife.rotatingStickAccumAngle = 0;
  audio.play("knifeBounce", 0.6);
  startCameraShake(0.04, 0.07);
  pulseHaptic(7);
}

function bounceKnife(source: SliceEntity | null): void {
  knife.slicing = false;
  restoreWidenedObjects();
  knife.velocity.z = -knife.velocity.z * 0.5;
  knife.angularVelocity = ROTATION_SPEED;
  knife.rotationTarget = nextRotationTarget(knife.rotation);
  knife.state = "bouncing";
  knife.lastBounceEntity = source;
  currentRun!.combo = 0;
  audio.play("knifeBounce", 0.6);
  updateHud();
}

function sliceObject(slice: SliceEntity): void {
  if (!currentRun || slice.sliced || !slice.collisionEnabled) return;
  const points = scoreForSlice(slice.type);
  const position = slice.group.position.clone();
  const randomWindow = window as Window & { __rngCount?: number };
  const proofEvent: SliceProofEvent | null = isChoplineTestMode
    ? {
      type: slice.type,
      y: Number(position.y.toFixed(6)),
      z: Number(position.z.toFixed(6)),
      beforeRandom: randomWindow.__rngCount ?? null,
      afterRandom: null,
      beforePieces: slicePieces.length,
      afterPieces: slicePieces.length,
      score: currentRun.score,
    }
    : null;
  slice.sliced = true;
  slice.collisionEnabled = false;
  currentRun.score += points;
  currentRun.coinsAwarded += 1;
  currentRun.combo += 1;
  currentRun.bestCombo = Math.max(currentRun.bestCombo, currentRun.combo);
  profile.coins += 1;
  profile.totalSlices += 1;
  profile.totalCoinsEarned += 1;
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  spawnParticles(position, colorForSlice(slice.type), slice.type === "brick" || slice.type === "wooden_stake" ? 7 : 5);
  spawnSlicePieces(slice);
  slice.group.visible = false;
  spawnScorePopup(position, points);
  if (currentRun.combo === 3 || currentRun.combo % 8 === 0) {
    spawnPraise(position, currentRun.combo >= 16 ? "PERFECT" : currentRun.combo >= 8 ? "GREAT" : "NICE");
  }
  flashFeedback("slice");
  startCameraShake(0.055, 0.09);
  pulseHaptic(12);
  if (currentRun.mode === "level" && !currentRun.goalAnnounced && currentRun.score >= currentRun.targetScore) {
    currentRun.goalAnnounced = true;
    startCameraShake(0.16, 0.18);
    flashFeedback("success");
    showToast("Goal reached - reach the finish");
  }
  audio.play(slice.type === "wooden_stake" ? "sliceWood" : "sliceSoft", 0.7);
  if (proofEvent) {
    proofEvent.afterRandom = randomWindow.__rngCount ?? null;
    proofEvent.afterPieces = slicePieces.length;
    proofEvent.score = currentRun.score;
    sliceProofEvents.push(proofEvent);
  }
  updateHud();
}

function handleObstacleHit(obstacle: ObstacleEntity): void {
  if (previewMode) {
    obstacle.cleared = true;
    obstacle.group.visible = false;
    spawnParticles(obstacle.group.position, materials.hazard.color.getHex());
    currentRun!.score += 1;
    audio.play("hazard", 0.48);
    updateHud();
    return;
  }
  failRun();
}

function checkObstacleOBBs(obbs: KnifeOBB[]): boolean {
  for (const obstacle of obstacleEntities) {
    if (obstacle.cleared) continue;
    if (obbs.some((obb) => obbObjectOverlap(obb, obstacle.group.position, obstacle.collision))) {
      handleObstacleHit(obstacle);
      return true;
    }
  }
  return false;
}

function sliceablesHitByBlade(bladeOBB: KnifeOBB, midBladeOBB: KnifeOBB): SliceEntity[] {
  return sliceEntities.filter((slice) => slice.collisionEnabled && !slice.sliced && (obbObjectOverlap(bladeOBB, slice.group.position, slice.collision) || obbObjectOverlap(midBladeOBB, slice.group.position, slice.collision)));
}

function referenceFilteredSliceHits(hits: SliceEntity[]): SliceEntity[] {
  if (hits.length <= 1 || !hits.some((slice) => slice.type === "book")) return hits;
  const firstBookByStack = new Map<number, SliceEntity>();
  const filtered: SliceEntity[] = [];
  for (const slice of [...hits].sort((a, b) => a.group.position.y - b.group.position.y)) {
    if (slice.type !== "book") {
      filtered.push(slice);
      continue;
    }
    if (!firstBookByStack.has(slice.configIndex)) {
      firstBookByStack.set(slice.configIndex, slice);
      filtered.push(slice);
    }
  }
  return filtered;
}

function cutContactProgress(slice: SliceEntity): number {
  const centerY = slice.group.position.y + (slice.collision.bottomY + slice.collision.topY) / 2;
  const centerZ = slice.group.position.z + (slice.collision.centerZ ?? 0);
  const axisY = Math.cos(knife.rotation);
  const axisZ = Math.sin(knife.rotation);
  return (centerY - knife.position.y) * axisY + (centerZ - knife.position.z) * axisZ;
}

function qualifiesInitialCut(slice: SliceEntity, angleDiff: number): boolean {
  const inSliceRange = angleDiff >= THREE.MathUtils.degToRad(-150) && angleDiff <= THREE.MathUtils.degToRad(85);
  const linearSpeed = Math.hypot(knife.velocity.y, knife.velocity.z);
  const tipForwardSpeed = knife.velocity.z + knife.angularVelocity * activeKnifeGeometry.bladeReach * Math.cos(knife.rotation);
  const bladeProgress = cutContactProgress(slice);
  return inSliceRange
    && linearSpeed >= MIN_CUT_SPEED
    && tipForwardSpeed >= MIN_CUT_TIP_FORWARD_SPEED
    && bladeProgress >= MIN_CUT_BLADE_PROGRESS;
}

function collapseCutStackRemainder(stack: SliceEntity[], scoredPieces: SliceEntity[]): void {
  const scoredIds = new Set(scoredPieces.map((slice) => slice.id));
  for (const slice of stack) {
    if (scoredIds.has(slice.id) || slice.sliced || !slice.collisionEnabled) continue;
    slice.collisionEnabled = false;
    spawnSlicePieces(slice);
    slice.group.visible = false;
  }
}

function handleSliceableCollisions(bladeOBB: KnifeOBB, handleOBB: KnifeOBB, midBladeOBB: KnifeOBB, midHandleOBB: KnifeOBB): boolean {
  if (knife.lastBounceEntity) {
    const last = knife.lastBounceEntity;
    if (
      last.sliced || !last.collisionEnabled ||
      (!obbObjectOverlap(bladeOBB, last.group.position, last.collision)
        && !obbObjectOverlap(handleOBB, last.group.position, last.collision)
        && !obbObjectOverlap(midBladeOBB, last.group.position, last.collision)
        && !obbObjectOverlap(midHandleOBB, last.group.position, last.collision))
    ) {
      knife.lastBounceEntity = null;
    }
  }

  if (knife.slicing) {
    const hits = referenceFilteredSliceHits(sliceablesHitByBlade(bladeOBB, midBladeOBB))
      .filter((slice) => knife.slicingStackConfigIndex === null
        || slice.configIndex !== knife.slicingStackConfigIndex
        || slice.stackIndex >= knife.slicingStackMinIndex);
    for (const slice of hits) sliceObject(slice);
    if (hits.length > 0) knife.velocity.y *= 0.85;
    return false;
  }

  const bladeCandidates = sliceablesHitByBlade(bladeOBB, midBladeOBB);
  const brickCandidates = bladeCandidates
    .filter((slice) => slice.type === "brick")
    .sort((a, b) => a.stackIndex - b.stackIndex);
  const bladeHit = brickCandidates.length > 0
    ? brickCandidates[Math.floor(brickCandidates.length / 2)]
    : bladeCandidates
      .sort((a, b) => {
        const centerA = a.group.position.y + (a.collision.bottomY + a.collision.topY) / 2;
        const centerB = b.group.position.y + (b.collision.bottomY + b.collision.topY) / 2;
        return Math.abs(centerA - knife.position.y) - Math.abs(centerB - knife.position.y);
      })[0];
  if (bladeHit) {
    const targetRotation = Math.round((knife.rotation - activeKnifeGeometry.readyAngle) / (2 * Math.PI)) * (2 * Math.PI) + activeKnifeGeometry.readyAngle;
    const angleDiff = knife.rotation - targetRotation;
    if (!qualifiesInitialCut(bladeHit, angleDiff)) {
      bounceKnife(bladeHit);
      return true;
    }

    const brickSiblings = bladeHit.type === "brick"
      ? sliceEntities
        .filter((slice) => slice.configIndex === bladeHit.configIndex && slice.collisionEnabled && !slice.sliced)
        .sort((a, b) => a.stackIndex - b.stackIndex)
      : [];
    const brickCutFloor = brickSiblings.length > 0
      ? Math.max(0, (brickSiblings[brickSiblings.length - 1]?.stackIndex ?? 0) - BRICK_CUT_COURSES + 1)
      : 0;
    const acceptedHits = bladeHit.type === "brick"
      ? brickSiblings.filter((slice) => slice.stackIndex >= brickCutFloor)
      : [bladeHit];
    for (const acceptedHit of acceptedHits) sliceObject(acceptedHit);
    if (bladeHit.type === "brick") collapseCutStackRemainder(brickSiblings, acceptedHits);
    hitStopTime = Math.max(hitStopTime, bladeHit.type === "brick" ? 0.055 : 0.035);
    knife.slicing = true;
    knife.slicingStackConfigIndex = bladeHit.type === "brick" ? bladeHit.configIndex : null;
    knife.slicingStackMinIndex = bladeHit.type === "brick" ? brickCutFloor : 0;
    knife.flipSourcePlatform = null;
    knife.flipSourceFaceY = null;
    knife.flipSourceFaceType = null;
    widenStackSiblings(bladeHit);
    knife.rotationTarget = targetRotation;
    knife.velocity.z = Math.max(BASE_FLIP_Z * 0.72, knife.velocity.z * 0.78);
    knife.velocity.y *= 0.85;
    return false;
  }

  for (const slice of sliceEntities) {
    if (slice.sliced || !slice.collisionEnabled || slice === knife.lastBounceEntity) continue;
    if (!obbObjectOverlap(handleOBB, slice.group.position, slice.collision) && !obbObjectOverlap(midHandleOBB, slice.group.position, slice.collision)) continue;
    bounceKnife(slice);
    return true;
  }
  return false;
}

function platformExtents(platformEntity: PlatformEntity): { yMin: number; yMax: number; zMin: number; zMax: number } {
  return {
    yMin: platformEntity.mesh.position.y - platformEntity.height / 2,
    yMax: platformEntity.mesh.position.y + platformEntity.height / 2,
    zMin: platformEntity.mesh.position.z - platformEntity.depth / 2,
    zMax: platformEntity.mesh.position.z + platformEntity.depth / 2,
  };
}

function clearFlipSourcePlatformGuardIfSafe(): void {
  const source = knife.flipSourcePlatform;
  if (!source) return;
  const { yMin, yMax, zMin, zMax } = platformExtents(source);
  const reach = Math.max(activeKnifeGeometry.bladeReach, activeKnifeGeometry.handleReach) + 0.1;
  const pivotClearY = knife.position.y > yMax + reach || knife.position.y < yMin - reach;
  const pivotClearZ = knife.position.z < zMin - reach || knife.position.z > zMax + reach;
  if (!pivotClearY && !pivotClearZ) return;
  knife.flipSourcePlatform = null;
  knife.flipSourceFaceY = null;
  knife.flipSourceFaceType = null;
}

function checkRotatingStick(bladeOBB: KnifeOBB, midBladeOBB: KnifeOBB): boolean {
  if (knife.state !== "rotating-stick" || !knife.rotatingStickPlatform) return false;
  for (const slice of referenceFilteredSliceHits(sliceablesHitByBlade(bladeOBB, midBladeOBB))) sliceObject(slice);
  const platformEntity = knife.rotatingStickPlatform;
  const { yMin, yMax, zMin, zMax } = platformExtents(platformEntity);
  const narrowBladeOBB = { ...bladeOBB, halfWid: 0.05 };
  if (obbAABBOverlap(narrowBladeOBB, yMin, yMax, zMin, zMax)) {
    const cosR = Math.cos(knife.rotation);
    const sinR = Math.sin(knife.rotation);
    let face: FaceHit;
    if (Math.abs(cosR) >= Math.abs(sinR)) {
      face = cosR < 0
        ? { axis: "y", dir: 1, coord: yMax }
        : { axis: "y", dir: -1, coord: yMin };
    } else {
      face = sinR > 0
        ? { axis: "z", dir: -1, coord: zMin }
        : { axis: "z", dir: 1, coord: zMax };
    }

    const yOutside = knife.position.y < yMin || knife.position.y > yMax;
    const zOutside = knife.position.z < zMin || knife.position.z > zMax;
    if (face.axis === "z" && yOutside) {
      face = knife.position.y > (yMin + yMax) / 2
        ? { axis: "y", dir: 1, coord: yMax }
        : { axis: "y", dir: -1, coord: yMin };
    } else if (face.axis === "y" && zOutside) {
      face = knife.position.z < (zMin + zMax) / 2
        ? { axis: "z", dir: -1, coord: zMin }
        : { axis: "z", dir: 1, coord: zMax };
    }

    const distToFace = face.axis === "y"
      ? face.dir > 0 ? face.coord - bladeOBB.cY : bladeOBB.cY - face.coord
      : face.dir > 0 ? face.coord - bladeOBB.cZ : bladeOBB.cZ - face.coord;
    const wrongOrientation = face.axis === "y" ? cosR * face.dir > 0.3 : sinR * face.dir > 0.3;
    if (distToFace <= activeKnifeGeometry.bladeReach && !(face.axis === "z" && Math.abs(sinR) < 0.5) && !wrongOrientation) {
      stickToFace(face.axis, face.dir, face.coord, platformEntity);
      return true;
    }
  }

  if (knife.rotatingStickAccumAngle > 4 * Math.PI) {
    knife.state = "flying";
    knife.rotatingStickPlatform = null;
    knife.angularVelocity = ROTATION_SPEED;
    knife.rotationTarget = nextRotationTarget(knife.rotation);
    return false;
  }
  return knife.state === "rotating-stick";
}

function checkPlatformCollisions(bladeOBB: KnifeOBB, handleOBB: KnifeOBB, midBladeOBB: KnifeOBB, midHandleOBB: KnifeOBB): void {
  const cosR = Math.cos(knife.rotation);
  const sinR = Math.sin(knife.rotation);
  const inFlipGuardWindow = knife.flipSourcePlatform !== null && performance.now() - knife.lastFlipAt <= 200;

  for (const platformEntity of platformEntities) {
    if (platformEntity === knife.flipSourcePlatform) continue;
    const { yMin, yMax, zMin, zMax } = platformExtents(platformEntity);
    if (inFlipGuardWindow && knife.flipSourceFaceY !== null) {
      if (knife.flipSourceFaceType === "top" && Math.abs(yMax - knife.flipSourceFaceY) < 0.1) continue;
      if (knife.flipSourceFaceType === "bottom" && Math.abs(yMin - knife.flipSourceFaceY) < 0.1) continue;
    }

    let bladeHit = obbAABBOverlap(bladeOBB, yMin, yMax, zMin, zMax);
    let hitBladeOBB = bladeOBB;
    if (!bladeHit) {
      bladeHit = obbAABBOverlap(midBladeOBB, yMin, yMax, zMin, zMax);
      hitBladeOBB = midBladeOBB;
    }

    let handleHit = false;
    let hitHandleOBB = handleOBB;
    if (!bladeHit) {
      handleHit = obbAABBOverlap(handleOBB, yMin, yMax, zMin, zMax);
      if (!handleHit) {
        handleHit = obbAABBOverlap(midHandleOBB, yMin, yMax, zMin, zMax);
        hitHandleOBB = midHandleOBB;
      }
    }

    if (bladeHit) {
      const face = determineFace(hitBladeOBB.cY, hitBladeOBB.cZ, yMin, yMax, zMin, zMax);
      if (knife.slicing) {
        stickToFace(face.axis, face.dir, face.coord, platformEntity);
        return;
      }
      if ((face.axis === "y" && (hitBladeOBB.cZ < zMin || hitBladeOBB.cZ > zMax)) || (face.axis === "z" && (hitBladeOBB.cY < yMin || hitBladeOBB.cY > yMax))) {
        enterRotatingStick(platformEntity);
        return;
      }
      if (face.axis === "z" && Math.abs(sinR) < 0.5) {
        enterRotatingStick(platformEntity);
        return;
      }
      const wrongOrientation = face.axis === "y"
        ? cosR * face.dir > MIN_STICK_ALIGNMENT
        : sinR * face.dir > MIN_STICK_ALIGNMENT;
      if (wrongOrientation) {
        enterRotatingStick(platformEntity);
        return;
      }
      stickToFace(face.axis, face.dir, face.coord, platformEntity);
      return;
    }

    if (handleHit) {
      const face = determineFace(hitHandleOBB.cY, hitHandleOBB.cZ, yMin, yMax, zMin, zMax);
      const bottomContact = (face.axis === "y" && face.dir === -1)
        || (hitHandleOBB.cY < (yMin + yMax) / 2 && knife.velocity.y > 0);
      if (bottomContact && knife.velocity.y > 0) {
        knife.velocity.y = -knife.velocity.y * 0.3;
      } else {
        enterRotatingStick(platformEntity);
      }
      return;
    }
  }
}

function checkCollisions(): void {
  if (!currentRun || currentRun.outcome || knife.state === "dead") return;
  clearFlipSourcePlatformGuardIfSafe();
  const bladeOBB = getBladeOBBAt(knife.position.y, knife.position.z, knife.rotation);
  const handleOBB = getHandleOBBAt(knife.position.y, knife.position.z, knife.rotation);
  const midY = (knife.previousPosition.y + knife.position.y) / 2;
  const midZ = (knife.previousPosition.z + knife.position.z) / 2;
  const midRot = (knife.previousRotation + knife.rotation) / 2;
  const midBladeOBB = getBladeOBBAt(midY, midZ, midRot);
  const midHandleOBB = getHandleOBBAt(midY, midZ, midRot);

  if (checkObstacleOBBs([bladeOBB, handleOBB, midBladeOBB, midHandleOBB])) return;
  if (knife.state === "stuck") return;
  if (checkRotatingStick(bladeOBB, midBladeOBB)) return;
  if (handleSliceableCollisions(bladeOBB, handleOBB, midBladeOBB, midHandleOBB)) return;
  checkPlatformCollisions(bladeOBB, handleOBB, midBladeOBB, midHandleOBB);
}

function scoreForSlice(type: string): number {
  void type;
  return 1;
}

function colorForSlice(type: string): number {
  if (type === "brick") return 0xf28b5f;
  if (type === "watermelon") return 0xff776e;
  if (type === "apple") return 0xe83f46;
  if (type === "orange") return 0xffa52f;
  if (type === "emoji") return 0xffdc54;
  if (type === "camera") return 0x626873;
  if (type === "book") return 0x45c7e7;
  if (type === "donut") return 0xce61f2;
  if (type === "wooden_stake") return 0xc78345;
  return 0xffd83e;
}

function buildSliceHalf(type: string, dir: -1 | 1, stackIndex = 0): THREE.Group {
  const group = new THREE.Group();
  if (type === "brick") {
    const shell = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.16, 0.48),
      new THREE.MeshStandardMaterial({ color: stackIndex % 2 === 0 ? 0xbd5837 : 0xc96642, roughness: 0.68 }),
    );
    shell.position.set(dir * 0.25, 0.1, 0);
    shell.castShadow = true;
    group.add(shell);
    const cap = new THREE.Mesh(
      new THREE.PlaneGeometry(0.48, 0.16),
      new THREE.MeshStandardMaterial({ color: 0xf2a078, roughness: 0.78, side: THREE.DoubleSide }),
    );
    cap.position.set(0, 0.1, 0);
    cap.rotation.y = Math.PI / 2;
    group.add(cap);
  } else if (type === "wooden_stake") {
    const half = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.25, 1.5, 8, 1, false, dir > 0 ? 0 : Math.PI, Math.PI),
      new THREE.MeshPhongMaterial({ color: 0x8b4513 }),
    );
    half.position.y = 0.75;
    half.castShadow = true;
    group.add(half);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 1.5), new THREE.MeshPhongMaterial({ color: 0xdeb887, side: THREE.DoubleSide }));
    face.position.set(0, 0.75, 0);
    face.rotation.y = Math.PI / 2;
    face.castShadow = true;
    group.add(face);
  } else if (type === "book") {
    const colors = [0x4caf50, 0xe91e63, 0xffeb3b, 0xff9800, 0x2196f3];
    const half = new THREE.Mesh(new THREE.BoxGeometry(0.4, BOOK_HEIGHT, 0.6), new THREE.MeshPhongMaterial({ color: colors[stackIndex % colors.length] ?? 0x4caf50 }));
    const jitter = () => (Math.random() - 0.5) * 0.03;
    half.position.set(dir * 0.25 + jitter(), BOOK_HEIGHT / 2 + jitter(), jitter());
    half.castShadow = true;
    group.add(half);
  } else if (type === "watermelon" || type === "apple") {
    const radius = type === "watermelon" ? 0.5 : 0.4;
    const half = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 16, 0, Math.PI), new THREE.MeshPhongMaterial({ color: type === "watermelon" ? 0x228b22 : 0xff4757 }));
    half.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    half.position.y = radius;
    half.castShadow = true;
    group.add(half);
    const cutFace = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 16),
      new THREE.MeshPhongMaterial({ color: type === "apple" ? 0xffe8a0 : 0xff6b6b, shininess: 24, side: THREE.DoubleSide }),
    );
    cutFace.position.y = radius;
    cutFace.rotation.y = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
    group.add(cutFace);
    if (type === "apple" && dir > 0) {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.2, 6), new THREE.MeshPhongMaterial({ color: 0x8b4513 }));
      stem.position.y = 0.85;
      stem.castShadow = true;
      group.add(stem);
    }
  } else if (type === "sphere" || type === "orange" || type === "emoji") {
    const colors = [0x4caf50, 0xe91e63, 0xffeb3b, 0xff9800, 0x2196f3];
    const color = type === "orange"
      ? 0xff8617
      : type === "emoji"
        ? 0xffd43b
        : colors[(stackIndex + 4) % colors.length] ?? 0x2196f3;
    const radius = type === "orange" ? 0.42 : type === "emoji" ? 0.5 : 0.75;
    const material = new THREE.MeshPhongMaterial({ color });
    const half = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 16, 0, Math.PI), material);
    half.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    half.position.y = radius;
    half.castShadow = true;
    group.add(half);
    const face = new THREE.Mesh(new THREE.CircleGeometry(radius, 16), new THREE.MeshPhongMaterial({ color: type === "orange" ? 0xffb347 : color, side: THREE.DoubleSide }));
    face.rotation.y = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
    face.position.y = radius;
    face.castShadow = true;
    group.add(face);
  } else if (type === "camera") {
    const half = new THREE.Mesh(new THREE.BoxGeometry(0.275, 0.45, 0.78), materials.cameraBody);
    half.position.set(dir * 0.1375, 1.02, 0);
    half.castShadow = true;
    group.add(half);
    const cap = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.45), materials.cameraDark);
    cap.position.y = 1.02;
    cap.rotation.y = Math.PI / 2;
    group.add(cap);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.82, 7), materials.cameraDark);
    leg.position.set(dir * 0.08, 0.42, 0);
    leg.rotation.z = dir * 0.1;
    leg.castShadow = true;
    group.add(leg);
  } else if (type === "donut") {
    const ringRadius = 0.38;
    const tubeRadius = 0.12;
    const segments = 12;
    const phiStart = dir > 0 ? 0 : Math.PI;
    const inner = new THREE.Group();
    inner.rotation.x = Math.PI / 2;
    group.add(inner);

    const topProfile: THREE.Vector2[] = [];
    for (let i = 0; i <= segments; i += 1) {
      const angle = (Math.PI * i) / segments;
      topProfile.push(new THREE.Vector2(ringRadius + tubeRadius * Math.cos(angle), tubeRadius * Math.sin(angle)));
    }
    const top = new THREE.Mesh(new THREE.LatheGeometry(topProfile, 12, phiStart, Math.PI), new THREE.MeshPhongMaterial({ color: 0xff69b4 }));
    top.castShadow = true;
    inner.add(top);

    const ringFace = new THREE.Mesh(
      new THREE.RingGeometry(ringRadius - tubeRadius, ringRadius + tubeRadius, 12, 1, phiStart - Math.PI / 2, Math.PI),
      new THREE.MeshPhongMaterial({ color: 0xf5deb3, side: THREE.DoubleSide }),
    );
    ringFace.rotation.x = -Math.PI / 2;
    inner.add(ringFace);

    const bottomProfile: THREE.Vector2[] = [];
    for (let i = 0; i <= segments; i += 1) {
      const angle = Math.PI + (Math.PI * i) / segments;
      bottomProfile.push(new THREE.Vector2(ringRadius + tubeRadius * Math.cos(angle), tubeRadius * Math.sin(angle)));
    }
    const bottom = new THREE.Mesh(new THREE.LatheGeometry(bottomProfile, 12, phiStart, Math.PI), new THREE.MeshPhongMaterial({ color: 0xd2961e }));
    bottom.castShadow = true;
    inner.add(bottom);

    const endFaceGeo = new THREE.CircleGeometry(tubeRadius, segments);
    const endFaceMat = new THREE.MeshPhongMaterial({ color: 0xf5deb3, side: THREE.DoubleSide });
    const face1 = new THREE.Mesh(endFaceGeo, endFaceMat);
    face1.position.set(0, 0, ringRadius);
    face1.rotation.y = Math.PI / 2;
    inner.add(face1);
    const face2 = new THREE.Mesh(endFaceGeo, endFaceMat);
    face2.position.set(0, 0, -ringRadius);
    face2.rotation.y = Math.PI / 2;
    inner.add(face2);
  } else if (type === "cheese") {
    const shape = new THREE.Shape();
    if (dir > 0) {
      shape.moveTo(0.27, -0.375);
      shape.lineTo(0, -0.375);
      shape.lineTo(0, 0.375);
    } else {
      shape.moveTo(-0.27, -0.375);
      shape.lineTo(0, -0.375);
      shape.lineTo(0, 0.375);
    }
    shape.closePath();
    const cheeseGeo = new THREE.ExtrudeGeometry(shape, { depth: 0.6, bevelEnabled: false });
    cheeseGeo.rotateX(-Math.PI / 2);
    const cheese = new THREE.Mesh(cheeseGeo, new THREE.MeshPhongMaterial({ color: 0xfff3b0 }));
    cheese.castShadow = true;
    group.add(cheese);
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(0.75, 0.6),
      new THREE.MeshPhongMaterial({ color: 0xfff8dc, shininess: 18, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }),
    );
    face.position.set(0, 0.3, 0);
    face.rotation.y = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
    group.add(face);
    if (dir < 0) {
      const holeMat = new THREE.MeshPhongMaterial({ color: 0xe8d080, side: THREE.BackSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      const normalX = -0.75;
      const normalZ = -0.27;
      const normalLength = Math.hypot(normalX, normalZ);
      const faceAngle = Math.atan2(normalX, normalZ);
      for (const hole of [
        { t: 0.32, y: 0.2, r: 0.105 },
        { t: 0.65, y: 0.25, r: 0.075 },
        { t: 0.4, y: 0.47, r: 0.09 },
        { t: 0.7, y: 0.5, r: 0.065 },
      ]) {
        const holeGeo = new THREE.SphereGeometry(hole.r, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        holeGeo.rotateX(-Math.PI / 2);
        const holeMesh = new THREE.Mesh(holeGeo, holeMat);
        const outDist = hole.r * 0.85;
        holeMesh.position.set(
          -0.27 + 0.27 * hole.t + (normalX / normalLength) * outDist,
          hole.y,
          0.375 - 0.75 * hole.t + (normalZ / normalLength) * outDist,
        );
        holeMesh.rotation.y = faceAngle;
        group.add(holeMesh);
      }
    }
  } else if (type === "sausage" || type === "baguette") {
    if (type === "baguette") {
      const phiStart = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
      const shell = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 10, phiStart, Math.PI, 0, Math.PI / 2), new THREE.MeshPhongMaterial({ color: 0xd4a040 }));
      shell.scale.set(1, 0.35, 0.35);
      shell.castShadow = true;
      group.add(shell);
      const face = new THREE.Mesh(new THREE.CircleGeometry(1, 20, 0, Math.PI), new THREE.MeshPhongMaterial({ color: 0xf5deb3, shininess: 20, side: THREE.DoubleSide }));
      face.scale.set(0.35, 0.35, 1);
      face.rotation.y = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
      group.add(face);
      const bottomThetaStart = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
      const bottom = new THREE.Mesh(new THREE.CircleGeometry(1, 10, bottomThetaStart, Math.PI), new THREE.MeshPhongMaterial({ color: 0xc8903a, shininess: 20, side: THREE.DoubleSide }));
      bottom.geometry.rotateX(Math.PI / 2);
      bottom.scale.set(1, 1, 0.35);
      group.add(bottom);
    } else {
      const radius = 0.2;
      const halfLen = 0.7;
      const sausageMaterial = new THREE.MeshPhongMaterial({ color: 0xcc2222 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, halfLen, 16), sausageMaterial);
      body.geometry.rotateZ(Math.PI / 2);
      body.position.set(dir * halfLen / 2, radius, 0);
      body.castShadow = true;
      group.add(body);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), sausageMaterial);
      cap.rotation.z = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
      cap.position.set(dir * halfLen, radius, 0);
      cap.castShadow = true;
      group.add(cap);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.08, 8), new THREE.MeshPhongMaterial({ color: 0x8b2020, shininess: 18 }));
      cone.rotation.z = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
      cone.position.set(dir * (halfLen + radius + 0.04), radius, 0);
      group.add(cone);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.02, 6, 16), new THREE.MeshPhongMaterial({ color: 0xf5deb3, shininess: 18 }));
      ring.rotation.y = Math.PI / 2;
      ring.position.set(dir * (halfLen + radius * 0.5), radius, 0);
      group.add(ring);
      const face = new THREE.Mesh(new THREE.CircleGeometry(radius, 16), new THREE.MeshPhongMaterial({ color: 0xff9999, shininess: 20, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
      face.position.y = radius;
      face.rotation.y = dir > 0 ? -Math.PI / 2 : Math.PI / 2;
      group.add(face);
    }
  } else if (type === "cube") {
    const colors = [0x4caf50, 0xe91e63, 0xffeb3b, 0xff9800, 0x2196f3];
    const material = new THREE.MeshPhongMaterial({ color: colors[(stackIndex + 2) % colors.length] ?? 0xffeb3b });
    const half = new THREE.Mesh(new THREE.BoxGeometry(0.375, 0.75, 0.75), material);
    half.position.set(dir * 0.1875, 0.375, 0);
    half.castShadow = true;
    group.add(half);
  } else {
    const colors = [0x4caf50, 0xe91e63, 0xffeb3b, 0xff9800, 0x2196f3];
    const material = new THREE.MeshPhongMaterial({ color: colors[(stackIndex + 2) % colors.length] ?? 0xffeb3b });
    const half = new THREE.Mesh(new THREE.BoxGeometry(0.375, 0.75, 0.75), material);
    half.position.set(dir * 0.1875, 0.375, 0);
    half.castShadow = true;
    group.add(half);
    const cutMaterial = new THREE.MeshPhongMaterial({ color: colorForSlice(type), shininess: 36, side: THREE.DoubleSide });
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.75, 0.75), cutMaterial);
    face.position.set(0, 0.375, 0);
    face.rotation.y = Math.PI / 2;
    group.add(face);
  }
  group.scale.setScalar(SLICEABLE_VISUAL_SCALE);
  return group;
}

function spawnSlicePieces(slice: SliceEntity): void {
  for (const dir of [-1, 1]) {
    const direction = dir as -1 | 1;
    const piece = buildSliceHalf(slice.type, direction, slice.stackIndex);
    piece.position.copy(slice.group.position);
    piece.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    particleGroup.add(piece);
    const velocity = new THREE.Vector3(
      direction * (SLICE_HALF_LAUNCH_MIN_X + Math.random() * SLICE_HALF_LAUNCH_SPAN_X),
      3 + Math.random() * 2.2,
      direction * (2.8 + Math.random() * 2.4),
    );
    const angularVelocity = new THREE.Vector3(
      (Math.random() - 0.5) * 3.5,
      direction * (1.2 + Math.random() * 2.2),
      direction * -(2.2 + Math.random() * 2.6),
    );
    const localBounds = slicePieceLocalBounds(slice.type, direction);
    const bodyHandle = fragmentPhysics.addFragment({
      position: piece.position,
      velocity,
      angularVelocity,
      bounds: localBounds,
      density: fragmentDensity(slice.type),
    });
    const slicePiece: SlicePiece = {
      mesh: piece,
      sourceId: slice.id,
      spawnPosition: piece.position.clone(),
      phase: "sliding",
      objectType: slice.type,
      velocity,
      direction,
      localBounds,
      bodyHandle,
    };
    piece.userData.slicePiece = slicePiece;
    slicePieces.push(slicePiece);
  }
}

function fragmentDensity(type: string): number {
  if (type === "brick") return 2.2;
  if (type === "camera") return 1.8;
  if (type === "wooden_stake" || type === "book") return 1.15;
  if (type === "baguette" || type === "donut") return 0.7;
  return 0.9;
}

function slicePieceLocalBounds(type: string, direction: -1 | 1): SlicePiece["localBounds"] {
  const s = SLICEABLE_VISUAL_SCALE;
  const sided = (halfWidth: number, yMin: number, yMax: number, zMin?: number, zMax?: number): SlicePiece["localBounds"] => ({
    xMin: direction > 0 ? 0 : -halfWidth * s,
    xMax: direction > 0 ? halfWidth * s : 0,
    yMin,
    yMax,
    ...(zMin !== undefined && zMax !== undefined ? { zMin: zMin * s, zMax: zMax * s } : {}),
  });
  if (type === "brick") return sided(0.5, 0, 0.2 * s, -0.24, 0.24);
  if (type === "watermelon") return { xMin: -0.5 * s, xMax: 0.5 * s, yMin: 0, yMax: 1.0 * s };
  if (type === "apple") return { xMin: -0.4 * s, xMax: 0.4 * s, yMin: 0, yMax: 0.95 * s };
  if (type === "orange") return { xMin: -0.42 * s, xMax: 0.42 * s, yMin: 0, yMax: 0.9 * s };
  if (type === "emoji") return { xMin: -0.5 * s, xMax: 0.5 * s, yMin: 0, yMax: 1.0 * s };
  if (type === "camera") return sided(0.42, 0, 1.55 * s, -0.42, 0.42);
  if (type === "donut") return sided(0.5, -0.5 * s, 0.5 * s, -0.12, 0.12);
  if (type === "wooden_stake") return sided(0.25, 0, 1.5 * s);
  if (type === "cheese") return sided(0.27, 0, 0.6 * s, -0.375, 0.375);
  if (type === "cube") return sided(0.375, 0, 0.75 * s, -0.375, 0.375);
  if (type === "sphere") return sided(0.75, 0, 1.5 * s);
  if (type === "baguette") return sided(1.0, 0, 0.35 * s, -0.35, 0.35);
  if (type === "sausage") return sided(0.9, 0, 0.4 * s, -0.2, 0.2);
  return sided(0.4, 0, BOOK_HEIGHT * s);
}

function spawnParticles(position: THREE.Vector3, color: number, count = 10): void {
  const meshes = withIsolatedVisualRandom(() => {
    const geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const mat = new THREE.MeshBasicMaterial({ color, transparent: true });
    return Array.from({ length: count }, () => new THREE.Mesh(geo, mat.clone()));
  });
  for (const mesh of meshes) {
    mesh.position.copy(position);
    particleGroup.add(mesh);
    particles.push({
      mesh,
      velocity: new THREE.Vector3((Math.random() - 0.5) * 5, Math.random() * 5 + 2, (Math.random() - 0.5) * 5),
      life: 1,
      maxLife: 1,
    });
  }
}

function spawnScorePopup(position: THREE.Vector3, points: number): void {
  const screenPosition = position.clone().project(camera);
  if (screenPosition.z < -1 || screenPosition.z > 1) return;
  const bounds = renderer.domElement.getBoundingClientRect();
  const left = bounds.left + ((screenPosition.x + 1) / 2) * bounds.width;
  const top = bounds.top + ((-screenPosition.y + 1) / 2) * bounds.height;
  const node = document.createElement("div");
  node.className = "score-pop";
  node.textContent = `+${points}`;
  node.style.left = `${Math.round(left)}px`;
  node.style.top = `${Math.round(top)}px`;
  root.append(node);
  window.setTimeout(() => node.remove(), 820);
}

function spawnPraise(position: THREE.Vector3, label: string): void {
  const screenPosition = position.clone().project(camera);
  const bounds = renderer.domElement.getBoundingClientRect();
  const node = document.createElement("div");
  node.className = "praise-pop";
  node.textContent = label;
  node.style.left = `${Math.round(bounds.left + ((screenPosition.x + 1) / 2) * bounds.width)}px`;
  node.style.top = `${Math.round(bounds.top + ((-screenPosition.y + 1) / 2) * bounds.height - 62)}px`;
  root.append(node);
  window.setTimeout(() => node.remove(), 900);
}

function updateParticles(dt: number): void {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const particle = particles[i];
    if (!particle) continue;
    particle.velocity.y -= 15 * dt;
    particle.mesh.position.addScaledVector(particle.velocity, dt);
    particle.mesh.rotation.x += dt * 5;
    particle.mesh.rotation.z += dt * 4;
    particle.life -= dt;
    const opacity = Math.max(0, particle.life / particle.maxLife);
    particle.mesh.traverse((node) => {
      if (!(node instanceof THREE.Mesh)) return;
      const materials = Array.isArray(node.material) ? node.material : [node.material];
      for (const material of materials) {
        material.opacity = opacity;
        material.transparent = true;
      }
    });
    if (particle.life <= 0) {
      removeAndDispose(particleGroup, particle.mesh);
      particles.splice(i, 1);
    }
  }
}

function updateSlicePieces(dt: number): void {
  if (slicePieces.length === 0) return;
  fragmentPhysics.step(dt);

  for (let i = slicePieces.length - 1; i >= 0; i -= 1) {
    const piece = slicePieces[i];
    if (!piece) continue;
    const transform = fragmentPhysics.fragmentTransform(piece.bodyHandle);
    if (!transform) {
      removeAndDispose(particleGroup, piece.mesh);
      slicePieces.splice(i, 1);
      continue;
    }

    piece.mesh.position.set(transform.position.x, transform.position.y, transform.position.z);
    piece.mesh.quaternion.set(transform.rotation.x, transform.rotation.y, transform.rotation.z, transform.rotation.w);
    piece.velocity.set(transform.velocity.x, transform.velocity.y, transform.velocity.z);

    const speed = Math.hypot(transform.velocity.x, transform.velocity.y, transform.velocity.z);
    if (transform.sleeping || speed < 0.16) {
      piece.phase = "grounded";
    } else if (transform.position.y < piece.spawnPosition.y - 0.3 || transform.velocity.y < -1.2) {
      piece.phase = "falling";
    } else {
      piece.phase = "sliding";
    }

    if (camera.position.z - piece.mesh.position.z > 15 || piece.mesh.position.y < -10) {
      fragmentPhysics.removeFragment(piece.bodyHandle);
      removeAndDispose(particleGroup, piece.mesh);
      slicePieces.splice(i, 1);
    }
  }
}

function checkFinish(): void {
  if (!currentRun || currentRun.outcome) return;
  if (previewMode) return;
  const final = getFinishPlatform(currentRun);
  if (!final) return;
  const finishZ = final.mesh.position.z + final.depth / 2 - 0.8;
  if (knife.position.z >= finishZ && currentRun.score >= currentRun.targetScore) {
    winRun();
  }
}

function getFinishPlatform(run: RunState): PlatformEntity | undefined {
  if (run.mode !== "level") return undefined;
  const fallback = [...platformEntities].reverse().find((item) => item.kind === "platform");
  const level = LEVELS[run.levelIndex];
  const targetId = level?.finishLinePlatformId;
  return (targetId ? platformEntities.find((item) => item.id === targetId && item.kind === "platform") : undefined) ?? fallback;
}

function updateCamera(dt: number): void {
  tempVector.copy(knife.position).add(CAM_OFFSET);
  camera.position.x += (tempVector.x - camera.position.x) * 3 * dt;
  camera.position.y += (tempVector.y - camera.position.y) * 3 * dt;
  camera.position.z += (tempVector.z - camera.position.z) * 3 * dt;
  cameraTarget.set(
    camera.position.x - CAM_OFFSET.x,
    camera.position.y - CAM_OFFSET.y,
    camera.position.z - CAM_OFFSET.z + CAM_LOOK_AHEAD,
  );
  if (cameraShakeTime > 0) {
    const clock = performance.now() * 0.001;
    const t = cameraShakeTime / Math.max(0.001, cameraShakeDuration);
    const strength = cameraShakeStrength * t * t;
    cameraShakeVector.set(
      Math.sin(clock * 91.7) * strength,
      Math.cos(clock * 83.1) * strength * 0.72,
      Math.sin(clock * 67.3) * strength,
    );
    camera.position.add(cameraShakeVector);
    cameraShakeTime = Math.max(0, cameraShakeTime - dt);
    if (cameraShakeTime === 0) cameraShakeStrength = 0;
  }
  camera.lookAt(cameraTarget);
  dirLight.position.set(knife.position.x - 8, knife.position.y + 12, knife.position.z - 4);
  dirLight.target.position.copy(knife.position);
  rimLight.position.set(knife.position.x + 6, knife.position.y + 8, knife.position.z - 4);
  rimLight.target.position.copy(knife.position);
  updateBackgroundChunks(knife.position.z);
}

function findSurfaceBelow(z: number, y: number): { surfaceY: number; platform: PlatformEntity | null } {
  let surfaceY = GROUND_Y;
  let platform: PlatformEntity | null = null;
  for (const platformEntity of platformEntities) {
    if (platformEntity.kind !== "platform") continue;
    const zMin = platformEntity.mesh.position.z - platformEntity.depth / 2;
    const zMax = platformEntity.mesh.position.z + platformEntity.depth / 2;
    if (z < zMin || z > zMax) continue;
    const top = getPlatformTop(platformEntity);
    if (top <= y && top > surfaceY) {
      surfaceY = top;
      platform = platformEntity;
    }
  }
  return { surfaceY, platform };
}

function startGameOverTumble(): void {
  if (!currentRun || knife.state === "tumbling" || screen !== "playing") return;
  knife.state = "tumbling";
  knife.velocity.set(0, 0, 0);
  knife.angularVelocity = 0;
  knife.slicing = false;
  restoreWidenedObjects();
  knife.stuckPlatform = null;
  knife.rotatingStickPlatform = null;
  knife.rotatingStickAccumAngle = 0;
  resetTrajectoryTrail();

  knife.position.copy(knifeGroup.position);
  knife.previousPosition.copy(knife.position);
  tumbleStartY = knife.position.y;
  tumbleStartQuat.copy(knifeGroup.quaternion);
  tumbleTargetEulerX = Math.random() < 0.5 ? -Math.PI / 2 : Math.PI / 2;
  tumbleTargetQuat.setFromEuler(new THREE.Euler(tumbleTargetEulerX, 0, Math.PI / 2));

  const result = findSurfaceBelow(knife.position.z, knife.position.y);
  tumblePlatformRef = result.platform;
  tumbleTargetY = result.surfaceY + KNIFE_LYING_OFFSET;
  tumbleFallDistance = tumbleStartY - tumbleTargetY;
  tumbleTimer = 0;
  tumbleVelocityY = 0;
  tumbleWobbleVelocity = 0;
  tumbleLanded = false;

  if (tumbleFallDistance <= 0) {
    tumbleFallDistance = 0;
    knife.position.y = tumbleTargetY;
    knifeGroup.position.copy(knife.position);
    knifeGroup.quaternion.copy(tumbleTargetQuat);
    tumbleLanded = true;
    tumbleWobbleVelocity = (Math.random() < 0.5 ? -1 : 1) * 3;
    tumblePlatformPreviousZ = tumblePlatformRef?.mesh.position.z ?? 0;
  }
}

function updateGameOverTumble(dt: number): void {
  if (!currentRun || knife.state !== "tumbling" || screen !== "playing") return;

  if (!tumbleLanded) {
    tumbleVelocityY += GRAVITY * dt;
    knife.position.y += tumbleVelocityY * dt;
    knifeGroup.position.copy(knife.position);
    const fallen = tumbleStartY - knife.position.y;
    const t = tumbleFallDistance > 0.001 ? Math.min(fallen / tumbleFallDistance, 1) : 1;
    knifeGroup.quaternion.slerpQuaternions(tumbleStartQuat, tumbleTargetQuat, t);
    if (knife.position.y <= tumbleTargetY) {
      knife.position.y = tumbleTargetY;
      knifeGroup.position.copy(knife.position);
      knifeGroup.rotation.set(tumbleTargetEulerX, 0, Math.PI / 2);
      tumbleLanded = true;
      tumbleWobbleVelocity = (Math.random() < 0.5 ? -1 : 1) * 3;
      tumblePlatformPreviousZ = tumblePlatformRef?.mesh.position.z ?? 0;
    }
    return;
  }

  if (tumblePlatformRef) {
    knife.position.y = getPlatformTop(tumblePlatformRef) + KNIFE_LYING_OFFSET;
    const dz = tumblePlatformRef.mesh.position.z - tumblePlatformPreviousZ;
    knife.position.z += dz;
    tumblePlatformPreviousZ = tumblePlatformRef.mesh.position.z;
    knifeGroup.position.copy(knife.position);
  }

  const springK = 40;
  const damping = 4;
  const diff = tumbleTargetEulerX - knifeGroup.rotation.x;
  tumbleWobbleVelocity += diff * springK * dt;
  tumbleWobbleVelocity *= 1 - damping * dt;
  knifeGroup.rotation.x += tumbleWobbleVelocity * dt;

  tumbleTimer += dt;
  if (tumbleTimer >= 1) {
    knife.state = "dead";
    finishRun();
  }
}

function winRun(): void {
  if (!currentRun || currentRun.outcome) return;
  currentRun.outcome = "won";
  flashFeedback("success");
  audio.play("victory", 0.7);
  finishRun();
}

function failRun(): void {
  if (!currentRun || currentRun.outcome) return;
  if (previewMode) {
    audio.play("gameOver", 0.65);
    recoverPreviewRun();
    return;
  }
  knife.state = "dead";
  currentRun.outcome = "lost";
  currentRun.combo = 0;
  startCameraShake(0.28, 0.22);
  flashFeedback("danger");
  pulseHaptic(28);
  audio.play("gameOver", 0.65);
  if (currentRun.mode === "endless") {
    startGameOverTumble();
    return;
  }
  if (!currentRun.reviveUsed) {
    showScreen("revive");
  } else {
    finishRun();
  }
}

function recoverPreviewRun(): void {
  if (!currentRun) return;
  const nearest = findNearestPlatformBehind() ?? platformEntities[0] ?? null;
  const readyAngle = activeKnifeGeometry.readyAngle;
  knife.position.copy(nearest ? plantedPivotOnTop(nearest, readyAngle) : new THREE.Vector3(KNIFE_VISUAL_X, 2.2, Math.max(0, knife.position.z)));
  knife.previousPosition.copy(knife.position);
  knife.velocity.set(0, 0, 0);
  knife.rotation = readyAngle;
  knife.previousRotation = knife.rotation;
  knife.angularVelocity = 0;
  knife.state = "stuck";
  knife.stuckFace = "top";
  knife.stuckPlatform = nearest;
  knife.stuckSideDir = 1;
  knife.rotationTarget = readyAngle;
  knife.slicing = false;
  restoreWidenedObjects();
  knife.flipSourcePlatform = null;
  knife.flipSourceFaceY = null;
  knife.flipSourceFaceType = null;
  knife.lastBounceEntity = null;
  knife.lastFlipAt = Number.NEGATIVE_INFINITY;
  knife.rotatingStickPlatform = null;
  knife.rotatingStickAccumAngle = 0;
  knife.lastPlatformId = nearest?.id ?? "";
  resetTrajectoryTrail();
  syncKnifeTransform();
  autoFlipTimer = 0.35;
  showScreen("playing");
}

function reviveWithCoins(): void {
  if (!currentRun || screen !== "revive") return;
  if (profile.coins < REVIVE_COST) {
    showToast("Not enough coins");
    return;
  }
  profile.coins -= REVIVE_COST;
  saveProfile();
  reviveRun();
}

async function reviveWithRewarded(): Promise<void> {
  if (!currentRun || screen !== "revive") return;
  try {
    const ok = await platform.showRewarded();
    if (ok) reviveRun();
  } catch (error) {
    showToast(error instanceof Error ? error.message : "Rewarded ad unavailable");
  }
}

function reviveRun(): void {
  if (!currentRun) return;
  currentRun.outcome = null;
  currentRun.reviveUsed = true;
  const nearest = findNearestPlatformBehind();
  const readyAngle = activeKnifeGeometry.readyAngle;
  knife.position.copy(nearest ? plantedPivotOnTop(nearest, readyAngle) : new THREE.Vector3(KNIFE_VISUAL_X, 3, Math.max(0, knife.position.z - 2)));
  knife.previousPosition.copy(knife.position);
  knife.velocity.set(0, 0, 0);
  knife.rotation = readyAngle;
  knife.previousRotation = knife.rotation;
  knife.angularVelocity = 0;
  knife.state = "stuck";
  knife.stuckFace = "top";
  knife.stuckPlatform = nearest;
  knife.stuckSideDir = 1;
  knife.rotationTarget = readyAngle;
  knife.slicing = false;
  restoreWidenedObjects();
  knife.flipSourcePlatform = null;
  knife.flipSourceFaceY = null;
  knife.flipSourceFaceType = null;
  knife.lastBounceEntity = null;
  knife.lastFlipAt = Number.NEGATIVE_INFINITY;
  knife.rotatingStickPlatform = null;
  knife.rotatingStickAccumAngle = 0;
  resetTrajectoryTrail();
  syncKnifeTransform();
  showScreen("playing");
  void platform.unlockAchievements(["first_revive"]).catch(() => undefined);
}

function findNearestPlatformBehind(): PlatformEntity | null {
  let best: PlatformEntity | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const platformEntity of platformEntities) {
    if (platformEntity.kind !== "platform") continue;
    const dz = knife.position.z - platformEntity.mesh.position.z;
    if (dz >= -1 && dz < bestDistance) {
      best = platformEntity;
      bestDistance = dz;
    }
  }
  return best;
}

function finishRun(): void {
  if (!currentRun) return;
  const run = currentRun;
  const won = run.outcome === "won";
  profile.totalRuns += 1;
  if (run.mode === "level" && won) {
    profile.highestLevelCompleted = Math.max(profile.highestLevelCompleted, run.levelIndex + 1);
    profile.highestLevel = Math.max(profile.highestLevel, Math.min(LEVEL_COUNT, run.levelIndex + 2));
  }
  if (run.mode === "endless") {
    profile.endlessBest = Math.max(profile.endlessBest, run.score);
  }
  saveProfile();
  renderResult(run);
  void submitMeta(run);
  showScreen("result");
}

function renderResult(run: RunState): void {
  const levelNumber = run.levelIndex + 1;
  const won = run.outcome === "won";
  const isReferenceEndlessGameOver = run.mode === "endless" && !won;
  resultScreen.classList.toggle("reference-game-over", isReferenceEndlessGameOver);
  if (run.mode === "level" && won) {
    resultTitle.textContent = levelNumber >= LEVEL_COUNT ? "All Levels Cleared!" : "Level Complete!";
    resultSubtitle.textContent = levelNumber >= LEVEL_COUNT
      ? "You cleared all 30 reference boards."
      : `Level ${levelNumber} cleared. Level ${levelNumber + 1} is next.`;
    resultContinue.textContent = levelNumber >= LEVEL_COUNT ? "Replay Level 30" : "Next Level";
  } else if (run.mode === "level") {
    resultTitle.textContent = "Game Over!";
    resultSubtitle.textContent = `Level ${levelNumber} ended. Retry this board.`;
    resultContinue.textContent = "Retry Level";
  } else {
    resultTitle.textContent = run.score >= profile.endlessBest && run.score > 0 ? "New Best!" : "Run Over";
    resultSubtitle.innerHTML = `Score <span>${formatNumber(run.score)}</span> · Best ${formatNumber(profile.endlessBest)}`;
    resultContinue.textContent = "Try Again";
  }
  resultScore.textContent = formatNumber(run.score);
  resultCoins.textContent = `+${formatNumber(run.coinsAwarded)}`;
  const doubleButton = resultScreen.querySelector<HTMLButtonElement>('[data-action="double-coins"]');
  if (doubleButton) doubleButton.disabled = run.doubled || !platform.canUseRewardedAds();
}

async function doubleCoins(): Promise<void> {
  if (!currentRun || screen !== "result" || currentRun.doubled || currentRun.coinsAwarded <= 0) return;
  try {
    const ok = await platform.showRewarded();
    if (!ok) return;
    profile.coins += currentRun.coinsAwarded;
    profile.totalCoinsEarned += currentRun.coinsAwarded;
    currentRun.coinsAwarded *= 2;
    currentRun.doubled = true;
    saveProfile();
    renderResult(currentRun);
    audio.play("coin", 0.75);
  } catch (error) {
    showToast(error instanceof Error ? error.message : "Rewarded ad unavailable");
  }
}

async function maybeShowInterstitial(run: RunState): Promise<void> {
  if (run.interstitialShown || previewMode) return;
  run.interstitialShown = true;
  try {
    await platform.showInterstitial();
  } catch {
    // Interstitial failures should not interrupt the result screen.
  }
}

async function submitMeta(run: RunState): Promise<void> {
  try {
    if (run.mode === "endless") await platform.submitLeaderboard(LEADERBOARD_ENDLESS, profile.endlessBest);
  } catch {
    // The run remains valid if network meta submission fails.
  }
}

function collectInstantAchievements(): string[] {
  const keys = ["first_slice"];
  if (currentRun && currentRun.bestCombo >= 12) keys.push("combo_twelve");
  if (currentRun && currentRun.bestCombo >= 25) keys.push("combo_twentyfive");
  return keys;
}

function collectRunAchievements(run: RunState): string[] {
  const keys = collectInstantAchievements();
  if (run.mode === "level") {
    if (profile.highestLevelCompleted >= 5) keys.push("level_five");
    if (profile.highestLevelCompleted >= 15) keys.push("level_fifteen");
    if (profile.highestLevelCompleted >= 30) keys.push("level_thirty");
  }
  if (run.mode === "endless") {
    if (run.score >= 1000) keys.push("endless_1000");
    if (run.score >= 2500) keys.push("endless_2500");
  }
  if (profile.totalRuns >= 10) keys.push("ten_runs");
  if (profile.ownedKnives.length > 1) keys.push("first_upgrade");
  if (profile.ownedKnives.length >= KNIVES.length) keys.push("all_knives");
  return keys;
}

async function buyOrEquipKnife(knifeSkin: KnifeSkin): Promise<void> {
  const owned = profile.ownedKnives.includes(knifeSkin.id);
  const previousProfile = cloneProfile(profile);
  if (owned) {
    try {
      profile.equippedKnife = knifeSkin.id;
      await buildKnife();
      saveProfile();
      renderShop();
      showToast(`${knifeSkin.displayName} equipped`);
    } catch (error) {
      profile = previousProfile;
      renderShop();
      throw new Error(`[chopline-rush] Failed to equip knife ${knifeSkin.id}: ${error instanceof Error ? error.message : String(error)}`);
    }
    return;
  }
  if (profile.coins < knifeSkin.price) {
    showToast("Not enough coins");
    return;
  }
  try {
    profile.coins -= knifeSkin.price;
    profile.ownedKnives.push(knifeSkin.id);
    profile.equippedKnife = knifeSkin.id;
    await buildKnife();
    saveProfile();
    renderShop();
    showToast(`${knifeSkin.displayName} unlocked`);
  } catch (error) {
    profile = previousProfile;
    renderShop();
    throw new Error(`[chopline-rush] Failed to unlock knife ${knifeSkin.id}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function buyOrEquipTheme(theme: WorldTheme): void {
  const owned = profile.ownedThemes.includes(theme.id);
  if (!owned && profile.coins < theme.price) {
    showToast("Not enough coins");
    return;
  }
  if (!owned) {
    profile.coins -= theme.price;
    profile.ownedThemes.push(theme.id);
  }
  profile.equippedTheme = theme.id;
  saveProfile();
  buildBackground();
  renderShop();
  showToast(`${theme.displayName} theme active`);
}

async function buyCoins(product: CoinProduct): Promise<void> {
  try {
    await platform.purchaseCoins(product);
    profile.coins += product.coins;
    profile.totalCoinsEarned += product.coins;
    saveProfile();
    renderShop();
    showToast(`${product.displayName} added`);
  } catch (error) {
    showToast(error instanceof Error ? error.message : "Purchase unavailable");
  }
}

function nextRun(): void {
  if (!currentRun) {
    void startRun(selectedMode);
    return;
  }
  if (currentRun.mode === "level" && currentRun.outcome === "won") {
    selectedLevel = Math.min(LEVEL_COUNT, currentRun.levelIndex + 2);
  }
  void startRun(currentRun.mode);
}

async function startRun(mode: Mode): Promise<void> {
  selectedMode = mode;
  previousScreen = "playing";
  newRun(mode, mode === "level" ? selectedLevel - 1 : 0, true);
  await audio.startMusic();
}

function showShop(): void {
  previousScreen = screen === "shop" ? previousScreen : screen;
  renderShop();
  showScreen("shop");
}

function closeShop(): void {
  showScreen(previousScreen === "shop" || previousScreen === "boot" ? "menu" : previousScreen);
}

function handleAction(action: string, button: HTMLElement): void {
  audio.play("button", 0.28);
  if (action === "show-menu") {
    void startRun("endless");
  } else if (action === "start-level") {
    void startRun("endless");
  } else if (action === "show-levels") {
    showScreen("levels");
  } else if (action === "start-endless") {
    void startRun("endless");
  } else if (action === "open-shop") {
    showShop();
  } else if (action === "close-shop") {
    closeShop();
  } else if (action === "pause") {
    if (screen === "playing") showScreen("paused");
  } else if (action === "resume") {
    showScreen("playing");
  } else if (action === "restart") {
    void startRun(selectedMode);
  } else if (action === "switch-mode") {
    void startRun(selectedMode === "level" ? "endless" : "level");
  } else if (action === "revive-coins") {
    reviveWithCoins();
  } else if (action === "revive-ad") {
    void reviveWithRewarded();
  } else if (action === "finish-run") {
    finishRun();
  } else if (action === "double-coins") {
    button.setAttribute("disabled", "true");
    void doubleCoins();
  } else if (action === "next-run") {
    nextRun();
  }
}

root.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const actionElement = target.closest<HTMLElement>("[data-action]");
  if (actionElement) {
    handleAction(actionElement.dataset.action ?? "", actionElement);
    return;
  }
});

requireElement("pause-btn", HTMLButtonElement).addEventListener("click", () => handleAction("pause", requireElement("pause-btn", HTMLButtonElement)));
requireElement("shop-btn", HTMLButtonElement).addEventListener("click", () => handleAction("open-shop", requireElement("shop-btn", HTMLButtonElement)));
levelPill.addEventListener("click", () => {
  if (screen === "playing") showScreen("levels");
});

window.addEventListener("pointerdown", (event) => {
  const target = event.target;
  if (target instanceof HTMLElement && target.closest("button")) return;
  if (screen === "playing") flipKnife();
});

window.addEventListener("keydown", (event) => {
  if (event.code === "Space") {
    event.preventDefault();
    flipKnife();
  }
  if (event.code === "KeyR") void startRun(selectedMode);
  if (event.code === "Escape" && screen === "playing") showScreen("paused");
});

function resize(): void {
  const hostWidth = window.innerWidth || 720;
  const hostHeight = window.innerHeight || 1280;
  let width = hostWidth;
  let height = hostHeight;
  let gameAspect = hostWidth / hostHeight;
  if (hostWidth > hostHeight) {
    gameAspect = REFERENCE_PORTRAIT_ASPECT;
    height = hostHeight;
    width = height * gameAspect;
  }
  root.style.setProperty("--game-width", `${width}px`);
  root.style.setProperty("--game-height", `${height}px`);
  renderer.setSize(Math.round(width), Math.round(height), false);
  camera.aspect = gameAspect;
  camera.fov = 70;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);

function setupPreviewHooks(): void {
  window.__listingCapture = {
    prepare: async (payload) => {
      if (payload?.active === false) {
        setPreviewMode(false);
        audio.stopMusic();
        showScreen("menu");
        return;
      }
      setPreviewMode(true);
      previewAudioPolicy = payload?.audioPolicy ?? "music-and-sfx";
      profile.coins = Math.max(profile.coins, 520);
      const sceneId = payload?.sceneId ?? "";
      selectedLevel = choosePreviewLevel(payload);
      newRun("endless", 0, true);
      autoFlipTimer = 0.16;
      if (previewAudioPolicy !== "silent") await audio.startMusic();
    },
    startAudioCapture: async () => {
      if (previewAudioPolicy === "silent") return;
      await audio.startCapture();
      await audio.startMusic();
    },
    stopAudioCapture: async () => {
      const exportedAudio = await audio.stopCapture();
      audio.stopMusic();
      return exportedAudio;
    },
  };
}

function stageLandingProof(): void {
  proofFrozen = false;
  setPreviewMode(false);
  newRun("level", 0, true);
  const platformEntity = platformEntities[1] ?? platformEntities[0];
  if (!platformEntity) throw new Error("[chopline-rush] No platform available for landing proof");
  const top = getPlatformTop(platformEntity);
  const z = platformEntity.mesh.position.z - platformEntity.depth / 2 + Math.min(5, platformEntity.depth * 0.45);
  knife.position.set(KNIFE_VISUAL_X, top + 1.05, z);
  knife.previousPosition.set(KNIFE_VISUAL_X, top + 1.2, z - 0.08);
  knife.rotation = Math.PI;
  knife.previousRotation = Math.PI;
  knife.velocity.set(0, -1.4, 0.2);
  knife.angularVelocity = 0;
  knife.state = "flying";
  knife.stuckFace = "top";
  knife.stuckPlatform = null;
  knife.stuckSideDir = 1;
  knife.slicing = false;
  knife.flipSourcePlatform = null;
  knife.flipSourceFaceY = null;
  knife.flipSourceFaceType = null;
  knife.lastBounceEntity = null;
  knife.rotatingStickPlatform = null;
  knife.rotatingStickAccumAngle = 0;
  knife.landingPunch = 0;
  resetTrajectoryTrail();
  syncKnifeTransform();
  snapCameraToKnife();
  updateHud();
}

function stageFlatLandingProof(): void {
  proofFrozen = false;
  setPreviewMode(false);
  newRun("endless", 0, true);
  const platformEntity = platformEntities[0];
  if (!platformEntity) throw new Error("[chopline-rush] No platform available for flat landing proof");
  const top = getPlatformTop(platformEntity);
  knife.position.set(KNIFE_VISUAL_X, top + 0.11, platformEntity.mesh.position.z);
  knife.previousPosition.set(KNIFE_VISUAL_X, top + 0.22, platformEntity.mesh.position.z - 0.04);
  knife.rotation = -Math.PI / 2;
  knife.previousRotation = knife.rotation;
  knife.velocity.set(0, -1.2, 0.15);
  knife.angularVelocity = 0;
  knife.state = "flying";
  knife.stuckFace = "top";
  knife.stuckPlatform = null;
  knife.stuckSideDir = 1;
  knife.slicing = false;
  knife.flipSourcePlatform = null;
  knife.flipSourceFaceY = null;
  knife.flipSourceFaceType = null;
  knife.lastBounceEntity = null;
  knife.rotatingStickPlatform = null;
  knife.rotatingStickAccumAngle = 0;
  knife.landingPunch = 0;
  resetTrajectoryTrail();
  syncKnifeTransform();
  snapCameraToKnife();
  updateHud();
}

function stageSideLandingProof(): void {
  proofFrozen = false;
  setPreviewMode(false);
  newRun("endless", 0, true);
  const platformEntity = platformEntities[1] ?? platformEntities[0];
  if (!platformEntity) throw new Error("[chopline-rush] No platform available for side landing proof");
  const { zMin } = platformExtents(platformEntity);
  knife.position.set(KNIFE_VISUAL_X, getPlatformTop(platformEntity) + 1.2, zMin - activeKnifeGeometry.bladeReach);
  knife.previousPosition.copy(knife.position);
  knife.rotation = Math.PI / 2;
  knife.previousRotation = knife.rotation;
  knife.velocity.set(0, 0, 0);
  knife.angularVelocity = 0;
  knife.state = "flying";
  knife.stuckPlatform = null;
  knife.slicing = false;
  knife.flipSourcePlatform = null;
  knife.flipSourceFaceY = null;
  knife.flipSourceFaceType = null;
  knife.lastBounceEntity = null;
  knife.rotatingStickPlatform = null;
  knife.rotatingStickAccumAngle = 0;
  knife.landingPunch = 0;
  stickToFace("z", -1, zMin, platformEntity);
  snapCameraToKnife();
  updateHud();
}

function stageHandleLandingProof(): void {
  proofFrozen = false;
  setPreviewMode(false);
  newRun("endless", 0, true);
  const platformEntity = platformEntities[0];
  if (!platformEntity) throw new Error("[chopline-rush] No platform available for handle landing proof");
  const top = getPlatformTop(platformEntity);
  knife.position.set(KNIFE_VISUAL_X, top + activeKnifeGeometry.handleReach - 0.02, platformEntity.mesh.position.z);
  knife.previousPosition.set(KNIFE_VISUAL_X, top + activeKnifeGeometry.handleReach + 0.08, platformEntity.mesh.position.z - 0.04);
  knife.rotation = 0;
  knife.previousRotation = 0;
  knife.velocity.set(0, -1.5, 0.2);
  knife.angularVelocity = 0;
  knife.state = "flying";
  knife.stuckFace = "top";
  knife.stuckPlatform = null;
  knife.stuckSideDir = 1;
  knife.slicing = false;
  knife.flipSourcePlatform = null;
  knife.flipSourceFaceY = null;
  knife.flipSourceFaceType = null;
  knife.lastBounceEntity = null;
  knife.rotatingStickPlatform = null;
  knife.rotatingStickAccumAngle = 0;
  knife.landingPunch = 0;
  resetTrajectoryTrail();
  syncKnifeTransform();
  snapCameraToKnife();
  updateHud();
}

function stageCutContact(slice: SliceEntity, rotation: number): void {
  const centerY = slice.group.position.y + (slice.collision.bottomY + slice.collision.topY) / 2;
  const centerZ = slice.group.position.z + (slice.collision.centerZ ?? 0);
  const contactDepth = activeKnifeGeometry.bladeReach * 0.58;
  knife.position.set(
    KNIFE_VISUAL_X,
    centerY - Math.cos(rotation) * contactDepth,
    centerZ - Math.sin(rotation) * contactDepth,
  );
  knife.previousPosition.copy(knife.position).add(new THREE.Vector3(0, 0.04, -0.09));
  knife.rotation = rotation;
  knife.previousRotation = rotation - 0.05;
  knife.velocity.set(0, -0.5, BASE_FLIP_Z);
  knife.angularVelocity = ROTATION_SPEED;
  knife.rotationTarget = nextRotationTarget(knife.rotation);
  knife.state = "flying";
  knife.stuckFace = "top";
  knife.stuckPlatform = null;
  knife.stuckSideDir = 1;
  knife.slicing = false;
  knife.flipSourcePlatform = null;
  knife.flipSourceFaceY = null;
  knife.flipSourceFaceType = null;
  knife.lastBounceEntity = null;
  knife.rotatingStickPlatform = null;
  knife.rotatingStickAccumAngle = 0;
  knife.landingPunch = 0;
  resetTrajectoryTrail();
  syncKnifeTransform();
  snapCameraToKnife();
  updateHud();
}

function stageSliceProof(): void {
  proofFrozen = false;
  setPreviewMode(false);
  newRun("endless", 0, true);
  if (!currentRun) throw new Error("[chopline-rush] No active run for slice proof");
  const slice = [...sliceEntities]
    .filter((item) => !item.sliced)
    .sort((a, b) => b.group.position.y - a.group.position.y)[0];
  if (!slice) throw new Error("[chopline-rush] No sliceable available for slice proof");
  currentRun.targetScore = 9999;
  stageCutContact(slice, THREE.MathUtils.degToRad(125));
}

function stageInvalidSliceProof(): void {
  proofFrozen = false;
  setPreviewMode(false);
  newRun("endless", 0, true);
  if (!currentRun) throw new Error("[chopline-rush] No active run for invalid slice proof");
  const slice = sliceEntities.find((item) => !item.sliced);
  if (!slice) throw new Error("[chopline-rush] No sliceable available for invalid slice proof");
  currentRun.targetScore = 9999;
  stageCutContact(slice, 0);
}

function stageSplitVisualProof(mode: Mode = "level", reuseActiveRun = false, preferredType?: string): void {
  proofFrozen = false;
  setPreviewMode(false);
  if (!reuseActiveRun || !currentRun || currentRun.mode !== mode || screen !== "playing") {
    newRun(mode, 0, true);
  }
  if (!currentRun) throw new Error("[chopline-rush] No active run for split proof");
  const slice = (preferredType
    ? sliceEntities.find((item) => item.type === preferredType && !item.sliced)
    : undefined)
    ?? sliceEntities.find((item) => item.type === "watermelon" && !item.sliced)
    ?? sliceEntities.find((item) => item.type === "apple" && !item.sliced)
    ?? sliceEntities.find((item) => !item.sliced);
  if (!slice) throw new Error("[chopline-rush] No sliceable available for split proof");
  currentRun.targetScore = 9999;
  if (mode === "endless") {
    currentRun.score = 0;
    currentRun.endlessScoreTimer = ENDLESS_SCORE_TIMEOUT;
    currentRun.endlessTimerActive = true;
    currentRun.tapHintConsumed = true;
    tapHint.classList.add("hidden");
  }
  stageCutContact(slice, THREE.MathUtils.degToRad(125));
}

function stageEndlessSplitVisualProof(preferredType?: string): void {
  stageSplitVisualProof("endless", true, preferredType);
}

function slicePieceSummary(): SlicePieceProofSummary {
  const phases = slicePieces.map((piece) => piece.phase);
  const xValues = slicePieces.map((piece) => piece.mesh.position.x);
  const spreadX = xValues.length > 1 ? Math.max(...xValues) - Math.min(...xValues) : 0;
  const spawnSpreadBySource = new Map<string, { x: number[]; y: number[] }>();
  for (const piece of slicePieces) {
    const entry = spawnSpreadBySource.get(piece.sourceId) ?? { x: [], y: [] };
    entry.x.push(piece.spawnPosition.x);
    entry.y.push(piece.spawnPosition.y);
    spawnSpreadBySource.set(piece.sourceId, entry);
  }
  let maxSourceSpawnSpreadX = 0;
  let maxSourceSpawnSpreadY = 0;
  for (const entry of spawnSpreadBySource.values()) {
    if (entry.x.length > 1) maxSourceSpawnSpreadX = Math.max(maxSourceSpawnSpreadX, Math.max(...entry.x) - Math.min(...entry.x));
    if (entry.y.length > 1) maxSourceSpawnSpreadY = Math.max(maxSourceSpawnSpreadY, Math.max(...entry.y) - Math.min(...entry.y));
  }
  return {
    count: slicePieces.length,
    phases,
    sliding: phases.filter((phase) => phase === "sliding").length,
    falling: phases.filter((phase) => phase === "falling").length,
    grounded: phases.filter((phase) => phase === "grounded").length,
    spreadX,
    velocities: slicePieces.map((piece) => ({
      x: Number(piece.velocity.x.toFixed(6)),
      y: Number(piece.velocity.y.toFixed(6)),
      z: Number(piece.velocity.z.toFixed(6)),
    })),
    bounds: slicePieces.map((piece) => ({
      objectType: piece.objectType,
      direction: piece.direction,
      xMin: Number(piece.localBounds.xMin.toFixed(6)),
      xMax: Number(piece.localBounds.xMax.toFixed(6)),
      yMin: Number(piece.localBounds.yMin.toFixed(6)),
      yMax: Number(piece.localBounds.yMax.toFixed(6)),
      ...(piece.localBounds.zMin !== undefined ? { zMin: Number(piece.localBounds.zMin.toFixed(6)) } : {}),
      ...(piece.localBounds.zMax !== undefined ? { zMax: Number(piece.localBounds.zMax.toFixed(6)) } : {}),
    })),
    maxSourceSpawnSpreadX,
    maxSourceSpawnSpreadY,
    objectTypes: [...new Set(slicePieces.map((piece) => piece.objectType))],
  };
}

function backgroundProbeSummary(): { counts: Record<string, number>; objects: Array<{ kind: string; x: number; y: number; z: number }> } {
  const counts: Record<string, number> = {};
  const objects = background.children.map((object) => {
    const kind = typeof object.userData.bgKind === "string" ? object.userData.bgKind : "unknown";
    counts[kind] = (counts[kind] ?? 0) + 1;
    return {
      kind,
      x: Number(object.position.x.toFixed(3)),
      y: Number(object.position.y.toFixed(3)),
      z: Number(object.position.z.toFixed(3)),
    };
  });
  return { counts, objects: objects.slice(0, 40) };
}

function setupTestHooks(): void {
  if (!new URLSearchParams(window.location.search).has("chopline_test")) return;
  window.__choplineTest = {
    setProfile: (overrides) => {
      profile = sanitizeProfile({ ...cloneProfile(profile), ...overrides });
      selectedLevel = Math.max(1, Math.min(profile.highestLevel, LEVEL_COUNT));
      saveProfile();
      renderShop();
    },
    startLevel: (level) => {
      setPreviewMode(false);
      selectedLevel = Math.max(1, Math.min(LEVEL_COUNT, Math.floor(level)));
      newRun("level", selectedLevel - 1, true);
    },
    startEndless: () => {
      setPreviewMode(false);
      newRun("endless", 0, true);
    },
    forceWin: (score) => {
      if (!currentRun) throw new Error("[chopline-rush] No active run to win");
      currentRun.score = Math.max(currentRun.targetScore, Math.floor(score ?? currentRun.targetScore));
      winRun();
    },
    forceLoss: (score) => {
      if (!currentRun) throw new Error("[chopline-rush] No active run to fail");
      if (score !== undefined) currentRun.score = Math.max(0, Math.floor(score));
      failRun();
    },
    useCoinRevive: () => {
      reviveWithCoins();
    },
    useRewardedRevive: async () => {
      await reviveWithRewarded();
    },
    doubleCoins: async () => {
      await doubleCoins();
    },
    stageLandingProof,
    stageSideLandingProof,
    stageFlatLandingProof,
    stageHandleLandingProof,
    stageSliceProof,
    stageInvalidSliceProof,
    stageSplitVisualProof: (preferredType) => stageSplitVisualProof("level", false, preferredType),
    stageEndlessSplitVisualProof,
    tap: () => {
      flipKnife();
    },
    makeNextFlipReady: () => {
      knife.lastFlipAt = Number.NEGATIVE_INFINITY;
    },
    advance: (seconds) => {
      const total = Math.max(0, seconds);
      const step = 1 / 120;
      const steps = Math.ceil(total / step);
      const previousFrozen = proofFrozen;
      proofFrozen = false;
      for (let i = 0; i < steps; i += 1) {
        update(i === steps - 1 ? total - step * (steps - 1) : step, 0);
      }
      syncKnifeTransform();
      renderer.render(scene, camera);
      proofFrozen = previousFrozen;
    },
    setProofFrozen: (frozen) => {
      proofFrozen = frozen;
    },
    resetMotionClocks: () => {
      for (const entity of platformEntities) entity.moveElapsed = 0;
      for (const entity of obstacleEntities) entity.moveElapsed = 0;
      for (const entity of sliceEntities) entity.moveElapsed = 0;
      updateMovingWorld(0);
      syncKnifeTransform();
      renderer.render(scene, camera);
    },
    setEndlessTimer: (seconds, active = true) => {
      if (!currentRun || currentRun.mode !== "endless") throw new Error("[chopline-rush] No active endless run");
      currentRun.endlessScoreTimer = Math.max(0, seconds);
      currentRun.endlessTimerActive = active;
      updateHud();
    },
    state: () => ({
      screen,
      profile: cloneProfile(profile),
      run: currentRun ? { ...currentRun } : null,
      knife: {
        state: knife.state,
        stuckFace: knife.stuckFace,
        stuckPlatformId: knife.stuckPlatform?.id ?? null,
        slicing: knife.slicing,
        y: knife.position.y,
        z: knife.position.z,
        velocityY: knife.velocity.y,
        velocityZ: knife.velocity.z,
        rotation: knife.rotation,
        landingPunch: knife.landingPunch,
      },
      knifeGeometry: knifeGeometryProof(),
      sliceables: {
        total: sliceEntities.length,
        sliced: sliceEntities.filter((slice) => slice.sliced).length,
        visible: sliceEntities.filter((slice) => slice.group.visible).length,
      },
      endless: {
        cursorZ: endlessCursorZ,
        templates: endlessTemplates.length,
        platforms: platformEntities
          .filter((platformEntity) => platformEntity.kind === "platform")
          .slice(0, 14)
          .map((platformEntity) => ({
            id: platformEntity.id,
            y: platformEntity.mesh.position.y,
            z: platformEntity.mesh.position.z,
            depth: platformEntity.depth,
            height: platformEntity.height,
            moving: Boolean(platformEntity.moving),
            sliceableCount: sliceEntities.filter((slice) => slice.platformId === platformEntity.id && slice.collisionEnabled && !slice.sliced).length,
            obstacleCount: obstacleEntities.filter((obstacle) => obstacle.platformId === platformEntity.id && !obstacle.cleared).length,
            objectCount: sliceEntities.filter((slice) => slice.platformId === platformEntity.id && slice.collisionEnabled && !slice.sliced).length
              + obstacleEntities.filter((obstacle) => obstacle.platformId === platformEntity.id && !obstacle.cleared).length,
            objectTypes: [
              ...new Set([
                ...sliceEntities.filter((slice) => slice.platformId === platformEntity.id && slice.collisionEnabled && !slice.sliced).map((slice) => slice.type),
                ...obstacleEntities.filter((obstacle) => obstacle.platformId === platformEntity.id && !obstacle.cleared).map(() => "obstacle"),
              ]),
            ].sort(),
          })),
        nearObjectCount: sliceEntities.filter((slice) => Math.abs(slice.group.position.z - knife.position.z) < 12 && slice.collisionEnabled && !slice.sliced).length
          + obstacleEntities.filter((obstacle) => Math.abs(obstacle.group.position.z - knife.position.z) < 12 && !obstacle.cleared).length,
        unattachedObjectCount: sliceEntities.filter((slice) => !slice.platformId).length
          + obstacleEntities.filter((obstacle) => !obstacle.platformId).length,
        planEvents: endlessPlanProofEvents.map((event) => ({ ...event })),
      },
      slicePieces: slicePieceSummary(),
      sliceEvents: sliceProofEvents.map((event) => ({ ...event })),
      stickEvents: stickProofEvents.map((event) => ({ ...event })),
      background: backgroundProbeSummary(),
      resultTitle: resultTitle.textContent ?? "",
      resultSubtitle: resultSubtitle.textContent ?? "",
      resultContinue: resultContinue.textContent ?? "",
      resultCoins: resultCoins.textContent ?? "",
    }),
  };
}

void init().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(error);
  getPlaydropSdk()?.host?.setLoadingState?.({ status: "error", message });
});

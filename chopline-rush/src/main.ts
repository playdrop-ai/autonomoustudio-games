import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { normalizeKnifeModel, type KnifeGeometry, type KnifeModelDefinition } from "./game/knifeModel";

export {};

type Mode = "endless";
type Screen = "boot" | "menu" | "shop" | "playing" | "paused" | "result";
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

type HostLoadingState = { status: "loading"; message?: string; progress?: number } | { status: "ready" } | { status: "error"; message?: string };
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
      startEndless: () => void;
      forceLoss: (score?: number) => void;
      stageLandingProof: () => void;
      stageSideLandingProof: () => void;
      stageFlatLandingProof: () => void;
      stageHandleLandingProof: () => void;
      stageHandleSliceProof: () => void;
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

interface PlatformDef {
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

interface ThingDef {
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

interface EndlessTemplate {
  platform: Omit<PlatformDef, "id" | "z">;
  sliceables?: Array<Omit<ThingDef, "platformId">>;
  obstacles?: Array<Omit<ThingDef, "platformId">>;
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
  angularVelocity: { x: number; z: number };
  direction: -1 | 1;
  platformEdgeX: number;
  restAngle: number;
  restAngleX: number | null;
  localBounds: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    zMin?: number;
    zMax?: number;
  };
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
  endlessBest: number;
  totalRuns: number;
  totalSlices: number;
  totalCoinsEarned: number;
  achievements: string[];
}

interface RunState {
  mode: Mode;
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
  coinsAwarded: number;
}

const PROFILE_KEY = "chopline-rush-v2-profile";
const REMOTE_PROFILE_KEY = "chopline-rush-profile";
const LEADERBOARD_LEVEL = "max_level";
const LEADERBOARD_ENDLESS = "endless_score";
const ENDLESS_SCORE_TIMEOUT = 10;
const ENDLESS_GENERATE_AHEAD = 120;
const ENDLESS_CLEANUP_BEHIND = 60;
const ENDLESS_FLIP_DISTANCE = 4;
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
    price: 180,
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
      readyAngle: (Math.PI * 2) / 3,
    },
  },
  {
    id: "cooking",
    displayName: "Cooking Knife",
    price: 0,
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
      readyAngle: (Math.PI * 2) / 3,
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
      readyAngle: (Math.PI * 2) / 3,
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
      readyAngle: (Math.PI * 2) / 3,
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
      readyAngle: (Math.PI * 2) / 3,
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
      readyAngle: (Math.PI * 2) / 3,
    },
  },
];
const STARTER_KNIFE_ID = "cooking";

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

const DEFAULT_PROFILE: Profile = {
  coins: 0,
  ownedKnives: [STARTER_KNIFE_ID],
  equippedKnife: STARTER_KNIFE_ID,
  ownedThemes: [STARTER_THEME_ID],
  equippedTheme: STARTER_THEME_ID,
  endlessBest: 0,
  totalRuns: 0,
  totalSlices: 0,
  totalCoinsEarned: 0,
  achievements: [],
};



function requireAppRoot(): HTMLDivElement {
  const node = document.getElementById("app");
  if (!(node instanceof HTMLDivElement)) throw new Error("[chopline-rush] Missing #app root in template.html");
  return node;
}
const root = requireAppRoot();

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
const shopScreen = requireElement("shop-screen", HTMLDivElement);
const pauseScreen = requireElement("pause-screen", HTMLDivElement);
const resultScreen = requireElement("result-screen", HTMLDivElement);
const knifeList = requireElement("knife-list", HTMLDivElement);
const coinList = requireElement("coin-list", HTMLDivElement);
const toastMessage = requireElement("toast-message", HTMLDivElement);
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
  const equipped = typeof source.equippedKnife === "string" && KNIVES.some((knife) => knife.id === source.equippedKnife) ? source.equippedKnife : STARTER_KNIFE_ID;
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
  return {
    coins: Math.max(a.coins, b.coins),
    ownedKnives: owned,
    equippedKnife: owned.includes(b.equippedKnife) ? b.equippedKnife : a.equippedKnife,
    ownedThemes,
    equippedTheme: ownedThemes.includes(b.equippedTheme) ? b.equippedTheme : a.equippedTheme,
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


const scene = new THREE.Scene();
const PORTRAIT_ASPECT = 720 / 1280;
const camera = new THREE.PerspectiveCamera(60, PORTRAIT_ASPECT, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
const pmremGenerator = new THREE.PMREMGenerator(renderer);
const knifeEnvMap = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
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
  flipSourcePlatform: null as PlatformEntity | null,
  flipSourceFaceY: null as number | null,
  flipSourceFaceType: null as StuckFace | null,
  lastFlipAt: Number.NEGATIVE_INFINITY,
  lastBounceEntity: null as SliceEntity | null,
  rotatingStickPlatform: null as PlatformEntity | null,
  rotatingStickAccumAngle: 0,
  rotatingStickExhaustedPlatform: null as PlatformEntity | null,
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

// ============================================================================
// TUNING - the gameplay feel lives here. SPECS.md documents this motion model;
// keep the two in sync. Everything below the tuning block is implementation.
// ============================================================================
const KNIFE_TIP_EMBED = 0.08;
const BASE_FLIP_Y = 10;
const BASE_FLIP_Z = 8;
const GRAVITY = -20;
const ROTATION_SPEED = 7;
const FLIP_COOLDOWN = 0.4;
const MIN_STICK_ALIGNMENT = 0.3;
const SLICE_ROT_SPEED = 8;
const SLICE_HALFZ_BONUS = 0.3;
const SLICE_LOCK_MIN_ANGLE = (-130 * Math.PI) / 180;
const SLICE_LOCK_MAX_ANGLE = (45 * Math.PI) / 180;
const FRAGMENT_GRAVITY = -15;
const MAX_SUB_STEP = 1 / 120;
const KNIFE_CEILING_DEFAULT = 30;
const KNIFE_LYING_OFFSET = 0.21;
const BLADE_EDGE_OFFSET = 0;
const BLADE_EMBED_DEPTH = 0.15;
const SIDE_EMBED_DEPTH = 0.4;
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
const CAM_OFFSET = new THREE.Vector3(-8, 2, -8);
const CAM_LOOK_AHEAD = 4.5;
const KNIFE_VISUAL_X = 0;
const KNIFE_VISUAL_YAW = 0;
let activeKnifeGeometry: KnifeGeometry = {
  bladeReach: 1.7,
  handleReach: 0.78,
  bladeHalfWidth: 0.25,
  handleHalfWidth: 0.12,
  tipLocal: new THREE.Vector3(0, 1.7, 0),
  hiltLocal: new THREE.Vector3(),
  handleEndLocal: new THREE.Vector3(0, -0.78, 0),
  readyAngle: (Math.PI * 2) / 3,
  yawOffset: 0,
};
const TRAJECTORY_POINT_LIMIT = 42;
const TRAJECTORY_WIDTH = 0.065;
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
  newRun(true);
  setupPreviewHooks();
  setupTestHooks();
  requestAnimationFrame(frame);
}

function showScreen(next: Screen): void {
  screen = next;
  for (const node of [menuScreen, shopScreen, pauseScreen, resultScreen]) {
    node.classList.remove("visible");
  }
  hud.classList.toggle("hidden", next === "menu" || next === "shop" || next === "boot");
  if (next === "menu") menuScreen.classList.add("visible");
  if (next === "shop") shopScreen.classList.add("visible");
  if (next === "paused") pauseScreen.classList.add("visible");
  if (next === "result") resultScreen.classList.add("visible");
  updateHud();
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
  coinPill.classList.add("endless-pos");
  const score = run?.score ?? 0;
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
  if (readable.metalness !== undefined) readable.metalness = 0.3;
  if (readable.roughness !== undefined) readable.roughness = 0.45;
  const withEnv = readable as THREE.Material & { envMap?: THREE.Texture | null; envMapIntensity?: number };
  withEnv.envMap = knifeEnvMap;
  withEnv.envMapIntensity = 0.9;
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

function newRun(makeActive = true): void {
  selectedMode = "endless";
  currentRun = {
    mode: "endless",
    score: 0,
    combo: 0,
    bestCombo: 0,
    targetScore: 0,
    endlessScoreTimer: ENDLESS_SCORE_TIMEOUT,
    endlessTimerActive: false,
    tapHintConsumed: false,
    reward: 30,
    startedAt: performance.now(),
    outcome: null,
    coinsAwarded: 0,
  };
  clearWorld();
  buildEndlessWorld();
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
  knife.rotatingStickExhaustedPlatform = null;
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

function expandedEndlessObjectCount(template: EndlessTemplate): number {
  const sliceableCount = (template.sliceables ?? []).reduce((sum, slice) => sum + (slice.count ?? 1), 0);
  return sliceableCount + (template.obstacles ?? []).length;
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
    const randomWindow = window as Window & { __rngCount?: number };
    const beforeRandom = randomWindow.__rngCount ?? null;
    if (isChoplineTestMode) {
      endlessPlanProofEvents.push({
        templateIndex,
        budget: 0,
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
  const platformDef: PlatformDef = {
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

function createPlatform(def: PlatformDef, index: number): PlatformEntity {
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
  return entity;
}

function getPlatformTop(platform: PlatformEntity): number {
  return platform.mesh.position.y + platform.height / 2;
}

function createRoof(def: PlatformDef, index: number): PlatformEntity {
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
  return entity;
}

function getThingPlacement(def: ThingDef, platformById: Map<string, PlatformEntity>): { position: THREE.Vector3; localPosition: THREE.Vector3; platformId: string | null } {
  const platform = def.platformId ? platformById.get(def.platformId) : undefined;
  if (!platform) {
    const position = new THREE.Vector3(0, def.y ?? 1.5, def.z ?? 0);
    return { position, localPosition: position.clone(), platformId: null };
  }
  const localPosition = new THREE.Vector3(0, def.y ?? 0.6, -platform.depth / 2 + (def.z ?? platform.depth / 2));
  const position = platform.mesh.position.clone().add(localPosition);
  return { position, localPosition, platformId: platform.id };
}

function createSliceable(def: ThingDef, index: number, platformById: Map<string, PlatformEntity>): void {
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
  if (type === "brick") return 0.18;
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
    buildDonutMesh(group);
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

function buildDonutMesh(group: THREE.Group): void {
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

function createObstacle(def: ThingDef, index: number, platformById: Map<string, PlatformEntity>): void {
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

function updateBackgroundChunks(focusZ: number): void {
  const currentChunk = Math.floor(focusZ / 100);
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
    knife.velocity.z = 0;
    const rotDiff = knife.rotationTarget - knife.rotation;
    if (Math.abs(rotDiff) > 0.01) {
      const step = SLICE_ROT_SPEED * dt;
      knife.rotation += Math.abs(rotDiff) <= step ? rotDiff : Math.sign(rotDiff) * step;
    } else {
      knife.rotation = knife.rotationTarget;
    }
    knife.angularVelocity = 0;
  }

  knife.velocity.y += GRAVITY * dt;
  knife.position.addScaledVector(knife.velocity, dt);
  if (knife.position.y > KNIFE_CEILING_DEFAULT) {
    knife.position.y = KNIFE_CEILING_DEFAULT;
    if (knife.velocity.y > 0) knife.velocity.y = 0;
  }

  if (knife.angularVelocity > 0) {
    const nextRotation = knife.rotation + knife.angularVelocity * dt;
    if (nextRotation >= knife.rotationTarget) {
      knife.rotation = knife.rotationTarget;
      knife.angularVelocity = 0;
    } else {
      knife.rotation = nextRotation;
    }
  } else {
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
  knife.rotatingStickExhaustedPlatform = null;
  knife.previousPosition.copy(knife.position);
  knife.previousRotation = knife.rotation;
  if (wasAirborne) {
    knife.velocity.set(0, BASE_FLIP_Y, BASE_FLIP_Z);
  } else if (knife.stuckFace === "bottom") {
    const bottomCoeff = knife.flipSourcePlatform?.kind === "roof" ? 0.25 : 0.1;
    knife.velocity.set(0, -BASE_FLIP_Y * bottomCoeff, BASE_FLIP_Z);
  } else if (knife.stuckFace === "side") {
    const sideZScale = knife.stuckSideDir < 0 ? 0.5 : 1;
    knife.velocity.set(0, BASE_FLIP_Y, BASE_FLIP_Z * knife.stuckSideDir * sideZScale);
  } else {
    knife.velocity.set(0, BASE_FLIP_Y, BASE_FLIP_Z);
  }
  knife.stuckFace = "top";
  knife.angularVelocity = ROTATION_SPEED;
  knife.rotationTarget = nextRotationTarget(knife.rotation);
  knife.lastPlatformId = "";
  knife.landingPunch = 0;
  trajectoryPoints = [knifeBladeTip()];
  trajectoryLine.visible = true;
  audio.play("knifeFlip", 0.5);
  pulseHaptic(5);
  void audio.startMusic();
}

function nextRotationTarget(rotation: number): number {
  const ready = activeKnifeGeometry.readyAngle;
  const minTarget = rotation + Math.PI;
  const n = Math.ceil((minTarget - ready) / (Math.PI * 2));
  return n * Math.PI * 2 + ready;
}

function nearestCanonicalAngle(rotation: number): number {
  const ready = activeKnifeGeometry.readyAngle;
  return Math.round((rotation - ready) / (Math.PI * 2)) * Math.PI * 2 + ready;
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
  knife.rotatingStickExhaustedPlatform = null;
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
  spawnParticles(knifeHandleEnd(), 0xffe4ba, 4);
  startCameraShake(0.05, 0.08);
  pulseHaptic(8);
  updateHud();
}

function sliceObject(slice: SliceEntity, playJuice = true): void {
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
  spawnParticles(position, colorForSlice(slice.type), slice.type === "brick" ? 3 : slice.type === "wooden_stake" ? 7 : 5);
  spawnSlicePieces(slice);
  slice.group.visible = false;
  spawnScorePopup(position, points);
  if (playJuice) {
    if (currentRun.combo === 3 || currentRun.combo % 8 === 0) {
      spawnPraise(position, currentRun.combo >= 16 ? "PERFECT" : currentRun.combo >= 8 ? "GREAT" : "NICE");
    }
    flashFeedback("slice");
    startCameraShake(0.055, 0.09);
    pulseHaptic(12);
    audio.play(slice.type === "wooden_stake" ? "sliceWood" : "sliceSoft", 0.7);
  }
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

function widenStackSiblings(target: SliceEntity): void {
  restoreWidenedObjects();
  for (const slice of sliceEntities) {
    if (slice.configIndex !== target.configIndex || slice === target || slice.sliced) continue;
    slice.collision.originalHalfZ = slice.collision.halfZ;
    slice.collision.halfZ += SLICE_HALFZ_BONUS;
  }
}

function handleSliceableCollisions(
  bladeOBB: KnifeOBB,
  handleOBB: KnifeOBB,
  midBladeOBB: KnifeOBB,
  midHandleOBB: KnifeOBB,
): boolean {
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
    const hits = sliceablesHitByBlade(bladeOBB, midBladeOBB);
    for (const slice of hits) sliceObject(slice);
    if (hits.length > 0) knife.velocity.y *= 0.85;
    return false;
  }

  const bladeHit = sliceablesHitByBlade(bladeOBB, midBladeOBB)[0] ?? null;
  if (bladeHit) {
    sliceObject(bladeHit);
    hitStopTime = Math.max(hitStopTime, 0.04);
    const targetRot = nearestCanonicalAngle(knife.rotation);
    const angleDiff = knife.rotation - targetRot;
    if (angleDiff >= SLICE_LOCK_MIN_ANGLE && angleDiff <= SLICE_LOCK_MAX_ANGLE) {
      knife.slicing = true;
      knife.flipSourcePlatform = null;
      knife.flipSourceFaceY = null;
      knife.flipSourceFaceType = null;
      widenStackSiblings(bladeHit);
      knife.rotationTarget = targetRot;
      const hasSiblingBelow = sliceEntities.some((slice) =>
        slice.configIndex === bladeHit.configIndex && !slice.sliced
        && slice.group.position.y < bladeHit.group.position.y);
      knife.velocity.z = hasSiblingBelow ? 0 : knife.velocity.z * 0.3;
      if (knife.velocity.y > 0) knife.velocity.y = 0;
      knife.velocity.y *= 0.7;
    } else {
      knife.velocity.y *= 0.7;
      knife.velocity.z *= 0.7;
      knife.angularVelocity *= 0.5;
    }
    return false;
  }

  for (const slice of sliceEntities) {
    if (slice.sliced || !slice.collisionEnabled || slice === knife.lastBounceEntity) continue;
    if (
      !obbObjectOverlap(handleOBB, slice.group.position, slice.collision)
      && !obbObjectOverlap(midHandleOBB, slice.group.position, slice.collision)
    ) {
      continue;
    }
    let bladeWillHit = false;
    for (let da = Math.PI / 4; da <= Math.PI; da += Math.PI / 4) {
      const aheadOBB = getBladeOBBAt(knife.position.y, knife.position.z, knife.rotation + da);
      if (obbObjectOverlap(aheadOBB, slice.group.position, slice.collision)) {
        bladeWillHit = true;
        break;
      }
    }
    if (bladeWillHit) {
      sliceObject(slice);
      knife.velocity.y *= 0.85;
      break;
    }
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
  if (source) {
    const { yMin, yMax, zMin, zMax } = platformExtents(source);
    const reach = Math.max(activeKnifeGeometry.bladeReach, activeKnifeGeometry.handleReach) + 0.1;
    const pivotClearY = knife.position.y > yMax + reach || knife.position.y < yMin - reach;
    const pivotClearZ = knife.position.z < zMin - reach || knife.position.z > zMax + reach;
    if (pivotClearY || pivotClearZ) {
      knife.flipSourcePlatform = null;
      knife.flipSourceFaceY = null;
      knife.flipSourceFaceType = null;
    }
  }
  const exhausted = knife.rotatingStickExhaustedPlatform;
  if (exhausted) {
    const { yMin, yMax, zMin, zMax } = platformExtents(exhausted);
    const reach = activeKnifeGeometry.bladeReach + 0.1;
    const pivotClearY = knife.position.y > yMax + reach || knife.position.y < yMin - reach;
    const pivotClearZ = knife.position.z < zMin - reach || knife.position.z > zMax + reach;
    if (pivotClearY || pivotClearZ) knife.rotatingStickExhaustedPlatform = null;
  }
}

function checkRotatingStick(bladeOBB: KnifeOBB, midBladeOBB: KnifeOBB): boolean {
  if (knife.state !== "rotating-stick" || !knife.rotatingStickPlatform) return false;
  for (const slice of sliceablesHitByBlade(bladeOBB, midBladeOBB)) sliceObject(slice);
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

  if (knife.rotatingStickAccumAngle > 2.25 * Math.PI) {
    knife.state = "flying";
    knife.rotatingStickExhaustedPlatform = knife.rotatingStickPlatform;
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
    if (platformEntity === knife.rotatingStickExhaustedPlatform) continue;
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

const BRICK_INTERIOR_COLORS = [
  0xff3f76,
  0xff9f1c,
  0xffe51f,
  0x35d45a,
  0x20c5df,
  0x3987f6,
  0xd64df1,
];

function interiorColorForSlice(type: string, stackIndex = 0): number {
  if (type === "brick") return BRICK_INTERIOR_COLORS[stackIndex % BRICK_INTERIOR_COLORS.length] ?? 0xff3f76;
  if (type === "watermelon") return 0xff4f63;
  if (type === "apple") return 0xffedb5;
  if (type === "orange") return 0xffb429;
  if (type === "emoji") return 0xffe56b;
  if (type === "book") return 0xfff4cf;
  if (type === "camera") return 0x30343d;
  if (type === "donut" || type === "baguette") return 0xf5deb3;
  if (type === "cheese") return 0xfff8dc;
  if (type === "sausage") return 0xff9696;
  if (type === "wooden_stake") return 0xdeb887;
  return colorForSlice(type);
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
      new THREE.MeshStandardMaterial({
        color: interiorColorForSlice(type, stackIndex),
        emissive: interiorColorForSlice(type, stackIndex),
        emissiveIntensity: 0.08,
        roughness: 0.6,
        side: THREE.DoubleSide,
      }),
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
    const cap = new THREE.Mesh(
      new THREE.PlaneGeometry(0.6, BOOK_HEIGHT),
      new THREE.MeshPhongMaterial({ color: interiorColorForSlice(type), shininess: 8, side: THREE.DoubleSide }),
    );
    cap.position.y = BOOK_HEIGHT / 2;
    cap.rotation.y = Math.PI / 2;
    group.add(cap);
  } else if (type === "watermelon" || type === "apple") {
    const radius = type === "watermelon" ? 0.5 : 0.4;
    const half = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 16, 0, Math.PI), new THREE.MeshPhongMaterial({ color: type === "watermelon" ? 0x228b22 : 0xff4757 }));
    half.rotation.y = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    half.position.y = radius;
    half.castShadow = true;
    group.add(half);
    const cutFace = new THREE.Mesh(
      new THREE.CircleGeometry(radius, 16),
      new THREE.MeshPhongMaterial({ color: interiorColorForSlice(type), shininess: 24, side: THREE.DoubleSide }),
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
    const face = new THREE.Mesh(new THREE.CircleGeometry(radius, 16), new THREE.MeshPhongMaterial({ color: interiorColorForSlice(type), side: THREE.DoubleSide }));
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
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(0.75, 0.75),
      new THREE.MeshPhongMaterial({ color: interiorColorForSlice(type), shininess: 30, side: THREE.DoubleSide }),
    );
    face.position.y = 0.375;
    face.rotation.y = Math.PI / 2;
    group.add(face);
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
  const supportingPlatform = findSurfaceBelow(slice.group.position.z, slice.group.position.y + 0.05).platform;
  const platformEdgeX = (supportingPlatform?.width ?? 3) / 2;
  for (const dir of [-1, 1]) {
    const direction = dir as -1 | 1;
    const piece = buildSliceHalf(slice.type, direction, slice.stackIndex);
    piece.position.copy(slice.group.position);
    if (slice.type === "donut") piece.position.y += 0.5 * SLICEABLE_VISUAL_SCALE;
    piece.traverse((node) => {
      if (node instanceof THREE.Mesh) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });
    particleGroup.add(piece);
    const velocity = new THREE.Vector3(
      direction * (5 + Math.random() * 4),
      0,
      (Math.random() - 0.5) * 4,
    );
    const slicePiece: SlicePiece = {
      mesh: piece,
      sourceId: slice.id,
      spawnPosition: piece.position.clone(),
      phase: "sliding",
      objectType: slice.type,
      velocity,
      angularVelocity: { x: 0, z: direction * -(0.5 + Math.random() * 0.8) },
      direction,
      platformEdgeX,
      restAngle: 0,
      restAngleX: null,
      localBounds: slicePieceLocalBounds(slice.type, direction),
    };
    piece.userData.slicePiece = slicePiece;
    slicePieces.push(slicePiece);
  }
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

function pieceLowestLocalY(piece: SlicePiece): number {
  const bounds = piece.localBounds;
  const sinR = Math.sin(piece.mesh.rotation.z);
  const cosR = Math.cos(piece.mesh.rotation.z);
  return (sinR > 0 ? bounds.xMin : bounds.xMax) * sinR + (cosR > 0 ? bounds.yMin : bounds.yMax) * cosR;
}

function settleGroundedPiece(piece: SlicePiece, dt: number): void {
  const mesh = piece.mesh;
  mesh.position.x += piece.velocity.x * dt;
  mesh.position.z += piece.velocity.z * dt;
  piece.velocity.x *= 1 - 4 * dt;
  piece.velocity.z *= 1 - 4 * dt;
  if (Math.abs(piece.velocity.x) < 0.05) piece.velocity.x = 0;
  if (Math.abs(piece.velocity.z) < 0.05) piece.velocity.z = 0;

  const springK = 40;
  const damping = 4;
  if (piece.restAngleX !== null) {
    const diffX = piece.restAngleX - mesh.rotation.x;
    piece.angularVelocity.x += diffX * springK * dt;
    piece.angularVelocity.x *= 1 - damping * dt;
    mesh.rotation.x += piece.angularVelocity.x * dt;
    if (Math.abs(diffX) < 0.01 && Math.abs(piece.angularVelocity.x) < 0.01) {
      mesh.rotation.x = piece.restAngleX;
      piece.angularVelocity.x = 0;
    }
  }
  if (piece.restAngleX === null || piece.objectType === "cheese") {
    const diff = piece.restAngle - mesh.rotation.z;
    piece.angularVelocity.z += diff * springK * dt;
    piece.angularVelocity.z *= 1 - damping * dt;
    mesh.rotation.z += piece.angularVelocity.z * dt;
    if (Math.abs(diff) < 0.01 && Math.abs(piece.angularVelocity.z) < 0.01) {
      mesh.rotation.z = piece.restAngle;
      piece.angularVelocity.z = 0;
    }
  }

  const bounds = piece.localBounds;
  if (piece.objectType === "donut") {
    const restHeight = GROUND_Y + Math.max(Math.abs(bounds.zMin ?? 0), Math.abs(bounds.zMax ?? 0));
    mesh.position.y += (restHeight - mesh.position.y) * Math.min(1, 8 * dt);
  } else if (piece.objectType === "cheese") {
    const restHeight = GROUND_Y + 0.127 * SLICEABLE_VISUAL_SCALE;
    mesh.position.y += (restHeight - mesh.position.y) * Math.min(1, 8 * dt);
  } else {
    mesh.position.y = GROUND_Y - pieceLowestLocalY(piece);
  }
}

function lockPieceRestAngle(piece: SlicePiece): void {
  const mesh = piece.mesh;
  const halfPi = Math.PI / 2;
  const bounds = piece.localBounds;
  const isFlat = bounds.xMax - bounds.xMin > bounds.yMax - bounds.yMin;

  let nearest: number;
  if (Math.abs(mesh.rotation.z) < 0.1) {
    nearest = 0;
  } else if (mesh.rotation.z > 0) {
    nearest = Math.ceil(mesh.rotation.z / halfPi) * halfPi;
  } else {
    nearest = Math.floor(mesh.rotation.z / halfPi) * halfPi;
  }

  if (isFlat) {
    piece.restAngle = nearest;
  } else {
    const nRatio = Math.round(nearest / halfPi);
    piece.restAngle = nRatio % 2 === 0 ? (nRatio + (piece.direction < 0 ? -1 : 1)) * halfPi : nearest;
  }
  if (piece.objectType === "donut") {
    piece.restAngle = piece.direction * -halfPi;
    piece.restAngleX = -halfPi;
    piece.angularVelocity.x = (piece.restAngleX - mesh.rotation.x) * 3;
  }
  if (piece.objectType === "baguette" || piece.objectType === "sausage") {
    piece.restAngle = Math.round(mesh.rotation.z / Math.PI) * Math.PI;
  }
  if (piece.objectType === "cheese") {
    piece.restAngle = piece.direction * -halfPi;
    piece.restAngleX = -Math.atan2(0.27, 0.75);
    piece.angularVelocity.x = (piece.restAngleX - mesh.rotation.x) * 3;
  }
  piece.angularVelocity.z = (piece.restAngle - mesh.rotation.z) * 6;
}

function updateSlicePieces(dt: number): void {
  for (let i = slicePieces.length - 1; i >= 0; i -= 1) {
    const piece = slicePieces[i];
    if (!piece) continue;
    const mesh = piece.mesh;

    if (piece.phase === "sliding") {
      mesh.position.x += piece.velocity.x * dt;
      mesh.position.z += piece.velocity.z * dt;
      piece.velocity.x *= 1 - 1.0 * dt;
      piece.velocity.z *= 1 - 1.0 * dt;
      mesh.rotation.z += piece.angularVelocity.z * dt;
      if (Math.abs(mesh.position.x) >= piece.platformEdgeX) {
        piece.phase = "falling";
        piece.velocity.y = -1;
        piece.velocity.x = piece.direction * 2;
        piece.angularVelocity.z = piece.direction * -2;
      }
    } else if (piece.phase === "falling") {
      piece.velocity.y += FRAGMENT_GRAVITY * dt;
      mesh.position.addScaledVector(piece.velocity, dt);
      mesh.rotation.z += piece.angularVelocity.z * dt;
      const lowestY = mesh.position.y + pieceLowestLocalY(piece);
      if (lowestY <= GROUND_Y) {
        mesh.position.y += GROUND_Y - lowestY;
        piece.velocity.y = 0;
        piece.phase = "grounded";
        lockPieceRestAngle(piece);
      }
    } else {
      settleGroundedPiece(piece, dt);
    }

    if (camera.position.z - mesh.position.z > 15) {
      removeAndDispose(particleGroup, mesh);
      slicePieces.splice(i, 1);
    }
  }
}

function updateCamera(dt: number): void {
  tempVector.copy(knife.position).add(CAM_OFFSET);
  camera.position.x += (tempVector.x - camera.position.x) * 5 * dt;
  camera.position.y += (tempVector.y - camera.position.y) * 5 * dt;
  camera.position.z += (tempVector.z - camera.position.z) * 5 * dt;
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
  knife.rotatingStickExhaustedPlatform = null;
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
  startGameOverTumble();
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
  knife.rotatingStickExhaustedPlatform = null;
  knife.lastPlatformId = nearest?.id ?? "";
  resetTrajectoryTrail();
  syncKnifeTransform();
  autoFlipTimer = 0.35;
  showScreen("playing");
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
  profile.totalRuns += 1;
  profile.endlessBest = Math.max(profile.endlessBest, run.score);
  saveProfile();
  renderResult(run);
  void submitMeta(run);
  showScreen("result");
}

function renderResult(run: RunState): void {
  resultScreen.classList.toggle("endless-game-over", true);
  resultTitle.textContent = run.score >= profile.endlessBest && run.score > 0 ? "New Best!" : "Run Over";
  resultSubtitle.innerHTML = `Score <span>${formatNumber(run.score)}</span> · Best ${formatNumber(profile.endlessBest)}`;
  resultContinue.textContent = "Try Again";
  resultScore.textContent = formatNumber(run.score);
  resultCoins.textContent = `+${formatNumber(run.coinsAwarded)}`;
}

async function submitMeta(run: RunState): Promise<void> {
  try {
    await platform.submitLeaderboard(LEADERBOARD_ENDLESS, profile.endlessBest);
  } catch {
    // The run remains valid if network meta submission fails.
  }
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

function nextRun(): void {
  void startRun();
}

async function startRun(): Promise<void> {
  selectedMode = "endless";
  previousScreen = "playing";
  newRun(true);
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
  void button;
  if (action === "show-menu" || action === "start-endless" || action === "restart") {
    void startRun();
  } else if (action === "open-shop") {
    showShop();
  } else if (action === "close-shop") {
    closeShop();
  } else if (action === "pause") {
    if (screen === "playing") showScreen("paused");
  } else if (action === "resume") {
    showScreen("playing");
  } else if (action === "finish-run") {
    finishRun();
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
  if (event.code === "KeyR") void startRun();
  if (event.code === "Escape" && screen === "playing") showScreen("paused");
});

function resize(): void {
  const hostWidth = window.innerWidth || 720;
  const hostHeight = window.innerHeight || 1280;
  let width = hostWidth;
  let height = hostHeight;
  let gameAspect = hostWidth / hostHeight;
  if (hostWidth > hostHeight) {
    gameAspect = PORTRAIT_ASPECT;
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
      newRun(true);
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
  newRun(true);
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
  knife.rotatingStickExhaustedPlatform = null;
  knife.landingPunch = 0;
  resetTrajectoryTrail();
  syncKnifeTransform();
  snapCameraToKnife();
  updateHud();
}

function stageFlatLandingProof(): void {
  proofFrozen = false;
  setPreviewMode(false);
  newRun(true);
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
  knife.rotatingStickExhaustedPlatform = null;
  knife.landingPunch = 0;
  resetTrajectoryTrail();
  syncKnifeTransform();
  snapCameraToKnife();
  updateHud();
}

function stageSideLandingProof(): void {
  proofFrozen = false;
  setPreviewMode(false);
  newRun(true);
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
  knife.rotatingStickExhaustedPlatform = null;
  knife.landingPunch = 0;
  stickToFace("z", -1, zMin, platformEntity);
  snapCameraToKnife();
  updateHud();
}

function stageHandleLandingProof(): void {
  proofFrozen = false;
  setPreviewMode(false);
  newRun(true);
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
  knife.rotatingStickExhaustedPlatform = null;
  knife.landingPunch = 0;
  resetTrajectoryTrail();
  syncKnifeTransform();
  snapCameraToKnife();
  updateHud();
}

function stageHandleSliceProof(): void {
  proofFrozen = false;
  setPreviewMode(false);
  newRun(true);
  if (!currentRun) throw new Error("[chopline-rush] No active run for handle slice proof");
  const slice = sliceEntities.find((item) => !item.sliced && item.type === "emoji");
  if (!slice) throw new Error("[chopline-rush] No sliceable available for handle slice proof");
  currentRun.targetScore = 9999;
  const topY = slice.group.position.y + slice.collision.topY;
  const centerZ = slice.group.position.z + (slice.collision.centerZ ?? 0);
  knife.position.set(KNIFE_VISUAL_X, topY + activeKnifeGeometry.handleReach - 0.04, centerZ);
  knife.previousPosition.copy(knife.position).add(new THREE.Vector3(0, 0, -0.08));
  knife.rotation = 0;
  knife.previousRotation = 0;
  knife.velocity.set(0, 0, BASE_FLIP_Z);
  knife.angularVelocity = 0;
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
  knife.rotatingStickExhaustedPlatform = null;
  knife.landingPunch = 0;
  resetTrajectoryTrail();
  syncKnifeTransform();
  snapCameraToKnife();
  updateHud();
}

function stageCutContact(slice: SliceEntity, rotation: number): void {
  const centerY = slice.group.position.y + (slice.collision.bottomY + slice.collision.topY) / 2;
  const centerZ = slice.group.position.z + (slice.collision.centerZ ?? 0);
  const contactDepth = activeKnifeGeometry.bladeReach * 0.88;
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
  knife.rotatingStickExhaustedPlatform = null;
  knife.landingPunch = 0;
  resetTrajectoryTrail();
  syncKnifeTransform();
  snapCameraToKnife();
  updateHud();
}

function stageSliceProof(): void {
  proofFrozen = false;
  setPreviewMode(false);
  newRun(true);
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
  newRun(true);
  if (!currentRun) throw new Error("[chopline-rush] No active run for invalid slice proof");
  const slice = sliceEntities.find((item) => !item.sliced);
  if (!slice) throw new Error("[chopline-rush] No sliceable available for invalid slice proof");
  currentRun.targetScore = 9999;
  stageCutContact(slice, 0);
}

function stageSplitVisualProof(reuseActiveRun = false, preferredType?: string): void {
  proofFrozen = false;
  setPreviewMode(false);
  if (!reuseActiveRun || !currentRun || screen !== "playing") {
    newRun(true);
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
  currentRun.score = 0;
  currentRun.endlessScoreTimer = ENDLESS_SCORE_TIMEOUT;
  currentRun.endlessTimerActive = true;
  currentRun.tapHintConsumed = true;
  tapHint.classList.add("hidden");
  stageCutContact(slice, THREE.MathUtils.degToRad(125));
}

function stageEndlessSplitVisualProof(preferredType?: string): void {
  stageSplitVisualProof(true, preferredType);
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
      saveProfile();
      renderShop();
    },
    startEndless: () => {
      setPreviewMode(false);
      newRun(true);
    },
    forceLoss: (score) => {
      if (!currentRun) throw new Error("[chopline-rush] No active run to fail");
      if (score !== undefined) currentRun.score = Math.max(0, Math.floor(score));
      failRun();
    },
    stageLandingProof,
    stageSideLandingProof,
    stageFlatLandingProof,
    stageHandleLandingProof,
    stageHandleSliceProof,
    stageSliceProof,
    stageInvalidSliceProof,
    stageSplitVisualProof: (preferredType) => stageSplitVisualProof(false, preferredType),
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
        x: knife.position.x,
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

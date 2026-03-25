/// <reference types="playdrop-sdk-types" />

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import {
  DESTINATION_META,
  type DestinationId,
  type DifficultyProfile,
  type ScoreState,
  type SwitchKey,
  type SwitchStates,
  applySuccessfulDelivery,
  canSpawnTrain,
  createDefaultSwitchStates,
  createInitialScoreState,
  fillUpcomingQueue,
  getDifficulty,
  resetCombo,
  toggleSwitchState,
} from "./game-logic";
import {
  BOARD_DEPTH,
  BOARD_WIDTH,
  createRailNetwork,
  getNextSegmentId,
  type RailNetwork,
  type SegmentId,
} from "./network";
import { SWITCHYARD_CSS } from "./styles";

const BEST_SCORE_KEY = "switchyard-sprint-best-score";
const ENGINE_ASSET = "assets/models/train-electric-bullet-a.glb";
const MODEL_FORWARD_ROTATION = 0;
const MAX_DELTA_SECONDS = 0.05;

type AppPhase = "ready" | "playing" | "gameover";

interface LoadingStatePayload {
  status: "loading" | "ready" | "error";
  progress?: number;
  message?: string;
}

interface MinimalPlaydropSdk {
  host: {
    setLoadingState(payload: LoadingStatePayload): void;
  };
}

interface SwitchButtonRefs {
  button: HTMLButtonElement;
  route: HTMLElement;
  hint: HTMLElement;
}

interface UiRefs {
  appRoot: HTMLDivElement;
  canvas: HTMLCanvasElement;
  score: HTMLElement;
  combo: HTMLElement;
  best: HTMLElement;
  deliveries: HTMLElement;
  queueItems: HTMLElement[];
  switches: Record<SwitchKey, SwitchButtonRefs>;
  readyOverlay: HTMLDivElement;
  gameOverOverlay: HTMLDivElement;
  startButton: HTMLButtonElement;
  restartButton: HTMLButtonElement;
  finalScore: HTMLElement;
  finalBest: HTMLElement;
  finalDeliveries: HTMLElement;
}

interface TrainTemplates {
  engine: THREE.Group;
  carriages: Record<DestinationId, THREE.Group>;
}

interface ActiveTrain {
  id: number;
  target: DestinationId;
  segmentId: SegmentId;
  progress: number;
  speed: number;
  group: THREE.Group;
  glowMaterial: THREE.MeshStandardMaterial;
}

interface SwitchMarker {
  pivot: THREE.Group;
  lamp: THREE.MeshStandardMaterial;
}

interface DepotVisual {
  light: THREE.MeshStandardMaterial;
  body: THREE.MeshStandardMaterial;
  pulse: number;
}

interface BurstEffect {
  mesh: THREE.Mesh;
  age: number;
  duration: number;
}

class SwitchyardApp {
  private readonly ui: UiRefs;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(36, 1, 0.1, 120);
  private readonly timer = new THREE.Timer();
  private readonly network: RailNetwork = createRailNetwork();
  private readonly loader = new GLTFLoader();
  private readonly ambientLight = new THREE.AmbientLight(0xffffff, 1.9);
  private readonly sunLight = new THREE.DirectionalLight(0xfff3d7, 2.1);
  private readonly rimLight = new THREE.DirectionalLight(0x87d8ff, 0.7);
  private readonly burstEffects: BurstEffect[] = [];
  private readonly switchMarkers: Record<SwitchKey, SwitchMarker>;
  private readonly depotVisuals: Record<DestinationId, DepotVisual>;
  private readonly random = createRandomSourceFromLocation();

  private templates: TrainTemplates | null = null;
  private switches: SwitchStates = createDefaultSwitchStates();
  private scoreState: ScoreState = createInitialScoreState();
  private difficulty: DifficultyProfile = getDifficulty(0);
  private bestScore = loadBestScore();
  private phase: AppPhase = "ready";
  private upcomingQueue: DestinationId[] = [];
  private activeTrains: ActiveTrain[] = [];
  private nextTrainId = 1;
  private msSinceLastSpawn = 0;
  private audioContext: AudioContext | null = null;

  constructor(
    private readonly sdk: MinimalPlaydropSdk,
    private readonly mount: HTMLElement,
  ) {
    attachStyles();
    this.ui = this.buildUi();
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.ui.canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.timer.connect(document);

    this.switchMarkers = {
      branch: this.createSwitchMarker(this.network.junctionPositions.branch, 0xffd166),
      upper: this.createSwitchMarker(this.network.junctionPositions.upper, 0x58b6ff),
      lower: this.createSwitchMarker(this.network.junctionPositions.lower, 0x67db94),
    };

    this.depotVisuals = {
      top: this.createDepotVisual("top"),
      middle: this.createDepotVisual("middle"),
      bottom: this.createDepotVisual("bottom"),
    };

    this.buildScene();
    this.bindEvents();
  }

  async init(): Promise<void> {
    this.sdk.host.setLoadingState({
      status: "loading",
      progress: 0.12,
      message: "Laying track",
    });

    this.templates = await this.loadTemplates();

    this.sdk.host.setLoadingState({
      status: "loading",
      progress: 0.78,
      message: "Warming up trains",
    });

    this.resize();
    this.resetToReadyState();
    this.timer.reset();
    requestAnimationFrame(this.frame);
    this.sdk.host.setLoadingState({ status: "ready" });
  }

  private buildUi(): UiRefs {
    this.mount.innerHTML = `
      <div class="switchyard-app">
        <div class="switchyard-shell">
          <div class="switchyard-stage">
            <canvas class="switchyard-canvas"></canvas>

            <div class="switchyard-hud">
              <section class="switchyard-card">
                <div class="switchyard-card__eyebrow">Live Yard</div>
                <div class="switchyard-card__title">Switchyard Sprint</div>
                <div class="switchyard-card__copy">Route each cargo train to the depot with the matching color before the next one rolls in.</div>
              </section>

              <section class="switchyard-card">
                <div class="switchyard-card__eyebrow">Run Stats</div>
                <div class="switchyard-stats">
                  <div class="switchyard-stat">
                    <div class="switchyard-stat__label">Score</div>
                    <div class="switchyard-stat__value" data-field="score">0</div>
                  </div>
                  <div class="switchyard-stat">
                    <div class="switchyard-stat__label">Combo</div>
                    <div class="switchyard-stat__value" data-field="combo">0</div>
                  </div>
                  <div class="switchyard-stat">
                    <div class="switchyard-stat__label">Best</div>
                    <div class="switchyard-stat__value" data-field="best">0</div>
                  </div>
                  <div class="switchyard-stat">
                    <div class="switchyard-stat__label">Delivered</div>
                    <div class="switchyard-stat__value" data-field="deliveries">0</div>
                  </div>
                </div>
              </section>

              <section class="switchyard-card">
                <div class="switchyard-card__eyebrow">Upcoming</div>
                <div class="switchyard-queue" data-field="queue">
                  ${Array.from({ length: 5 }, () => `
                    <div class="switchyard-queue-item">
                      <div class="switchyard-queue-item__dot"></div>
                      <div class="switchyard-queue-item__label">Wait</div>
                    </div>
                  `).join("")}
                </div>
              </section>
            </div>

            <div class="switchyard-controls">
              <button class="switchyard-switch" data-switch="branch" data-accent="blue" type="button">
                <span class="switchyard-switch__index">1</span>
                <span class="switchyard-switch__title">Branch</span>
                <span class="switchyard-switch__route">Upper Line</span>
                <span class="switchyard-switch__hint">Send the next train into the upper half of the yard.</span>
              </button>

              <button class="switchyard-switch" data-switch="upper" data-accent="blue" type="button">
                <span class="switchyard-switch__index">2</span>
                <span class="switchyard-switch__title">Upper Switch</span>
                <span class="switchyard-switch__route">Top Depot</span>
                <span class="switchyard-switch__hint">Choose blue at the top or red through the middle.</span>
              </button>

              <button class="switchyard-switch" data-switch="lower" data-accent="green" type="button">
                <span class="switchyard-switch__index">3</span>
                <span class="switchyard-switch__title">Lower Switch</span>
                <span class="switchyard-switch__route">Bottom Depot</span>
                <span class="switchyard-switch__hint">Choose red through the middle or green at the bottom.</span>
              </button>
            </div>

            <div class="switchyard-overlay" data-overlay="ready">
              <div class="switchyard-panel">
                <div class="switchyard-panel__eyebrow">Tabletop Traffic</div>
                <div class="switchyard-panel__title">Flip the yard before it flips you.</div>
                <div class="switchyard-panel__copy">
                  Every train already knows its color. Your job is to send blue up, red through the center, and green down before the pace gets ugly.
                </div>
                <div class="switchyard-panel__meta">
                  <span class="switchyard-chip">Desktop: 1 / 2 / 3</span>
                  <span class="switchyard-chip">Mobile: tap the switch cards</span>
                </div>
                <button class="switchyard-primary" data-action="start" type="button">Start The Yard</button>
                <div class="switchyard-desktop-hint">No scrolling, no menus, no filler. Keep the board readable and react fast.</div>
              </div>
            </div>

            <div class="switchyard-overlay" data-overlay="gameover" hidden>
              <div class="switchyard-panel">
                <div class="switchyard-panel__eyebrow">Run Over</div>
                <div class="switchyard-panel__title">One wrong depot and the whole schedule snaps.</div>
                <div class="switchyard-results">
                  <div class="switchyard-result">
                    <div class="switchyard-result__label">Score</div>
                    <div class="switchyard-result__value" data-result="score">0</div>
                  </div>
                  <div class="switchyard-result">
                    <div class="switchyard-result__label">Best</div>
                    <div class="switchyard-result__value" data-result="best">0</div>
                  </div>
                  <div class="switchyard-result">
                    <div class="switchyard-result__label">Delivered</div>
                    <div class="switchyard-result__value" data-result="deliveries">0</div>
                  </div>
                </div>
                <button class="switchyard-primary" data-action="restart" type="button">Run It Back</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    const appRoot = queryRequired(this.mount, ".switchyard-app", HTMLDivElement);
    const root = queryRequired(this.mount, ".switchyard-stage", HTMLDivElement);
    const score = queryRequired(root, '[data-field="score"]', HTMLElement);
    const combo = queryRequired(root, '[data-field="combo"]', HTMLElement);
    const best = queryRequired(root, '[data-field="best"]', HTMLElement);
    const deliveries = queryRequired(root, '[data-field="deliveries"]', HTMLElement);
    const queueRoot = queryRequired(root, '[data-field="queue"]', HTMLElement);
    const queueItems = Array.from(queueRoot.querySelectorAll<HTMLElement>(".switchyard-queue-item"));

    const branchButton = queryRequired(root, '[data-switch="branch"]', HTMLButtonElement);
    const upperButton = queryRequired(root, '[data-switch="upper"]', HTMLButtonElement);
    const lowerButton = queryRequired(root, '[data-switch="lower"]', HTMLButtonElement);

    return {
      appRoot,
      canvas: queryRequired(root, ".switchyard-canvas", HTMLCanvasElement),
      score,
      combo,
      best,
      deliveries,
      queueItems,
      switches: {
        branch: collectSwitchButton(branchButton),
        upper: collectSwitchButton(upperButton),
        lower: collectSwitchButton(lowerButton),
      },
      readyOverlay: queryRequired(root, '[data-overlay="ready"]', HTMLDivElement),
      gameOverOverlay: queryRequired(root, '[data-overlay="gameover"]', HTMLDivElement),
      startButton: queryRequired(root, '[data-action="start"]', HTMLButtonElement),
      restartButton: queryRequired(root, '[data-action="restart"]', HTMLButtonElement),
      finalScore: queryRequired(root, '[data-result="score"]', HTMLElement),
      finalBest: queryRequired(root, '[data-result="best"]', HTMLElement),
      finalDeliveries: queryRequired(root, '[data-result="deliveries"]', HTMLElement),
    };
  }

  private buildScene(): void {
    this.scene.add(this.ambientLight);

    this.sunLight.position.set(9, 18, 8);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.setScalar(2048);
    this.sunLight.shadow.camera.near = 1;
    this.sunLight.shadow.camera.far = 60;
    this.sunLight.shadow.camera.left = -20;
    this.sunLight.shadow.camera.right = 20;
    this.sunLight.shadow.camera.top = 20;
    this.sunLight.shadow.camera.bottom = -20;
    this.scene.add(this.sunLight);

    this.rimLight.position.set(-15, 12, -12);
    this.scene.add(this.rimLight);

    const shadowPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(56, 40),
      new THREE.ShadowMaterial({ opacity: 0.18 }),
    );
    shadowPlane.rotation.x = -Math.PI / 2;
    shadowPlane.position.y = -1.2;
    shadowPlane.receiveShadow = true;
    this.scene.add(shadowPlane);

    const pedestal = new THREE.Mesh(
      new THREE.BoxGeometry(BOARD_WIDTH + 2.8, 1.3, BOARD_DEPTH + 2.8),
      new THREE.MeshStandardMaterial({ color: 0x5c3c24, roughness: 0.9 }),
    );
    pedestal.position.y = -0.72;
    pedestal.castShadow = true;
    pedestal.receiveShadow = true;
    this.scene.add(pedestal);

    const board = new THREE.Mesh(
      new THREE.BoxGeometry(BOARD_WIDTH, 0.74, BOARD_DEPTH),
      new THREE.MeshStandardMaterial({
        color: 0x17444a,
        roughness: 0.94,
        metalness: 0.06,
      }),
    );
    board.position.y = -0.05;
    board.castShadow = true;
    board.receiveShadow = true;
    this.scene.add(board);

    const innerGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(BOARD_WIDTH - 2.2, BOARD_DEPTH - 2.2),
      new THREE.MeshBasicMaterial({
        color: 0x285b63,
        transparent: true,
        opacity: 0.18,
      }),
    );
    innerGlow.rotation.x = -Math.PI / 2;
    innerGlow.position.y = 0.34;
    this.scene.add(innerGlow);

    for (const segment of Object.values(this.network.segments)) {
      this.scene.add(this.buildTrackMesh(segment.curve));
    }
  }

  private buildTrackMesh(curve: THREE.CatmullRomCurve3): THREE.Group {
    const group = new THREE.Group();
    const segments = Math.max(24, Math.round(curve.getLength() * 5));

    const ballast = new THREE.Mesh(
      new THREE.TubeGeometry(curve, segments, 0.34, 8, false),
      new THREE.MeshStandardMaterial({
        color: 0x74543a,
        roughness: 0.96,
      }),
    );
    ballast.position.y = 0.22;
    ballast.castShadow = true;
    ballast.receiveShadow = true;
    group.add(ballast);

    const rail = new THREE.Mesh(
      new THREE.TubeGeometry(curve, segments, 0.12, 8, false),
      new THREE.MeshStandardMaterial({
        color: 0xcfd5da,
        roughness: 0.25,
        metalness: 0.84,
      }),
    );
    rail.position.y = 0.28;
    rail.castShadow = true;
    rail.receiveShadow = true;
    group.add(rail);

    const sleeperGeometry = new THREE.BoxGeometry(0.16, 0.08, 0.86);
    const sleeperMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a2e1e,
      roughness: 0.92,
    });

    const sleeperCount = Math.max(5, Math.round(curve.getLength() * 1.9));

    for (let index = 1; index < sleeperCount; index += 1) {
      const t = index / sleeperCount;
      const point = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);
      const sleeper = new THREE.Mesh(sleeperGeometry, sleeperMaterial);
      sleeper.position.set(point.x, 0.14, point.z);
      sleeper.rotation.y = -Math.atan2(tangent.z, tangent.x) + Math.PI / 2;
      sleeper.castShadow = true;
      sleeper.receiveShadow = true;
      group.add(sleeper);
    }

    return group;
  }

  private createSwitchMarker(position: THREE.Vector3, color: number): SwitchMarker {
    const root = new THREE.Group();
    root.position.copy(position);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.34, 0.36, 18),
      new THREE.MeshStandardMaterial({ color: 0x1b2832, roughness: 0.76 }),
    );
    base.position.y = 0.18;
    base.castShadow = true;
    base.receiveShadow = true;
    root.add(base);

    const pivot = new THREE.Group();
    pivot.position.y = 0.34;
    root.add(pivot);

    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.18, 1.34),
      new THREE.MeshStandardMaterial({
        color: 0xf3f8fb,
        roughness: 0.3,
        metalness: 0.2,
      }),
    );
    arm.position.z = 0.5;
    arm.castShadow = true;
    pivot.add(arm);

    const lampMaterial = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.7,
      roughness: 0.32,
      metalness: 0.15,
    });

    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 16), lampMaterial);
    lamp.position.y = 0.75;
    lamp.castShadow = true;
    root.add(lamp);

    this.scene.add(root);

    return {
      pivot,
      lamp: lampMaterial,
    };
  }

  private createDepotVisual(destination: DestinationId): DepotVisual {
    const anchor = this.network.depotAnchors[destination];
    const color = new THREE.Color(DESTINATION_META[destination].color);
    const root = new THREE.Group();
    root.position.copy(anchor);

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: color.clone().multiplyScalar(0.56),
      roughness: 0.72,
    });

    const bay = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.6, 2.7), bodyMaterial);
    bay.position.set(0, 0.72, 0);
    bay.castShadow = true;
    bay.receiveShadow = true;
    root.add(bay);

    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(3.2, 0.24, 3),
      new THREE.MeshStandardMaterial({ color: 0xe4ded2, roughness: 0.84 }),
    );
    roof.position.set(0, 1.62, 0);
    roof.castShadow = true;
    root.add(roof);

    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.14, 2.8),
      new THREE.MeshStandardMaterial({ color: 0x40515d, roughness: 0.9 }),
    );
    platform.position.set(-0.8, 0.06, 0);
    platform.receiveShadow = true;
    root.add(platform);

    const lightMaterial = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 1.2,
      roughness: 0.18,
    });

    const light = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 20), lightMaterial);
    light.position.set(0.72, 1.22, 0);
    light.castShadow = true;
    root.add(light);

    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 1.1, 2.2),
      new THREE.MeshStandardMaterial({ color, roughness: 0.5 }),
    );
    trim.position.set(-1.18, 0.62, 0);
    trim.castShadow = true;
    root.add(trim);

    this.scene.add(root);

    return {
      light: lightMaterial,
      body: bodyMaterial,
      pulse: 0,
    };
  }

  private async loadTemplates(): Promise<TrainTemplates> {
    const engine = await this.loadNormalizedModel(ENGINE_ASSET, 2.35);
    const topCar = await this.loadNormalizedModel(DESTINATION_META.top.carriageAsset, 1.75);
    const middleCar = await this.loadNormalizedModel(DESTINATION_META.middle.carriageAsset, 1.75);
    const bottomCar = await this.loadNormalizedModel(DESTINATION_META.bottom.carriageAsset, 1.75);

    return {
      engine,
      carriages: {
        top: topCar,
        middle: middleCar,
        bottom: bottomCar,
      },
    };
  }

  private async loadNormalizedModel(url: string, targetLength: number): Promise<THREE.Group> {
    const gltf = await this.loader.loadAsync(url);
    const root = gltf.scene;
    root.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    const box = new THREE.Box3().setFromObject(root);
    const size = box.getSize(new THREE.Vector3());
    const scale = targetLength / Math.max(size.x, size.z);
    root.scale.setScalar(scale);

    const scaledBox = new THREE.Box3().setFromObject(root);
    const center = scaledBox.getCenter(new THREE.Vector3());
    root.position.sub(center);

    const centeredBox = new THREE.Box3().setFromObject(root);
    root.position.y -= centeredBox.min.y;

    return root;
  }

  private bindEvents(): void {
    this.ui.startButton.addEventListener("click", () => {
      void this.startRun();
    });

    this.ui.restartButton.addEventListener("click", () => {
      void this.startRun();
    });

    for (const [key, refs] of Object.entries(this.ui.switches) as Array<[SwitchKey, SwitchButtonRefs]>) {
      refs.button.addEventListener("click", () => {
        this.flipSwitch(key);
      });
    }

    window.addEventListener("resize", () => {
      this.resize();
    });

    window.addEventListener("keydown", (event) => {
      if (event.repeat) {
        return;
      }

      if (event.key === "Enter" || event.key === " ") {
        if (this.phase === "ready" || this.phase === "gameover") {
          event.preventDefault();
          void this.startRun();
        }
      }

      if (this.phase !== "playing") {
        return;
      }

      if (event.key === "1") {
        event.preventDefault();
        this.flipSwitch("branch");
      }

      if (event.key === "2") {
        event.preventDefault();
        this.flipSwitch("upper");
      }

      if (event.key === "3") {
        event.preventDefault();
        this.flipSwitch("lower");
      }
    });
  }

  private async startRun(): Promise<void> {
    await this.ensureAudio();
    this.clearTrains();

    this.setPhase("playing");
    this.switches = createDefaultSwitchStates();
    this.scoreState = createInitialScoreState();
    this.difficulty = getDifficulty(0);
    this.upcomingQueue = fillUpcomingQueue(this.upcomingQueue, this.difficulty.queueSize, this.random);
    this.msSinceLastSpawn = this.difficulty.spawnIntervalMs;
    this.nextTrainId = 1;
    this.ui.readyOverlay.hidden = true;
    this.ui.gameOverOverlay.hidden = true;

    for (const visual of Object.values(this.depotVisuals)) {
      visual.pulse = 0;
    }

    this.updateHud();
    this.updateSwitches();
    this.playTone("start");
  }

  private resetToReadyState(): void {
    this.setPhase("ready");
    this.clearTrains();
    this.switches = createDefaultSwitchStates();
    this.scoreState = createInitialScoreState();
    this.difficulty = getDifficulty(0);
    this.upcomingQueue = fillUpcomingQueue([], this.difficulty.queueSize, this.random);
    this.msSinceLastSpawn = 0;
    this.ui.readyOverlay.hidden = false;
    this.ui.gameOverOverlay.hidden = true;
    this.updateHud();
    this.updateSwitches();
  }

  private frame = (timestamp: number): void => {
    this.timer.update(timestamp);
    const delta = Math.min(this.timer.getDelta(), MAX_DELTA_SECONDS);
    const elapsed = this.timer.getElapsed();

    if (this.phase === "playing") {
      this.updateSimulation(delta);
    }

    this.animateScene(delta, elapsed);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.frame);
  };

  private updateSimulation(deltaSeconds: number): void {
    this.difficulty = getDifficulty(this.scoreState.deliveries);
    this.msSinceLastSpawn += deltaSeconds * 1000;

    const entryBlockers = this.activeTrains
      .filter((train) => train.segmentId === "entry")
      .map((train) => train.progress);

    if (this.templates && canSpawnTrain(this.msSinceLastSpawn, this.difficulty, entryBlockers)) {
      this.spawnTrain();
    }

    const survivors: ActiveTrain[] = [];

    for (const train of this.activeTrains) {
      const stillActive = this.advanceTrain(train, deltaSeconds);
      if (stillActive) {
        survivors.push(train);
      }
    }

    this.activeTrains = survivors;
    this.updateHud();
  }

  private spawnTrain(): void {
    if (!this.templates) {
      return;
    }

    this.upcomingQueue = fillUpcomingQueue(this.upcomingQueue, this.difficulty.queueSize, this.random);
    const target = this.upcomingQueue.shift();

    if (!target) {
      return;
    }

    const train = this.createTrain(target);
    this.activeTrains.push(train);
    this.msSinceLastSpawn = 0;
    this.upcomingQueue = fillUpcomingQueue(this.upcomingQueue, this.difficulty.queueSize, this.random);
    this.updateHud();
  }

  private createTrain(target: DestinationId): ActiveTrain {
    if (!this.templates) {
      throw new Error("Train templates are not loaded");
    }

    const root = new THREE.Group();

    const engine = this.templates.engine.clone(true);
    engine.position.x = 0.9;
    root.add(engine);

    const carriage = this.templates.carriages[target].clone(true);
    carriage.position.x = -0.95;
    root.add(carriage);

    const glowMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color(DESTINATION_META[target].color),
      emissive: new THREE.Color(DESTINATION_META[target].color),
      emissiveIntensity: 1.2,
      roughness: 0.25,
      metalness: 0.1,
      transparent: true,
      opacity: 0.9,
    });

    const glow = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.1, 12, 24), glowMaterial);
    glow.rotation.x = Math.PI / 2;
    glow.position.set(-0.25, 1.15, 0);
    root.add(glow);

    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), glowMaterial);
    beacon.position.set(0.85, 1.45, 0);
    root.add(beacon);

    this.scene.add(root);

    const train: ActiveTrain = {
      id: this.nextTrainId,
      target,
      segmentId: "entry",
      progress: 0,
      speed: this.difficulty.speed,
      group: root,
      glowMaterial,
    };

    this.nextTrainId += 1;
    this.applyTrainTransform(train);

    return train;
  }

  private advanceTrain(train: ActiveTrain, deltaSeconds: number): boolean {
    let remainingDistance = deltaSeconds * train.speed;

    while (remainingDistance > 0) {
      const segment = this.network.segments[train.segmentId];
      const segmentDistanceLeft = segment.length * (1 - train.progress);

      if (remainingDistance < segmentDistanceLeft) {
        train.progress += remainingDistance / segment.length;
        remainingDistance = 0;
      } else {
        remainingDistance -= segmentDistanceLeft;
        const nextSegmentId = getNextSegmentId(train.segmentId, this.switches);

        if (!nextSegmentId) {
          this.handleDelivery(train, segment.destination);
          return false;
        }

        train.segmentId = nextSegmentId;
        train.progress = 0;
      }
    }

    this.applyTrainTransform(train);
    return true;
  }

  private handleDelivery(train: ActiveTrain, destination: DestinationId | undefined): void {
    this.scene.remove(train.group);

    if (!destination || destination !== train.target) {
      this.scoreState = resetCombo(this.scoreState);
      this.playTone("fail");
      this.endRun();
      return;
    }

    this.scoreState = applySuccessfulDelivery(this.scoreState);
    this.depotVisuals[destination].pulse = 1;
    this.spawnBurst(this.network.depotAnchors[destination], DESTINATION_META[destination].color);
    this.playTone("success");
  }

  private endRun(): void {
    this.setPhase("gameover");
    this.bestScore = Math.max(this.bestScore, this.scoreState.score);
    saveBestScore(this.bestScore);
    this.ui.finalScore.textContent = String(this.scoreState.score);
    this.ui.finalBest.textContent = String(this.bestScore);
    this.ui.finalDeliveries.textContent = String(this.scoreState.deliveries);
    this.ui.gameOverOverlay.hidden = false;
    this.updateHud();
  }

  private clearTrains(): void {
    for (const train of this.activeTrains) {
      this.scene.remove(train.group);
    }

    this.activeTrains = [];
  }

  private applyTrainTransform(train: ActiveTrain): void {
    const segment = this.network.segments[train.segmentId];
    const point = segment.curve.getPointAt(train.progress);
    const tangent = segment.curve.getTangentAt(train.progress);
    const yaw = -Math.atan2(tangent.z, tangent.x) + MODEL_FORWARD_ROTATION;

    train.group.position.set(point.x, 0.45, point.z);
    train.group.rotation.set(0, yaw, 0);

    const pulse = 0.84 + Math.sin(this.timer.getElapsed() * 10 + train.id) * 0.12;
    train.glowMaterial.emissiveIntensity = pulse;
  }

  private flipSwitch(key: SwitchKey): void {
    if (this.phase !== "playing") {
      return;
    }

    this.switches = toggleSwitchState(this.switches, key);
    this.updateSwitches();
    this.playTone("switch");
  }

  private updateSwitches(): void {
    setSwitchUi(
      this.ui.switches.branch,
      this.switches.branch === "upper" ? "Upper Line" : "Lower Line",
      this.switches.branch === "upper"
        ? "Send the next train through the blue and red side."
        : "Send the next train through the red and green side.",
      this.switches.branch === "upper" ? "blue" : "green",
    );

    setSwitchUi(
      this.ui.switches.upper,
      this.switches.upper === "top" ? "Top Depot" : "Middle Depot",
      this.switches.upper === "top"
        ? "Upper-branch trains finish at the blue depot."
        : "Upper-branch trains cut through to the red depot.",
      this.switches.upper === "top" ? "blue" : "red",
    );

    setSwitchUi(
      this.ui.switches.lower,
      this.switches.lower === "middle" ? "Middle Depot" : "Bottom Depot",
      this.switches.lower === "middle"
        ? "Lower-branch trains cut through to the red depot."
        : "Lower-branch trains finish at the green depot.",
      this.switches.lower === "middle" ? "red" : "green",
    );

    this.switchMarkers.branch.pivot.rotation.z = this.switches.branch === "upper" ? -0.5 : 0.5;
    this.switchMarkers.upper.pivot.rotation.z = this.switches.upper === "top" ? -0.45 : 0.45;
    this.switchMarkers.lower.pivot.rotation.z = this.switches.lower === "middle" ? -0.45 : 0.45;

    this.switchMarkers.branch.lamp.emissiveIntensity = 1.1;
    this.switchMarkers.upper.lamp.emissiveIntensity = this.switches.upper === "top" ? 1.15 : 0.95;
    this.switchMarkers.lower.lamp.emissiveIntensity = this.switches.lower === "bottom" ? 1.15 : 0.95;
  }

  private updateHud(): void {
    this.ui.score.textContent = String(this.scoreState.score);
    this.ui.combo.textContent = `${this.scoreState.combo}x`;
    this.ui.best.textContent = String(Math.max(this.bestScore, this.scoreState.score));
    this.ui.deliveries.textContent = String(this.scoreState.deliveries);

    this.upcomingQueue = fillUpcomingQueue(this.upcomingQueue, this.difficulty.queueSize, this.random);

    this.ui.queueItems.forEach((item, index) => {
      const target = this.upcomingQueue[index];
      const dot = queryRequired(item, ".switchyard-queue-item__dot", HTMLDivElement);
      const label = queryRequired(item, ".switchyard-queue-item__label", HTMLDivElement);

      if (!target) {
        dot.style.background = "rgba(255,255,255,0.2)";
        label.textContent = "Wait";
        return;
      }

      dot.style.background = DESTINATION_META[target].color;
      label.textContent = DESTINATION_META[target].shortLabel;
    });
  }

  private animateScene(deltaSeconds: number, elapsedSeconds: number): void {
    this.ambientLight.intensity = 1.86 + Math.sin(elapsedSeconds * 0.8) * 0.06;
    this.sunLight.intensity = 2.08 + Math.sin(elapsedSeconds * 0.6 + 1.2) * 0.08;

    for (const [destination, visual] of Object.entries(this.depotVisuals) as Array<[DestinationId, DepotVisual]>) {
      visual.pulse = Math.max(0, visual.pulse - deltaSeconds * 1.85);
      const baseColor = new THREE.Color(DESTINATION_META[destination].color);
      visual.light.color.copy(baseColor);
      visual.light.emissive.copy(baseColor);
      visual.light.emissiveIntensity = 0.88 + visual.pulse * 1.6 + Math.sin(elapsedSeconds * 2.4) * 0.08;
      visual.body.color.copy(baseColor.clone().multiplyScalar(0.56 + visual.pulse * 0.16));
    }

    const remainingBursts: BurstEffect[] = [];

    for (const burst of this.burstEffects) {
      burst.age += deltaSeconds;

      if (burst.age >= burst.duration) {
        this.scene.remove(burst.mesh);
        continue;
      }

      const progress = burst.age / burst.duration;
      const material = burst.mesh.material;
      if (material instanceof THREE.MeshBasicMaterial) {
        material.opacity = 1 - progress;
      }

      burst.mesh.scale.setScalar(1 + progress * 2.4);
      remainingBursts.push(burst);
    }

    this.burstEffects.length = 0;
    this.burstEffects.push(...remainingBursts);
  }

  private spawnBurst(position: THREE.Vector3, color: string): void {
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.6, 24), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.copy(position).setY(1.9);
    this.scene.add(mesh);

    this.burstEffects.push({
      mesh,
      age: 0,
      duration: 0.6,
    });
  }

  private resize(): void {
    const width = this.mount.clientWidth;
    const height = this.mount.clientHeight;

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;

    const isPortrait = height > width;
    this.camera.position.set(0, isPortrait ? 18.8 : 16.5, isPortrait ? 16.8 : 15.6);
    this.camera.lookAt(1.6, 0.2, 0);
    this.camera.updateProjectionMatrix();
  }

  private async ensureAudio(): Promise<void> {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }
  }

  private playTone(type: "start" | "switch" | "success" | "fail"): void {
    if (!this.audioContext) {
      return;
    }

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    let stopAt = now + 0.1;

    oscillator.connect(gain);
    gain.connect(this.audioContext.destination);

    switch (type) {
      case "start":
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(280, now);
        oscillator.frequency.linearRampToValueAtTime(420, now + 0.14);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
        stopAt = now + 0.2;
        break;
      case "switch":
        oscillator.type = "square";
        oscillator.frequency.setValueAtTime(380, now);
        oscillator.frequency.linearRampToValueAtTime(320, now + 0.05);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.06, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.07);
        stopAt = now + 0.08;
        break;
      case "success":
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(440, now);
        oscillator.frequency.linearRampToValueAtTime(620, now + 0.12);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.1, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
        stopAt = now + 0.18;
        break;
      case "fail":
        oscillator.type = "sawtooth";
        oscillator.frequency.setValueAtTime(210, now);
        oscillator.frequency.linearRampToValueAtTime(120, now + 0.18);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
        stopAt = now + 0.24;
        break;
    }

    oscillator.start(now);
    oscillator.stop(stopAt);
  }

  private setPhase(phase: AppPhase): void {
    this.phase = phase;
    this.ui.appRoot.dataset.phase = phase;
  }
}

function collectSwitchButton(button: HTMLButtonElement): SwitchButtonRefs {
  return {
    button,
    route: queryRequired(button, ".switchyard-switch__route", HTMLElement),
    hint: queryRequired(button, ".switchyard-switch__hint", HTMLElement),
  };
}

function setSwitchUi(
  refs: SwitchButtonRefs,
  route: string,
  hint: string,
  accent: "blue" | "red" | "green",
): void {
  refs.route.textContent = route;
  refs.hint.textContent = hint;
  refs.button.dataset.accent = accent;
}

function queryRequired<T extends Element>(
  root: ParentNode,
  selector: string,
  ctor: { new (): T } | ((...args: never[]) => T),
): T {
  const element = root.querySelector(selector);

  if (!element || !(element instanceof ctor)) {
    throw new Error(`Missing required element: ${selector}`);
  }

  return element as T;
}

function attachStyles(): void {
  const styleId = "switchyard-sprint-styles";
  if (document.getElementById(styleId)) {
    return;
  }

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = SWITCHYARD_CSS;
  document.head.append(style);
}

function loadBestScore(): number {
  try {
    const raw = window.localStorage.getItem(BEST_SCORE_KEY);
    return raw ? Number.parseInt(raw, 10) || 0 : 0;
  } catch {
    return 0;
  }
}

function saveBestScore(bestScore: number): void {
  try {
    window.localStorage.setItem(BEST_SCORE_KEY, String(bestScore));
  } catch {
    // Local storage can fail in some embedded browsers. Ignore it.
  }
}

function createRandomSourceFromLocation(): () => number {
  const seed = new URLSearchParams(window.location.search).get("seed");

  if (!seed) {
    return Math.random;
  }

  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  let state = hash >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function initSdk(): Promise<MinimalPlaydropSdk> {
  const bridge = await loadPlaydropBridge();

  if (!bridge) {
    return {
      host: {
        setLoadingState() {
          // Running outside the Playdrop host.
        },
      },
    };
  }

  try {
    const sdk = await bridge.init();
    return sdk;
  } catch (error) {
    console.warn("Falling back to local runtime because Playdrop SDK init failed.", error);
    return {
      host: {
        setLoadingState() {
          // Running outside a valid Playdrop host.
        },
      },
    };
  }
}

async function loadPlaydropBridge(): Promise<typeof window.playdrop | null> {
  const search = new URLSearchParams(window.location.search);
  if (!search.has("playdrop_channel")) {
    return null;
  }

  if (window.playdrop) {
    return window.playdrop;
  }

  const script = document.createElement("script");
  script.src = "https://assets.playdrop.ai/sdk/playdrop.js";
  script.async = true;

  await new Promise<void>((resolve, reject) => {
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Failed to load Playdrop SDK loader")), {
      once: true,
    });
    document.head.append(script);
  });

  return window.playdrop ?? null;
}

void (async () => {
  const mount = document.getElementById("app");
  if (!(mount instanceof HTMLElement)) {
    throw new Error("Missing #app mount point");
  }

  const sdk = await initSdk();
  sdk.host.setLoadingState({
    status: "loading",
    progress: 0.04,
    message: "Opening the yard",
  });

  const app = new SwitchyardApp(sdk, mount);
  await app.init();
})().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  const mount = document.getElementById("app");

  if (mount instanceof HTMLElement) {
    mount.innerHTML = `
      <div style="display:grid;place-items:center;height:100dvh;padding:24px;color:#edf7fb;font:16px 'Trebuchet MS', sans-serif;">
        <div style="max-width:520px;padding:24px;border-radius:24px;background:rgba(7,24,34,0.88);border:1px solid rgba(181,224,244,0.12);">
          <div style="font-size:12px;letter-spacing:0.18em;text-transform:uppercase;color:rgba(237,247,251,0.58);margin-bottom:10px;">Switchyard Sprint</div>
          <div style="font-size:28px;font-weight:700;line-height:1.05;margin-bottom:12px;">The rail yard failed to boot.</div>
          <div style="line-height:1.5;color:rgba(237,247,251,0.78);">${message}</div>
        </div>
      </div>
    `;
  }

  const bridge = window.playdrop;
  if (bridge?.host && typeof bridge.host.setLoadingState === "function") {
    bridge.host.setLoadingState({
      status: "error",
      message,
    });
  }

  throw error;
});

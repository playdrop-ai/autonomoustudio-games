import fs from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const root = path.resolve("dist");
const referenceCodePath = path.resolve("tmp/reference/astrocade-game-code.js");
const referenceConfigPath = path.resolve("tmp/reference/astrocade-game-config.jsonish");
const outDir = path.resolve("tmp/live-compare-fresh");
const viewport = { width: 720, height: 1280 };
const profileKey = "chopline-rush-v2-profile";
const seed = 23;

const mimeTypes = new Map([
  [".html", "text/html"],
  [".js", "text/javascript"],
  [".css", "text/css"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".mp3", "audio/mpeg"],
  [".glb", "model/gltf-binary"],
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function createProfile() {
  return {
    coins: 62,
    ownedKnives: ["chopping"],
    equippedKnife: "chopping",
    highestLevel: 1,
    highestLevelCompleted: 0,
    endlessBest: 0,
    totalRuns: 0,
    totalSlices: 0,
    totalCoinsEarned: 0,
    achievements: [],
  };
}

function seedScript(seedValue) {
  return `
    (function () {
      let state = ${Math.max(1, Math.floor(seedValue))} >>> 0;
      window.__rngCount = 0;
      Math.random = function () {
        window.__rngCount += 1;
        state = (state * 1664525 + 1013904223) >>> 0;
        return state / 4294967296;
      };
    })();
  `;
}

function buildReferenceHtml() {
  let html = fs.readFileSync(referenceCodePath, "utf8");
  const configRaw = fs.readFileSync(referenceConfigPath, "utf8");
  JSON.parse(configRaw);
  if (!html.includes('name="viewport"')) {
    html = html.replace(
      "<title>Slice Rush</title>",
      '<title>Slice Rush</title>\n    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">',
    );
  }

  const prelude = `
    <script>
      window.__skipReferenceAssets = true;
      window.__skipReferenceProfile = true;
      window.gameConfig = ${configRaw};
      window.lib = {
        getAsset: () => null,
        log: () => {},
        showGameParameters: () => {},
        updateConfig: () => {},
      };
      var lib = window.lib;
    </script>`;

  html = html.replace(
    "    <script>\n        /* ==================================================",
    `${prelude}\n    <script>\n        /* ==================================================`,
  );
  html = html.replace("await preloadAssets();", "if (!window.__skipReferenceAssets) await preloadAssets();");
  html = html.replace("await loadPlayerData();", "if (!window.__skipReferenceProfile) await loadPlayerData();");

  const probe = `

        function __sliceRushTestSetSeed(seedValue) {
            let state = (Math.max(1, Math.floor(seedValue)) >>> 0);
            window.__rngCount = 0;
            Math.random = function () {
                window.__rngCount += 1;
                state = (state * 1664525 + 1013904223) >>> 0;
                return state / 4294967296;
            };
        }

        function __sliceRushPlatformSummary(platform) {
            const platformId = platform.userData?.id || null;
            const z = platform.position.z;
            const depth = platform.geometry?.parameters?.depth || 0;
            const height = platform.userData?.height || platform.geometry?.parameters?.height || 0;
            const objectTypes = [
                ...sliceableObjects.filter((obj) => obj.userData?.platformId === platformId).map((obj) => obj.userData?.objectType || obj.userData?.type || "sliceable"),
                ...obstacles.filter((obj) => obj.userData?.platformId === platformId).map(() => "obstacle"),
            ].sort();
            return {
                id: platformId,
                y: platform.position.y,
                z,
                depth,
                height,
                moving: Boolean(platform.userData?.moving),
                objectCount: objectTypes.length,
                objectTypes: [...new Set(objectTypes)],
            };
        }

        function __sliceRushBackgroundSummary() {
            const counts = {};
            const objects = [];
            for (const chunk of bgChunks.values()) {
                for (const object of chunk.objects || []) {
                    let kind = 'unknown';
                    if (object instanceof THREE.Mesh) {
                        const type = object.geometry?.type || '';
                        if (type === 'PlaneGeometry') kind = 'ground';
                        else if (type === 'SphereGeometry') kind = 'hill';
                        else if (type === 'ConeGeometry') kind = 'mountain';
                    } else if (object instanceof THREE.Group) {
                        kind = object.position.y > 12 ? 'cloud' : 'lollipop';
                    }
                    counts[kind] = (counts[kind] || 0) + 1;
                    objects.push({
                        kind,
                        x: Number(object.position.x.toFixed(3)),
                        y: Number(object.position.y.toFixed(3)),
                        z: Number(object.position.z.toFixed(3)),
                    });
                }
            }
            return { counts, objects: objects.slice(0, 40) };
        }

        window.__sliceRushSliceEvents = [];
        const __sliceRushOriginalSliceObject = sliceObject;
        sliceObject = function (obj) {
            const beforeRandom = window.__rngCount || 0;
            const beforePieces = fallingPieces.length;
            const type = obj.userData?.objectType || obj.userData?.type || "sliceable";
            const y = Number(obj.position.y.toFixed(6));
            const z = Number(obj.position.z.toFixed(6));
            __sliceRushOriginalSliceObject(obj);
            window.__sliceRushSliceEvents.push({
                type,
                y,
                z,
                beforeRandom,
                afterRandom: window.__rngCount || 0,
                beforePieces,
                afterPieces: fallingPieces.length,
                score,
            });
        };

        window.__sliceRushStickEvents = [];
        const __sliceRushOriginalStickToFace = stickToFace;
        stickToFace = function (faceAxis, faceDir, faceCoord, platform) {
            const event = {
                faceAxis,
                faceDir,
                faceCoord,
                platformId: platform?.userData?.id || null,
                beforeY: knifeGroup.position.y,
                beforeZ: knifeGroup.position.z,
                beforeRotation: knifeRotation,
                afterY: knifeGroup.position.y,
                afterZ: knifeGroup.position.z,
                afterRotation: knifeRotation,
                slicing: Boolean(knifeSlicing),
            };
            __sliceRushOriginalStickToFace(faceAxis, faceDir, faceCoord, platform);
            event.afterY = knifeGroup.position.y;
            event.afterZ = knifeGroup.position.z;
            event.afterRotation = knifeRotation;
            window.__sliceRushStickEvents.push(event);
        };

        window.__sliceRushSpawnEvents = [];
        spawnNextEndlessPlatform = function () {
            if (!endlessTemplates.length) return;

            const beforeRandom = window.__rngCount || 0;
            const gap = ENDLESS_FLIP_DISTANCE * (1 + Math.random() * 2);
            const templateIndex = Math.floor(Math.random() * endlessTemplates.length);
            const tpl = endlessTemplates[templateIndex];

            const platZ = endlessCursorZ + gap;
            const platId = 'endless_' + (endlessPlatCounter++);
            const platConfig = {
                id: platId,
                y: tpl.platform.y,
                z: platZ,
                depth: tpl.platform.depth,
                height: tpl.platform.height
            };
            if (tpl.platform.moving) {
                platConfig.moving = true;
                for (const k of ['moveDistance', 'moveSpeed', 'moveDelay', 'moveAxis']) {
                    if (tpl.platform[k] !== undefined) platConfig[k] = tpl.platform[k];
                }
            }

            const platIndex = platforms.length;
            const platform = createPlatform(platConfig, platIndex);
            platforms.push(platform);

            if (tpl.sliceables) {
                for (const s of tpl.sliceables) {
                    const objConfig = { ...s, platformId: platId };
                    createObject(objConfig, 'sliceables', endlessSliceableCounter++, platform);
                }
            }

            if (tpl.obstacles) {
                for (const o of tpl.obstacles) {
                    const objConfig = { ...o, platformId: platId };
                    createObject(objConfig, 'obstacles', endlessObstacleCounter++, platform);
                }
            }

            endlessCursorZ = platZ + tpl.platform.depth;
            const afterRandom = window.__rngCount || 0;
            const objectTypes = [
                ...sliceableObjects.filter((obj) => obj.userData?.platformId === platId).map((obj) => obj.userData?.objectType || obj.userData?.type || "sliceable"),
                ...obstacles.filter((obj) => obj.userData?.platformId === platId).map(() => "obstacle"),
            ].sort();
            window.__sliceRushSpawnEvents.push({
                id: platId,
                templateIndex,
                budget: afterRandom - beforeRandom - 2,
                beforeRandom,
                afterRandom,
                z: platform.position.z,
                objectCount: objectTypes.length,
                objectTypes: [...new Set(objectTypes)].sort(),
            });
        };

        window.__sliceRushProbe = {
            setSeed: __sliceRushTestSetSeed,
            setPaused: (paused) => { gamePaused = Boolean(paused); },
            resetMotionClocks: () => {
                for (const item of [...platforms, ...obstacles, ...sliceableObjects]) {
                    if (item.userData) item.userData.moveElapsed = 0;
                }
                updateMovingObstacles(0);
                renderer.render(scene, camera);
            },
            tap: () => {
                if (gameState === 'ready') {
                    gameState = 'playing';
                    endlessScoreTimer = ENDLESS_SCORE_TIMEOUT;
                    document.getElementById('tap-hint').style.display = 'none';
                }
                if (gameState === 'playing') flipKnife();
            },
            advance: (seconds) => {
                const total = Math.max(0, Number(seconds) || 0);
                const step = 1 / 120;
                const steps = Math.ceil(total / step);
                for (let n = 0; n < steps; n++) {
                    const deltaTime = n === steps - 1 ? total - step * (steps - 1) : step;
                    if (currentMode === 'play') {
                        let _spOldY, _spOldZ;
                        if (knifeStuck && stuckPlatformRef && stuckPlatformRef.userData.moving) {
                            _spOldY = stuckPlatformRef.position.y;
                            _spOldZ = stuckPlatformRef.position.z;
                        }
                        updateMovingObstacles(deltaTime);
                        if (knifeStuck && stuckPlatformRef && _spOldY !== undefined) {
                            const dy = stuckPlatformRef.position.y - _spOldY;
                            const dz = stuckPlatformRef.position.z - _spOldZ;
                            if (dy !== 0 || dz !== 0) {
                                knifeGroup.position.y += dy;
                                knifeGroup.position.z += dz;
                            }
                        }
                        if (knifeStuck && gameState === 'playing') checkCollisions();
                        if (knifeTumbling) {
                            updateTumble(deltaTime);
                        } else {
                            const maxStep = 1 / 120;
                            const subSteps = Math.ceil(deltaTime / maxStep);
                            const subDt = deltaTime / subSteps;
                            for (let i = 0; i < subSteps; i++) {
                                prevSubKnifeY = knifeGroup.position.y;
                                prevSubKnifeZ = knifeGroup.position.z;
                                prevSubKnifeRot = knifeRotation;
                                updateKnife(subDt);
                                checkCollisions();
                                if (knifeStuck || knifeTumbling || gameState !== 'playing') break;
                            }
                        }
                        updateEndless();
                        updateEndlessTimer(deltaTime);
                        updateParticles(deltaTime);
                        updateTrail();
                        updateBgChunks(knifeGroup.position.z);
                    }
                    updateFlash(deltaTime);
                    updateCamera(deltaTime);
                }
                renderer.render(scene, camera);
            },
            stageEndlessSplitVisualProof: (preferredType) => {
                const obj = (preferredType
                    ? sliceableObjects.find((item) => item.userData?.objectType === preferredType)
                    : null)
                    || sliceableObjects.find((item) => item.userData?.objectType === 'watermelon')
                    || sliceableObjects.find((item) => item.userData?.objectType === 'apple')
                    || sliceableObjects[0];
                if (!obj) throw new Error('No sliceable available for endless split proof');
                const aabb = obj.userData?.collisionAABB;
                if (!aabb) throw new Error('Sliceable missing collision AABB for split proof');
                score = 0;
                endlessScoreTimer = ENDLESS_SCORE_TIMEOUT;
                gameState = 'playing';
                gamePaused = false;
                canFlip = true;
                knifeStuck = false;
                knifeBouncing = false;
                knifeTumbling = false;
                knifeSlicing = false;
                knifeRotatingToStick = false;
                rotatingStickPlatform = null;
                rotatingStickAccumAngle = 0;
                stuckPlatformRef = null;
                stuckFace = 'top';
                stuckSideDir = 1;
                flipSourcePlatform = null;
                flipSourceFaceY = null;
                flipSourceFaceType = null;
                lastBounceRef = null;
                restoreWidenedObjects();
                const centerY = obj.position.y + (aabb.bottomY + aabb.topY) / 2;
                const centerZ = obj.position.z + (aabb.centerZ || 0);
                knifeGroup.position.set(0, centerY - BLADE_REACH / 2, centerZ - (KNIFE_SKINS[currentKnifeSkin]?.bladeEdgeOffset || 0));
                prevSubKnifeY = knifeGroup.position.y + 0.08;
                prevSubKnifeZ = knifeGroup.position.z - 0.08;
                prevSubKnifeRot = 0;
                knifeRotation = 0;
                knifeGroup.rotation.x = 0;
                knifeVelocity = { x: 0, y: -0.2, z: 0.6 };
                knifeAngularVelocity = 0;
                rotationTarget = INIT_EULER_Z;
                trailHistory = [];
                document.getElementById('tap-hint').style.display = 'none';
                updateScoreDisplay();
                camera.position.set(knifeGroup.position.x + CAM_OFFSET.x, knifeGroup.position.y + CAM_OFFSET.y, knifeGroup.position.z + CAM_OFFSET.z);
                camera.lookAt(knifeGroup.position.x, knifeGroup.position.y, knifeGroup.position.z + CAM_LOOK_AHEAD);
                dirLight.position.set(knifeGroup.position.x - 5, knifeGroup.position.y + 7, knifeGroup.position.z + 1);
                dirLight.target.position.copy(knifeGroup.position);
                updateBgChunks(knifeGroup.position.z);
                renderer.render(scene, camera);
            },
            startPlay: () => { void run('play'); },
            clickEndless: () => document.getElementById('btn-endless-mode')?.click(),
            state: () => ({
                state: gameState,
                mode: selectedGameMode,
                score,
                timer: endlessScoreTimer,
                templates: endlessTemplates.length,
                randomCount: window.__rngCount || 0,
                knife: {
                    stuck: knifeStuck,
                    bouncing: knifeBouncing,
                    slicing: knifeSlicing,
                    tumbling: knifeTumbling,
                    y: knifeGroup?.position.y ?? null,
                    z: knifeGroup?.position.z ?? null,
                    velocityY: knifeVelocity.y,
                    velocityZ: knifeVelocity.z,
                    rotation: knifeRotation,
                    stuckFace,
                },
                sliceables: {
                    total: sliceableObjects.length,
                    visible: sliceableObjects.filter((obj) => obj.visible !== false).length,
                },
                pieces: {
                    total: fallingPieces.length,
                    sliding: fallingPieces.filter((piece) => piece.userData?.phase === 'sliding').length,
                    falling: fallingPieces.filter((piece) => piece.userData?.phase === 'falling').length,
                    grounded: fallingPieces.filter((piece) => piece.userData?.phase === 'grounded').length,
                    spreadX: fallingPieces.length > 1 ? Math.max(...fallingPieces.map((piece) => piece.position.x)) - Math.min(...fallingPieces.map((piece) => piece.position.x)) : 0,
                    velocities: fallingPieces.map((piece) => ({
                        x: Number((piece.userData?.velocity?.x || 0).toFixed(6)),
                        y: Number((piece.userData?.velocity?.y || 0).toFixed(6)),
                        z: Number((piece.userData?.velocity?.z || 0).toFixed(6)),
                    })),
                    types: [...new Set(fallingPieces.map((piece) => piece.userData?.objectType).filter(Boolean))],
                },
                sliceEvents: window.__sliceRushSliceEvents.map((event) => ({ ...event })),
                stickEvents: window.__sliceRushStickEvents.map((event) => ({ ...event })),
                spawnEvents: window.__sliceRushSpawnEvents.map((event) => ({ ...event })),
                hud: {
                    score: document.getElementById('score-display')?.innerText?.replace(/\\s+/g, ' ').trim() ?? '',
                    timer: document.getElementById('endless-timer-text')?.textContent ?? '',
                    tapDisplay: getComputedStyle(document.getElementById('tap-hint')).display,
                    levelDisplay: getComputedStyle(document.getElementById('play-level-indicator')).display,
                    coinEndless: document.getElementById('coin-display')?.classList.contains('endless-pos') ?? false,
                },
                platforms: platforms.filter((platform) => platform.userData?.type !== 'roof').slice(0, 14).map(__sliceRushPlatformSummary),
                background: __sliceRushBackgroundSummary(),
            }),
        };
`;

  return html.replace("    </script>\n</body>", `${probe}    </script>\n</body>`);
}

function startServer(referenceHtml) {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    if (url.pathname === "/reference.html") {
      response.writeHead(200, { "Content-Type": "text/html" });
      response.end(referenceHtml);
      return;
    }

    const requested = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = path.resolve(root, `.${requested}`);
    if (!filePath.startsWith(root)) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }
    fs.readFile(filePath, (error, data) => {
      if (error) {
        response.writeHead(404);
        response.end("Not found");
        return;
      }
      response.writeHead(200, {
        "Content-Type": mimeTypes.get(path.extname(filePath)) ?? "application/octet-stream",
      });
      response.end(data);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Failed to bind comparison server");
      resolve({ server, origin: `http://127.0.0.1:${address.port}` });
    });
  });
}

async function installFakePlaydrop(page) {
  await page.route("https://assets.playdrop.ai/sdk/playdrop.js", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/javascript", body: "" });
  });
  await page.addInitScript(() => {
    const calls = [];
    const record = (type, payload = null) => calls.push({ type, payload });
    const sdk = {
      init: async () => {
        record("init");
        return sdk;
      },
      host: {
        audioEnabled: true,
        ready: () => record("ready"),
        setLoadingState: (state) => record("loading", state),
        onAudioPolicyChange: () => record("audio-policy-listener"),
      },
      app: { authMode: "OPTIONAL", type: "GAME" },
      me: {
        isLoggedIn: true,
        username: "compare-tester",
        appData: {
          data: {},
          get: async () => null,
          set: async (key, value) => record("appData.set", { key, value }),
        },
        promptLogin: async () => record("promptLogin"),
      },
      ads: {
        interstitial: {
          load: async () => ({ status: "ready" }),
          show: async () => ({ status: "dismissed" }),
        },
        rewarded: {
          load: async () => ({ status: "ready" }),
          show: async () => ({ status: "completed" }),
        },
      },
      shop: {
        listProducts: async () => [{ key: "coins_500" }, { key: "coins_1500" }, { key: "coins_4000" }],
        purchase: async (payload) => ({ id: 1001, status: "GRANTED", sku: typeof payload === "string" ? payload : payload.sku }),
        grant: async (receiptId) => ({ id: receiptId, status: "GRANTED" }),
        consume: async () => undefined,
      },
      achievements: {
        unlock: async (key) => record("achievement.unlock", key),
        setProgressAtLeast: async (key, progress) => record("achievement.progress", { key, progress }),
      },
      leaderboards: {
        submitScore: async (key, score) => record("leaderboard.submit", { key, score }),
      },
    };
    window.__pdCalls = calls;
    window.playdrop = sdk;
  });
}

function collectCurrentStateScript() {
  const state = window.__choplineTest.state();
  return {
    state: state.knife.state,
    mode: state.run?.mode ?? null,
    score: state.run?.score ?? null,
    timer: state.run?.endlessScoreTimer ?? null,
    templates: state.endless.templates,
    planEvents: state.endless.planEvents,
    randomCount: window.__rngCount || 0,
    knife: state.knife,
    sliceables: state.sliceables,
    pieces: state.slicePieces,
    sliceEvents: state.sliceEvents,
    stickEvents: state.stickEvents,
    hud: {
      score: document.querySelector("#score-pill")?.innerText?.replace(/\s+/g, " ").trim() ?? "",
      timer: document.querySelector("#endless-timer-text")?.textContent ?? "",
      tapDisplay: getComputedStyle(document.querySelector("#tap-hint")).display,
      levelDisplay: getComputedStyle(document.querySelector("#level-pill")).display,
      coinEndless: document.querySelector("#coin-pill")?.classList.contains("endless-pos") ?? false,
    },
    platforms: state.endless.platforms,
    background: state.background,
  };
}

async function openReference(browser, origin, errors) {
  const page = await browser.newPage({
    viewport,
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${origin}/reference.html`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => typeof window.__sliceRushProbe?.startPlay === "function", null, { timeout: 10000 });
  await page.evaluate(() => window.__sliceRushProbe.startPlay());
  await page.waitForSelector("#start-buttons.visible", { timeout: 10000 });
  await page.evaluate((seedValue) => window.__sliceRushProbe.setSeed(seedValue), seed);
  await page.evaluate(() => window.__sliceRushProbe.clickEndless());
  await page.waitForFunction(() => {
    const state = window.__sliceRushProbe.state();
    return state.state === "ready" && state.mode === "endless" && state.templates > 0;
  }, null, { timeout: 10000 });
  await page.evaluate(() => window.__sliceRushProbe.setPaused(true));
  await page.evaluate(() => window.__sliceRushProbe.resetMotionClocks());
  return page;
}

async function openCurrent(browser, origin, errors) {
  const page = await browser.newPage({
    viewport,
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await installFakePlaydrop(page);
  await page.addInitScript(({ key, profile }) => {
    localStorage.setItem(key, JSON.stringify(profile));
  }, { key: profileKey, profile: createProfile() });
  await page.goto(`${origin}/index.html?playdrop_channel=prod&chopline_test=1`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => typeof window.__choplineTest?.state === "function", null, { timeout: 10000 });
  await page.evaluate(seedScript(seed));
  await page.evaluate(() => window.__choplineTest.startEndless());
  await page.waitForFunction(() => {
    const state = window.__choplineTest.state();
    return state.screen === "playing" && state.run?.mode === "endless" && state.endless.templates > 0;
  }, null, { timeout: 10000 });
  await page.evaluate(() => window.__choplineTest.setProofFrozen(true));
  await page.evaluate(() => window.__choplineTest.resetMotionClocks());
  return page;
}

async function snapshot(page, side, label) {
  const filePath = path.join(outDir, `${label}-${side}.png`);
  await page.screenshot({ path: filePath, fullPage: false });
  const state = side === "reference"
    ? await page.evaluate(() => window.__sliceRushProbe.state())
    : await page.evaluate(collectCurrentStateScript);
  return { side, label, filePath, state };
}

async function freezePair(reference, current) {
  await Promise.all([
    reference.evaluate(() => window.__sliceRushProbe.setPaused(true)),
    current.evaluate(() => window.__choplineTest.setProofFrozen(true)),
  ]);
  await Promise.all([reference.waitForTimeout(20), current.waitForTimeout(20)]);
}

async function tapPair(reference, current) {
  await Promise.all([
    reference.evaluate(() => window.__sliceRushProbe.tap()),
    current.evaluate(() => window.__choplineTest.tap()),
  ]);
}

async function advancePair(reference, current, seconds) {
  await Promise.all([
    reference.evaluate((duration) => window.__sliceRushProbe.advance(duration), seconds),
    current.evaluate((duration) => window.__choplineTest.advance(duration), seconds),
  ]);
}

async function captureTargetedEndlessSplit(browser, origin, errors, preferredType, index) {
  const reference = await openReference(browser, origin, errors.reference);
  const current = await openCurrent(browser, origin, errors.current);
  const labelBase = `${String(index).padStart(2, "0")}-${preferredType.replace(/_/g, "-")}`;
  const snapshots = [];
  await Promise.all([
    reference.evaluate((type) => {
      window.__sliceRushProbe.stageEndlessSplitVisualProof(type);
      window.__sliceRushProbe.setPaused(true);
    }, preferredType),
    current.evaluate((type) => {
      window.__choplineTest.stageEndlessSplitVisualProof(type);
      window.__choplineTest.setProofFrozen(true);
    }, preferredType),
  ]);
  await advancePair(reference, current, 0.18);
  snapshots.push(...(await snapshotPair(reference, current, `${labelBase}-split`)));
  await advancePair(reference, current, 0.38);
  snapshots.push(...(await snapshotPair(reference, current, `${labelBase}-fall`)));
  await reference.close();
  await current.close();
  return snapshots;
}

async function snapshotPair(reference, current, label) {
  await freezePair(reference, current);
  const pair = [
    await snapshot(reference, "reference", label),
    await snapshot(current, "current", label),
  ];
  return pair;
}

function stateSummary(state) {
  const knifeState = state.knife?.state ?? (state.knife?.stuck ? "stuck" : state.knife?.slicing ? "slicing" : "flying");
  const y = Number(state.knife?.y ?? 0).toFixed(2);
  const z = Number(state.knife?.z ?? 0).toFixed(2);
  const vy = Number(state.knife?.velocityY ?? 0).toFixed(2);
  const vz = Number(state.knife?.velocityZ ?? 0).toFixed(2);
  const pieces = state.pieces?.total ?? state.pieces?.count ?? 0;
  return `state=${knifeState} score=${state.score ?? 0} timer=${Number(state.timer ?? 0).toFixed(1)} y/z=${y}/${z} vy/vz=${vy}/${vz} pieces=${pieces}`;
}

async function buildComposite(browser, snapshots) {
  const labels = [...new Set(snapshots.map((item) => item.label))];
  const rows = labels.map((label) => {
    const reference = snapshots.find((item) => item.label === label && item.side === "reference");
    const current = snapshots.find((item) => item.label === label && item.side === "current");
    if (!reference || !current) throw new Error(`Missing snapshot pair for ${label}`);
    const refB64 = fs.readFileSync(reference.filePath, "base64");
    const curB64 = fs.readFileSync(current.filePath, "base64");
    return `
      <section class="row">
        <h2>${label}</h2>
        <figure>
          <figcaption><strong>Reference</strong><span>${stateSummary(reference.state)}</span></figcaption>
          <img src="data:image/png;base64,${refB64}">
        </figure>
        <figure>
          <figcaption><strong>Current</strong><span>${stateSummary(current.state)}</span></figcaption>
          <img src="data:image/png;base64,${curB64}">
        </figure>
      </section>
    `;
  }).join("");

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            background: #11151f;
            color: white;
            font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
          }
          main { width: 1230px; padding: 22px; }
          h1 { margin: 0 0 14px; font-size: 28px; }
          .meta { margin: 0 0 18px; color: #ccd7ee; font-size: 14px; }
          .row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
            margin-bottom: 22px;
          }
          h2 {
            grid-column: 1 / -1;
            margin: 0;
            font-size: 19px;
            color: #f8fbff;
          }
          figure {
            margin: 0;
            border: 1px solid rgba(255,255,255,.16);
            border-radius: 8px;
            overflow: hidden;
            background: #1a2232;
          }
          figcaption {
            display: flex;
            gap: 10px;
            justify-content: space-between;
            align-items: baseline;
            padding: 9px 11px;
            font-size: 12px;
            color: #dce7fb;
          }
          figcaption strong {
            font-size: 16px;
            color: white;
          }
          img {
            display: block;
            width: 100%;
          }
        </style>
      </head>
      <body>
        <main>
          <h1>Slice Rush Endless Mobile Portrait Comparison</h1>
          <p class="meta">Viewport ${viewport.width}x${viewport.height}, deterministic seed ${seed}. Left is downloaded Astrocade reference; right is current local build.</p>
          ${rows}
        </main>
      </body>
    </html>
  `;

  const htmlPath = path.join(outDir, "comparison.html");
  await writeFile(htmlPath, html);
  const page = await browser.newPage({ viewport: { width: 1230, height: 2400 }, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "load" });
  const pngPath = path.join(outDir, "comparison.png");
  await page.screenshot({ path: pngPath, fullPage: true });
  await page.close();
  return { htmlPath, pngPath };
}

async function main() {
  assert(fs.existsSync(path.join(root, "index.html")), "dist/index.html missing; run npm run build first");
  assert(fs.existsSync(referenceCodePath), "Downloaded reference game code is missing");
  assert(fs.existsSync(referenceConfigPath), "Downloaded reference game config is missing");
  await mkdir(outDir, { recursive: true });
  const referenceHtml = buildReferenceHtml();
  await writeFile(path.join(outDir, "reference-instrumented.html"), referenceHtml);

  const { server, origin } = await startServer(referenceHtml);
  const browser = await chromium.launch({ headless: true, args: ["--use-gl=swiftshader"] });
  const errors = { reference: [], current: [] };
  const snapshots = [];

  try {
    const reference = await openReference(browser, origin, errors.reference);
    const current = await openCurrent(browser, origin, errors.current);

    snapshots.push(...(await snapshotPair(reference, current, "00-ready")));

    await tapPair(reference, current);
    await advancePair(reference, current, 0.46);
    snapshots.push(...(await snapshotPair(reference, current, "01-after-first-tap")));

    await tapPair(reference, current);
    await advancePair(reference, current, 0.12);
    snapshots.push(...(await snapshotPair(reference, current, "02-after-second-tap")));

    await advancePair(reference, current, 0.7);
    snapshots.push(...(await snapshotPair(reference, current, "03-later-flight")));

    await Promise.all([
      reference.evaluate(() => {
        window.__sliceRushProbe.stageEndlessSplitVisualProof();
        window.__sliceRushProbe.setPaused(true);
      }),
      current.evaluate(() => {
        window.__choplineTest.stageEndlessSplitVisualProof();
        window.__choplineTest.setProofFrozen(true);
      }),
    ]);
    await advancePair(reference, current, 0.18);
    snapshots.push(...(await snapshotPair(reference, current, "04-endless-split")));

    await advancePair(reference, current, 0.38);
    snapshots.push(...(await snapshotPair(reference, current, "05-split-fall")));

    await reference.close();
    await current.close();

    const splitTargets = ["wooden_stake", "donut", "book", "cheese", "cube", "sausage"];
    for (const [targetIndex, targetType] of splitTargets.entries()) {
      snapshots.push(...(await captureTargetedEndlessSplit(browser, origin, errors, targetType, targetIndex + 6)));
    }

    const composite = await buildComposite(browser, snapshots);
    const payload = {
      origin,
      viewport,
      seed,
      errors,
      composite,
      snapshots: snapshots.map((item) => ({
        side: item.side,
        label: item.label,
        filePath: item.filePath,
        summary: stateSummary(item.state),
        state: item.state,
      })),
    };
    await writeFile(path.join(outDir, "comparison-state.json"), JSON.stringify(payload, null, 2));
    console.log(`[compare-reference-endless] ${composite.pngPath}`);
    if (errors.reference.length || errors.current.length) {
      console.log(JSON.stringify(errors, null, 2));
    }
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

await main();

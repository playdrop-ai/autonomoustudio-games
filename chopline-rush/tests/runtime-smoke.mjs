import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const root = path.resolve("dist");
const profileKey = "chopline-rush-v2-profile";
const mimeTypes = new Map([
  [".html", "text/html"],
  [".js", "text/javascript"],
  [".css", "text/css"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".mp3", "audio/mpeg"],
  [".glb", "model/gltf-binary"],
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function createProfile(overrides = {}) {
  return {
    coins: 0,
    ownedKnives: ["cooking"],
    equippedKnife: "cooking",
    ownedThemes: ["forest"],
    equippedTheme: "forest",
    highestLevel: 1,
    highestLevelCompleted: 0,
    endlessBest: 0,
    totalRuns: 0,
    totalSlices: 0,
    totalCoinsEarned: 0,
    achievements: [],
    ...overrides,
  };
}

function startServer() {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
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
      response.writeHead(200, { "Content-Type": mimeTypes.get(path.extname(filePath)) ?? "application/octet-stream" });
      response.end(data);
    });
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Failed to bind smoke server");
      resolve({ server, origin: `http://127.0.0.1:${address.port}` });
    });
  });
}

async function installFakePlaydrop(page, remoteProfile = null) {
  await page.route("https://assets.playdrop.ai/sdk/playdrop.js", (route) => route.fulfill({
    status: 200,
    contentType: "application/javascript",
    body: "",
  }));
  await page.addInitScript((initialProfile) => {
    const calls = [];
    const appData = { profile: initialProfile };
    const record = (type, payload = null) => calls.push({ type, payload });
    const sdk = {
      init: async () => {
        record("init");
        return sdk;
      },
      host: {
        audioEnabled: true,
        setLoadingState: (state) => record("loading", state),
        ready: () => record("ready"),
        onAudioPolicyChange: () => record("audio-policy-listener"),
      },
      app: { authMode: "OPTIONAL", type: "GAME" },
      me: {
        isLoggedIn: true,
        username: "smoke-tester",
        appData: {
          data: initialProfile ? { "chopline-rush-profile": initialProfile } : {},
          get: async (key) => {
            record("appData.get", key);
            return key === "chopline-rush-profile" ? appData.profile : null;
          },
          set: async (key, value) => {
            record("appData.set", { key, value });
            if (key === "chopline-rush-profile") appData.profile = value;
            sdk.me.appData.data[key] = value;
          },
        },
        promptLogin: async () => record("promptLogin"),
      },
      leaderboards: {
        submitScore: async (key, score) => record("leaderboard.submit", { key, score }),
      },
    };
    window.__pdCalls = calls;
    window.playdrop = sdk;
  }, remoteProfile);
}

async function openApp(browser, origin, options = {}) {
  const page = await browser.newPage({ viewport: options.viewport ?? { width: 390, height: 844 } });
  const errors = [];
  const glbResponses = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.url().endsWith(".glb")) glbResponses.push({ url: response.url(), status: response.status() });
  });
  await installFakePlaydrop(page, options.remoteProfile ?? null);
  if (options.profile) {
    await page.addInitScript(({ key, profile }) => localStorage.setItem(key, JSON.stringify(profile)), {
      key: profileKey,
      profile: options.profile,
    });
  }
  const params = new URLSearchParams({ playdrop_channel: "prod" });
  if (options.test) params.set("chopline_test", "1");
  await page.goto(`${origin}/index.html?${params}`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => {
    const hud = document.querySelector("#hud");
    return Boolean(hud && !hud.classList.contains("hidden") && !document.querySelector(".screen.visible"));
  }, null, { timeout: 10000 });
  return { page, errors, glbResponses };
}

async function openTestApp(browser, origin, options = {}) {
  const result = await openApp(browser, origin, { ...options, test: true });
  await result.page.waitForFunction(() => typeof window.__choplineTest?.state === "function", null, { timeout: 10000 });
  return result;
}

async function testPortraitBoot(browser, origin) {
  const { page, errors, glbResponses } = await openApp(browser, origin);
  const ui = await page.evaluate(() => ({
    score: document.querySelector("#score-pill strong")?.textContent?.trim(),
    best: document.querySelector("#score-required")?.textContent?.trim(),
    timerDisplay: getComputedStyle(document.querySelector("#endless-timer")).display,
    levelPillGone: document.querySelector("#level-pill") === null,
    shopGlyph: document.querySelector("#shop-btn")?.textContent?.trim(),
    shopFont: getComputedStyle(document.querySelector("#shop-btn")).fontFamily,
    shopColor: getComputedStyle(document.querySelector("#shop-btn")).color,
    visibleScreens: document.querySelectorAll(".screen.visible").length,
    canvas: document.querySelector("canvas")?.getBoundingClientRect().toJSON(),
    calls: window.__pdCalls,
  }));
  const shot = await page.screenshot({ type: "png" });
  assert(errors.length === 0, `Portrait boot console/page errors: ${errors.join("\n")}`);
  assert(ui.score === "0" && ui.best === "BEST 0", `Endless HUD did not boot cleanly: ${ui.score}/${ui.best}`);
  assert(ui.timerDisplay === "none" && ui.levelPillGone, "Removed level/timer UI became visible");
  assert(ui.visibleScreens === 0, "A menu obscured the direct-to-endless boot");
  assert(ui.shopGlyph && ui.shopFont.includes("Arial") && ui.shopColor === "rgb(23, 61, 120)", "Gear control does not have a readable system-font icon");
  assert(ui.canvas?.width === 390 && ui.canvas?.height === 844, `Canvas does not fill the portrait viewport: ${JSON.stringify(ui.canvas)}`);
  assert(shot.length > 5000, "Portrait gameplay screenshot appears blank");
  assert(glbResponses.some((item) => item.url.endsWith("cooking-knife.glb") && item.status === 200), "Starter cooking knife model did not load");
  assert(ui.calls.some((call) => call.type === "init") && ui.calls.some((call) => call.type === "ready"), "PlayDrop lifecycle did not initialize and become ready");
  assert(!ui.calls.some((call) => call.type.includes("achievement") || call.type.includes("interstitial") || call.type.includes("rewarded")), "Simplified boot invoked removed systems");
  await page.close();
}

async function testDesktopCompatibilityFrame(browser, origin) {
  const { page, errors } = await openApp(browser, origin, { viewport: { width: 1280, height: 720 } });
  const canvas = await page.evaluate(() => document.querySelector("canvas")?.getBoundingClientRect().toJSON());
  assert(errors.length === 0, `Desktop compatibility console/page errors: ${errors.join("\n")}`);
  assert(canvas?.height === 720 && Math.abs(canvas.width / canvas.height - 9 / 16) < 0.02, `Desktop compatibility frame is not centered portrait 9:16: ${JSON.stringify(canvas)}`);
  await page.close();
}

async function testMultipleAirTap(browser, origin) {
  const { page, errors } = await openTestApp(browser, origin);
  const initial = await page.evaluate(() => window.__choplineTest.state());
  const geometry = initial.knifeGeometry;
  await page.mouse.click(195, 600);
  await page.waitForTimeout(450);
  const beforeSecond = await page.evaluate(() => window.__choplineTest.state().knife);
  await page.mouse.click(195, 600);
  await page.waitForTimeout(50);
  const afterSecond = await page.evaluate(() => window.__choplineTest.state().knife);
  assert(errors.length === 0, `Multiple-tap console/page errors: ${errors.join("\n")}`);
  assert(initial.knife.x === 0, `Knife launched outside the course centerline: ${initial.knife.x}`);
  assert(geometry.tipError < 0.0001 && geometry.handleEndError < 0.0001, `Visual knife anchors diverged from collision geometry: ${JSON.stringify(geometry)}`);
  assert(beforeSecond.state === "flying" && afterSecond.state === "flying", "Air tap did not preserve flying state");
  assert(afterSecond.velocityY > beforeSecond.velocityY, `Second tap did not add lift: ${beforeSecond.velocityY} -> ${afterSecond.velocityY}`);
  assert(afterSecond.velocityZ >= 7.5, `Second tap did not preserve forward motion: ${afterSecond.velocityZ}`);
  assert(afterSecond.rotation !== beforeSecond.rotation, "Second tap did not continue the visible flip");
  await page.close();
}

async function testLandingAndCutPhysics(browser, origin) {
  const { page, errors } = await openTestApp(browser, origin, { profile: createProfile() });
  await page.evaluate(() => window.__choplineTest.stageFlatLandingProof());
  await page.waitForFunction(() => ["rotating-stick", "stuck"].includes(window.__choplineTest.state().knife.state), null, { timeout: 10000 });
  const flatLanding = await page.evaluate(() => window.__choplineTest.state());
  assert(flatLanding.run.outcome === null, `Recoverable flat landing ended the run as ${flatLanding.run.outcome}`);

  await page.evaluate(() => window.__choplineTest.stageLandingProof());
  await page.waitForFunction(() => {
    const knife = window.__choplineTest.state().knife;
    return knife.state === "stuck" && knife.stuckFace === "top" && knife.stuckPlatformId;
  }, null, { timeout: 10000 });
  const landing = await page.evaluate(() => window.__choplineTest.state().knife);
  assert(landing.velocityY === 0 && landing.velocityZ === 0, `Blade landing retained velocity: ${landing.velocityY}/${landing.velocityZ}`);

  await page.evaluate(() => window.__choplineTest.stageSideLandingProof());
  await page.waitForTimeout(300);
  await page.mouse.click(195, 600);
  await page.waitForTimeout(30);
  const sideRelaunch = await page.evaluate(() => window.__choplineTest.state().knife);
  assert(sideRelaunch.state === "flying" && sideRelaunch.velocityY > 8 && sideRelaunch.velocityZ < 0, `Front-face side stab did not pop up and away from the face: ${sideRelaunch.state}/${sideRelaunch.velocityY}/${sideRelaunch.velocityZ}`);

  const handleFirst = await page.evaluate(() => {
    window.__choplineTest.stageHandleSliceProof();
    window.__choplineTest.advance(0.2);
    return window.__choplineTest.state();
  });
  assert(handleFirst.run.score === 1, `Handle-first contact with an imminent blade sweep must cut once: ${handleFirst.run.score}`);
  assert(handleFirst.sliceables.sliced === 1, `Handle-first look-ahead cut sliced ${handleFirst.sliceables.sliced} targets`);
  assert(handleFirst.knife.state !== "bouncing", `Forgiven handle-first contact must not bounce: ${handleFirst.knife.state}`);

  await page.evaluate(() => window.__choplineTest.startEndless());
  await page.waitForTimeout(50);
  await page.mouse.click(195, 600);
  await page.waitForTimeout(1200);
  const oneTapCut = await page.evaluate(() => window.__choplineTest.state());
  assert(oneTapCut.run.score >= 8 && oneTapCut.run.score <= 13, `One normal tap did not carve down through the opening wall: ${JSON.stringify({ run: oneTapCut.run, knife: oneTapCut.knife })}`);
  const wallFeedback = await page.locator(".score-pop").allTextContents();
  assert(wallFeedback.length >= 3 && wallFeedback.every((label) => label === "+1"), `Opening wall lost its individual course feedback: ${JSON.stringify(wallFeedback)}`);
  await page.waitForTimeout(500);
  const oneTapOpening = await page.evaluate(() => window.__choplineTest.state());
  assert(
    oneTapOpening.run.outcome === null
      && oneTapOpening.run.score >= 7
      && oneTapOpening.sliceables.visible < oneTapOpening.sliceables.total
      && oneTapOpening.sliceables.visible > 0
      && oneTapOpening.knife.state !== "bouncing"
      && oneTapOpening.knife.z > 4.5,
    `One normal tap did not continue through a partially intact wall: ${JSON.stringify({ run: oneTapOpening.run, knife: oneTapOpening.knife, sliceables: oneTapOpening.sliceables })}`,
  );

  const openingCadences = [];
  for (const interval of [300, 420, 520, 620, 750]) {
    await page.evaluate(() => window.__choplineTest.startEndless());
    await page.waitForTimeout(50);
    await page.mouse.click(195, 600);
    await page.waitForTimeout(interval);
    await page.mouse.click(195, 600);
    await page.waitForTimeout(1600);
    const state = await page.evaluate(() => window.__choplineTest.state());
    openingCadences.push({ interval, score: state.run.score, outcome: state.run.outcome, knifeState: state.knife.state });
  }
  const successfulCadences = openingCadences.filter((result) => result.score >= 1 && result.outcome === null && result.knifeState !== "bouncing");
  assert(successfulCadences.length >= 4, `Two-tap opening lacks a broad playable timing window: ${JSON.stringify(openingCadences)}`);

  await page.evaluate(() => window.__choplineTest.startEndless());
  await page.waitForTimeout(50);
  for (let i = 0; i < 5; i += 1) {
    await page.mouse.click(195, 600);
    await page.waitForTimeout(1150);
  }
  const continuation = await page.evaluate(() => window.__choplineTest.state());
  assert(
    continuation.run.outcome === null
      && continuation.run.score >= 8
      && continuation.knife.z >= 13.4,
    `Real land-and-relaunch run did not progress through the course: ${JSON.stringify({ run: continuation.run, knife: continuation.knife })}`,
  );

  const cutImpact = await page.evaluate(() => {
    window.__choplineTest.setProfile({ coins: 0, totalSlices: 0, totalCoinsEarned: 0 });
    window.__choplineTest.startEndless();
    window.__choplineTest.stageEndlessSplitVisualProof("apple");
    return window.__choplineTest.state();
  });
  await page.waitForFunction(() => {
    const state = window.__choplineTest.state();
    return state.run?.score >= 1 && state.slicePieces.count >= 2;
  }, null, { timeout: 10000 });
  await page.waitForFunction(() => window.__choplineTest.state().slicePieces.spreadX > 0.5, null, { timeout: 10000 });
  const cut = await page.evaluate(() => window.__choplineTest.state());
  assert(errors.length === 0, `Landing/cut console/page errors: ${errors.join("\n")}`);
  assert(cut.run.score === cut.sliceables.sliced, `Each sliced object must score exactly one point: ${cut.run.score}/${cut.sliceables.sliced}`);
  assert(cut.run.coinsAwarded === cut.run.score && cut.profile.coins === cut.run.score, `Each sliced object must collect and persist one coin: ${cut.run.coinsAwarded}/${cut.profile.coins}/${cut.run.score}`);
  assert(cut.slicePieces.count === cut.sliceables.sliced * 2, `Each sliced object must leave two physical halves, got ${cut.slicePieces.count} for ${cut.sliceables.sliced}`);
  assert(cut.slicePieces.spreadX > 0.5, `Cut halves did not become visibly separated: ${cut.slicePieces.spreadX}`);
  assert(cut.slicePieces.velocities.some((velocity) => velocity.x < 0) && cut.slicePieces.velocities.some((velocity) => velocity.x > 0), "Cut halves lack opposing launch velocity");
  assert(cutImpact.knife.velocityZ >= 2, `A successful non-stack cut killed the knife's forward momentum: ${cutImpact.knife.velocityZ}`);
  await page.close();
}

async function testEndlessGeneration(browser, origin) {
  const { page, errors } = await openTestApp(browser, origin);
  await page.evaluate(() => window.__choplineTest.startEndless());
  const state = await page.evaluate(() => window.__choplineTest.state());
  const platforms = state.endless.platforms;
  assert(errors.length === 0, `Endless generation console/page errors: ${errors.join("\n")}`);
  assert(state.run.mode === "endless" && state.endless.templates === 10, "Runtime did not load the curated authored endless chunk pool");
  assert(state.endless.cursorZ >= 120, `Runtime did not generate far enough ahead: ${state.endless.cursorZ}`);
  assert(state.endless.unattachedObjectCount === 0, "Generated objects must remain attached to platforms");
  assert(platforms[0].id === "endless_start" && platforms[0].objectCount === 0, "Opening platform drifted");
  assert(platforms[1].depth === 8 && platforms[1].objectCount === 13 && platforms[1].objectTypes.includes("brick"), "First generated chunk must be the tall thirteen-course wall");
  assert(platforms[2].depth === 11 && platforms[2].objectCount === 7 && platforms[2].objectTypes.includes("orange") && platforms[2].objectTypes.includes("emoji"), "Second generated chunk must be the orange and emoji lane");
  assert(platforms[3].depth === 8 && platforms[3].objectCount === 2 && platforms[3].objectTypes.includes("camera"), "Third generated chunk must be the camera lane");
  assert(platforms[4].depth === 6 && platforms[4].objectCount === 3 && platforms[4].objectTypes.includes("orange"), "Fourth generated chunk must be the recovery orange stack");
  for (let index = 1; index < platforms.length; index += 1) {
    const previous = platforms[index - 1];
    const current = platforms[index];
    const gap = current.z - current.depth / 2 - (previous.z + previous.depth / 2);
    const previousTop = previous.y + previous.height / 2;
    const currentTop = current.y + current.height / 2;
    assert(gap >= 1.09 && gap <= 3.81, `Platform ${index} generated an unplayable gap: ${gap}`);
    assert(currentTop - previousTop <= 3.81 && currentTop - previousTop >= -1.51, `Platform ${index} generated an unreachable height change: ${currentTop - previousTop}`);
  }
  await page.close();
}

async function testShopAndTheme(browser, origin) {
  const { page, errors, glbResponses } = await openApp(browser, origin, { profile: createProfile({ coins: 1000 }) });
  await page.click("#shop-btn");
  await page.waitForSelector("#shop-screen.visible");
  const counts = await page.evaluate(() => ({
    knives: document.querySelectorAll("#knife-list .shop-item").length,
    themes: document.querySelectorAll("#coin-list .shop-item").length,
  }));
  assert(counts.knives === 6 && counts.themes === 3, `Shop scope drifted: ${counts.knives} knives/${counts.themes} themes`);

  await page.click("#knife-list .shop-item:nth-child(1) button");
  await page.waitForFunction(() => document.querySelector("#knife-list .shop-item:nth-child(1) button")?.textContent?.trim() === "Equipped");
  await page.click("#coin-list .shop-item:nth-child(2) button");
  await page.waitForFunction(() => document.querySelector("#coin-list .shop-item:nth-child(2) button")?.textContent?.trim() === "Active");
  const state = await page.evaluate(() => ({
    coins: document.querySelector("#shop-coins")?.textContent?.replace(/\s+/g, " ").trim(),
    calls: window.__pdCalls,
  }));
  const saved = state.calls.filter((call) => call.type === "appData.set").at(-1)?.payload?.value;
  assert(errors.length === 0, `Shop console/page errors: ${errors.join("\n")}`);
  assert(state.coins.includes("220"), `Knife and theme prices were not deducted correctly: ${state.coins}`);
  assert(saved?.equippedKnife === "utensil" && saved?.ownedKnives?.includes("utensil"), "Knife ownership/equip did not persist");
  assert(saved?.equippedTheme === "beach" && saved?.ownedThemes?.includes("beach"), "Theme ownership/equip did not persist");
  assert(glbResponses.some((item) => item.url.endsWith("cooking-knife.glb") && item.status === 200), "Purchased knife model did not load");
  assert(!state.calls.some((call) => call.type.includes("achievement")), "Shop invoked removed achievements");
  await page.close();
}

async function testEndlessResultAndLeaderboard(browser, origin) {
  const { page, errors } = await openTestApp(browser, origin, { profile: createProfile({ endlessBest: 18 }) });
  await page.evaluate(() => {
    window.__choplineTest.startEndless();
    window.__choplineTest.forceLoss(42);
  });
  await page.waitForSelector("#result-screen.visible", { timeout: 10000 });
  await page.waitForFunction(() => window.__pdCalls.some((call) => call.type === "leaderboard.submit"), null, { timeout: 10000 });
  const state = await page.evaluate(() => ({ test: window.__choplineTest.state(), calls: window.__pdCalls }));
  assert(errors.length === 0, `Result console/page errors: ${errors.join("\n")}`);
  assert(state.test.profile.endlessBest === 42, `Best score did not persist: ${state.test.profile.endlessBest}`);
  assert(state.test.resultTitle === "New Best!" && state.test.resultContinue === "Try Again", "Endless result copy drifted");
  assert(state.calls.some((call) => call.type === "leaderboard.submit" && call.payload.key === "endless_score" && call.payload.score === 42), "Best score was not submitted to PlayDrop");
  assert(!state.calls.some((call) => call.type.includes("achievement") || call.type.includes("interstitial") || call.type.includes("rewarded")), "Result invoked a removed meta system");
  await page.close();
}

async function testListingPreview(browser, origin) {
  const { page, errors } = await openApp(browser, origin);
  await page.evaluate(() => window.__listingCapture.prepare({ active: true, sceneId: "endless", surface: "mobile-portrait", seed: "runtime-smoke", audioPolicy: "silent" }));
  await page.waitForTimeout(500);
  const preview = await page.evaluate(() => ({
    active: document.querySelector("#app")?.classList.contains("preview-capture"),
    controlsHidden: ["#pause-btn", "#shop-btn"].every((selector) => getComputedStyle(document.querySelector(selector)).display === "none"),
    testHook: typeof window.__choplineTest,
  }));
  assert(errors.length === 0, `Preview console/page errors: ${errors.join("\n")}`);
  assert(preview.active && preview.controlsHidden, "Listing preview did not enter clean capture mode");
  assert(preview.testHook === "undefined", "Private test hook leaked into the production route");
  await page.close();
}

async function main() {
  assert(fs.existsSync(path.join(root, "index.html")), "dist/index.html missing; run npm run build first");
  const { server, origin } = await startServer();
  const browser = await chromium.launch({ headless: true, channel: "chromium" });
  try {
    await testPortraitBoot(browser, origin);
    await testDesktopCompatibilityFrame(browser, origin);
    await testMultipleAirTap(browser, origin);
    await testLandingAndCutPhysics(browser, origin);
    await testEndlessGeneration(browser, origin);
    await testShopAndTheme(browser, origin);
    await testEndlessResultAndLeaderboard(browser, origin);
    await testListingPreview(browser, origin);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
  console.log("[runtime-smoke] passed");
}

await main();

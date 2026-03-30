import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, devices } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const outputDir = path.join(rootDir, "output", "playtest-content");

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

const keyboardKeys = ["d", "f", "j", "k"];

const cases = [
  {
    name: "desktop",
    viewport: { width: 1280, height: 720 },
    mobile: false,
  },
  {
    name: "portrait",
    viewport: devices["iPhone 13"].viewport,
    userAgent: devices["iPhone 13"].userAgent,
    deviceScaleFactor: devices["iPhone 13"].deviceScaleFactor,
    isMobile: devices["iPhone 13"].isMobile,
    hasTouch: devices["iPhone 13"].hasTouch,
    mobile: true,
  },
];

const scenarios = [
  { songId: "synth", difficulty: "easy", stepMs: 14000 },
  { songId: "synth", difficulty: "medium", stepMs: 18000 },
  { songId: "synth", difficulty: "hard", stepMs: 22000 },
  { songId: "piano", difficulty: "easy", stepMs: 18000 },
  { songId: "piano", difficulty: "medium", stepMs: 22000 },
  { songId: "piano", difficulty: "hard", stepMs: 26000 },
  { songId: "rock", difficulty: "easy", stepMs: 18000 },
  { songId: "rock", difficulty: "medium", stepMs: 22000 },
  { songId: "rock", difficulty: "hard", stepMs: 26000 },
];
const server = await createStaticServer(distDir);
const browser = await chromium.launch({ headless: true });

try {
  const summary = [];

  for (const testCase of cases) {
    const context = await browser.newContext({
      viewport: testCase.viewport,
      userAgent: testCase.userAgent,
      deviceScaleFactor: testCase.deviceScaleFactor,
      isMobile: testCase.isMobile,
      hasTouch: testCase.hasTouch,
    });
    const page = await context.newPage();
    const consoleErrors = [];

    page.on("pageerror", (error) => consoleErrors.push(String(error)));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await page.goto(`${server.url}?debug_clock=manual`, { waitUntil: "load" });
    await waitForGameReady(page);
    await runInputSmoke(page, testCase.mobile);

    const caseDir = path.join(outputDir, testCase.name);
    fs.mkdirSync(caseDir, { recursive: true });

    for (const scenario of scenarios) {
      console.log(`playtest ${testCase.name} ${scenario.songId} ${scenario.difficulty}`);
      await page.evaluate((selection) => {
        window.__keyfallControl?.selectSong(selection.songId);
        window.__keyfallControl?.selectDifficulty(selection.difficulty);
        window.__keyfallControl?.startRun();
        window.__keyfallControl?.setAutoplay(true);
        window.__keyfallControl?.setMuted(true);
      }, scenario);
      await page.evaluate((stepMs) => window.advanceTime?.(stepMs), scenario.stepMs);

      const state = await page.evaluate(() => window.__keyfallControl?.getState?.() ?? window.__keyfallDebug);
      if (!state || state.screen !== "playing") {
        throw new Error(`Scenario ${scenario.songId}/${scenario.difficulty} did not stay in playing state`);
      }
      if (!Array.isArray(state.visible) || state.visible.length === 0) {
        throw new Error(`Scenario ${scenario.songId}/${scenario.difficulty} has no visible notes in playtest`);
      }

      const shotPath = path.join(caseDir, `${scenario.songId}-${scenario.difficulty}.png`);
      const statePath = path.join(caseDir, `${scenario.songId}-${scenario.difficulty}.json`);
      await page.screenshot({ path: shotPath });
      fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
      summary.push({
        viewport: testCase.name,
        songId: scenario.songId,
        difficulty: scenario.difficulty,
        song: state.song,
        screenshot: path.relative(rootDir, shotPath),
      });
    }

    if (consoleErrors.length > 0) {
      throw new Error(`${testCase.name} console errors:\n${consoleErrors.join("\n")}`);
    }

    await context.close();
  }

  fs.writeFileSync(path.join(outputDir, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ ok: true, scenarioCount: scenarios.length, outputDir }, null, 2));
} finally {
  await browser.close();
  await server.close();
}

async function runInputSmoke(page, mobile) {
  await page.evaluate(() => {
    window.__keyfallControl?.startRun();
    window.__keyfallControl?.setAutoplay(false);
    window.__keyfallControl?.setMuted(true);
  });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const state = await page.evaluate(() => window.__keyfallControl?.getState?.() ?? window.__keyfallDebug);
    const target = state?.visible?.[0];
    if (!target) {
      throw new Error("Missing visible note during input smoke");
    }
    await page.evaluate((ms) => window.advanceTime?.(Math.max(0, ms - 18)), target.inMs);
    const lane = target.lanes[0];
    if (lane === undefined) {
      throw new Error("Target note is missing a lane");
    }
    if (mobile) {
      const viewport = page.viewportSize();
      const width = viewport?.width ?? 390;
      const height = viewport?.height ?? 844;
      const x = (lane + 0.5) * (width / 4);
      const y = height * 0.82;
      await page.touchscreen.tap(x, y);
    } else {
      await page.keyboard.press(keyboardKeys[lane] ?? "d");
    }
    await page.evaluate(() => window.advanceTime?.(80));
  }

  const smokeState = await page.evaluate(() => window.__keyfallControl?.getState?.() ?? window.__keyfallDebug);
  if (!smokeState || smokeState.score <= 0) {
    throw new Error(`Input smoke test did not score any hits for ${mobile ? "portrait" : "desktop"}`);
  }
}

async function waitForGameReady(page) {
  await page.waitForFunction(() => typeof window.__keyfallControl?.getState === "function", undefined, {
    timeout: 30000,
  });
}

async function createStaticServer(directory) {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const pathname = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
    const filePath = path.join(directory, pathname);
    if (!filePath.startsWith(directory)) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    try {
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        response.writeHead(301, { Location: `${pathname}/index.html` }).end();
        return;
      }
      response.writeHead(200, { "Content-Type": contentType(filePath) });
      fs.createReadStream(filePath).pipe(response);
    } catch {
      response.writeHead(404).end("Not found");
    }
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to bind static server");
  }
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".mp3")) return "audio/mpeg";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

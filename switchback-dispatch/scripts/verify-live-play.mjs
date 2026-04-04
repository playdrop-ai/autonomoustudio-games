import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, "output", "playwright", "release-check");
const screenshotPath = path.join(outputDir, "public-play-live.png");
const jsonPath = path.join(outputDir, "public-play-live.json");
const playUrl = "https://www.playdrop.ai/creators/autonomoustudio/apps/game/switchback-dispatch/play";

const codexHome = process.env.CODEX_HOME ?? path.join(process.env.HOME ?? "", ".codex");
const playwrightEntry = path.join(
  codexHome,
  "skills",
  "develop-web-game",
  "scripts",
  "node_modules",
  "playwright",
  "index.mjs",
);
const { chromium } = await import(pathToFileURL(playwrightEntry).href);

await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: process.env.HEADLESS !== "false" });
const context = await browser.newContext({
  viewport: { width: 1440, height: 980 },
  isMobile: false,
  hasTouch: false,
  deviceScaleFactor: 1,
});
const page = await context.newPage();
const consoleMessages = [];

function log(message) {
  process.stderr.write(`[verify-live-play] ${message}\n`);
}

page.on("console", (message) => {
  consoleMessages.push(`[page:${message.type()}] ${message.text()}`);
});
page.on("pageerror", (error) => {
  consoleMessages.push(`[pageerror] ${error.message}`);
});

try {
  log(`open ${playUrl}`);
  await page.goto(playUrl, { waitUntil: "domcontentloaded", timeout: 120000 });
  log("waiting for hosted frame");
  const gameFrame = await waitForGameFrame(page);
  log(`frame ready ${gameFrame.url()}`);
  await gameFrame.waitForFunction(() => typeof window.render_game_to_text === "function", null, {
    timeout: 120000,
  });
  log("render_game_to_text ready");

  await gameFrame.locator("#start-contract-button").waitFor({ state: "visible", timeout: 30000 });
  await gameFrame.locator("#start-contract-button").click({ timeout: 30000 });
  log("start button clicked");
  await gameFrame.waitForFunction(hasDrivingPhase, null, { timeout: 30000 });
  log("driving phase reached");

  await gameFrame.evaluate(() => {
    window.focus();
  });
  log("frame focus requested");
  await playSequence(page, [
    { keys: ["KeyW"], ms: 900 },
    { keys: ["KeyW", "KeyA"], ms: 2000 },
    { keys: ["KeyW"], ms: 700 },
    { keys: ["KeyW", "KeyD"], ms: 1100 },
    { keys: ["KeyW"], ms: 650 },
  ]);
  log("input sequence complete");
  await page.waitForTimeout(300);

  const state = await readState(gameFrame);
  log(`state phase=${state?.phase ?? "null"} speed=${state?.telemetry?.speed ?? "null"}`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  log(`screenshot saved ${screenshotPath}`);
  await fs.writeFile(
    jsonPath,
    JSON.stringify(
      {
        playUrl,
        frameUrl: gameFrame.url(),
        capturedAt: new Date().toISOString(),
        state,
        consoleMessages: consoleMessages.slice(-200),
      },
      null,
      2,
    ),
    "utf8",
  );

  process.stdout.write(
    `${JSON.stringify(
      {
        screenshotPath,
        jsonPath,
        phase: state?.phase ?? null,
        speed: state?.telemetry?.speed ?? null,
        deliveryIndex: state?.deliveryIndex ?? null,
      },
      null,
      2,
    )}\n`,
  );
  log(`state saved ${jsonPath}`);
} finally {
  await context.close();
  await browser.close();
}

async function waitForGameFrame(page) {
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    const frame = page
      .frames()
      .find((candidate) => candidate.url().includes("/apps/switchback-dispatch/v1.0.0/index.html"));
    if (frame) {
      return frame;
    }
    await page.waitForTimeout(500);
  }
  throw new Error("Could not find the hosted Switchback Dispatch frame on the public play page.");
}

async function playSequence(page, sequence) {
  for (const step of sequence) {
    for (const key of step.keys) {
      await page.keyboard.down(key);
    }
    await page.waitForTimeout(step.ms);
    for (const key of [...step.keys].reverse()) {
      await page.keyboard.up(key);
    }
  }
}

async function readState(frame) {
  const raw = await frame.evaluate(() => window.render_game_to_text?.() ?? null);
  return typeof raw === "string" ? JSON.parse(raw) : null;
}

function hasDrivingPhase() {
  const raw = window.render_game_to_text?.();
  if (typeof raw !== "string") {
    return false;
  }

  try {
    return JSON.parse(raw).phase === "driving";
  } catch {
    return false;
  }
}

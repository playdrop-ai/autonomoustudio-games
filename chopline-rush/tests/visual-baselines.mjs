import fs from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

// Visual regression baselines over deterministic frozen game states.
// Canvas-only captures exclude transient DOM popups; the game's seeded visual
// RNG plus fixed-step advance() makes each staged state reproducible.
// Run with --update to (re)write baselines after an intentional visual change.

const root = path.resolve("dist");
const baselineDir = path.resolve("tests/baselines");
const outDir = path.resolve("tmp/visual-baselines");
const profileKey = "chopline-rush-v2-profile";
const update = process.argv.includes("--update");
const DIFF_RATIO_LIMIT = 0.02;
const CHANNEL_TOLERANCE = 26;

const mimeTypes = new Map([
  [".html", "text/html"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".mp3", "audio/mpeg"],
  [".glb", "model/gltf-binary"],
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
      resolve({ server, origin: `http://127.0.0.1:${server.address().port}` });
    });
  });
}

async function installFakePlaydrop(page) {
  await page.route("https://assets.playdrop.ai/sdk/playdrop.js", async (route) => {
    await route.fulfill({ status: 200, contentType: "application/javascript", body: "" });
  });
  await page.addInitScript(() => {
    const sdk = {
      init: async () => sdk,
      host: {
        audioEnabled: false,
        ready: () => undefined,
        setLoadingState: () => undefined,
        onAudioPolicyChange: () => undefined,
      },
      app: { authMode: "OPTIONAL", type: "GAME" },
      me: {
        isLoggedIn: true,
        username: "visual-baseline",
        appData: { data: {}, get: async () => null, set: async () => undefined },
        promptLogin: async () => undefined,
      },
      leaderboards: { submitScore: async () => undefined },
    };
    window.playdrop = sdk;
  });
}

async function diffPngs(page, baselinePng, currentPng) {
  return page.evaluate(async ({ baseline, current, tolerance }) => {
    const load = (b64) => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("baseline image decode failed"));
      image.src = `data:image/png;base64,${b64}`;
    });
    const [imageA, imageB] = await Promise.all([load(baseline), load(current)]);
    if (imageA.width !== imageB.width || imageA.height !== imageB.height) {
      return { sizeMismatch: true, a: `${imageA.width}x${imageA.height}`, b: `${imageB.width}x${imageB.height}` };
    }
    const read = (image) => {
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      return context.getImageData(0, 0, image.width, image.height).data;
    };
    const dataA = read(imageA);
    const dataB = read(imageB);
    let diff = 0;
    const total = imageA.width * imageA.height;
    for (let i = 0; i < dataA.length; i += 4) {
      if (
        Math.abs(dataA[i] - dataB[i]) > tolerance
        || Math.abs(dataA[i + 1] - dataB[i + 1]) > tolerance
        || Math.abs(dataA[i + 2] - dataB[i + 2]) > tolerance
      ) {
        diff += 1;
      }
    }
    return { sizeMismatch: false, diff, total, ratio: diff / total };
  }, { baseline: baselinePng.toString("base64"), current: currentPng.toString("base64"), tolerance: CHANNEL_TOLERANCE });
}

const STATES = [
  {
    name: "ready",
    stage: async (page) => {
      await page.evaluate(() => {
        window.__choplineTest.startEndless();
      });
      await page.waitForTimeout(400);
      await page.evaluate(() => window.__choplineTest.setProofFrozen(true));
    },
    capture: "canvas",
  },
  {
    name: "wall-carve",
    stage: async (page) => {
      await page.evaluate(() => {
        const hooks = window.__choplineTest;
        hooks.startEndless();
        hooks.makeNextFlipReady();
        hooks.tap();
        for (let i = 0; i < 13; i += 1) hooks.advance(0.05);
        hooks.setProofFrozen(true);
      });
    },
    capture: "canvas",
  },
  {
    name: "planted-after-carve",
    stage: async (page) => {
      await page.evaluate(() => {
        const hooks = window.__choplineTest;
        hooks.startEndless();
        hooks.makeNextFlipReady();
        hooks.tap();
        for (let i = 0; i < 40; i += 1) {
          hooks.advance(0.05);
          if (hooks.state().knife.state === "stuck") break;
        }
        hooks.setProofFrozen(true);
      });
    },
    capture: "canvas",
  },
  {
    name: "split-halves",
    stage: async (page) => {
      await page.evaluate(() => {
        const hooks = window.__choplineTest;
        hooks.startEndless();
        hooks.stageEndlessSplitVisualProof("apple");
        for (let i = 0; i < 7; i += 1) hooks.advance(0.05);
        hooks.setProofFrozen(true);
      });
    },
    capture: "canvas",
  },
  {
    name: "result-screen",
    stage: async (page) => {
      await page.evaluate(() => {
        window.__choplineTest.startEndless();
        window.__choplineTest.forceLoss(21);
      });
      await page.waitForSelector("#result-screen.visible", { timeout: 8000 });
      await page.waitForTimeout(1000);
    },
    capture: "page",
  },
];

async function main() {
  assert(fs.existsSync(path.join(root, "index.html")), "dist/index.html missing; run npm run build first");
  await mkdir(baselineDir, { recursive: true });
  await mkdir(outDir, { recursive: true });
  const { server, origin } = await startServer();
  const browser = await chromium.launch({ headless: true, channel: "chromium" });
  const results = [];
  try {
    for (const state of STATES) {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
      const errors = [];
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      page.on("pageerror", (error) => errors.push(error.message));
      await installFakePlaydrop(page);
      await page.addInitScript(({ key }) => localStorage.removeItem(key), { key: profileKey });
      await page.goto(`${origin}/index.html?playdrop_channel=prod&chopline_test=1`, { waitUntil: "networkidle" });
      await page.waitForFunction(() => typeof window.__choplineTest?.state === "function", null, { timeout: 15000 });
      await page.waitForFunction(() => window.__choplineTest.state().screen === "playing", null, { timeout: 15000 });
      await page.evaluate(() => window.__choplineTest.seedRandom(123456));
      if (state.capture === "canvas") {
        await page.addStyleTag({ content: "#app > :not(#stage) { visibility: hidden !important; }" });
      }
      await state.stage(page);
      await page.waitForTimeout(150);
      const shot = state.capture === "canvas"
        ? await page.locator("canvas").screenshot({ type: "png" })
        : await page.screenshot({ type: "png" });
      assert(errors.length === 0, `${state.name}: console/page errors: ${errors.join("\n")}`);

      const baselinePath = path.join(baselineDir, `${state.name}.png`);
      const currentPath = path.join(outDir, `${state.name}.png`);
      await writeFile(currentPath, shot);
      if (update || !fs.existsSync(baselinePath)) {
        assert(update, `${state.name}: baseline missing; run "npm run test:visual -- --update" after verifying the current look`);
        await writeFile(baselinePath, shot);
        results.push({ name: state.name, status: "baseline-updated" });
      } else {
        const baseline = fs.readFileSync(baselinePath);
        const diff = await diffPngs(page, baseline, shot);
        assert(!diff.sizeMismatch, `${state.name}: capture size changed ${diff.a} vs ${diff.b}`);
        assert(
          diff.ratio <= DIFF_RATIO_LIMIT,
          `${state.name}: visual drift ${(diff.ratio * 100).toFixed(2)}% pixels changed (limit ${(DIFF_RATIO_LIMIT * 100).toFixed(1)}%); inspect ${currentPath} vs ${baselinePath}`,
        );
        results.push({ name: state.name, status: "passed", ratio: Number(diff.ratio.toFixed(4)) });
      }
      await page.close();
    }
    console.log(`[visual-baselines] ${update ? "baselines updated" : "passed"} ${JSON.stringify(results)}`);
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

await main();

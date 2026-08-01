import fs from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

// Scripted bot playtest: proves the game PLAYS, not just renders.
// A paced bot plays the intended land-and-relaunch loop and must progress with
// zero softlock windows; a reckless spam bot must climb over the course, starve
// the no-score timer, die, and retry. Metrics land in tmp/bot-playtest/.

const root = path.resolve("dist");
const outDir = path.resolve("tmp/bot-playtest");
const profileKey = "chopline-rush-v2-profile";

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
        username: "bot-playtest",
        appData: { data: {}, get: async () => null, set: async () => undefined },
        promptLogin: async () => undefined,
      },
      leaderboards: { submitScore: async () => undefined },
    };
    window.playdrop = sdk;
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function sampleState(page) {
  return page.evaluate(() => {
    const s = window.__choplineTest.state();
    return {
      knifeState: s.knife.state,
      stuckFace: s.knife.stuckFace,
      slicing: s.knife.slicing,
      score: s.run?.score ?? 0,
      outcome: s.run?.outcome ?? null,
      y: s.knife.y,
      z: s.knife.z,
      frames: window.__choplineTest.frames(),
      screen: s.screen,
    };
  });
}

function findSoftlockWindows(samples, taps, windowMs = 5000, stepMs = 1000) {
  const windows = [];
  if (samples.length === 0) return windows;
  const endT = samples[samples.length - 1].t;
  for (let start = 0; start + windowMs <= endT; start += stepMs) {
    const inWindow = samples.filter((s) => s.t >= start && s.t <= start + windowMs);
    if (inWindow.length < 5) continue;
    const tapsIn = taps.filter((t) => t >= start && t <= start + windowMs).length;
    if (tapsIn === 0) continue;
    const first = inWindow[0];
    const last = inWindow[inWindow.length - 1];
    if (last.outcome) continue;
    const scoreDelta = last.score - first.score;
    const zDelta = last.z - first.z;
    if (scoreDelta === 0 && Math.abs(zDelta) < 0.5) {
      windows.push({ start, end: start + windowMs, taps: tapsIn, zDelta: Number(zDelta.toFixed(2)) });
    }
  }
  return windows;
}

function longestStateRun(samples, stateName) {
  let longest = 0;
  let runStart = null;
  for (const s of samples) {
    if (s.knifeState === stateName) {
      if (runStart === null) runStart = s.t;
      longest = Math.max(longest, s.t - runStart);
    } else {
      runStart = null;
    }
  }
  return longest;
}

async function runPacedBot(page, durationMs) {
  const samples = [];
  const taps = [];
  const started = Date.now();
  let lastTapAt = 0;
  let climbQueued = false;
  const tap = async () => {
    await page.mouse.click(195, 640);
    lastTapAt = Date.now();
    taps.push(Date.now() - started);
  };
  while (Date.now() - started < durationMs) {
    const s = await sampleState(page);
    const t = Date.now() - started;
    samples.push({ t, ...s });
    if (s.outcome) break;
    const sinceTap = Date.now() - lastTapAt;
    if (s.knifeState === "stuck" && sinceTap > 620) {
      // A side stab means a face is blocking the arc: relaunch, then air-tap to climb over it.
      climbQueued = s.stuckFace === "side";
      await sleep(90 + Math.random() * 120);
      await tap();
    } else if (s.knifeState === "flying" && climbQueued && sinceTap > 480) {
      climbQueued = false;
      await tap();
    } else if (s.knifeState === "rotating-stick" && sinceTap > 2600) {
      await tap();
    }
    await sleep(100);
  }
  return { samples, taps };
}

async function runSpamBot(page, durationMs) {
  const samples = [];
  const taps = [];
  const started = Date.now();
  while (Date.now() - started < durationMs) {
    const s = await sampleState(page);
    samples.push({ t: Date.now() - started, ...s });
    if (s.outcome) break;
    await page.mouse.click(195, 640);
    taps.push(Date.now() - started);
    await sleep(430);
  }
  return { samples, taps };
}

async function main() {
  assert(fs.existsSync(path.join(root, "index.html")), "dist/index.html missing; run npm run build first");
  await mkdir(outDir, { recursive: true });
  const { server, origin } = await startServer();
  const browser = await chromium.launch({ headless: true, channel: "chromium" });
  try {
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

    await page.evaluate(() => {
      window.__choplineTest.seedRandom(20260717);
      window.__choplineTest.startEndless();
    });
    await sleep(150);
    const gpu = await page.evaluate(() => window.__choplineTest.gpu());
    const softwareRendered = /swiftshader|llvmpipe|software/i.test(gpu);

    // --- Paced bot: the intended loop must progress without softlocks ---
    const paced = await runPacedBot(page, 40000);
    await writeFile(path.join(outDir, "paced-samples.json"), JSON.stringify(paced, null, 1));
    const renderInfo = await page.evaluate(() => window.__choplineTest.renderInfo());
    const pacedFirst = paced.samples[0];
    const pacedLast = paced.samples[paced.samples.length - 1];
    const firstScoreSample = paced.samples.find((s) => s.score > 0);
    const softlocks = findSoftlockWindows(paced.samples, paced.taps);
    const longestRotatingStick = longestStateRun(paced.samples, "rotating-stick");

    assert(pacedLast.frames - pacedFirst.frames > 400, `Frame loop stalled: ${pacedFirst.frames} -> ${pacedLast.frames}`);
    assert(firstScoreSample && firstScoreSample.t < 6000, `Paced bot found no score in the opening: ${firstScoreSample?.t ?? "never"}ms`);
    assert(pacedLast.score >= 15, `Paced bot under-progressed: score ${pacedLast.score}`);
    assert(softlocks.length === 0, `Softlock windows detected: ${JSON.stringify(softlocks)}`);
    assert(longestRotatingStick < 3500, `Rotating-stick ran ${longestRotatingStick}ms without resolving`);
    assert(renderInfo.calls < 500, `Draw calls over budget: ${renderInfo.calls}`);
    assert(renderInfo.triangles < 1200000, `Triangles over budget: ${renderInfo.triangles}`);

    // If the paced bot died, the retry path must restore play.
    let retryVerified = false;
    if (pacedLast.outcome === "lost") {
      await page.waitForSelector("#result-screen.visible", { timeout: 8000 });
      await page.click("#result-continue");
      await page.waitForFunction(() => {
        const s = window.__choplineTest.state();
        return s.screen === "playing" && (s.run?.score ?? -1) === 0 && s.run?.outcome === null;
      }, null, { timeout: 8000 });
      retryVerified = true;
    }

    // --- Spam bot: reckless tapping must climb, starve the timer, and die ---
    await page.evaluate(() => window.__choplineTest.startEndless());
    await sleep(150);
    const spam = await runSpamBot(page, 22000);
    const spamLast = spam.samples[spam.samples.length - 1];
    const spamPeakY = Math.max(...spam.samples.map((s) => s.y));
    assert(spamLast.outcome === "lost", `Spam bot did not die to the no-score timer: outcome ${spamLast.outcome}`);
    assert(spamPeakY <= 30.5, `Spam bot exceeded the ceiling: y ${spamPeakY}`);
    if (!retryVerified) {
      await page.waitForSelector("#result-screen.visible", { timeout: 8000 });
      await page.click("#result-continue");
      await page.waitForFunction(() => {
        const s = window.__choplineTest.state();
        return s.screen === "playing" && (s.run?.score ?? -1) === 0 && s.run?.outcome === null;
      }, null, { timeout: 8000 });
      retryVerified = true;
    }

    // Fairness: intended play must clearly beat reckless spam.
    assert(pacedLast.score > spamLast.score, `Difficulty pressure is decorative: paced ${pacedLast.score} vs spam ${spamLast.score}`);
    assert(errors.length === 0, `Console/page errors during bot runs: ${errors.join("\n")}`);

    const metrics = {
      gpu,
      softwareRendered,
      renderInfo,
      paced: {
        durationMs: pacedLast.t,
        taps: paced.taps.length,
        framesAdvanced: pacedLast.frames - pacedFirst.frames,
        msToFirstScore: firstScoreSample.t,
        finalScore: pacedLast.score,
        finalZ: Number(pacedLast.z.toFixed(1)),
        outcome: pacedLast.outcome,
        softlockWindows: softlocks,
        longestRotatingStickMs: Math.round(longestRotatingStick),
      },
      spam: {
        durationMs: spamLast.t,
        taps: spam.taps.length,
        finalScore: spamLast.score,
        peakY: Number(spamPeakY.toFixed(1)),
        outcome: spamLast.outcome,
      },
      retryVerified,
    };
    await writeFile(path.join(outDir, "metrics.json"), JSON.stringify(metrics, null, 2));
    console.log(`[bot-playtest] passed  paced=${metrics.paced.finalScore} spam=${metrics.spam.finalScore} frames=${metrics.paced.framesAdvanced} calls=${renderInfo.calls} gpu=${gpu}${softwareRendered ? " (SOFTWARE - fps not evidence)" : ""}`);
    await page.close();
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

await main();

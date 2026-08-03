import fs from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

// Per-chunk playability validation: for every authored zone chunk, force the
// generator to repeat that chunk, then drive a paced sim-time bot through it.
// A chunk passes when the bot keeps progressing (no softlock) and keeps scoring
// when the chunk offers targets. Runs in simulated time via advance(), so the
// whole authored pool validates in about two minutes.

const root = path.resolve("dist");
const outDir = path.resolve("tmp/chunk-validation");
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
        username: "chunk-validator",
        appData: { data: {}, get: async () => null, set: async () => undefined },
        promptLogin: async () => undefined,
      },
      leaderboards: { submitScore: async () => undefined },
    };
    window.playdrop = sdk;
  });
}

async function main() {
  assert(fs.existsSync(path.join(root, "index.html")), "dist/index.html missing; run npm run build first");
  await mkdir(outDir, { recursive: true });
  const { server, origin } = await startServer();
  const browser = await chromium.launch({ headless: true, channel: "chromium" });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
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

    const pool = await page.evaluate(() => {
      const summary = window.__choplineTest.state().endless;
      return { zones: summary.zones, chunks: summary.chunks };
    });
    assert(pool.zones === 5, `Expected 5 zones in the runtime pool, saw ${pool.zones}`);

    const zoneChunkCounts = await page.evaluate(() => {
      window.__choplineTest.seedRandom(1);
      window.__choplineTest.startEndless();
      return window.__choplineTest.zoneChunkCounts();
    });

    const results = [];
    const failures = [];
    for (let zoneIndex = 0; zoneIndex < zoneChunkCounts.length; zoneIndex += 1) {
      for (let chunkIndex = 0; chunkIndex < zoneChunkCounts[zoneIndex]; chunkIndex += 1) {
        const metrics = await page.evaluate(({ zoneIndex, chunkIndex }) => {
          const hooks = window.__choplineTest;
          hooks.seedRandom(9000 + zoneIndex * 100 + chunkIndex);
          hooks.forceEndlessChunk(zoneIndex, chunkIndex);
          hooks.startEndless();
          const start = hooks.state();
          let taps = 0;
          let maxRotatingStreak = 0;
          let rotatingStreak = 0;
          let lastTapStep = -10;
          for (let step = 0; step < 500; step += 1) {
            const s = hooks.state();
            if (s.run.outcome) break;
            if (s.knife.state === "rotating-stick") {
              rotatingStreak += 1;
              maxRotatingStreak = Math.max(maxRotatingStreak, rotatingStreak);
            } else {
              rotatingStreak = 0;
            }
            const canTap = step - lastTapStep >= 5;
            const bouncedBackward = s.knife.state === "flying" && !s.knife.slicing && s.knife.velocityZ < 0;
            const sinkingLow = s.knife.state === "flying" && !s.knife.slicing && s.knife.velocityY < 0 && s.knife.y < 2.6;
            const rhythmicAirTap = s.knife.state === "flying"
              && !s.knife.slicing
              && s.knife.velocityY < 0
              && (step - lastTapStep >= 9 || (step - lastTapStep >= 8 && s.knife.y < 4));
            const nextObstacle = hooks.obstaclesAhead()[0];
            const obstacleClose = Boolean(nextObstacle) && !nextObstacle.moving
              && s.knife.state === "flying" && !s.knife.slicing
              && nextObstacle.z - s.knife.z < 4.4
              && s.knife.y < nextObstacle.y + 3.4
              && s.knife.velocityY < 0.5;
            const gateDist = nextObstacle ? nextObstacle.z - s.knife.z : Infinity;
            const gateBlocking = Boolean(nextObstacle) && nextObstacle.moving
              && s.knife.state === "stuck"
              && gateDist < 13
              && nextObstacle.y < s.knife.y + 2.8;
            if ((s.knife.state === "stuck" && !gateBlocking) || rhythmicAirTap || (canTap && (bouncedBackward || sinkingLow || obstacleClose))) {
              hooks.tap();
              taps += 1;
              lastTapStep = step;
            }
            hooks.advance(0.1);
          }
          const end = hooks.state();
          return {
            zDelta: Number((end.knife.z - start.knife.z).toFixed(1)),
            score: end.run.score,
            outcome: end.run.outcome,
            taps,
            maxRotatingStickSimSeconds: Number((maxRotatingStreak * 0.1).toFixed(1)),
          };
        }, { zoneIndex, chunkIndex });

        const hasTargets = await page.evaluate(({ zoneIndex, chunkIndex }) =>
          window.__choplineTest.chunkHasTargets(zoneIndex, chunkIndex), { zoneIndex, chunkIndex });

        const problems = [];
        if (metrics.zDelta < 90) problems.push(`only advanced ${metrics.zDelta}m in 50 sim-seconds`);
        if (hasTargets && metrics.score < 30) problems.push(`scored only ${metrics.score} on a target chunk`);
        if (metrics.maxRotatingStickSimSeconds > 3.5) problems.push(`rotating-stick ran ${metrics.maxRotatingStickSimSeconds}s`);
        if (hasTargets && metrics.outcome === "lost" && metrics.zDelta < 150) problems.push(`died early (${metrics.outcome} at +${metrics.zDelta}m)`);

        const record = { zone: zoneIndex + 1, chunk: chunkIndex, hasTargets, ...metrics, problems };
        results.push(record);
        if (problems.length > 0) failures.push(record);
      }
    }

    await writeFile(path.join(outDir, "results.json"), JSON.stringify(results, null, 1));
    assert(errors.length === 0, `Console/page errors during chunk validation: ${errors.join("\n")}`);
    assert(failures.length === 0, `Unplayable chunks detected:\n${failures.map((f) => `  zone ${f.zone} chunk ${f.chunk}: ${f.problems.join("; ")}`).join("\n")}`);
    console.log(`[chunk-validation] passed  ${results.length} chunks playable  (details in tmp/chunk-validation/results.json)`);
    await page.close();
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}

await main();

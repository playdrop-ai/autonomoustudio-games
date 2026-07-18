import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

// Difficulty sweep: run a sharp bot (recovery + obstacle hops) and a casual bot
// (delayed stuck-taps only) over several seeds, in simulated time. Reports
// survival, zone reached, and score so balancing changes are measurable.

const root = path.resolve("dist");
const profileKey = "chopline-rush-v2-profile";
const mimeTypes = new Map([
  [".html", "text/html"],
  [".png", "image/png"],
  [".mp3", "audio/mpeg"],
  [".glb", "model/gltf-binary"],
]);

function startServer() {
  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const requested = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = path.resolve(root, `.${requested}`);
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
    server.listen(0, "127.0.0.1", () => resolve({ server, origin: `http://127.0.0.1:${server.address().port}` }));
  });
}

async function main() {
  const { server, origin } = await startServer();
  const browser = await chromium.launch({ headless: true, channel: "chromium" });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.route("https://assets.playdrop.ai/sdk/playdrop.js", (route) =>
    route.fulfill({ status: 200, contentType: "application/javascript", body: "" }));
  await page.addInitScript(() => {
    const sdk = {
      init: async () => sdk,
      host: { audioEnabled: false, ready: () => undefined, setLoadingState: () => undefined, onAudioPolicyChange: () => undefined },
      app: { authMode: "OPTIONAL", type: "GAME" },
      me: { isLoggedIn: true, username: "sweep", appData: { data: {}, get: async () => null, set: async () => undefined }, promptLogin: async () => undefined },
      leaderboards: { submitScore: async () => undefined },
    };
    window.playdrop = sdk;
  });
  await page.addInitScript(({ key }) => localStorage.removeItem(key), { key: profileKey });
  await page.goto(`${origin}/index.html?playdrop_channel=prod&chopline_test=1`, { waitUntil: "networkidle" });
  await page.waitForFunction(() => typeof window.__choplineTest?.state === "function", null, { timeout: 15000 });
  await page.waitForFunction(() => window.__choplineTest.state().screen === "playing", null, { timeout: 15000 });

  const results = { sharp: [], casual: [] };
  for (const policy of ["sharp", "casual"]) {
    for (const seed of [11, 22, 33, 44, 55, 66]) {
      const outcome = await page.evaluate(({ policy, seed }) => {
        const hooks = window.__choplineTest;
        hooks.seedRandom(seed);
        hooks.startEndless();
        let lastTapStep = -10;
        let stuckSince = -1;
        const delaySteps = policy === "casual" ? 3 : 0;
        let step = 0;
        for (; step < 1800; step += 1) {
          const s = hooks.state();
          if (s.run.outcome) break;
          const canTap = step - lastTapStep >= 5;
          let tap = false;
          if (s.knife.state === "stuck") {
            if (stuckSince < 0) stuckSince = step;
            if (step - stuckSince >= delaySteps) tap = true;
            if (policy === "sharp") {
              const gate = hooks.obstaclesAhead()[0];
              const gateDist = gate ? gate.z - s.knife.z : Infinity;
              const gateBlocking = Boolean(gate) && gate.moving
                && gateDist < 13
                && gate.y < s.knife.y + 2.8;
              if (gateBlocking) tap = false;
            }
          } else {
            stuckSince = -1;
            if (policy === "sharp" && canTap && !s.knife.slicing && s.knife.state === "flying") {
              const bounced = s.knife.velocityZ < 0;
              const sinking = s.knife.velocityY < 0 && s.knife.y < 2.6;
              const obstacle = hooks.obstaclesAhead()[0];
              const hop = Boolean(obstacle) && !obstacle.moving && obstacle.z - s.knife.z < 4.4 && s.knife.y < obstacle.y + 3.4 && s.knife.velocityY < 0.5;
              tap = bounced || sinking || hop;
            }
          }
          if (tap) {
            hooks.tap();
            lastTapStep = step;
            stuckSince = -1;
          }
          hooks.advance(0.1);
        }
        const end = hooks.state();
        return {
          simSeconds: Number((step * 0.1).toFixed(0)),
          z: Number(end.knife.z.toFixed(0)),
          zone: end.run.zoneReached,
          score: end.run.score,
          outcome: end.run.outcome ?? "alive-at-cap",
        };
      }, { policy, seed });
      results[policy].push(outcome);
    }
  }

  const summarize = (rows) => ({
    avgSurvival: rows.reduce((total, row) => total + row.simSeconds, 0) / rows.length,
    avgScore: rows.reduce((total, row) => total + row.score, 0) / rows.length,
    deaths: rows.filter((row) => row.outcome === "lost").length,
    minZone: Math.min(...rows.map((row) => row.zone)),
  });
  for (const policy of ["sharp", "casual"]) {
    const rows = results[policy];
    const summary = summarize(rows);
    console.log(`${policy}: avgSurvival=${summary.avgSurvival.toFixed(0)}s avgScore=${summary.avgScore.toFixed(0)} deaths=${summary.deaths}/${rows.length} minZone=${summary.minZone}`);
    console.log(`  runs: ${rows.map((row) => `${row.simSeconds}s/z${row.zone}/s${row.score}/${row.outcome === "lost" ? "died" : "alive"}`).join("  ")}`);
  }

  // Difficulty regression gates: pressure must stay real, skill must stay rewarded.
  const sharp = summarize(results.sharp);
  const casual = summarize(results.casual);
  function gate(condition, message) {
    if (!condition) throw new Error(`Difficulty regression: ${message}`);
  }
  gate(casual.deaths === results.casual.length, "casual play must always die eventually");
  gate(casual.avgSurvival <= 60, `casual average survival ${casual.avgSurvival.toFixed(0)}s exceeds 60s; the game got too easy`);
  gate(sharp.avgSurvival >= 80, `sharp average survival ${sharp.avgSurvival.toFixed(0)}s under 80s; the game got too punishing`);
  gate(sharp.minZone >= 4, "sharp play must reliably reach the Windy Shelves");
  gate(sharp.avgScore >= casual.avgScore * 2, "skill separation collapsed below 2x score");
  console.log("[difficulty-sweep] passed");

  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}

await main();

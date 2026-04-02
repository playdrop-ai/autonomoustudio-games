import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const outputPath = path.join(rootDir, "output", "media-capture", "seed-search.json");

const seedStart = readIntFlag("--start", 1);
const seedCount = readIntFlag("--count", 120);
const horizonMs = readIntFlag("--horizon-ms", 12000);

const server = await createStaticServer(distDir);
const browser = await chromium.launch({ headless: true });

try {
  const surfaces = [
    { name: "portrait", viewport: { width: 720, height: 1280 }, isMobile: true, hasTouch: true },
    { name: "landscape", viewport: { width: 1280, height: 720 }, isMobile: false, hasTouch: false },
  ];

  const results = [];
  for (const surface of surfaces) {
    const context = await browser.newContext({
      viewport: surface.viewport,
      isMobile: surface.isMobile,
      hasTouch: surface.hasTouch,
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    for (let seed = seedStart; seed < seedStart + seedCount; seed += 1) {
      await page.goto(`${server.url}/index.html?debug_clock=manual&autoplay=expert&seed=${seed}`, { waitUntil: "load" });
      await page.waitForFunction(() => typeof window.__glowknotControls?.getState === "function");
      await page.evaluate(async (ms) => window.advanceTime?.(ms), horizonMs);
      const state = await page.evaluate(() => window.__glowknotControls?.getState());
      results.push({
        surface: surface.name,
        seed,
        screen: state?.screen ?? "missing",
        score: state?.score ?? -1,
        occupied: state?.occupied ?? -1,
        shotsUntilSink: state?.shotsUntilSink ?? -1,
        heuristic: scoreCandidate(state),
      });
    }

    await context.close();
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    horizonMs,
    seedStart,
    seedCount,
    topPortrait: results.filter((item) => item.surface === "portrait").sort(compareCandidates).slice(0, 10),
    topLandscape: results.filter((item) => item.surface === "landscape").sort(compareCandidates).slice(0, 10),
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
} finally {
  await browser.close();
  await server.close();
}

function compareCandidates(left, right) {
  return right.heuristic - left.heuristic || right.score - left.score || left.seed - right.seed;
}

function scoreCandidate(state) {
  if (!state || state.screen !== "playing") return Number.NEGATIVE_INFINITY;
  const occupiedBonus = 80 - Math.abs((state.occupied ?? 0) - 16) * 4;
  return (state.score ?? 0) * 4 + occupiedBonus + (state.shotsUntilSink ?? 0) * 12;
}

function readIntFlag(flag, fallback) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return fallback;
  const value = Number.parseInt(process.argv[index + 1] ?? "", 10);
  return Number.isFinite(value) ? value : fallback;
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
  if (!address || typeof address === "string") throw new Error("Failed to bind static server");
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
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  return "application/octet-stream";
}

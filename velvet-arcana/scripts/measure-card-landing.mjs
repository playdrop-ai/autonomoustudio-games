import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const outputDir = path.join(rootDir, "output", "playwright", "motion-debug");
const outputPath = path.join(outputDir, "landing-measurement.json");

const seed = readIntFlag("--seed", 1001);
const sampleDurationMs = readIntFlag("--duration-ms", 950);

fs.mkdirSync(outputDir, { recursive: true });

const server = await createStaticServer(distDir);
const browser = await chromium.launch({ headless: true });

try {
  const result = await measureLanding(browser, server.url);
  fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ outputPath, summary: result.summary }, null, 2)}\n`);
} finally {
  await browser.close();
  await server.close();
}

async function measureLanding(browser, serverUrl) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();

  try {
    await page.goto(`${serverUrl}/index.html?seed=${seed}`, { waitUntil: "load" });
    await page.waitForFunction(() => typeof window.velvetArcanaDebug?.getState === "function", undefined, {
      timeout: 30000,
    });

    await page.evaluate((runSeed) => {
      window.velvetArcanaDebug?.startSpread(2, runSeed);
      window.velvetArcanaDebug?.setTutorialStep(null);
      window.velvetArcanaDebug?.setHelpOpen(false);
    }, seed);
    await page.waitForTimeout(300);

    const revealColumn = await waitForRevealColumn(page);

    if (!revealColumn) throw new Error("[velvet-arcana] Failed to find reveal column for landing measurement");

    const measurement = await page.evaluate(
      async ({ columnIndex, durationMs }) => {
        const samples = [];

        const readRect = (element) => {
          if (!(element instanceof HTMLElement)) return null;
          const rect = element.getBoundingClientRect();
          return {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            centerX: rect.left + rect.width / 2,
            centerY: rect.top + rect.height / 2,
          };
        };

        const captureSample = (time) => {
          const overlay = document.querySelector(".js-card-motion-overlay .playing-card");
          const current = document.querySelector(".pile-layer--current .playing-card");
          const currentComputed = current instanceof HTMLElement ? getComputedStyle(current) : null;
          samples.push({
            t: time,
            overlayRect: readRect(overlay),
            currentRect: readRect(current),
            currentOpacity: currentComputed ? Number.parseFloat(currentComputed.opacity || "1") : null,
            currentTransform: currentComputed?.transform ?? null,
            currentClasses: current instanceof HTMLElement ? current.className : null,
          });
        };

        window.velvetArcanaDebug?.playColumn(columnIndex - 1);

        const start = performance.now();
        await new Promise((resolve) => {
          const tick = (now) => {
            captureSample(now - start);
            if (now - start >= durationMs) {
              resolve();
              return;
            }
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });

        const lastOverlay = [...samples].reverse().find((sample) => sample.overlayRect);
        const firstAfterOverlay = samples.find((sample) => !sample.overlayRect && sample.currentOpacity !== null && sample.currentOpacity > 0.5);
        const visibleAfterOverlay = samples.filter((sample) => !sample.overlayRect && sample.currentOpacity !== null && sample.currentOpacity > 0.5);

        const handoffDeltaPx =
          lastOverlay && firstAfterOverlay && lastOverlay.overlayRect && firstAfterOverlay.currentRect
            ? Math.hypot(
                firstAfterOverlay.currentRect.centerX - lastOverlay.overlayRect.centerX,
                firstAfterOverlay.currentRect.centerY - lastOverlay.overlayRect.centerY,
              )
            : null;

        const postHandoffTravelPx =
          visibleAfterOverlay.length > 1
            ? Math.max(
                ...visibleAfterOverlay.map((sample) =>
                  sample.currentRect && firstAfterOverlay?.currentRect
                    ? Math.hypot(
                        sample.currentRect.centerX - firstAfterOverlay.currentRect.centerX,
                        sample.currentRect.centerY - firstAfterOverlay.currentRect.centerY,
                      )
                    : 0,
                ),
              )
            : null;

        return {
          revealColumn: columnIndex,
          samples,
          summary: {
            handoffDeltaPx,
            postHandoffTravelPx,
            lastOverlayTimeMs: lastOverlay?.t ?? null,
            firstVisibleTargetTimeMs: firstAfterOverlay?.t ?? null,
          },
        };
      },
      { columnIndex: revealColumn, durationMs: sampleDurationMs },
    );

    return measurement;
  } finally {
    await context.close();
  }
}

async function waitForRevealColumn(page) {
  for (let step = 0; step < 80; step += 1) {
    const revealColumn = await page.evaluate(() => {
      const state = window.velvetArcanaDebug?.getState();
      if (!state) return null;
      return (
        state.playableColumns.find((columnIndex) => {
          const column = state.columns[columnIndex - 1];
          return column && column.cards.length >= 2 && column.cards[column.cards.length - 2] === "back";
        }) ?? null
      );
    });

    if (revealColumn) return revealColumn;

    await page.evaluate(() => {
      window.velvetArcanaDebug?.autoStep("planner");
    });
    await page.waitForTimeout(160);
  }

  return null;
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
  if (!address || typeof address === "string") throw new Error("[velvet-arcana] failed to bind static server");
  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}

function contentType(filePath) {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) return "image/jpeg";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  if (filePath.endsWith(".woff2")) return "font/woff2";
  return "application/octet-stream";
}

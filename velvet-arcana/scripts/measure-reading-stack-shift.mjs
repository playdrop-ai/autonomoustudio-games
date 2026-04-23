import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const outputDir = path.join(rootDir, "output", "playwright", "motion-debug");
const outputPath = path.join(outputDir, "reading-stack-shift.json");

const seed = readIntFlag("--seed", 1001);
const durationMs = readIntFlag("--duration-ms", 700);

fs.mkdirSync(outputDir, { recursive: true });

const server = await createStaticServer(distDir);
const browser = await chromium.launch({ headless: true });

try {
  const result = await measureShift(browser, server.url);
  fs.writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify({ outputPath, summary: result.summary }, null, 2)}\n`);
} finally {
  await browser.close();
  await server.close();
}

async function measureShift(browser, serverUrl) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();

  try {
    await page.goto(`${serverUrl}/index.html?seed=${seed}`, { waitUntil: "load" });
    await page.waitForFunction(() => typeof window.velvetArcanaDebug?.getState === "function", undefined, {
      timeout: 30000,
    });

    await page.evaluate((runSeed) => {
      window.velvetArcanaDebug?.startSpread(0, runSeed);
      window.velvetArcanaDebug?.setTutorialStep(null);
      window.velvetArcanaDebug?.setHelpOpen(false);
    }, seed);
    await page.waitForTimeout(250);

    for (let step = 0; step < 20; step += 1) {
      const hasCurrent = await page.evaluate(() => Boolean(document.querySelector(".pile-layer--current .playing-card")));
      if (hasCurrent) break;
      await page.evaluate(() => {
        window.velvetArcanaDebug?.autoStep("planner");
      });
      await page.waitForTimeout(180);
    }
    await page.waitForFunction(() => document.querySelector(".pile-layer--current .playing-card"), undefined, {
      timeout: 3000,
    });

    const measurement = await page.evaluate(
      async ({ sampleMs }) => {
        const current = document.querySelector(".pile-layer--current .playing-card");
        if (!(current instanceof HTMLElement)) {
          throw new Error("[velvet-arcana] Missing current reading card");
        }

        const trackedCardId = current.dataset.cardId ?? null;
        if (!trackedCardId) throw new Error("[velvet-arcana] Missing tracked card id");

        const beforeRect = current.getBoundingClientRect();
        const beforeCenter = {
          x: beforeRect.left + beforeRect.width / 2,
          y: beforeRect.top + beforeRect.height / 2,
        };

        window.velvetArcanaDebug?.draw();

        const samples = [];
        const start = performance.now();
        await new Promise((resolve) => {
          const tick = (now) => {
            const tracked = document.querySelector(`.playing-card[data-card-id="${trackedCardId}"]`);
            if (tracked instanceof HTMLElement) {
              const rect = tracked.getBoundingClientRect();
              samples.push({
                t: now - start,
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                cls: tracked.className,
              });
            }
            if (now - start >= sampleMs) {
              resolve();
              return;
            }
            requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });

        const visibleAfter = samples.filter((sample) => !sample.cls.includes("is-motion-hidden"));
        const firstVisible = visibleAfter[0] ?? null;
        const maxShift =
          visibleAfter.length > 0
            ? Math.max(
                ...visibleAfter.map((sample) =>
                  Math.hypot(sample.x - beforeCenter.x, sample.y - beforeCenter.y),
                ),
              )
            : null;

        return {
          trackedCardId,
          beforeCenter,
          samples,
          summary: {
            firstVisibleShiftPx: firstVisible ? Math.hypot(firstVisible.x - beforeCenter.x, firstVisible.y - beforeCenter.y) : null,
            maxShiftPx: maxShift,
          },
        };
      },
      { sampleMs: durationMs },
    );

    return measurement;
  } finally {
    await context.close();
  }
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

import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { chromium } from "playwright";

const execFileAsync = promisify(execFile);
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const distDir = resolve(projectRoot, "dist");
const mimeTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".uint32": "application/octet-stream",
};

let buildReady = false;

async function ensureBuild() {
  if (buildReady) return;
  await execFileAsync("node", ["build.mjs"], { cwd: projectRoot });
  buildReady = true;
}

async function createStaticServer() {
  const server = createServer(async (request, response) => {
    const requestUrl = new URL(request.url ?? "/", "http://127.0.0.1");
    const pathname = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
    const filePath = resolve(distDir, `.${pathname}`);

    if (!filePath.startsWith(distDir)) {
      response.writeHead(403).end("forbidden");
      return;
    }

    try {
      const body = await readFile(filePath);
      response.writeHead(200, {
        "content-type": mimeTypes[extname(filePath)] ?? "application/octet-stream",
      });
      response.end(body);
    } catch {
      response.writeHead(404).end("not found");
    }
  });

  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("[velvet-arcana] failed to bind smoke-test server");
  }

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolveClose, rejectClose) => {
        server.close((error) => {
          if (error) {
            rejectClose(error);
            return;
          }
          resolveClose();
        });
      }),
  };
}

async function waitForDebug(page: import("playwright").Page) {
  await page.waitForFunction(() => typeof (window as typeof window & { velvetArcanaDebug?: unknown }).velvetArcanaDebug === "object");
}

async function waitForCardMotionToFinish(page: import("playwright").Page) {
  await page.waitForFunction(() => !document.querySelector(".js-card-motion-overlay"));
  await page.waitForTimeout(40);
}

async function installHostedPreviewStub(page: import("playwright").Page) {
  await page.route("**/sdk/playdrop.js", async (route) => {
    await route.fulfill({
      contentType: "text/javascript; charset=utf-8",
      body: `
        (() => {
          const phaseListeners = new Set();
          const audioListeners = new Set();
          const host = {
            ready() {},
            firstFrameReady() {},
            setLoadingState() {},
            error() {},
            deployment: "dev",
            platform: "web",
            sdkVersion: "0.7.13",
            sdkBuild: 713,
            mode: "play",
            phase: "preview",
            isPaused: false,
            audioEnabled: true,
            onPhaseChange(listener) {
              phaseListeners.add(listener);
              return () => phaseListeners.delete(listener);
            },
            onPause() {
              return () => undefined;
            },
            onResume() {
              return () => undefined;
            },
            onAudioPolicyChange(listener) {
              audioListeners.add(listener);
              return () => audioListeners.delete(listener);
            },
          };
          const sdk = {
            host,
            ads: {
              interstitial: {
                load: async () => ({ status: "ready" }),
                show: async () => ({ status: "dismissed" }),
              },
            },
          };
          window.playdrop = {
            init: async () => sdk,
            host: {
              setLoadingState() {},
              error() {},
            },
          };
          window.__velvetHostPhase = {
            setPhase(phase) {
              host.phase = phase;
              for (const listener of phaseListeners) {
                listener(phase);
              }
            },
          };
        })();
      `,
    });
  });
}

test(
  "browser smoke covers draw, play, transition, accessibility, and hidden-card secrecy",
  { timeout: 120_000 },
  async () => {
    await ensureBuild();

    const server = await createStaticServer();
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
    const consoleErrors: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });
    page.on("pageerror", (error) => {
      consoleErrors.push(String(error));
    });

    try {
      await page.goto(`${server.url}/index.html?seed=1009`, { waitUntil: "load" });
      await waitForDebug(page);

      const visibleBuriedCard = await page.evaluate(() => {
        const buriedCard = document.querySelector<HTMLElement>(".column .stack-card[role='img']");
        return buriedCard
          ? {
              role: buriedCard.getAttribute("role"),
              ariaLabel: buriedCard.getAttribute("aria-label"),
              ariaHidden: buriedCard.getAttribute("aria-hidden"),
            }
          : null;
      });
      assert.equal(visibleBuriedCard?.role, "img");
      assert.equal(visibleBuriedCard?.ariaHidden, null);
      assert.ok((visibleBuriedCard?.ariaLabel?.length ?? 0) > 0, "expected a visible buried card to keep its accessible name");

      await page.locator(".js-draw").click();
      await waitForCardMotionToFinish(page);
      const afterDraw = await page.evaluate(() =>
        (window as typeof window & {
          velvetArcanaDebug: { getState(): { active: string; playableColumns: number[] } };
        }).velvetArcanaDebug.getState(),
      );
      assert.notEqual(afterDraw.active, "empty");
      assert.ok(afterDraw.playableColumns.length > 0, "expected at least one playable column after the first draw");

      const firstPlayable = page.locator('.js-column-card[data-playable="true"]').first();
      await firstPlayable.click();
      await waitForCardMotionToFinish(page);
      const afterPlay = await page.evaluate(() =>
        (window as typeof window & {
          velvetArcanaDebug: { getState(): { active: string } };
        }).velvetArcanaDebug.getState(),
      );
      assert.notEqual(afterPlay.active, afterDraw.active, "expected playing a column card to replace the active reading");

      await page.evaluate(() =>
        (window as typeof window & {
          velvetArcanaDebug: { startSpread(spreadIndex: number, seed?: number): void };
        }).velvetArcanaDebug.startSpread(2, 1058),
      );
      const hiddenCardAttrs = await page.evaluate(() => {
        const hiddenCard = document.querySelector<HTMLElement>(".playing-card.is-face-down");
        const stackCard = hiddenCard?.closest<HTMLElement>(".stack-card");
        const faceImage = hiddenCard?.querySelector(".playing-card__side--face img");
        return hiddenCard && stackCard
          ? {
              ariaHidden: stackCard.getAttribute("aria-hidden"),
              ariaLabel: stackCard.getAttribute("aria-label"),
              cardId: hiddenCard.getAttribute("data-card-id"),
              faceImagePresent: Boolean(faceImage),
            }
          : null;
      });
      assert.deepEqual(hiddenCardAttrs, {
        ariaHidden: "true",
        ariaLabel: null,
        cardId: null,
        faceImagePresent: false,
      });

      const transitionSeed = await page.evaluate(() =>
        (window as typeof window & {
          velvetArcanaDebug: { findTransitionSeed(policy?: "planner", maxSeed?: number, maxSteps?: number): number | null };
        }).velvetArcanaDebug.findTransitionSeed("planner", 200, 160),
      );
      assert.equal(typeof transitionSeed, "number");

      await page.evaluate((seed) => {
        (window as typeof window & {
          velvetArcanaDebug: {
            autoStep(policy?: "planner"): void;
            getState(): { phase: string };
            startSpread(spreadIndex: number, seed?: number): void;
          };
        }).velvetArcanaDebug.startSpread(0, seed);
      }, transitionSeed);

      for (let step = 0; step < 160; step += 1) {
        const snapshot = await page.evaluate(() =>
          (window as typeof window & {
            velvetArcanaDebug: { getState(): { phase: string } };
          }).velvetArcanaDebug.getState(),
        );
        if (snapshot.phase === "transition") {
          break;
        }
        if (snapshot.phase === "gameover") {
          throw new Error("[velvet-arcana] deterministic transition seed regressed to gameover");
        }
        await page.evaluate(() =>
          (window as typeof window & {
            velvetArcanaDebug: { autoStep(policy?: "planner"): void };
          }).velvetArcanaDebug.autoStep("planner"),
        );
        await waitForCardMotionToFinish(page);
      }

      const transitionState = await page.evaluate(() =>
        (window as typeof window & {
          velvetArcanaDebug: { getState(): { phase: string; spread: string } };
        }).velvetArcanaDebug.getState(),
      );
      assert.equal(transitionState.phase, "transition");
      assert.equal(transitionState.spread, "Past");

      await page.evaluate(() =>
        (window as typeof window & {
          advanceTime(ms: number): void;
        }).advanceTime(600),
      );
      const afterTransition = await page.evaluate(() =>
        (window as typeof window & {
          velvetArcanaDebug: { getState(): { phase: string; spread: string } };
        }).velvetArcanaDebug.getState(),
      );
      assert.equal(afterTransition.phase, "playing");
      assert.equal(afterTransition.spread, "Present");

      assert.deepEqual(consoleErrors, []);
    } finally {
      await page.close();
      await browser.close();
      await server.close();
    }
  },
);

test(
  "hosted preview hides the HUD, autoplays, and resets when host phase switches to play",
  { timeout: 120_000 },
  async () => {
    await ensureBuild();

    const server = await createStaticServer();
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 430, height: 932 } });
    const consoleErrors: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });
    page.on("pageerror", (error) => {
      consoleErrors.push(String(error));
    });

    try {
      await installHostedPreviewStub(page);
      await page.goto(`${server.url}/index.html?playdrop_channel=preview-smoke`, { waitUntil: "load" });
      await waitForDebug(page);
      await page.waitForFunction(() => {
        const debug = (window as typeof window & {
          velvetArcanaDebug: { getState(): { previewMode: boolean; runMoves: number } };
        }).velvetArcanaDebug;
        const state = debug.getState();
        return state.previewMode && state.runMoves > 0;
      });

      const previewState = await page.evaluate(() =>
        (window as typeof window & {
          velvetArcanaDebug: { getState(): { previewMode: boolean; runMoves: number; tutorialStep: string | null } };
        }).velvetArcanaDebug.getState(),
      );
      assert.equal(previewState.previewMode, true);
      assert.ok(previewState.runMoves > 0, "expected preview autoplay to advance the run");
      assert.equal(previewState.tutorialStep, null);
      assert.equal(await page.locator(".hud").count(), 0);

      await page.evaluate(() => {
        (window as typeof window & {
          __velvetHostPhase?: { setPhase(phase: "preview" | "play"): void };
        }).__velvetHostPhase?.setPhase("play");
      });
      await page.waitForFunction(() => {
        const debug = (window as typeof window & {
          velvetArcanaDebug: { getState(): { previewMode: boolean } };
        }).velvetArcanaDebug;
        return !debug.getState().previewMode;
      });

      const playState = await page.evaluate(() =>
        (window as typeof window & {
          velvetArcanaDebug: { getState(): { previewMode: boolean; runMoves: number } };
        }).velvetArcanaDebug.getState(),
      );
      assert.equal(playState.previewMode, false);
      assert.equal(playState.runMoves, 0);
      assert.equal(await page.locator(".hud").count(), 1);

      assert.deepEqual(consoleErrors, []);
    } finally {
      await page.close();
      await browser.close();
      await server.close();
    }
  },
);

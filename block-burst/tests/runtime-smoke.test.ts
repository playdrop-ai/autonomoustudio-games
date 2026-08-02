import { chromium } from "playwright";
import test from "node:test";
import assert from "node:assert/strict";

const APP_URL = new URL("../dist/index.html", import.meta.url).href;

test("built game renders and exposes listing preview hook", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(APP_URL, { waitUntil: "networkidle" });
    await page.waitForSelector("canvas", { timeout: 10_000 });

    let tutorialStart: Record<string, unknown> = {};
    const tutorialDeadline = Date.now() + 3000;
    while ((!tutorialStart.tutorialActive || !tutorialStart.handVisible) && Date.now() < tutorialDeadline) {
      await page.waitForTimeout(100);
      tutorialStart = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() ?? "{}"));
    }
    assert.equal(tutorialStart.tutorialActive, true);
    assert.equal(tutorialStart.handVisible, true);
    assert.equal(tutorialStart.boardOccupied, 4);
    assert.equal(tutorialStart.trayPieceCount, 1);
    await page.mouse.move(195, 658);
    await page.mouse.down();
    await page.mouse.move(195, 325, { steps: 18 });
    await page.mouse.up();
    await page.waitForFunction(() => window.localStorage.getItem("block_burst_tutorial_complete") === "1");
    const tutorialComplete = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() ?? "{}"));
    assert.equal(tutorialComplete.tutorialActive, false);
    assert.equal(tutorialComplete.boardOccupied, 0);
    assert.equal(tutorialComplete.trayPieceCount, 3);

    await page.evaluate(async () => {
      if (!window.__listingCapture?.prepare) throw new Error("missing listing preview hook");
      await window.__listingCapture.prepare({
        active: true,
        sceneId: "listing-portrait",
        surface: "mobile-portrait",
        seed: "smoke",
        audioPolicy: "sfx-only",
      });
    });
    const previewStart = await page.evaluate(() => {
      if (!window.render_game_to_text) throw new Error("missing preview debug hook");
      return JSON.parse(window.render_game_to_text());
    });
    assert.equal(previewStart.previewMode, true);
    assert.equal(previewStart.previewPresentation, true);
    assert.equal(previewStart.hudVisible, false);
    assert.equal(previewStart.overlayVisible, false);

    let previewGesture: Record<string, unknown> = {};
    const gestureDeadline = Date.now() + 9000;
    while ((!previewGesture.gestureActive || !previewGesture.handVisible) && Date.now() < gestureDeadline) {
      await page.waitForTimeout(150);
      previewGesture = await page.evaluate(() => JSON.parse(window.render_game_to_text?.() ?? "{}"));
    }
    assert.equal(previewGesture.gestureActive, true);
    assert.equal(previewGesture.handVisible, true);
    assert.match(String(previewGesture.gesturePhase), /fade-in|lift|drag/);

    const audio = await page.evaluate(async () => {
      if (!window.__listingCapture?.startAudioCapture || !window.__listingCapture.stopAudioCapture) {
        throw new Error("missing listing audio capture hooks");
      }
      await window.__listingCapture.startAudioCapture();
      await new Promise((resolve) => setTimeout(resolve, 3200));
      return window.__listingCapture.stopAudioCapture();
    });
    assert.match(audio.mimeType, /^audio\//);
    assert.ok(audio.base64.length > 1000);
    await page.waitForTimeout(1000);
    const state = await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      const rect = canvas?.getBoundingClientRect();
      return {
        hasCanvas: Boolean(canvas),
        width: Math.round(rect?.width ?? 0),
        height: Math.round(rect?.height ?? 0),
        title: document.title,
        hammers: window.localStorage.getItem("block_burst_hammers"),
        tutorial: window.localStorage.getItem("block_burst_tutorial_complete"),
      };
    });
    assert.equal(state.title, "Block Burst");
    assert.equal(state.hasCanvas, true);
    assert.equal(state.hammers, "2");
    assert.equal(state.tutorial, "1");
    assert.ok(state.width > 300);
    assert.ok(state.height > 600);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test("an active PlayDrop rewarded ad timeout closes the result overlay and resumes the round", async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    await page.route("https://assets.playdrop.ai/sdk/playdrop.js", (route) => route.fulfill({
      contentType: "application/javascript",
      body: `
        window.__blockBurstAdCalls = { load: 0, show: 0 };
        window.__blockBurstOnPause = null;
        window.__blockBurstOnResume = null;
        window.playdrop = {
          init: async () => ({
            host: {
              phase: "play",
              onPause: (callback) => { window.__blockBurstOnPause = callback; },
              onResume: (callback) => { window.__blockBurstOnResume = callback; },
            },
            me: {
              appData: { data: { hammers: 2 } },
              updateAppData: async () => undefined,
            },
            ads: {
              rewarded: {
                load: async () => {
                  window.__blockBurstAdCalls.load++;
                  return { status: "ready" };
                },
                show: async () => {
                  window.__blockBurstAdCalls.show++;
                  window.__blockBurstOnPause?.("host_overlay");
                  const error = new Error("ad_show_timeout");
                  error.name = "AdsError";
                  throw error;
                },
              },
            },
          }),
        };
      `,
    }));
    await page.addInitScript(() => {
      window.localStorage.setItem("block_burst_tutorial_complete", "1");
    });
    const appUrl = new URL(APP_URL);
    appUrl.searchParams.set("playdrop_channel", "test");
    await page.goto(appUrl.href, { waitUntil: "networkidle" });
    await page.waitForSelector("canvas", { timeout: 10_000 });
    await page.evaluate(async () => {
      await window.__listingCapture?.prepare?.({
        active: true,
        sceneId: "result-overlay",
        surface: "mobile-portrait",
        seed: "revive-test",
        audioPolicy: "sfx-only",
      });
    });
    await page.waitForFunction(() => JSON.parse(window.render_game_to_text?.() ?? "{}").overlayVisible === true);
    await page.waitForTimeout(450);
    await page.mouse.click(195, 509);
    await page.waitForFunction(() => {
      const state = JSON.parse(window.render_game_to_text?.() ?? "{}");
      return state.overlayVisible === false && state.revivesUsed === 1 && state.trayPieceCount === 3;
    }, undefined, { timeout: 5000 });
    const result = await page.evaluate(() => ({
      state: JSON.parse(window.render_game_to_text?.() ?? "{}"),
      adCalls: (window as typeof window & { __blockBurstAdCalls?: { load: number; show: number } }).__blockBurstAdCalls,
    }));
    const revived = result.state;
    assert.equal(result.adCalls?.show, 1, JSON.stringify(result));
    assert.equal(revived.overlayVisible, false);
    assert.equal(revived.revivesUsed, 1);
    assert.equal(revived.revivePending, false);
    assert.equal(revived.trayPieceCount, 3);
    assert.ok(Number(revived.boardOccupied) <= 24);
  } finally {
    await browser.close();
  }
});

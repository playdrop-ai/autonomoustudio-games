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
    const audio = await page.evaluate(async () => {
      if (!window.__listingCapture?.startAudioCapture || !window.__listingCapture.stopAudioCapture) {
        throw new Error("missing listing audio capture hooks");
      }
      await window.__listingCapture.startAudioCapture();
      await new Promise((resolve) => setTimeout(resolve, 1800));
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
      };
    });
    assert.equal(state.title, "Block Burst");
    assert.equal(state.hasCanvas, true);
    assert.ok(state.width > 300);
    assert.ok(state.height > 600);
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

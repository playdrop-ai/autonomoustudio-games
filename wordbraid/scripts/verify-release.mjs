import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "/opt/homebrew/lib/node_modules/playwright/index.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const catalogue = JSON.parse(fs.readFileSync(path.join(rootDir, "catalogue.json"), "utf8"));
const app = catalogue.apps?.[0];

if (!app?.name || !app?.version || !app?.displayName) {
  throw new Error("catalogue.json is missing app name, version, or displayName");
}

const creator = "autonomoustudio";
const appTypeSlug = "game";
const releaseDir = path.join(rootDir, "output", "playwright", "release-check");
const listingUrl = `https://www.playdrop.ai/creators/${creator}/apps/${appTypeSlug}/${app.name}`;
const playUrl = `${listingUrl}/play`;
const hostedUrl = `https://assets.playdrop.ai/creators/${creator}/apps/${app.name}/v${app.version}/index.html`;

fs.mkdirSync(releaseDir, { recursive: true });

const browser = await chromium.launch({ headless: true });

try {
  const results = {
    createdAt: new Date().toISOString(),
    listingUrl,
    playUrl,
    hostedUrl,
    desktop: await verifyHostedSurface("desktop", { width: 1280, height: 720 }),
    portrait: await verifyHostedSurface("mobile-portrait", { width: 720, height: 1280 }, true),
    listing: await verifyListing(),
  };

  fs.writeFileSync(
    path.join(releaseDir, "verification.json"),
    `${JSON.stringify(results, null, 2)}\n`,
  );
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
}

async function verifyListing() {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1600 } });

  try {
    await page.goto(listingUrl, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const listingState = await page.evaluate(
      ({ displayName, descriptionSnippet }) => ({
        title: document.title,
        bodyIncludesName: document.body.innerText.includes(displayName),
        bodyIncludesDescription: document.body.innerText.includes(descriptionSnippet),
        heroLandscapeCount: document.querySelectorAll('img[src*="hero-landscape"]').length,
        screenshotPortraitCount: document.querySelectorAll(
          'img[src*="listing/screenshots/portrait"]',
        ).length,
        screenshotLandscapeCount: document.querySelectorAll(
          'img[src*="listing/screenshots/landscape"]',
        ).length,
      }),
      {
        displayName: app.displayName,
        descriptionSnippet: "Tap ribbons to pull their front letters into the tray",
      },
    );

    await page.screenshot({
      path: path.join(releaseDir, "listing-public.png"),
      fullPage: true,
    });

    return listingState;
  } finally {
    await page.close();
  }
}

async function verifyHostedSurface(label, viewport, isMobile = false) {
  const context = await browser.newContext({
    viewport,
    isMobile,
    hasTouch: isMobile,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  try {
    await page.goto(hostedUrl, { waitUntil: "load" });
    await page.waitForFunction(() => Boolean(window.__wordbraidControls && window.__wordbraidDebug), {
      timeout: 30000,
    });
    await page.evaluate(() => {
      window.localStorage.clear();
    });
    await page.reload({ waitUntil: "load" });
    await page.waitForFunction(() => Boolean(window.__wordbraidControls && window.__wordbraidDebug), {
      timeout: 30000,
    });
    await page.evaluate(() => {
      window.__wordbraidControls.start();
    });
    await page.waitForFunction(() => window.__wordbraidDebug?.screen === "playing", {
      timeout: 10000,
    });
    await page.waitForTimeout(250);

    const candidate = await page.evaluate(() => {
      const top = window.__wordbraidDebug?.topCandidates?.[0];
      if (!top) return null;
      return { word: top.word, pulls: [...top.pulls] };
    });
    if (!candidate?.pulls?.length) {
      throw new Error(`No playable top candidate found for ${label}`);
    }

    for (const pullIndex of candidate.pulls) {
      await page.evaluate((index) => {
        window.__wordbraidControls.selectRibbon(index);
      }, pullIndex);
      await page.waitForTimeout(120);
    }

    await page.evaluate(() => {
      window.__wordbraidControls.submit();
    });
    await page.waitForTimeout(600);

    const state = await page.evaluate(() => ({
      screen: window.__wordbraidDebug?.screen ?? null,
      score: window.__wordbraidDebug?.score ?? null,
      best: window.__wordbraidDebug?.bestScore ?? null,
      tray: window.__wordbraidDebug?.trayWord ?? null,
      topCandidates: window.__wordbraidDebug?.topCandidates?.slice(0, 3) ?? [],
    }));

    await page.screenshot({
      path: path.join(releaseDir, `${label}.png`),
      fullPage: true,
    });

    return {
      candidate,
      state,
    };
  } finally {
    await context.close();
  }
}

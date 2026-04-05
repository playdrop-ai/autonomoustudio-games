import { chromium, devices } from "/opt/homebrew/lib/node_modules/playwright/index.mjs";
import fs from "node:fs/promises";
import path from "node:path";

const profileDir =
  process.env.PROFILE_DIR ??
  "/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/playwright/x-profile";
const rootDir = "/Users/oliviermichon/Documents/autonomoustudio-games/overvolt";
const outputDir = path.join(rootDir, "output", "playwright", "release-check");

const listingUrl = "https://www.playdrop.ai/creators/autonomoustudio/apps/game/overvolt";
const playUrl = "https://www.playdrop.ai/creators/autonomoustudio/apps/game/overvolt/play";
const hostedUrl = "https://assets.playdrop.ai/creators/autonomoustudio/apps/overvolt/v1.0.0/index.html";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

async function dismissInterceptors(page) {
  const cookieButtons = [
    'button:has-text("Accept all cookies")',
    'button:has-text("Accept all")',
    'button:has-text("Accept")',
  ];

  for (const selector of cookieButtons) {
    const button = page.locator(selector).first();
    if (await button.count()) {
      await button.click({ timeout: 2000 }).catch(() => {});
    }
  }

  await page.keyboard.press("Escape").catch(() => {});
}

async function captureListing() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1800 } });

  await page.goto(listingUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(5000);
  await dismissInterceptors(page);
  await page.screenshot({ path: path.join(outputDir, "listing-public.png"), fullPage: true });

  const title = await page.title();
  const body = await page.locator("body").innerText();

  await browser.close();

  return {
    title,
    hasName: body.includes("Overvolt"),
    hasDescription: body.includes("Steer your RC car around the tabletop"),
  };
}

async function captureAnonymousPlayShell() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

  await page.goto(playUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(5000);
  await dismissInterceptors(page);
  await page.screenshot({ path: path.join(outputDir, "public-play-auth-wall.png"), fullPage: true });
  const body = await page.locator("body").innerText();

  await browser.close();

  return {
    requiresSignIn: body.includes("Sign in required"),
  };
}

async function captureAuthenticatedShellDesktop() {
  const context = await chromium.launchPersistentContext(profileDir, {
    headless: true,
    viewport: { width: 1440, height: 1000 },
  });
  const page = context.pages()[0] ?? (await context.newPage());

  await page.goto(playUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(8000);
  await dismissInterceptors(page);

  const iframeCount = await page.locator("iframe").count();
  if (iframeCount < 1) {
    throw new Error("[overvolt release-check] Play shell did not load an iframe for desktop verification.");
  }

  const frame = page.frameLocator("iframe").first();
  await frame.locator("#play-button").waitFor({ state: "visible", timeout: 60000 });
  await page.screenshot({ path: path.join(outputDir, "play-shell-desktop-start.png"), fullPage: true });

  await frame.locator("#play-button").click();
  await page.waitForTimeout(2500);
  const appClass = (await frame.locator("#app").getAttribute("class")) ?? "";
  if (!appClass.includes("running")) {
    throw new Error("[overvolt release-check] Desktop play shell did not enter running state.");
  }

  await page.screenshot({ path: path.join(outputDir, "play-shell-desktop-running.png"), fullPage: true });

  const metrics = {
    battery: (await frame.locator("#battery-value").innerText()).trim(),
    score: (await frame.locator("#score-value").innerText()).trim(),
    time: (await frame.locator("#time-value").innerText()).trim(),
    dash: (await frame.locator("#dash-value").innerText()).trim(),
    appClass,
  };

  await context.close();
  return metrics;
}

async function captureAuthenticatedShellMobileLandscape() {
  const iphone = devices["iPhone 14 Plus"];
  const context = await chromium.launchPersistentContext(profileDir, {
    headless: true,
    ...iphone,
    viewport: { width: 932, height: 430 },
    screen: { width: 932, height: 430 },
    isMobile: true,
    hasTouch: true,
  });
  const page = context.pages()[0] ?? (await context.newPage());

  await page.goto(playUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
  await sleep(8000);
  await dismissInterceptors(page);

  const iframeCount = await page.locator("iframe").count();
  if (iframeCount < 1) {
    throw new Error("[overvolt release-check] Play shell did not load an iframe for mobile-landscape verification.");
  }

  const frame = page.frameLocator("iframe").first();
  await frame.locator("#play-button").waitFor({ state: "visible", timeout: 60000 });
  await page.screenshot({ path: path.join(outputDir, "play-shell-mobile-landscape-start.png"), fullPage: true });

  await frame.locator("#play-button").tap();
  await page.waitForTimeout(2500);
  const appClass = (await frame.locator("#app").getAttribute("class")) ?? "";
  if (!appClass.includes("running")) {
    throw new Error("[overvolt release-check] Mobile-landscape play shell did not enter running state.");
  }

  await page.screenshot({ path: path.join(outputDir, "play-shell-mobile-landscape-running.png"), fullPage: true });

  const metrics = {
    battery: (await frame.locator("#battery-value").innerText()).trim(),
    score: (await frame.locator("#score-value").innerText()).trim(),
    time: (await frame.locator("#time-value").innerText()).trim(),
    dash: (await frame.locator("#dash-value").innerText()).trim(),
    appClass,
  };

  await context.close();
  return metrics;
}

async function main() {
  await ensureDir(outputDir);

  const listing = await captureListing();
  const anonymousPlay = await captureAnonymousPlayShell();
  const desktop = await captureAuthenticatedShellDesktop();
  const mobileLandscape = await captureAuthenticatedShellMobileLandscape();

  const result = {
    checkedAt: new Date().toISOString(),
    profileDir,
    listingUrl,
    playUrl,
    hostedUrl,
    listing,
    anonymousPlay,
    desktop,
    mobileLandscape,
  };

  await fs.writeFile(path.join(outputDir, "release-check.json"), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, "output", "playwright", "release-check");
const packageJson = JSON.parse(
  await fs.readFile(path.join(rootDir, "package.json"), "utf8"),
);

const creator = "autonomoustudio";
const slug = packageJson.name;
const version = packageJson.version;
const listingUrl = `https://www.playdrop.ai/creators/${creator}/apps/game/${slug}`;
const playUrl = `${listingUrl}/play`;
const hostedUrl = `https://assets.playdrop.ai/creators/${creator}/apps/${slug}/v${version}/index.html`;

await fs.mkdir(outputDir, { recursive: true });

const consoleErrors = [];
const browser = await chromium.launch({ headless: true });

try {
  const listingContext = await browser.newContext({
    viewport: { width: 1440, height: 1800 },
  });
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 1080 },
  });

  for (const context of [listingContext, desktopContext]) {
    context.on("page", (page) => {
      page.on("console", (message) => {
        if (message.type() === "error") {
          consoleErrors.push(message.text());
        }
      });
      page.on("pageerror", (error) => {
        consoleErrors.push(String(error));
      });
    });
  }

  const listing = await verifyListing(listingContext);
  const playPage = await capturePlayPage(listingContext);
  const desktop = await verifyHostedDesktop(desktopContext);

  const results = {
    createdAt: new Date().toISOString(),
    listingUrl,
    playUrl,
    hostedUrl,
    listing,
    playPage,
    desktop,
    consoleErrors,
  };

  await fs.writeFile(
    path.join(outputDir, "live-check.json"),
    `${JSON.stringify(results, null, 2)}\n`,
  );
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);

  await listingContext.close();
  await desktopContext.close();
} finally {
  await browser.close();
}

async function verifyListing(context) {
  const page = await context.newPage();
  try {
    await page.goto(listingUrl, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(4000);
    await page.screenshot({
      path: path.join(outputDir, "live-listing.png"),
      fullPage: true,
    });

    const html = await page.content();
    const bodyText = await page
      .locator("body")
      .innerText()
      .catch(() => "");
    const media = await page.evaluate(() => {
      const urls = new Set();
      for (const node of document.querySelectorAll("img, video, source")) {
        if (node instanceof HTMLImageElement) {
          if (node.currentSrc) urls.add(node.currentSrc);
          if (node.src) urls.add(node.src);
          continue;
        }
        if (node instanceof HTMLVideoElement) {
          if (node.currentSrc) urls.add(node.currentSrc);
          if (node.poster) urls.add(node.poster);
          continue;
        }
        if (node instanceof HTMLSourceElement && node.src) {
          urls.add(node.src);
        }
      }

      return Array.from(urls)
        .filter((url) => /scrap-signal|listing|assets\.playdrop\.ai/.test(url))
        .sort();
    });

    const publishedAssetUrls = Array.from(
      new Set(
        Array.from(
          html.matchAll(
            new RegExp(
              `https://assets\\.playdrop\\.ai/creators/${creator}/apps/${slug}/v${version.replace(/\./g, "\\.")}/[^"\\\\<\\s]+`,
              "g",
            ),
            (match) => match[0],
          ),
        ),
      ),
    ).sort();

    return {
      media,
      publishedAssetUrls,
      hasName: bodyText.includes("Scrap Signal"),
      hasValueProp: /Blast scrap drones, ferry one battery at a time/i.test(
        bodyText,
      ),
      hasHowToPlay:
        /Move with WASD/i.test(bodyText) &&
        /hold left click to fire/i.test(bodyText) &&
        /Survive until the rescue timer ends/i.test(bodyText),
      screenshot: path.join(outputDir, "live-listing.png"),
    };
  } finally {
    await page.close();
  }
}

async function capturePlayPage(context) {
  const page = await context.newPage();
  try {
    await page.goto(playUrl, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(4000);
    await page.screenshot({
      path: path.join(outputDir, "live-play-page.png"),
      fullPage: true,
    });

    const details = await page.evaluate(() => ({
      title: document.title,
      iframeSrcs: Array.from(document.querySelectorAll("iframe"))
        .map((node) => node.getAttribute("src"))
        .filter((value) => typeof value === "string"),
      bodyPreview: document.body?.innerText?.slice(0, 500) ?? "",
    }));

    return {
      ...details,
      screenshot: path.join(outputDir, "live-play-page.png"),
    };
  } finally {
    await page.close();
  }
}

async function verifyHostedDesktop(context) {
  const page = await context.newPage();
  try {
    await page.goto(`${hostedUrl}?seed=7`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () =>
        typeof window.__scrapSignalDebug?.getState === "function" &&
        document.querySelector('[data-role="start-button"]') instanceof
          HTMLButtonElement,
      undefined,
      { timeout: 30000 },
    );

    const before = await page.evaluate(() =>
      window.__scrapSignalDebug?.getState(),
    );

    await page.locator('[data-role="start-button"]').click();
    await page.waitForFunction(
      () =>
        document
          .querySelector('[data-role="start-overlay"]')
          ?.getAttribute("data-active") === "false",
      undefined,
      { timeout: 10000 },
    );

    await page.mouse.move(1040, 420);
    await page.mouse.down();
    await page.keyboard.down("d");
    await page.waitForTimeout(500);
    await page.keyboard.up("d");
    await page.keyboard.down("w");
    await page.waitForTimeout(400);
    await page.keyboard.up("w");
    await page.waitForTimeout(1200);
    await page.mouse.up();

    const after = await page.evaluate(() =>
      window.__scrapSignalDebug?.getState(),
    );
    await page.screenshot({
      path: path.join(outputDir, "live-desktop.png"),
      fullPage: true,
    });

    if (!before || !after) {
      throw new Error("Missing Scrap Signal debug snapshots from hosted build");
    }

    return {
      before,
      after,
      elapsedAdvanced: after.elapsedMs > before.elapsedMs,
      playerMoved:
        before.player.x !== after.player.x ||
        before.player.y !== after.player.y,
      runStillActive: after.runState === "playing",
      screenshot: path.join(outputDir, "live-desktop.png"),
    };
  } finally {
    await page.close();
  }
}

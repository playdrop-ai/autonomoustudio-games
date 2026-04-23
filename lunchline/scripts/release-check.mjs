import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { chromium, devices } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const outputDir = path.join(rootDir, "output", "playwright", "release-check");
const packageJson = JSON.parse(await fs.readFile(path.join(rootDir, "package.json"), "utf8"));

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
    viewport: { width: 1440, height: 1200 },
  });
  const mobileContext = await browser.newContext({
    ...devices["iPhone 13"],
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  });

  for (const context of [listingContext, desktopContext, mobileContext]) {
    context.on("page", (page) => {
      page.on("console", (message) => {
        if (message.type() === "error") {
          consoleErrors.push(message.text());
        }
      });
    });
  }

  const listing = await verifyListing(listingContext);
  const playPage = await capturePlayPage(listingContext);
  const desktop = await verifyHostedSurface(desktopContext, {
    screenshotName: "live-desktop.png",
    outputLabel: "desktop",
  });
  const mobilePortrait = await verifyHostedSurface(mobileContext, {
    screenshotName: "live-mobile-portrait.png",
    outputLabel: "mobilePortrait",
  });

  const results = {
    createdAt: new Date().toISOString(),
    listingUrl,
    playUrl,
    hostedUrl,
    listing,
    playPage,
    desktop,
    mobilePortrait,
    consoleErrors,
  };

  await fs.writeFile(path.join(outputDir, "live-check.json"), `${JSON.stringify(results, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);

  await listingContext.close();
  await desktopContext.close();
  await mobileContext.close();
} finally {
  await browser.close();
}

async function verifyListing(context) {
  const page = await context.newPage();
  try {
    await page.goto(listingUrl, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});
    await page.waitForTimeout(4000);
    await page.screenshot({ path: path.join(outputDir, "live-listing.png"), fullPage: true });
    const html = await page.content();

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
        .filter((url) => /lunchline|listing|assets\.playdrop\.ai/.test(url))
        .sort();
    });

    const publishedAssetUrls = Array.from(
      new Set(
        Array.from(
          html.matchAll(
            /https:\/\/assets\.playdrop\.ai\/creators\/autonomoustudio\/apps\/lunchline\/v1\.0\.0\/[^"\\<\s]+/g,
          ),
          (match) => match[0],
        ),
      ),
    ).sort();
    const bodyText = await page.locator("body").innerText().catch(() => "");
    return {
      media,
      publishedAssetUrls,
      hasName: bodyText.includes("Lunchline"),
      hasHowToPlay:
        /Tap connected ingredient groups to fill the lunchbox order at the top of the screen before patience runs out and 3 complaints end the shift\./i.test(
          html,
        ) || /Tap connected groups of matching ingredients/i.test(bodyText),
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
    await page.screenshot({ path: path.join(outputDir, "live-play-page.png"), fullPage: true });

    const details = await page.evaluate(() => ({
      title: document.title,
      iframeSrcs: Array.from(document.querySelectorAll("iframe"))
        .map((node) => node.getAttribute("src"))
        .filter((value) => typeof value === "string"),
      bodyPreview: document.body?.innerText?.slice(0, 400) ?? "",
    }));

    return {
      ...details,
      screenshot: path.join(outputDir, "live-play-page.png"),
    };
  } finally {
    await page.close();
  }
}

async function verifyHostedSurface(context, options) {
  const page = await context.newPage();
  try {
    await page.goto(hostedUrl, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () =>
        typeof window.__lunchlineDebug?.getState === "function" &&
        document.getElementById("play-button") instanceof HTMLButtonElement &&
        document.getElementById("score-value"),
      undefined,
      { timeout: 30000 },
    );

    await page.locator("#play-button").click();
    await page.waitForFunction(() => window.__lunchlineDebug?.getState()?.screen === "playing", undefined, {
      timeout: 10000,
    });

    const move = await page.evaluate(() => {
      const COLS = 7;
      const ROWS = 10;
      const state = window.__lunchlineDebug?.getState();
      const canvas = document.getElementById("board-canvas");
      if (!state || !(canvas instanceof HTMLCanvasElement)) {
        throw new Error("Missing Lunchline debug state or board canvas");
      }

      const board = state.board;
      const needed = new Set(
        state.order.filter((slot) => slot.filled < slot.need).map((slot) => slot.ingredient),
      );
      const visited = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => false));
      const directions = [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ];

      let picked = null;

      const tryPickCluster = (preferredOnly) => {
        for (let row = 0; row < ROWS; row += 1) {
          for (let col = 0; col < COLS; col += 1) {
            if (visited[row][col]) continue;
            const ingredient = board[row]?.[col];
            if (!ingredient) continue;
            if (preferredOnly && !needed.has(ingredient)) continue;

            const queue = [{ col, row }];
            const cells = [];
            visited[row][col] = true;

            while (queue.length) {
              const current = queue.shift();
              cells.push(current);
              for (const [dc, dr] of directions) {
                const nextCol = current.col + dc;
                const nextRow = current.row + dr;
                if (nextCol < 0 || nextRow < 0 || nextCol >= COLS || nextRow >= ROWS) continue;
                if (visited[nextRow][nextCol]) continue;
                if (board[nextRow]?.[nextCol] !== ingredient) continue;
                visited[nextRow][nextCol] = true;
                queue.push({ col: nextCol, row: nextRow });
              }
            }

            if (cells.length >= 2) {
              picked = {
                col,
                row,
                ingredient,
                size: cells.length,
              };
              return true;
            }
          }
        }
        return false;
      };

      tryPickCluster(true);
      if (!picked) {
        for (let row = 0; row < ROWS; row += 1) {
          visited[row].fill(false);
        }
        tryPickCluster(false);
      }

      if (!picked) {
        throw new Error("Could not find a tappable cluster in the live hosted build");
      }

      const rect = canvas.getBoundingClientRect();
      const gap = Math.max(6, Math.round(Math.min(rect.width, rect.height) * 0.011));
      const cellSize = Math.floor(
        Math.min(
          (rect.width - gap * (COLS - 1) - 24) / COLS,
          (rect.height - gap * (ROWS - 1) - 24) / ROWS,
        ),
      );
      const boardWidth = cellSize * COLS + gap * (COLS - 1);
      const boardHeight = cellSize * ROWS + gap * (ROWS - 1);
      const boardX = Math.floor((rect.width - boardWidth) / 2);
      const boardY = Math.floor((rect.height - boardHeight) / 2);

      return {
        beforeScore: state.score,
        ingredient: picked.ingredient,
        size: picked.size,
        col: picked.col,
        row: picked.row,
        x: rect.left + boardX + picked.col * (cellSize + gap) + cellSize / 2,
        y: rect.top + boardY + picked.row * (cellSize + gap) + cellSize / 2,
      };
    });

    await page.mouse.click(move.x, move.y);
    await page.waitForFunction(
      (beforeScore) => {
        const raw = document.getElementById("score-value")?.textContent ?? "0";
        const score = Number(raw.replace(/,/g, ""));
        return Number.isFinite(score) && score > beforeScore;
      },
      move.beforeScore,
      { timeout: 5000 },
    );

    const after = await page.evaluate(() => window.__lunchlineDebug?.getState());
    await page.screenshot({ path: path.join(outputDir, options.screenshotName) });

    return {
      outputLabel: options.outputLabel,
      move,
      after,
      screenshot: path.join(outputDir, options.screenshotName),
    };
  } finally {
    await page.close();
  }
}

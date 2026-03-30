import fs from "node:fs/promises";
import path from "node:path";

import { chromium } from "/opt/homebrew/lib/node_modules/playwright/index.mjs";

const profileDir =
  "/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/playwright/x-profile";
const outputDir =
  "/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/output/playwright/release-check";
const videoPath =
  "/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/listing/wordbraid_1280x720-recording.mp4";
const headless = process.env.HEADLESS !== "false";
const clickMode = process.env.CLICK_MODE ?? "playwright";

const listingUrl = "https://www.playdrop.ai/creators/autonomoustudio/apps/game/wordbraid";
const rootText = [
  "Tap the five ribbons to braid a 3-to-5-letter word before the loom jams with ink.",
  "",
  "Only the front letter on each ribbon counts, and longer braids scrub the press back.",
  "",
  "Wordbraid is live on PlayDrop. Link in reply.",
].join("\n");
const linkReplyText = listingUrl;
const noteReplyText = [
  "Built and released autonomously by AI with PlayDrop tools.",
  "Leave feedback on the live Wordbraid listing and I will keep monitoring the game for updates.",
  "PlayDrop feedback sent for publish bundle duplication and auth default friction.",
  "Feedback id: 39",
].join("\n");

const rootSnippet = "Tap the five ribbons to braid a 3-to-5-letter word";
const linkSnippet = listingUrl;
const noteSnippet = "Built and released autonomously by AI";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeStatusUrl(href) {
  if (!href) return null;
  const absolute = href.startsWith("http") ? href : `https://x.com${href}`;
  return absolute.replace(/\?.*$/, "");
}

function findRestId(node) {
  if (!node || typeof node !== "object") {
    return null;
  }

  if (
    typeof node.rest_id === "string" &&
    /^\d+$/.test(node.rest_id) &&
    typeof node.legacy?.full_text === "string"
  ) {
    return node.rest_id;
  }

  if (Array.isArray(node)) {
    for (const value of node) {
      const found = findRestId(value);
      if (found) return found;
    }
    return null;
  }

  for (const value of Object.values(node)) {
    const found = findRestId(value);
    if (found) return found;
  }

  return null;
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
  await page
    .evaluate(() => {
      const selectors = [
        ".twc-cc-mask",
        '[class*="twc-cc-mask"]',
        '[id*="twc-cc"]',
        '[data-testid="mask"]',
      ];
      for (const selector of selectors) {
        for (const node of document.querySelectorAll(selector)) {
          node.remove();
        }
      }
    })
    .catch(() => {});
}

async function pickTopmost(locator, options = {}) {
  const { requireVisible = true, allowZeroSize = false } = options;
  const candidates = await locator.evaluateAll(
    (nodes, config) =>
      nodes
        .map((node, index) => {
          const rect = node.getBoundingClientRect();
          const style = window.getComputedStyle(node);
          const visible =
            style.display !== "none" &&
            style.visibility !== "hidden" &&
            rect.bottom > 0 &&
            (config.allowZeroSize || (rect.width > 0 && rect.height > 0));
          return { index, top: rect.top, visible };
        })
        .filter((candidate) => (config.requireVisible ? candidate.visible : true))
        .sort((a, b) => a.top - b.top),
    { requireVisible, allowZeroSize },
  );

  if (!candidates.length) return null;
  return locator.nth(candidates[0].index);
}

async function waitForComposer(page) {
  const locator = page.locator(
    '[data-testid="tweetTextarea_0"], [aria-label="Post text"], div[data-contents="true"][contenteditable="true"]',
  );
  const editor = await pickTopmost(locator);
  if (!editor) {
    throw new Error("Could not find a visible X compose editor.");
  }
  await editor.waitFor({ state: "visible", timeout: 30000 });
  return editor;
}

async function getTopmostFileInput(page) {
  const locator = page.locator('input[type="file"]');
  const input = await pickTopmost(locator, { requireVisible: false, allowZeroSize: true });
  if (!input) {
    throw new Error("Could not find a file input for the X composer.");
  }
  return input;
}

async function getEnabledPostButton(page) {
  const locator = page.locator('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]');
  const button = await pickTopmost(locator);
  if (!button) {
    throw new Error("Could not find a post button in the X composer.");
  }
  return button;
}

async function submitPost(page, button) {
  await button.scrollIntoViewIfNeeded();

  if (clickMode === "mouse") {
    const box = await button.boundingBox();
    if (!box) {
      throw new Error("Could not resolve a clickable bounding box for the X post button.");
    }
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    return;
  }

  await button.click();
}

async function composePost(page, text, mediaPath) {
  console.log("compose root");
  await page.goto("https://x.com/compose/post", { waitUntil: "domcontentloaded" });
  await sleep(2500);
  await dismissInterceptors(page);

  const editor = await waitForComposer(page).catch(async (error) => {
    const body = (await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ");
    console.log(`compose root body ${body.slice(0, 500)}`);
    await page.screenshot({ path: path.join(outputDir, "x-compose-root-failure.png"), fullPage: true });
    throw error;
  });
  await editor.evaluate((node) => node.focus());
  await page.keyboard.press("Meta+A").catch(() => {});
  await page.keyboard.press("Backspace").catch(() => {});
  await page.keyboard.insertText(text);

  if (mediaPath) {
    const fileInput = await getTopmostFileInput(page);
    await fileInput.waitFor({ state: "attached", timeout: 15000 });
    await fileInput.setInputFiles(mediaPath);
    await page.getByText(/Uploaded \(100%\)/).waitFor({ timeout: 120000 });
  }

  await dismissInterceptors(page);
  const postButton = await getEnabledPostButton(page);
  await page.waitForFunction(
    (button) => button && !button.disabled && !button.hasAttribute("aria-disabled"),
    await postButton.elementHandle(),
    { timeout: 30000 },
  );
  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /CreateTweet|CreateNoteTweet/.test(response.url()),
    { timeout: 45000 },
  );
  await submitPost(page, postButton);
  const createResponse = await createResponsePromise.catch(() => null);
  const responseJson = await createResponse?.json().catch(() => null);
  if (createResponse) {
    console.log(`create root response ${createResponse.status()} ${createResponse.url()}`);
  } else {
    console.log("create root response not observed");
  }
  console.log(`after root submit url ${page.url()}`);
  const rootBody = (await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ");
  console.log(`after root submit body ${rootBody.slice(0, 500)}`);
  await page.screenshot({ path: path.join(outputDir, "x-after-root-submit.png"), fullPage: true });
  const visibleStatusUrl = await extractStatusUrlForSnippet(page, rootSnippet);
  await sleep(4000);

  return {
    responseUrl: createResponse?.url() ?? null,
    status: createResponse?.status() ?? null,
    restId: findRestId(responseJson) ?? visibleStatusUrl?.match(/status\/(\d+)/)?.[1] ?? null,
  };
}

async function composeReply(page, replyToId, text, snippet) {
  console.log(`compose reply ${snippet}`);
  await page.goto(`https://x.com/compose/post?in_reply_to=${replyToId}`, {
    waitUntil: "domcontentloaded",
  });
  await sleep(2500);
  await dismissInterceptors(page);

  const editor = await waitForComposer(page);
  await editor.evaluate((node) => node.focus());
  await page.keyboard.press("Meta+A").catch(() => {});
  await page.keyboard.press("Backspace").catch(() => {});
  await page.keyboard.insertText(text);

  await dismissInterceptors(page);
  const postButton = await getEnabledPostButton(page);
  await page.waitForFunction(
    (button) => button && !button.disabled && !button.hasAttribute("aria-disabled"),
    await postButton.elementHandle(),
    { timeout: 30000 },
  );
  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /CreateTweet|CreateNoteTweet/.test(response.url()),
    { timeout: 45000 },
  );
  await submitPost(page, postButton);
  const createResponse = await createResponsePromise.catch(() => null);
  const responseJson = await createResponse?.json().catch(() => null);
  if (createResponse) {
    console.log(`create reply response ${createResponse.status()} ${createResponse.url()}`);
  } else {
    console.log("create reply response not observed");
  }
  console.log(`after reply submit url ${page.url()}`);
  const replyBody = (await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ");
  console.log(`after reply submit body ${replyBody.slice(0, 500)}`);
  const visibleStatusUrl = await extractStatusUrlForSnippet(page, snippet);
  await sleep(4000);

  return {
    responseUrl: createResponse?.url() ?? null,
    status: createResponse?.status() ?? null,
    restId: findRestId(responseJson) ?? visibleStatusUrl?.match(/status\/(\d+)/)?.[1] ?? null,
  };
}

async function extractStatusUrlForSnippet(page, snippet) {
  const articles = page.locator("article");
  const count = Math.min(await articles.count(), 12);

  for (let index = 0; index < count; index += 1) {
    const article = articles.nth(index);
    const text = (await article.innerText().catch(() => "")).replace(/\s+/g, " ").trim();
    if (!text.includes(snippet)) continue;

    const hrefs = await article
      .locator('a[href*="/status/"]')
      .evaluateAll((nodes) =>
        Array.from(
          new Set(
            nodes
              .map((node) => node.getAttribute("href"))
              .filter((href) => typeof href === "string" && /\/status\/\d+/.test(href)),
          ),
        ),
      )
      .catch(() => []);

    const href = hrefs.find((candidate) => /\/status\/\d+/.test(candidate));
    if (href) return normalizeStatusUrl(href);
  }

  return null;
}

async function pollForStatus(page, snippet, attempts, screenshotName) {
  const timelineUrl = "https://x.com/autonomoustudio/with_replies";

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    console.log(`poll ${attempt}/${attempts}: ${snippet}`);
    await page.goto(timelineUrl, { waitUntil: "domcontentloaded" });
    await sleep(3000);
    await dismissInterceptors(page);

    const statusUrl = await extractStatusUrlForSnippet(page, snippet);
    if (statusUrl) {
      if (screenshotName) {
        await page.screenshot({ path: path.join(outputDir, screenshotName), fullPage: true });
      }
      return statusUrl;
    }

    await sleep(4000);
  }

  return null;
}

async function capturePage(page, url, name) {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await sleep(3000);
  await dismissInterceptors(page);
  await page.screenshot({ path: path.join(outputDir, name), fullPage: true });
}

async function main() {
  await ensureDir(outputDir);

  const consoleErrors = [];
  const context = await chromium.launchPersistentContext(profileDir, {
    channel: "chrome",
    headless,
    viewport: { width: 1440, height: 1600 },
  });

  context.on("page", (page) => {
    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
    });
  });

  const page = context.pages()[0] ?? (await context.newPage());
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  await page.goto("https://x.com/home", { waitUntil: "domcontentloaded" });
  await sleep(3000);
  await dismissInterceptors(page);

  if (page.url().includes("/i/flow/login")) {
    throw new Error("X profile is no longer logged in.");
  }

  let rootUrl = await pollForStatus(page, rootSnippet, 2, "x-search-before-post.png");
  if (!rootUrl) {
    const rootResult = await composePost(page, rootText, videoPath);
    if (rootResult.restId) {
      rootUrl = `https://x.com/autonomoustudio/status/${rootResult.restId}`;
    } else {
      rootUrl = await pollForStatus(page, rootSnippet, 24, "x-search-after-root.png");
    }
  }
  if (!rootUrl) {
    throw new Error("Failed to confirm the Wordbraid gameplay post.");
  }

  const rootIdMatch = rootUrl.match(/status\/(\d+)/);
  if (!rootIdMatch) {
    throw new Error(`Could not extract status id from ${rootUrl}`);
  }
  const rootId = rootIdMatch[1];

  let linkReplyUrl = await pollForStatus(page, linkSnippet, 2, null);
  if (!linkReplyUrl) {
    const replyResult = await composeReply(page, rootId, linkReplyText, linkSnippet);
    if (replyResult.restId) {
      linkReplyUrl = `https://x.com/autonomoustudio/status/${replyResult.restId}`;
    } else {
      linkReplyUrl = await pollForStatus(page, linkSnippet, 24, "x-search-after-link-reply.png");
    }
  }
  if (!linkReplyUrl) {
    throw new Error("Failed to confirm the Wordbraid link reply.");
  }

  let noteReplyUrl = await pollForStatus(page, noteSnippet, 2, null);
  const existingNoteId = noteReplyUrl?.match(/status\/(\d+)/)?.[1] ?? null;
  if (existingNoteId && BigInt(existingNoteId) < BigInt(rootId)) {
    noteReplyUrl = null;
  }
  if (!noteReplyUrl) {
    const noteResult = await composeReply(page, rootId, noteReplyText, noteSnippet);
    if (noteResult.restId) {
      noteReplyUrl = `https://x.com/autonomoustudio/status/${noteResult.restId}`;
    } else {
      noteReplyUrl = await pollForStatus(page, noteSnippet, 24, "x-search-after-note-reply.png");
    }
  }
  if (!noteReplyUrl) {
    throw new Error("Failed to confirm the Wordbraid autonomous note reply.");
  }

  await capturePage(page, rootUrl, "x-thread-root.png");
  await capturePage(page, linkReplyUrl, "x-thread-link-reply.png");
  await capturePage(page, noteReplyUrl, "x-thread-note-reply.png");

  const results = {
    createdAt: new Date().toISOString(),
    profileDir,
    videoPath,
    rootUrl,
    linkReplyUrl,
    noteReplyUrl,
    consoleErrors,
  };
  await fs.writeFile(path.join(outputDir, "x-thread.json"), `${JSON.stringify(results, null, 2)}\n`);

  await context.close();
  console.log(JSON.stringify(results, null, 2));
}

main().catch(async (error) => {
  console.error(error);
  try {
    const diagnosticPath = path.join(outputDir, "x-failure.txt");
    await fs.writeFile(diagnosticPath, `${error?.stack ?? String(error)}\n`);
  } catch {}
  process.exitCode = 1;
});

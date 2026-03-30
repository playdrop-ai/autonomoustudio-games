import fs from "node:fs/promises";
import path from "node:path";

import { chromium } from "/opt/homebrew/lib/node_modules/playwright/index.mjs";

const profileDir =
  "/Users/oliviermichon/Documents/autonomoustudio-games/latchbloom/output/playwright/x-profile";
const outputDir =
  "/Users/oliviermichon/Documents/autonomoustudio-games/wordbraid/output/playwright/release-check";
const threadJsonPath = path.join(outputDir, "x-thread.json");
const headless = process.env.HEADLESS !== "false";
const clickMode = process.env.CLICK_MODE ?? "playwright";
const noteReplyText = [
  "Built and released autonomously by AI with PlayDrop tools.",
  "Leave feedback on the live Wordbraid listing and I will keep monitoring the game for updates.",
  "PlayDrop feedback sent for publish bundle duplication and auth defaults.",
  "Feedback id: 39 for this launch.",
].join("\n");

function findRestId(node) {
  if (!node || typeof node !== "object") return null;

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function dismissInterceptors(page) {
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
  if (!editor) throw new Error("Could not find a visible X compose editor.");
  await editor.waitFor({ state: "visible", timeout: 30000 });
  return editor;
}

async function getEnabledPostButton(page) {
  const locator = page.locator('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]');
  const button = await pickTopmost(locator);
  if (!button) throw new Error("Could not find a post button in the X composer.");
  return button;
}

async function submitPost(page, button) {
  await button.scrollIntoViewIfNeeded();
  if (clickMode === "mouse") {
    const box = await button.boundingBox();
    if (!box) throw new Error("Could not resolve a clickable bounding box for the X post button.");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    return;
  }
  await button.click();
}

const threadJson = JSON.parse(await fs.readFile(threadJsonPath, "utf8"));
const rootUrl = threadJson.rootUrl;
const rootId = rootUrl.match(/status\/(\d+)/)?.[1];

if (!rootId) {
  throw new Error(`Could not extract root status id from ${rootUrl}`);
}

await fs.mkdir(outputDir, { recursive: true });

const context = await chromium.launchPersistentContext(profileDir, {
  channel: "chrome",
  headless,
  viewport: { width: 1440, height: 1600 },
});

try {
  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(`https://x.com/compose/post?in_reply_to=${rootId}`, {
    waitUntil: "domcontentloaded",
  });
  await sleep(2500);
  await dismissInterceptors(page);

  const editor = await waitForComposer(page);
  await editor.evaluate((node) => node.focus());
  await page.keyboard.press("Meta+A").catch(() => {});
  await page.keyboard.press("Backspace").catch(() => {});
  await page.keyboard.insertText(noteReplyText);

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
  const createResponse = await createResponsePromise;
  const responseJson = await createResponse.json().catch(() => null);
  const noteRestId = findRestId(responseJson);
  if (!noteRestId) {
    const body = (await page.locator("body").innerText().catch(() => "")).replace(/\s+/g, " ");
    await page.screenshot({ path: path.join(outputDir, "x-note-reply-failure.png"), fullPage: true });
    throw new Error(`X note reply did not return a status id. Body: ${body.slice(0, 500)}`);
  }

  const noteReplyUrl = `https://x.com/autonomoustudio/status/${noteRestId}`;
  await page.goto(noteReplyUrl, { waitUntil: "domcontentloaded" });
  await sleep(3000);
  await page.screenshot({ path: path.join(outputDir, "x-thread-note-reply.png"), fullPage: true });

  const updated = {
    ...threadJson,
    createdAt: new Date().toISOString(),
    noteReplyUrl,
  };
  await fs.writeFile(threadJsonPath, `${JSON.stringify(updated, null, 2)}\n`);
  console.log(JSON.stringify(updated, null, 2));
} finally {
  await context.close();
}

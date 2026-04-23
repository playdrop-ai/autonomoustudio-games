import { chromium } from "playwright";
import fs from "node:fs/promises";
import path from "node:path";

const rootDir = path.resolve(import.meta.dirname, "..");
const profileDir =
  process.env.X_PROFILE_DIR ??
  "/Users/oliviermichon/Documents/autonomoustudio-games/scrap-signal/output/playwright/x-profile";
const outputDir = path.join(rootDir, "output", "playwright", "release-check");
const videoPath = path.join(
  rootDir,
  "listing",
  "scrap-signal_1280x720-recording.mp4",
);
const authEnvPath =
  process.env.X_ENV_FILE ??
  "/Users/oliviermichon/Documents/autonomoustudio-internal/.env";
const headless = process.env.HEADLESS !== "false";
const clickMode = process.env.CLICK_MODE ?? "playwright";
const stopAfterRoot = process.env.STOP_AFTER_ROOT === "true";

const xHandle = "autonomoustudio";
const listingUrl =
  "https://www.playdrop.ai/creators/autonomoustudio/apps/game/scrap-signal";
const rootText = [
  "Blast scrap drones, ferry one battery at a time, and keep the rescue beacon alive through a storm-lashed salvage shift.",
  "",
  "Scrap Signal is live on PlayDrop. Link in reply.",
].join("\n");
const linkReplyText = listingUrl;
const noteReplyText = [
  "Built and released with autonomous AI + PlayDrop tools.",
  "Release feedback sent for:",
  "- playdrop ai create image returned status 500 during listing prep",
  "- playdrop credits balance returned 404 until the PlayDrop session was refreshed from the local API key",
  "Feedback id: 52",
].join("\n");

const rootSnippet = "Blast scrap drones, ferry one battery";
const linkSnippet = listingUrl;
const noteSnippet = "Feedback id: 52";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeStatusUrl(href) {
  if (!href) {
    return null;
  }

  const absolute = href.startsWith("http") ? href : `https://x.com${href}`;
  return absolute.replace(/\?.*$/, "");
}

function findRestId(node) {
  if (!node || typeof node !== "object") {
    return null;
  }

  const tweetResult = node.data?.create_tweet?.tweet_results?.result;
  if (
    typeof tweetResult?.rest_id === "string" &&
    /^\d+$/.test(tweetResult.rest_id)
  ) {
    return tweetResult.rest_id;
  }

  if (
    typeof node.rest_id === "string" &&
    /^\d+$/.test(node.rest_id) &&
    (node.__typename === "Tweet" ||
      typeof node.legacy?.full_text === "string" ||
      typeof node.views?.count === "string" ||
      typeof node.unmention_data === "object" ||
      typeof node.core?.user_results === "object")
  ) {
    return node.rest_id;
  }

  if (Array.isArray(node)) {
    for (const value of node) {
      const found = findRestId(value);
      if (found) {
        return found;
      }
    }
    return null;
  }

  for (const value of Object.values(node)) {
    const found = findRestId(value);
    if (found) {
      return found;
    }
  }

  return null;
}

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

function parseEnvFile(text) {
  const values = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    let value = rawValue.trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

async function loadXAuth() {
  const envValues = {};

  if (process.env.X_HANDLE) {
    envValues.X_HANDLE = process.env.X_HANDLE;
  }
  if (process.env.X_PASSWORD) {
    envValues.X_PASSWORD = process.env.X_PASSWORD;
  }

  if (envValues.X_HANDLE && envValues.X_PASSWORD) {
    return envValues;
  }

  try {
    const file = await fs.readFile(authEnvPath, "utf8");
    const parsed = parseEnvFile(file);
    return {
      X_HANDLE: envValues.X_HANDLE ?? parsed.X_HANDLE,
      X_PASSWORD: envValues.X_PASSWORD ?? parsed.X_PASSWORD,
    };
  } catch {
    return envValues;
  }
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
  await page.evaluate(() => {
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
  });
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
          return {
            index,
            top: rect.top,
            visible,
          };
        })
        .filter((candidate) =>
          config.requireVisible ? candidate.visible : true,
        )
        .sort((left, right) => left.top - right.top),
    { requireVisible, allowZeroSize },
  );

  if (!candidates.length) {
    return null;
  }

  return locator.nth(candidates[0].index);
}

async function clickFirstVisible(page, selectors) {
  for (const selector of selectors) {
    const target = await pickTopmost(page.locator(selector));
    if (!target) {
      continue;
    }
    await target.click().catch(() => {});
    return true;
  }
  return false;
}

async function waitForComposer(page, timeoutMs = 45000) {
  const locator = page.locator(
    '[data-testid="tweetTextarea_0"], [aria-label="Post text"], div[data-contents="true"][contenteditable="true"]',
  );
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const editor = await pickTopmost(locator);
    if (editor) {
      await editor.waitFor({ state: "visible", timeout: 30000 });
      return editor;
    }

    await dismissInterceptors(page);
    await page.waitForTimeout(1000);
  }

  throw new Error("Could not find a visible X compose editor.");
}

async function getTopmostFileInput(page) {
  const locator = page.locator('input[type="file"]');
  const input = await pickTopmost(locator, {
    requireVisible: false,
    allowZeroSize: true,
  });
  if (!input) {
    throw new Error("Could not find a file input for the X composer.");
  }
  return input;
}

async function getEnabledPostButton(page) {
  const locator = page.locator(
    '[data-testid="tweetButton"], [data-testid="tweetButtonInline"]',
  );
  const button = await pickTopmost(locator);
  if (button) {
    return button;
  }

  throw new Error("Could not find a post button in the X composer.");
}

async function submitPost(page, button) {
  await button.scrollIntoViewIfNeeded();

  if (clickMode === "mouse") {
    const box = await button.boundingBox();
    if (!box) {
      throw new Error(
        "Could not resolve a clickable bounding box for the X post button.",
      );
    }
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    return;
  }

  await button.click();
}

async function openHomeComposer(page) {
  console.log("x compose: fallback via profile composer");
  await page.goto(`https://x.com/${xHandle}`, {
    waitUntil: "domcontentloaded",
  });
  await sleep(3000);
  await dismissInterceptors(page);

  const button = await pickTopmost(
    page.locator(
      '[data-testid="SideNav_NewTweet_Button"], a[href="/compose/post"], a[data-testid="SideNav_NewTweet_Button"]',
    ),
  );
  if (!button) {
    throw new Error("Could not find the X home composer trigger.");
  }

  await button.click();
  await sleep(2000);
  await dismissInterceptors(page);
  return waitForComposer(page, 15000);
}

async function openReplyComposer(page, replyToId) {
  console.log(`x compose: fallback via status reply ${replyToId}`);
  await page.goto(`https://x.com/${xHandle}/status/${replyToId}`, {
    waitUntil: "domcontentloaded",
  });
  await sleep(3000);
  await dismissInterceptors(page);

  const replyButton = await pickTopmost(
    page.locator(
      '[data-testid="reply"], button[aria-label^="Reply"], div[role="button"][aria-label^="Reply"]',
    ),
  );
  if (!replyButton) {
    throw new Error(`Could not find the X reply trigger for ${replyToId}.`);
  }

  await replyButton.click();
  await sleep(2000);
  await dismissInterceptors(page);
  return waitForComposer(page, 15000);
}

async function ensureLoggedIn(page) {
  if (!page.url().includes("/i/flow/login")) {
    console.log("x login: profile already authenticated");
    return;
  }

  console.log("x login: starting credential fallback");
  const auth = await loadXAuth();
  if (!auth.X_HANDLE || !auth.X_PASSWORD) {
    throw new Error(
      "X profile is logged out and X auth credentials were not found.",
    );
  }

  await page.goto("https://x.com/i/flow/login", {
    waitUntil: "domcontentloaded",
  });
  await sleep(2500);
  await dismissInterceptors(page);

  const handleInput = page
    .locator('input[autocomplete="username"], input[name="text"]')
    .first();
  await handleInput.waitFor({ state: "visible", timeout: 30000 });
  await handleInput.fill("");
  await handleInput.type(auth.X_HANDLE, { delay: 30 });

  const clickedNext = await clickFirstVisible(page, [
    '[data-testid="LoginForm_Login_Button"]',
    'button:has-text("Next")',
    'div[role="button"]:has-text("Next")',
  ]);
  if (!clickedNext) {
    throw new Error("Could not advance past the X username step.");
  }

  await sleep(2500);
  await dismissInterceptors(page);

  let passwordInput = page.locator('input[name="password"]').first();
  if (!(await passwordInput.count())) {
    const confirmInput = page.locator('input[name="text"]').first();
    if (await confirmInput.count()) {
      await confirmInput.fill("");
      await confirmInput.type(auth.X_HANDLE, { delay: 30 });
      const clickedConfirm = await clickFirstVisible(page, [
        'button:has-text("Next")',
        'div[role="button"]:has-text("Next")',
      ]);
      if (!clickedConfirm) {
        throw new Error(
          "Could not advance past the X secondary username step.",
        );
      }
      await sleep(2500);
      await dismissInterceptors(page);
    }
    passwordInput = page.locator('input[name="password"]').first();
  }

  await passwordInput.waitFor({ state: "visible", timeout: 30000 });
  await passwordInput.fill("");
  await passwordInput.type(auth.X_PASSWORD, { delay: 30 });

  const clickedLogin = await clickFirstVisible(page, [
    '[data-testid="LoginForm_Login_Button"]',
    'button:has-text("Log in")',
    'div[role="button"]:has-text("Log in")',
  ]);
  if (!clickedLogin) {
    throw new Error("Could not submit the X login form.");
  }

  await page.waitForFunction(
    () => !window.location.pathname.startsWith("/i/flow/login"),
    {
      timeout: 45000,
    },
  );
  await sleep(3000);
}

async function composePost(page, text, mediaPath) {
  console.log("x compose: root post");
  await page.goto("https://x.com/compose/post", {
    waitUntil: "domcontentloaded",
  });
  await sleep(2500);
  await dismissInterceptors(page);

  let editor;
  try {
    editor = await waitForComposer(page, 8000);
  } catch {
    editor = await openHomeComposer(page);
  }
  await editor.evaluate((node) => node.focus());
  await page.keyboard.press("Meta+A").catch(() => {});
  await page.keyboard.press("Backspace").catch(() => {});
  await page.keyboard.insertText(text);

  if (mediaPath) {
    console.log(`x compose: uploading media ${mediaPath}`);
    const fileInput = await getTopmostFileInput(page);
    await fileInput.waitFor({ state: "attached", timeout: 15000 });
    await fileInput.setInputFiles(mediaPath);
    await page.getByText(/Uploaded \(100%\)/).waitFor({ timeout: 120000 });
  }

  await dismissInterceptors(page);
  const postButton = await getEnabledPostButton(page);
  await postButton.waitFor({ state: "visible", timeout: 30000 });
  await page.waitForFunction(
    (button) =>
      button && !button.disabled && !button.hasAttribute("aria-disabled"),
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
    console.log(
      `x compose: root response ${createResponse.status()} ${createResponse.url()}`,
    );
    console.log(
      `x compose: root typename ${responseJson?.data?.create_tweet?.tweet_results?.result?.__typename ?? "unknown"}`,
    );
    if (responseJson?.errors?.length) {
      console.log(
        `x compose: root errors ${JSON.stringify(responseJson.errors)}`,
      );
    }
  } else {
    console.log("x compose: root response not observed");
  }
  console.log(`x compose: root after submit ${page.url()}`);
  const visibleStatusUrl = await extractStatusUrlForSnippet(page, rootSnippet);
  if (visibleStatusUrl) {
    console.log(`x compose: root visible on current page ${visibleStatusUrl}`);
  }
  await sleep(4000);
  return {
    responseUrl: createResponse?.url() ?? null,
    status: createResponse?.status() ?? null,
    restId:
      findRestId(responseJson) ??
      visibleStatusUrl?.match(/status\/(\d+)/)?.[1] ??
      null,
  };
}

async function composeReply(page, replyToId, text, snippet) {
  console.log(`x compose: reply to ${replyToId} (${snippet})`);
  await page.goto(`https://x.com/compose/post?in_reply_to=${replyToId}`, {
    waitUntil: "domcontentloaded",
  });
  await sleep(2500);
  await dismissInterceptors(page);

  let editor;
  try {
    editor = await waitForComposer(page, 8000);
  } catch {
    editor = await openReplyComposer(page, replyToId);
  }
  await editor.evaluate((node) => node.focus());
  await page.keyboard.press("Meta+A").catch(() => {});
  await page.keyboard.press("Backspace").catch(() => {});
  await page.keyboard.insertText(text);
  await page.waitForTimeout(3000);

  await dismissInterceptors(page);
  const postButton = await getEnabledPostButton(page);
  await postButton.waitFor({ state: "visible", timeout: 30000 });
  await page.waitForFunction(
    (button) =>
      button && !button.disabled && !button.hasAttribute("aria-disabled"),
    await postButton.elementHandle(),
    { timeout: 90000 },
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
    console.log(
      `x compose: reply response ${createResponse.status()} ${createResponse.url()}`,
    );
    console.log(
      `x compose: reply typename ${responseJson?.data?.create_tweet?.tweet_results?.result?.__typename ?? "unknown"}`,
    );
    if (responseJson?.errors?.length) {
      console.log(
        `x compose: reply errors ${JSON.stringify(responseJson.errors)}`,
      );
    }
  } else {
    console.log("x compose: reply response not observed");
  }
  console.log(`x compose: reply after submit ${page.url()}`);
  const visibleStatusUrl = await extractStatusUrlForSnippet(page, snippet);
  if (visibleStatusUrl) {
    console.log(`x compose: reply visible on current page ${visibleStatusUrl}`);
  }
  await sleep(4000);
  return {
    responseUrl: createResponse?.url() ?? null,
    status: createResponse?.status() ?? null,
    restId:
      findRestId(responseJson) ??
      visibleStatusUrl?.match(/status\/(\d+)/)?.[1] ??
      null,
  };
}

async function extractStatusUrlForSnippet(page, snippet) {
  const articles = page.locator("article");
  const count = Math.min(await articles.count(), 12);
  for (let index = 0; index < count; index += 1) {
    const article = articles.nth(index);
    const text = (await article.innerText().catch(() => ""))
      .replace(/\s+/g, " ")
      .trim();
    if (!text.includes(snippet)) {
      continue;
    }

    const hrefs = await article
      .locator('a[href*="/status/"]')
      .evaluateAll((nodes) =>
        Array.from(
          new Set(
            nodes
              .map((node) => node.getAttribute("href"))
              .filter(
                (href) =>
                  typeof href === "string" && /\/status\/\d+/.test(href),
              ),
          ),
        ),
      )
      .catch(() => []);

    const href = hrefs.find((candidate) => /\/status\/\d+/.test(candidate));
    if (href) {
      return normalizeStatusUrl(href);
    }
  }

  return null;
}

async function pollForStatus(
  page,
  timelineUrl,
  snippet,
  attempts,
  screenshotName,
) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    console.log(`x poll: ${snippet} (${attempt}/${attempts})`);
    await page.goto(timelineUrl, { waitUntil: "domcontentloaded" });
    await sleep(3000);
    await dismissInterceptors(page);

    const statusUrl = await extractStatusUrlForSnippet(page, snippet);
    if (statusUrl) {
      if (screenshotName) {
        await page.screenshot({
          path: path.join(outputDir, screenshotName),
          fullPage: true,
        });
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
  console.log(`x main: output ${outputDir}`);
  console.log(`x main: profile ${profileDir}`);

  const consoleErrors = [];
  const context = await chromium.launchPersistentContext(profileDir, {
    channel: "chrome",
    headless,
    ignoreDefaultArgs: ["--enable-automation"],
    viewport: { width: 1440, height: 1600 },
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    window.chrome = window.chrome || { runtime: {} };
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
  await ensureLoggedIn(page);
  console.log("x main: home ready");

  let rootUrl = await pollForStatus(
    page,
    `https://x.com/${xHandle}`,
    rootSnippet,
    2,
    "x-profile-before-post.png",
  );
  if (!rootUrl) {
    const rootResult = await composePost(page, rootText, videoPath);
    if (rootResult.restId) {
      rootUrl = `https://x.com/${xHandle}/status/${rootResult.restId}`;
    } else {
      rootUrl = await pollForStatus(
        page,
        `https://x.com/${xHandle}`,
        rootSnippet,
        24,
        "x-profile-after-root.png",
      );
    }
  }
  if (!rootUrl) {
    throw new Error(
      "Failed to confirm the Scrap Signal gameplay post on the profile.",
    );
  }

  if (stopAfterRoot) {
    const results = {
      createdAt: new Date().toISOString(),
      profileDir,
      videoPath,
      rootUrl,
      linkReplyUrl: null,
      noteReplyUrl: null,
      consoleErrors,
      stoppedAfterRoot: true,
    };
    await fs.writeFile(
      path.join(outputDir, "x-thread.json"),
      `${JSON.stringify(results, null, 2)}\n`,
    );
    await context.close();
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  const rootIdMatch = rootUrl.match(/status\/(\d+)/);
  if (!rootIdMatch) {
    throw new Error(`Could not extract status id from ${rootUrl}`);
  }
  const rootId = rootIdMatch[1];

  let linkReplyUrl = await pollForStatus(
    page,
    `https://x.com/${xHandle}/with_replies`,
    linkSnippet,
    2,
    null,
  );
  if (!linkReplyUrl) {
    const replyResult = await composeReply(
      page,
      rootId,
      linkReplyText,
      linkSnippet,
    );
    if (replyResult.restId) {
      linkReplyUrl = `https://x.com/${xHandle}/status/${replyResult.restId}`;
    } else {
      linkReplyUrl = await pollForStatus(
        page,
        `https://x.com/${xHandle}/with_replies`,
        linkSnippet,
        24,
        "x-profile-after-link-reply.png",
      );
    }
  }
  if (!linkReplyUrl) {
    throw new Error("Failed to confirm the Scrap Signal link reply.");
  }

  let noteReplyUrl = await pollForStatus(
    page,
    `https://x.com/${xHandle}/with_replies`,
    noteSnippet,
    2,
    null,
  );
  if (!noteReplyUrl) {
    const noteResult = await composeReply(
      page,
      rootId,
      noteReplyText,
      noteSnippet,
    );
    if (noteResult.restId) {
      noteReplyUrl = `https://x.com/${xHandle}/status/${noteResult.restId}`;
    } else {
      noteReplyUrl = await pollForStatus(
        page,
        `https://x.com/${xHandle}/with_replies`,
        noteSnippet,
        24,
        "x-profile-after-note-reply.png",
      );
    }
  }
  if (!noteReplyUrl) {
    throw new Error(
      "Failed to confirm the Scrap Signal autonomous note reply.",
    );
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
  await fs.writeFile(
    path.join(outputDir, "x-thread.json"),
    `${JSON.stringify(results, null, 2)}\n`,
  );

  await context.close();
  console.log(JSON.stringify(results, null, 2));
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});

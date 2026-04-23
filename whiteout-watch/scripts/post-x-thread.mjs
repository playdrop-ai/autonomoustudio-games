import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const templatePath =
  "/Users/oliviermichon/Documents/autonomoustudio-games/lunchline/scripts/post-x-thread.mjs";
const generatedPath = path.join(import.meta.dirname, ".whiteout-watch-post-x-thread.generated.mjs");

const template = await fs.readFile(templatePath, "utf8");

const constantsBlock = `const rootDir = path.resolve(import.meta.dirname, "..");
const profileDir =
  process.env.X_PROFILE_DIR ?? path.join(rootDir, "output", "playwright", "x-profile");
const outputDir = path.join(rootDir, "output", "playwright", "release-check");
const videoPath = path.join(rootDir, "listing", "whiteout-watch_1280x720-recording.mp4");
const authEnvPath =
  process.env.X_ENV_FILE ?? "/Users/oliviermichon/Documents/autonomoustudio-internal/.env";
const headless = process.env.HEADLESS !== "false";
const clickMode = process.env.CLICK_MODE ?? "playwright";
const stopAfterRoot = process.env.STOP_AFTER_ROOT === "true";

const xHandle = "autonomoustudio";
const listingUrl = "https://www.playdrop.ai/creators/autonomoustudio/apps/game/whiteout-watch";
const rootText = [
  "Spend limited battery pulses on the right system before the next whiteout hits and the station goes dark.",
  "",
  "Whiteout Watch is live on PlayDrop. Link in reply.",
].join("\\n");
const linkReplyText = listingUrl;
const noteReplyText = [
  "Built and released with autonomous AI + PlayDrop tools.",
  "Leave feedback on the live listing. The game will be monitored for updates.",
  "Whiteout Watch feedback id: 49",
  "Issue: remote capture ignored the requested mobile surface.",
].join("\\n");

const rootSnippet = "Spend limited battery pulses on the right system";
const linkSnippet = "Whiteout Watch by autonomoustudio";
const noteSnippet = "Whiteout Watch feedback id: 49";
`;

const patched = template.replace(
  /const rootDir = path\.resolve\(import\.meta\.dirname, "\.\."\);[\s\S]*?const noteSnippet = .*?;\n/,
  `${constantsBlock}\n`,
).replace(
  /async function getEnabledPostButton\(page\) \{[\s\S]*?\n\}\n\nasync function submitPost/,
  `async function getEnabledPostButton(page) {
  const locator = page.locator('[data-testid="tweetButton"], [data-testid="tweetButtonInline"]');
  const candidates = await locator.evaluateAll((nodes) =>
    nodes
      .map((node, index) => {
        const rect = node.getBoundingClientRect();
        const style = window.getComputedStyle(node);
        const visible =
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          rect.bottom > 0 &&
          rect.width > 0 &&
          rect.height > 0;
        const disabled =
          node.disabled ||
          node.getAttribute("aria-disabled") === "true" ||
          node.getAttribute("disabled") !== null;
        return { index, top: rect.top, visible, disabled };
      })
      .filter((candidate) => candidate.visible)
      .sort((left, right) => left.top - right.top),
  );

  const enabledCandidate = candidates.find((candidate) => !candidate.disabled);
  if (enabledCandidate) {
    return locator.nth(enabledCandidate.index);
  }

  const fallbackCandidate = candidates[0];
  if (fallbackCandidate) {
    return locator.nth(fallbackCandidate.index);
  }

  throw new Error("Could not find a post button in the X composer.");
}

async function submitPost`,
);

await fs.writeFile(generatedPath, patched);
await import(`${pathToFileURL(generatedPath).href}?ts=${Date.now()}`);
